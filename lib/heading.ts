import type { GlossaryEntry } from "@/lib/types";

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    quot: "\"",
    apos: "'",
    lt: "<",
    gt: ">",
    ndash: "–",
    mdash: "—",
    hellip: "…"
  };
  const combiningMarks: Record<string, string> = {
    grave: "\u0300",
    acute: "\u0301",
    circ: "\u0302",
    tilde: "\u0303",
    uml: "\u0308",
    ring: "\u030A",
    cedil: "\u0327"
  };

  return value
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/giu, (match, entity: string) => {
      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        const codePoint = Number.parseInt(entity.slice(2), 16);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }

      if (entity.startsWith("#")) {
        const codePoint = Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }

      const lower = entity.toLowerCase();
      if (namedEntities[lower]) {
        return namedEntities[lower];
      }

      const accentMatch = lower.match(/^([a-z])(grave|acute|circ|tilde|uml|ring|cedil)$/);
      if (accentMatch) {
        return `${accentMatch[1]}${combiningMarks[accentMatch[2]] ?? ""}`;
      }

      return match;
    })
    .normalize("NFC");
}

export function stripHtmlTags(value: string): string {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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
