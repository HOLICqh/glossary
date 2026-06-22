import { containsPlaceholderTag } from "@/lib/body";
import { formatHeading } from "@/lib/heading";
import {
  normalizeCompactSearchText,
  normalizePinyinForSort,
  normalizeSearchText,
  tokens
} from "@/lib/pinyin";
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
  const isPlaceholder = containsPlaceholderTag(input.body_rich_text);
  const nextStatus =
    isPlaceholder ? "placeholder" : input.status === "placeholder" ? "draft" : input.status;
  const nextEntryType =
    isPlaceholder ? "placeholder" : input.entry_type === "placeholder" ? "text" : input.entry_type;
  return {
    ...input,
    status: nextStatus,
    entry_type: nextEntryType,
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
  const compactQuery = normalizeCompactSearchText(query);
  const queryTokens = tokens(query);
  const haystack = normalizeSearchText(entry.plain_text_search_cache);
  const compactHaystack = normalizeCompactSearchText(entry.plain_text_search_cache);
  const normalizedHeadword = normalizeSearchText(entry.headword_pinyin);
  const compactHeadword = normalizeCompactSearchText(entry.headword_pinyin);
  const normalizedGloss = normalizeSearchText(entry.english_gloss_or_translation);
  let score = 0;

  if (normalizedHeadword === normalizedQuery) {
    score += 50;
  }
  if (normalizedHeadword.includes(normalizedQuery)) {
    score += 25;
  }
  if (compactQuery && compactHeadword === compactQuery) {
    score += 45;
  }
  if (compactQuery && compactHeadword.includes(compactQuery)) {
    score += 22;
  }
  if (entry.headword_characters.includes(query.trim())) {
    score += 25;
  }
  if (normalizedGloss.includes(normalizedQuery)) {
    score += 10;
  }
  if (compactQuery && normalizeCompactSearchText(entry.english_gloss_or_translation).includes(compactQuery)) {
    score += 8;
  }
  if (compactQuery && compactHaystack.includes(compactQuery)) {
    score += 6;
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
