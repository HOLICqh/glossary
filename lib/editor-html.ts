export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeInlineNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent ?? "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const content = Array.from(element.childNodes).map(sanitizeInlineNode).join("");

  if (tag === "br") {
    return "<br>";
  }

  if (tag === "em" || tag === "i") {
    return `<em>${content}</em>`;
  }

  if (tag === "strong" || tag === "b") {
    return `<strong>${content}</strong>`;
  }

  return content;
}

export function sanitizePastedHtml(html: string, singleLine = false): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  if (singleLine) {
    return Array.from(doc.body.childNodes)
      .map(sanitizeInlineNode)
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  }

  const blockTags = new Set([
    "p",
    "div",
    "section",
    "article",
    "blockquote",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6"
  ]);

  const blocks: string[] = [];
  let inlineBuffer = "";

  function flushInlineBuffer() {
    const normalized = inlineBuffer
      .replace(/(?:<br>\s*){2,}/g, "</p><p>")
      .replace(/\s+/g, " ")
      .trim();
    inlineBuffer = "";

    if (!normalized) {
      return;
    }

    normalized.split("</p><p>").forEach((part) => {
      blocks.push(`<p>${part.replace(/^<p>|<\/p>$/g, "")}</p>`);
    });
  }

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE && blockTags.has((node as HTMLElement).tagName.toLowerCase())) {
      flushInlineBuffer();
      const content = Array.from(node.childNodes).map(sanitizeInlineNode).join("").trim();
      if (content) {
        blocks.push(`<p>${content}</p>`);
      }
      continue;
    }

    inlineBuffer += sanitizeInlineNode(node);
  }

  flushInlineBuffer();

  return blocks.join("") || `<p>${escapeHtml(doc.body.textContent?.trim() ?? "")}</p>`;
}

export function sanitizePastedText(text: string, singleLine = false): string {
  if (singleLine) {
    return escapeHtml(text.replace(/\s+/g, " ").trim());
  }

  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function normalizeInsertedText(text: string, beforeText: string): string {
  if (text === "\"") {
    return shouldUseOpeningQuote(beforeText) ? "“" : "”";
  }

  if (text === "'") {
    return shouldUseOpeningQuote(beforeText) ? "‘" : "’";
  }

  return text;
}

function shouldUseOpeningQuote(beforeText: string): boolean {
  const previous = beforeText.slice(-1);
  if (!previous) {
    return true;
  }

  return /[\s([{\-–—/]/.test(previous);
}
