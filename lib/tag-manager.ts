import { JSDOM } from "jsdom";

import { normalizeTagValue } from "@/lib/tag-helpers";

const tagPattern = /(#[\p{L}\p{N}_-]+)/gu;

export function normalizeEntryBodyTags(
  html: string,
  options?: {
    addTag?: string;
    removeTag?: string;
  }
): { html: string; tags: string[] } {
  const dom = new JSDOM(`<body>${html}</body>`);
  const { document, NodeFilter } = dom.window;
  const body = document.body;
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const discoveredTags: string[] = [];
  const textNodes: Text[] = [];

  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  for (const node of textNodes) {
    const source = node.textContent ?? "";
    let changed = false;
    const cleaned = source.replace(tagPattern, (match: string) => {
      const tag = normalizeTagValue(match);
      discoveredTags.push(tag);
      changed = true;
      return "";
    });

    if (changed) {
      node.textContent = cleaned
        .replace(/[ \t\u00a0]{2,}/g, " ")
        .replace(/\s+([,.;:!?)}\]》〉」』，。：；？！])/gu, "$1");
    }
  }

  pruneEmptyNodes(body);

  const tagMap = new Map<string, string>();
  for (const tag of discoveredTags) {
    if (tag) {
      tagMap.set(tag, tag);
    }
  }

  const addTag = normalizeTagValue(options?.addTag ?? "");
  if (addTag) {
    tagMap.set(addTag, addTag);
  }

  const removeTag = normalizeTagValue(options?.removeTag ?? "");
  if (removeTag) {
    tagMap.delete(removeTag);
  }

  const tags = Array.from(tagMap.values()).sort((left, right) => left.localeCompare(right));
  if (tags.length) {
    const paragraph = document.createElement("p");
    paragraph.textContent = tags.join(" ");
    body.appendChild(paragraph);
  }

  return {
    html: body.innerHTML.trim(),
    tags
  };
}

function pruneEmptyNodes(root: HTMLElement) {
  for (const node of Array.from(root.querySelectorAll("*")).reverse()) {
    if (node.tagName === "BR") {
      continue;
    }

    const text = node.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
    if (!text && node.children.length === 0) {
      node.remove();
    }
  }

  for (const paragraph of Array.from(root.querySelectorAll("p"))) {
    const text = paragraph.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
    if (!text && !paragraph.querySelector("br")) {
      paragraph.remove();
    }
  }
}
