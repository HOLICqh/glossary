import { containsPlaceholderTag, extractTagsFromHtml } from "@/lib/body";
import { formatHeading } from "@/lib/heading";
import {
  normalizeCompactSearchText,
  normalizePinyinForSort,
  normalizeSearchText,
  tokens
} from "@/lib/pinyin";
import { richTextToPlainText } from "@/lib/rich-text";
import { normalizeEntryBodyTags } from "@/lib/tag-manager";
import type { EntryInput, GlossaryEntry, SearchResult } from "@/lib/types";

type ParsedSearchQuery = {
  include: string;
  exclude: string[];
};

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
  const normalizedTags = normalizeEntryBodyTags(input.body_rich_text);
  const isPlaceholder = containsPlaceholderTag(normalizedTags.html);
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
    body_rich_text: normalizedTags.html,
    tags: normalizedTags.tags,
    plain_text_search_cache: buildPlainTextSearchCache({
      ...input,
      body_rich_text: normalizedTags.html,
      tags: normalizedTags.tags
    }),
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

export function searchEntries(entries: GlossaryEntry[], query: string, limit?: number): SearchResult[] {
  const parsed = parseSearchQuery(query);
  const trimmed = parsed.include.trim();
  const results = trimmed
    ? entries
        .filter((entry) => !matchesExcludedTerm(entry, parsed.exclude))
        .map((entry) => scoreEntry(entry, trimmed))
        .filter((result) => result.score > 0)
        .sort((left, right) => right.score - left.score || left.entry.sort_key.localeCompare(right.entry.sort_key))
    : entries
        .slice()
        .filter((entry) => !matchesExcludedTerm(entry, parsed.exclude))
        .sort((left, right) => left.sort_key.localeCompare(right.sort_key))
        .map((entry) => ({ entry, score: 0, matches: [] }));

  return typeof limit === "number" ? results.slice(0, limit) : results;
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const include: string[] = [];
  const exclude: string[] = [];

  for (const term of query.trim().split(/\s+/).filter(Boolean)) {
    if (term.startsWith("-") && term.length > 1) {
      exclude.push(term.slice(1));
    } else {
      include.push(term);
    }
  }

  return {
    include: include.join(" "),
    exclude
  };
}

function matchesExcludedTerm(entry: GlossaryEntry, excludedTerms: string[]): boolean {
  if (!excludedTerms.length) {
    return false;
  }

  const haystack = normalizeSearchText(entry.plain_text_search_cache);
  const compactHaystack = normalizeCompactSearchText(entry.plain_text_search_cache);
  const tagSet = new Set(
    [...entry.tags, ...extractTagsFromHtml(entry.body_rich_text)].map((tag) =>
      normalizeCompactSearchText(tag)
    )
  );

  return excludedTerms.some((term) => {
    const normalized = normalizeSearchText(term);
    const compact = normalizeCompactSearchText(term);

    if (term.startsWith("#")) {
      return tagSet.has(compact);
    }

    return haystack.includes(normalized) || (compact ? compactHaystack.includes(compact) : false);
  });
}
