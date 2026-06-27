import { JSDOM } from "jsdom";
import { Document, Packer, Paragraph, TextRun } from "docx";

import { stripHashtagsFromHtml } from "@/lib/body";
import { formatHeading, parseHeadingInput, stripHtmlTags } from "@/lib/heading";
import { containsHan } from "@/lib/pinyin";
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
          const heading = exportHeadingParts(entry);
          return [
            new Paragraph({
              children: [
                new TextRun({ text: heading.pinyin, bold: true }),
                new TextRun(heading.characters ? ` ${heading.characters}` : ""),
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
    const heading = exportHeadingRtf(entry);
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
            return `{\\i ${text}}`;
          }
          if (tag === "strong" || tag === "b") {
            return `{\\b ${text}}`;
          }
          return text;
        }

        return "";
      });
      return `${segments.join("")}\\par`;
    });

    return [
      `${heading}${entry.english_gloss_or_translation ? ` . ${escapeRtf(entry.english_gloss_or_translation)}` : ""}\\par`,
      ...paragraphs,
      "\\par"
    ];
  });

  return `{\\rtf1\\ansi\n${lines.join("\n")}\n}`;
}

export function exportEntriesToCurrentListText(
  entries: GlossaryEntry[],
  options: { stripTags?: boolean } = {}
): string {
  return sortEntriesForExport(entries)
    .map((entry) => {
      const heading = exportHeadingText(entry);
      const sourceBody = options.stripTags ? stripHashtagsFromHtml(entry.body_rich_text) : entry.body_rich_text;
      const body = stripHtmlTags(sourceBody);
      return `${heading} ${body}`.trim();
    })
    .join("\n\n");
}

export function exportEntriesToCurrentListRtf(
  entries: GlossaryEntry[],
  options: { stripTags?: boolean } = {}
): string {
  const lines = sortEntriesForExport(entries).map((entry) => {
    const heading = exportHeadingRtf(entry);
    const sourceBody = options.stripTags ? stripHashtagsFromHtml(entry.body_rich_text) : entry.body_rich_text;
    const body = htmlToInlineRtf(sourceBody);
    return `${heading}${body ? `\\~${body}` : ""}`.trim();
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

function exportHeadingText(entry: GlossaryEntry): string {
  const parts = exportHeadingParts(entry);
  return [parts.pinyin, parts.characters].filter(Boolean).join(" ").trim();
}

function exportHeadingRtf(entry: GlossaryEntry): string {
  const parts = exportHeadingParts(entry);
  const pinyin = escapeRtf(parts.pinyin);
  const characters = parts.characters ? `\\~${escapeRtf(parts.characters)}` : "";
  const pinyinRtf = headingPinyinShouldBeItalic(entry)
    ? `\\i ${pinyin}\\i0`
    : pinyin;
  return `\\b ${pinyinRtf}${characters}\\b0`;
}

function exportHeadingParts(entry: GlossaryEntry): { pinyin: string; characters: string } {
  const visible = stripHtmlTags(entry.heading_rich_text || formatHeading(entry));
  const reparsed = parseHeadingInput(visible);
  const storedPinyin = entry.headword_pinyin.trim();
  const storedCharacters = entry.headword_characters.trim();

  const storedLooksBroken =
    containsHan(storedPinyin) ||
    (!storedCharacters && Boolean(reparsed.headword_characters)) ||
    (storedCharacters && !visible.includes(`${storedPinyin} ${storedCharacters}`));

  if (storedLooksBroken) {
    return {
      pinyin: reparsed.headword_pinyin,
      characters: reparsed.headword_characters
    };
  }

  return {
    pinyin: storedPinyin || reparsed.headword_pinyin,
    characters: storedCharacters || reparsed.headword_characters
  };
}

function headingPinyinShouldBeItalic(entry: GlossaryEntry): boolean {
  const html = entry.heading_rich_text;
  if (!html) {
    return false;
  }

  const dom = new JSDOM(`<body>${html}</body>`);
  return Array.from(dom.window.document.body.querySelectorAll("i, em")).some((element) => {
    const text = stripHtmlTags(element.innerHTML);
    return Boolean(text) && entry.headword_pinyin.includes(text);
  });
}

function htmlToInlineRtf(
  html: string,
  options: {
    preserveBold?: boolean;
    preserveItalics?: boolean;
  } = {}
): string {
  const dom = new JSDOM(`<body>${html}</body>`);
  const pieces = Array.from(dom.window.document.body.childNodes).flatMap((node) =>
    serializeNode(node, dom.window.Node, options)
  );
  return pieces.join("").replace(/\s+/g, " ").trim();
}

function serializeNode(
  node: ChildNode,
  NodeCtor: typeof Node,
  options: {
    preserveBold?: boolean;
    preserveItalics?: boolean;
  }
): string[] {
  if (node.nodeType === NodeCtor.TEXT_NODE) {
    return [escapeRtf(node.textContent ?? "")];
  }

  if (node.nodeType !== NodeCtor.ELEMENT_NODE) {
    return [];
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const inner = Array.from(element.childNodes)
    .flatMap((child) => serializeNode(child, NodeCtor, options))
    .join("");

  if ((tag === "i" || tag === "em") && options.preserveItalics !== false) {
    return [`{\\i ${inner}}`];
  }

  if ((tag === "b" || tag === "strong") && options.preserveBold !== false) {
    return [`{\\b ${inner}}`];
  }

  if (tag === "a") {
    return [inner];
  }

  if (tag === "p") {
    return [inner];
  }

  return [inner];
}
