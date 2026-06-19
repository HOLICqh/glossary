import { JSDOM } from "jsdom";
import { Document, Packer, Paragraph, TextRun } from "docx";

import { formatHeading, stripHtmlTags } from "@/lib/heading";
import type { GlossaryEntry } from "@/lib/types";

function domParagraphs(html: string): TextRun[][] {
  const dom = new JSDOM(`<body>${html}</body>`);
  const blocks = Array.from(dom.window.document.body.children);

  return blocks.map((block) =>
    Array.from(block.childNodes).flatMap((node) => {
      if (node.nodeType === dom.window.Node.TEXT_NODE) {
        return [new TextRun(node.textContent ?? "")];
      }

      if (node.nodeType === dom.window.Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const text = element.textContent ?? "";
        const bold = ["strong", "b"].includes(element.tagName.toLowerCase());
        const italics = ["em", "i"].includes(element.tagName.toLowerCase());
        return [new TextRun({ text, bold, italics })];
      }

      return [];
    })
  );
}

export function sortEntriesForExport(entries: GlossaryEntry[]): GlossaryEntry[] {
  return entries.slice().sort((left, right) => left.sort_key.localeCompare(right.sort_key));
}

export async function exportEntriesToDocx(entries: GlossaryEntry[]): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: sortEntriesForExport(entries).flatMap((entry) => {
          const blocks = domParagraphs(entry.body_rich_text);
          return [
            new Paragraph({
              children: [
                new TextRun({ text: entry.headword_pinyin, bold: true }),
                new TextRun(` ${entry.headword_characters}`),
                new TextRun(`. ${entry.english_gloss_or_translation}`)
              ]
            }),
            ...blocks.map((runs) => new Paragraph({ children: runs.length ? runs : [new TextRun("")] })),
            new Paragraph("")
          ];
        })
      }
    ]
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export function exportEntriesToRtf(entries: GlossaryEntry[]): string {
  const lines = sortEntriesForExport(entries).flatMap((entry) => {
    const dom = new JSDOM(`<body>${entry.body_rich_text}</body>`);
    const paragraphs = Array.from(dom.window.document.body.children).map((block) => {
      const segments = Array.from(block.childNodes).map((node) => {
        if (node.nodeType === dom.window.Node.TEXT_NODE) {
          return escapeRtf(node.textContent ?? "");
        }

        if (node.nodeType === dom.window.Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const text = escapeRtf(element.textContent ?? "");
          const tag = element.tagName.toLowerCase();
          if (tag === "em" || tag === "i") {
            return `\\i ${text}\\i0 `;
          }
          if (tag === "strong" || tag === "b") {
            return `\\b ${text}\\b0 `;
          }
          return text;
        }

        return "";
      });
      return `${segments.join("")}\\par`;
    });

    return [
      `\\b ${escapeRtf(entry.headword_pinyin)}\\b0 ${escapeRtf(entry.headword_characters)}. ${escapeRtf(entry.english_gloss_or_translation)}\\par`,
      ...paragraphs,
      "\\par"
    ];
  });

  return `{\\rtf1\\ansi\n${lines.join("\n")}\n}`;
}

export function exportEntriesToCurrentListText(entries: GlossaryEntry[]): string {
  return sortEntriesForExport(entries)
    .map((entry) => {
      const heading = stripHtmlTags(formatHeading(entry));
      const body = stripHtmlTags(entry.body_rich_text);
      return `${heading} ${body}`.trim();
    })
    .join("\n\n");
}

export function exportEntriesToCurrentListRtf(entries: GlossaryEntry[]): string {
  const lines = sortEntriesForExport(entries).map((entry) => {
    const heading = htmlToInlineRtf(entry.heading_rich_text || formatHeading(entry));
    const body = htmlToInlineRtf(entry.body_rich_text);
    return `${heading}\\tab ${body}`.trim();
  });

  return `{\\rtf1\\ansi\\deff0\n${lines.join("\\par\\par\n")}\\par\n}`;
}

function escapeRtf(value: string): string {
  return Array.from(value)
    .map((char) => {
      if (char === "\\" || char === "{" || char === "}") {
        return `\\${char}`;
      }
      const code = char.codePointAt(0) ?? 0;
      return code > 127 ? `\\u${code}?` : char;
    })
    .join("");
}

function htmlToInlineRtf(html: string): string {
  const dom = new JSDOM(`<body>${html}</body>`);
  const pieces = Array.from(dom.window.document.body.childNodes).flatMap((node) =>
    serializeNode(node, dom.window.Node)
  );
  return pieces.join("").replace(/\s+/g, " ").trim();
}

function serializeNode(node: ChildNode, NodeCtor: typeof Node): string[] {
  if (node.nodeType === NodeCtor.TEXT_NODE) {
    return [escapeRtf(node.textContent ?? "")];
  }

  if (node.nodeType !== NodeCtor.ELEMENT_NODE) {
    return [];
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const inner = Array.from(element.childNodes).flatMap((child) => serializeNode(child, NodeCtor)).join("");

  if (tag === "i" || tag === "em") {
    return [`\\i ${inner}\\i0 `];
  }

  if (tag === "b" || tag === "strong") {
    return [`\\b ${inner}\\b0 `];
  }

  if (tag === "a") {
    return [inner];
  }

  if (tag === "p") {
    return [inner];
  }

  return [inner];
}
