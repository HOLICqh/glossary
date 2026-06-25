export const entryTypes = [
  "text",
  "person",
  "concept",
  "school",
  "chapter",
  "placeholder",
  "other"
] as const;

export const entryStatuses = [
  "draft",
  "placeholder",
  "reviewed",
  "final"
] as const;

export type EntryType = (typeof entryTypes)[number];
export type EntryStatus = (typeof entryStatuses)[number];

export type RelatedEntryRef = {
  id: string;
  relationship: string;
};

export type GlossaryLinkTarget = {
  id: string;
  headword_pinyin: string;
  status: EntryStatus;
};

export type GlossaryEntry = {
  id: string;
  headword_pinyin: string;
  headword_characters: string;
  heading_rich_text: string;
  sort_key: string;
  english_gloss_or_translation: string;
  entry_type: EntryType;
  body_rich_text: string;
  plain_text_search_cache: string;
  status: EntryStatus;
  tags: string[];
  related_entries: RelatedEntryRef[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
};

export type EntryInput = Omit<
  GlossaryEntry,
  "id" | "created_at" | "updated_at" | "plain_text_search_cache"
> & { id?: string };

export type SearchResult = {
  entry: GlossaryEntry;
  score: number;
  matches: string[];
};

export type HeadingOption = {
  id: string;
  heading: string;
  create?: boolean;
};

export type BulkTagUpdate = {
  id: string;
  body_rich_text: string;
  tags: string[];
  updated_by: string;
};

export type QualityIssue = {
  entryId: string;
  severity: "warning" | "error";
  code:
    | "missing-tones"
    | "body-han"
    | "missing-link-target"
    | "placeholder-referenced-by-final"
    | "duplicate-headword"
    | "missing-relevance-sentence";
  message: string;
};

export type UserRole = "public" | "editor";
