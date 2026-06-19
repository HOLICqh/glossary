import { formatHeading } from "@/lib/heading";
import { normalizePinyinForSort, normalizeSearchText, tokens } from "@/lib/pinyin";
import { richTextToPlainText } from "@/lib/rich-text";
import type { EntryInput, GlossaryEntry, SearchResult } from "@/lib/types";

export function buildPlainTextSearchCache(input: {
  headword_pinyin: string;
  headword_characters: string;
  heading_rich_text?: string;
  english_gloss_or_translation: string;
  body_rich_text: string;
  tags: string[];
}): string {
  return [
    formatHeading(input),
    input.headword_pinyin,
    normalizeSearchText(input.headword_pinyin),
    input.headword_characters,
    input.english_gloss_or_translation,
    richTextToPlainText(input.body_rich_text),
    input.tags.join(" ")
  ]
    .join(" ")
    .trim();
}

export function prepareEntry(input: EntryInput): GlossaryEntry {
  const now = new Date().toISOString();
  return {
    ...input,
    heading_rich_text:
      input.heading_rich_text ||
      [input.headword_pinyin, input.headword_characters].filter(Boolean).join(" ").trim(),
    id: input.id ?? crypto.randomUUID(),
    sort_key: input.sort_key || normalizePinyinForSort(input.headword_pinyin),
    plain_text_search_cache: buildPlainTextSearchCache(input),
    created_at: input.id ? now : now,
    updated_at: now
  };
}

export function scoreEntry(entry: GlossaryEntry, query: string): SearchResult {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokens(query);
  const haystack = normalizeSearchText(entry.plain_text_search_cache);
  let score = 0;

  if (normalizeSearchText(entry.headword_pinyin) === normalizedQuery) {
    score += 50;
  }
  if (normalizeSearchText(entry.headword_pinyin).includes(normalizedQuery)) {
    score += 25;
  }
  if (entry.headword_characters.includes(query.trim())) {
    score += 25;
  }
  if (normalizeSearchText(entry.english_gloss_or_translation).includes(normalizedQuery)) {
    score += 10;
  }

  const matches = queryTokens.filter((token) => haystack.includes(token));
  score += matches.length * 6;

  return { entry, score, matches };
}

export function searchEntries(entries: GlossaryEntry[], query: string, limit = 20): SearchResult[] {
  const trimmed = query.trim();
  const results = trimmed
    ? entries
        .map((entry) => scoreEntry(entry, trimmed))
        .filter((result) => result.score > 0)
        .sort((left, right) => right.score - left.score || left.entry.sort_key.localeCompare(right.entry.sort_key))
    : entries
        .slice()
        .sort((left, right) => left.sort_key.localeCompare(right.sort_key))
        .map((entry) => ({ entry, score: 0, matches: [] }));

  return results.slice(0, limit);
}
