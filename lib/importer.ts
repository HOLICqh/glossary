import { JSDOM } from "jsdom";

import { stripHtmlTags } from "@/lib/heading";
import { normalizePinyinForSort } from "@/lib/pinyin";
import type { EntryInput } from "@/lib/types";

const hanHeadingChunk =
  "[\\p{Script=Han}《》〈〉「」『』（）()〔〕【】·、，。：；？！…\\s]+";

export type ImportResult = {
  accepted: EntryInput[];
  acceptedCount: number;
  paragraphCount: number;
};

export function previewImport(text: string, userId: string): EntryInput[] {
  return parsePlainTextImport(text, userId).accepted;
}

export function parseImportFile(
  content: string,
  fileName: string,
  userId: string
): ImportResult {
  return fileName.toLowerCase().endsWith(".rtf")
    ? parseRtfImport(content, userId)
    : parsePlainTextImport(content, userId);
}

export function parsePlainTextImport(text: string, userId: string): ImportResult {
  const paragraphs = splitParagraphs(text);
  const accepted = paragraphs
    .map((paragraph) => parsePlainParagraph(paragraph, userId))
    .filter((entry): entry is EntryInput => Boolean(entry));

  return {
    accepted,
    acceptedCount: accepted.length,
    paragraphCount: paragraphs.length
  };
}

export function parseRtfImport(rtf: string, userId: string): ImportResult {
  return parsePlainTextImport(rtf, userId);
}

export function parseHtmlImport(html: string, userId: string): ImportResult {
  const dom = new JSDOM(html);
  const paragraphs = Array.from(dom.window.document.querySelectorAll("p"))
    .map((node) => parseHtmlParagraph(node.innerHTML, userId))
    .filter((entry): entry is EntryInput => Boolean(entry));

  return {
    accepted: paragraphs,
    acceptedCount: paragraphs.length,
    paragraphCount: Array.from(dom.window.document.querySelectorAll("p"))
      .map((node) => node.textContent?.replace(/\u00a0/g, " ").trim() ?? "")
      .filter(Boolean).length
  };
}

function parsePlainParagraph(paragraph: string, userId: string): EntryInput | null {
  const normalized = paragraph.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  const primaryMatch = normalized.match(
    new RegExp(`^(?<pinyin>[^\\p{Script=Han}]+?)\\s+(?<han>${hanHeadingChunk})(?<body>\\s+.+)$`, "u")
  );
  const match = primaryMatch?.groups ? primaryMatch : fallbackHeadingSplit(normalized);
  if (!match?.groups) {
    return null;
  }

  const headwordPinyin = match.groups.pinyin.trim();
  const headwordCharacters = match.groups.han.trim();
  const bodyText = match.groups.body.trim();
  if (!bodyText) {
    return null;
  }

  return {
    headword_pinyin: headwordPinyin,
    headword_characters: headwordCharacters,
    heading_rich_text: [headwordPinyin, headwordCharacters].join(" "),
    sort_key: normalizePinyinForSort(headwordPinyin),
    english_gloss_or_translation: "",
    entry_type: "text",
    body_rich_text: `<p>${escapeHtml(bodyText)}</p>`,
    status: "draft",
    tags: ["imported"],
    related_entries: [],
    created_by: userId,
    updated_by: userId
  };
}

function fallbackHeadingSplit(value: string): RegExpMatchArray | null {
  const firstHanIndex = value.search(/\p{Script=Han}/u);
  if (firstHanIndex < 0) {
    return null;
  }

  const pinyin = value.slice(0, firstHanIndex).trim();
  const rest = value.slice(firstHanIndex);
  const bodyStart = rest.search(/\s+(?=[‘’“”"'(\[]?[A-Za-z])/u);
  if (bodyStart < 0) {
    return null;
  }

  const han = rest.slice(0, bodyStart).trim();
  const body = rest.slice(bodyStart).trim();
  if (!pinyin || !han || !body) {
    return null;
  }

  const match = [value, pinyin, han, body] as unknown as RegExpMatchArray & {
    groups: {
      pinyin: string;
      han: string;
      body: string;
    };
  };
  match.groups = { pinyin, han, body };
  return match;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseHtmlParagraph(innerHtml: string, userId: string): EntryInput | null {
  const markerPattern = /<span[^>]*Apple-tab-span[^>]*>[\s\S]*?<\/span>/i;
  const cleanedHtml = innerHtml.replace(/<br\s*\/?>/gi, "").trim();
  const plainText = stripHtmlTags(cleanedHtml).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

  if (!plainText) {
    return null;
  }

  if (markerPattern.test(cleanedHtml)) {
    const [headingHtmlRaw, bodyHtmlRaw = ""] = cleanedHtml.split(markerPattern, 2);
    const headingText = stripHtmlTags(headingHtmlRaw).replace(/\s+/g, " ").trim();
    const bodyText = stripHtmlTags(bodyHtmlRaw).replace(/\s+/g, " ").trim();
    const headingMatch = headingText.match(/^(?<pinyin>[^\p{Script=Han}]+?)\s+(?<han>\p{Script=Han}{1,})$/u);

    if (headingMatch?.groups && bodyText) {
      return {
        headword_pinyin: headingMatch.groups.pinyin.trim(),
        headword_characters: headingMatch.groups.han.trim(),
        heading_rich_text: headingHtmlRaw.trim(),
        sort_key: normalizePinyinForSort(headingMatch.groups.pinyin.trim()),
        english_gloss_or_translation: "",
        entry_type: "text",
        body_rich_text: `<p>${bodyHtmlRaw.trim()}</p>`,
        status: "draft",
        tags: ["imported", "rtf"],
        related_entries: [],
        created_by: userId,
        updated_by: userId
      };
    }
  }

  return parsePlainParagraph(plainText, userId);
}
