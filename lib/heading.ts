import type { GlossaryEntry } from "@/lib/types";

export function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function formatHeading(
  entry: Pick<GlossaryEntry, "headword_pinyin" | "headword_characters"> & { heading_rich_text?: string }
): string {
  return entry.heading_rich_text || [entry.headword_pinyin, entry.headword_characters].filter(Boolean).join(" ").trim();
}

export function parseHeadingInput(heading: string): {
  headword_pinyin: string;
  headword_characters: string;
} {
  const trimmed = heading.trim();
  const match = trimmed.match(/^(?<pinyin>[^\p{Script=Han}]*?)(?:\s*(?<han>\p{Script=Han}.*))?$/u);

  return {
    headword_pinyin: match?.groups?.pinyin?.trim() ?? trimmed,
    headword_characters: match?.groups?.han?.trim() ?? ""
  };
}

export function normalizeHeadingKey(heading: string): string {
  return stripHtmlTags(heading).replace(/\s+/g, " ").trim().toLocaleLowerCase();
}
