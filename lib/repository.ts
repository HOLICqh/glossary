import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { hasSupabaseConfig } from "@/lib/env";
import { prepareEntry, searchEntries } from "@/lib/entries";
import { formatHeading, normalizeHeadingKey, parseHeadingInput, stripHtmlTags } from "@/lib/heading";
import { sampleEntries } from "@/lib/sample-data";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { BulkTagUpdate, EntryInput, GlossaryEntry, HeadingOption } from "@/lib/types";

export interface GlossaryRepository {
  list(limit?: number): Promise<GlossaryEntry[]>;
  listHeadingOptions(): Promise<HeadingOption[]>;
  getById(id: string): Promise<GlossaryEntry | null>;
  getByIds(ids: string[]): Promise<GlossaryEntry[]>;
  search(query: string, limit?: number): Promise<GlossaryEntry[]>;
  findByHeading(heading: string, excludeId?: string): Promise<GlossaryEntry | null>;
  upsert(input: EntryInput): Promise<GlossaryEntry>;
  bulkUpdateTags(updates: BulkTagUpdate[]): Promise<number>;
  delete(id: string): Promise<void>;
}

class FileGlossaryRepository implements GlossaryRepository {
  private filePath = path.join(process.cwd(), "data", "glossary.json");

  async list(limit?: number): Promise<GlossaryEntry[]> {
    const entries = (await this.readAll()).sort((left, right) => left.sort_key.localeCompare(right.sort_key));
    return typeof limit === "number" ? entries.slice(0, limit) : entries;
  }

  async listHeadingOptions(): Promise<HeadingOption[]> {
    return (await this.readAll())
      .sort((left, right) => left.sort_key.localeCompare(right.sort_key))
      .map((entry) => ({
        id: entry.id,
        heading: formatHeading(entry)
      }));
  }

  async getById(id: string): Promise<GlossaryEntry | null> {
    return (await this.readAll()).find((entry) => entry.id === id) ?? null;
  }

  async getByIds(ids: string[]): Promise<GlossaryEntry[]> {
    if (!ids.length) {
      return [];
    }

    const requested = new Set(ids);
    return (await this.readAll()).filter((entry) => requested.has(entry.id));
  }

  async search(query: string, limit = 20): Promise<GlossaryEntry[]> {
    return searchEntries(await this.list(), query, limit).map((result) => result.entry);
  }

  async findByHeading(heading: string, excludeId?: string): Promise<GlossaryEntry | null> {
    const target = normalizeHeadingKey(stripHtmlTags(heading));
    return (
      (await this.readAll()).find((entry) => {
        if (excludeId && entry.id === excludeId) {
          return false;
        }
        return normalizeHeadingKey(stripHtmlTags(entry.heading_rich_text)) === target;
      }) ?? null
    );
  }

  async upsert(input: EntryInput): Promise<GlossaryEntry> {
    const entries = await this.readAll();
    const existingIndex = input.id ? entries.findIndex((entry) => entry.id === input.id) : -1;
    const existing = existingIndex >= 0 ? entries[existingIndex] : null;
    const nextEntry = prepareEntry({
      ...input,
      id: input.id,
      created_by: existing?.created_by ?? input.created_by,
      updated_by: input.updated_by
    });

    if (existing) {
      nextEntry.created_at = existing.created_at;
      entries[existingIndex] = nextEntry;
    } else {
      entries.push(nextEntry);
    }

    await this.writeAll(entries);
    return nextEntry;
  }

  async delete(id: string): Promise<void> {
    const entries = await this.readAll();
    await this.writeAll(entries.filter((entry) => entry.id !== id));
  }

  async bulkUpdateTags(updates: BulkTagUpdate[]): Promise<number> {
    if (!updates.length) {
      return 0;
    }

    const entries = await this.readAll();
    const byId = new Map(updates.map((update) => [update.id, update]));
    let updatedCount = 0;

    const nextEntries = entries.map((entry) => {
      const update = byId.get(entry.id);
      if (!update) {
        return entry;
      }

      updatedCount += 1;
      return prepareEntry({
        ...entry,
        body_rich_text: update.body_rich_text,
        tags: update.tags,
        updated_by: update.updated_by
      });
    });

    await this.writeAll(nextEntries);
    return updatedCount;
  }

  private async readAll(): Promise<GlossaryEntry[]> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as GlossaryEntry[];
    } catch {
      await this.writeAll(sampleEntries);
      return sampleEntries.slice();
    }
  }

  private async writeAll(entries: GlossaryEntry[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(entries, null, 2), "utf8");
  }
}

type SupabaseGlossaryRow = {
  id: string;
  headword_pinyin: string;
  headword_characters: string | null;
  heading_rich_text: string | null;
  sort_key: string;
  english_gloss_or_translation: string | null;
  entry_type: GlossaryEntry["entry_type"];
  body_rich_text: string;
  plain_text_search_cache: string;
  status: GlossaryEntry["status"];
  tags: string[] | null;
  related_entries: GlossaryEntry["related_entries"] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

const SUPABASE_CACHE_TTL_MS = 10_000;

type TimedCache<T> = {
  value: T;
  expiresAt: number;
};

let cachedSupabaseEntries: TimedCache<GlossaryEntry[]> | null = null;
let cachedSupabaseHeadingOptions: TimedCache<HeadingOption[]> | null = null;

class SupabaseGlossaryRepository implements GlossaryRepository {
  async list(limit?: number): Promise<GlossaryEntry[]> {
    const cachedEntries = this.readEntryCache();
    if (cachedEntries) {
      return typeof limit === "number" ? cachedEntries.slice(0, limit) : cachedEntries;
    }

    let query = getSupabaseAdmin().from("glossary_entries").select("*").order("sort_key", { ascending: true });

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase list failed: ${error.message}`);
    }

    const entries = (data ?? []).map(mapRowToEntry);
    if (typeof limit !== "number") {
      this.writeEntryCache(entries);
    }
    return entries;
  }

  async listHeadingOptions(): Promise<HeadingOption[]> {
    const cachedHeadingOptions = this.readHeadingOptionCache();
    if (cachedHeadingOptions) {
      return cachedHeadingOptions;
    }

    const cachedEntries = this.readEntryCache();
    if (cachedEntries) {
      const derived = cachedEntries.map((entry) => ({
        id: entry.id,
        heading: formatHeading(entry)
      }));
      this.writeHeadingOptionCache(derived);
      return derived;
    }

    const { data, error } = await getSupabaseAdmin()
      .from("glossary_entries")
      .select("id, headword_pinyin, headword_characters, heading_rich_text, sort_key")
      .order("sort_key", { ascending: true });

    if (error) {
      throw new Error(`Supabase listHeadingOptions failed: ${error.message}`);
    }

    const options = (data ?? []).map((row) => ({
      id: row.id as string,
      heading:
        (row.heading_rich_text as string | null) ??
        [row.headword_pinyin as string, (row.headword_characters as string | null) ?? ""]
          .filter(Boolean)
          .join(" ")
          .trim()
    }));
    this.writeHeadingOptionCache(options);
    return options;
  }

  async getById(id: string): Promise<GlossaryEntry | null> {
    const cachedEntries = this.readEntryCache();
    if (cachedEntries) {
      return cachedEntries.find((entry) => entry.id === id) ?? null;
    }

    const { data, error } = await getSupabaseAdmin()
      .from("glossary_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase getById failed: ${error.message}`);
    }

    return data ? mapRowToEntry(data as SupabaseGlossaryRow) : null;
  }

  async getByIds(ids: string[]): Promise<GlossaryEntry[]> {
    if (!ids.length) {
      return [];
    }

    const cachedEntries = this.readEntryCache();
    if (cachedEntries) {
      const requested = new Set(ids);
      return cachedEntries.filter((entry) => requested.has(entry.id));
    }

    const { data, error } = await getSupabaseAdmin()
      .from("glossary_entries")
      .select("*")
      .in("id", ids);

    if (error) {
      throw new Error(`Supabase getByIds failed: ${error.message}`);
    }

    return (data ?? []).map((row) => mapRowToEntry(row as SupabaseGlossaryRow));
  }

  async search(query: string, limit = 20): Promise<GlossaryEntry[]> {
    return searchEntries(await this.list(), query, limit).map((result) => result.entry);
  }

  async findByHeading(heading: string, excludeId?: string): Promise<GlossaryEntry | null> {
    const headingText = stripHtmlTags(heading);
    const target = normalizeHeadingKey(headingText);
    const parsed = parseHeadingInput(headingText);

    let query = getSupabaseAdmin()
      .from("glossary_entries")
      .select("*")
      .eq("headword_pinyin", parsed.headword_pinyin)
      .eq("headword_characters", parsed.headword_characters || "")
      .limit(10);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase findByHeading failed: ${error.message}`);
    }

    const exact = (data ?? [])
      .map((row) => mapRowToEntry(row as SupabaseGlossaryRow))
      .find((entry) => normalizeHeadingKey(stripHtmlTags(entry.heading_rich_text)) === target);

    return exact ?? null;
  }

  async upsert(input: EntryInput): Promise<GlossaryEntry> {
    const existing = input.id ? await this.getById(input.id) : null;
    const nextEntry = prepareEntry({
      ...input,
      created_by: existing?.created_by ?? input.created_by,
      updated_by: input.updated_by
    });

    const { data, error } = await getSupabaseAdmin()
      .from("glossary_entries")
      .upsert(mapEntryToRow(nextEntry), { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    const saved = mapRowToEntry(data as SupabaseGlossaryRow);
    this.invalidateCaches();
    return saved;
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabaseAdmin().from("glossary_entries").delete().eq("id", id);
    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
    this.invalidateCaches();
  }

  async bulkUpdateTags(updates: BulkTagUpdate[]): Promise<number> {
    if (!updates.length) {
      return 0;
    }

    const ids = updates.map((update) => update.id);
    const existingEntries = await this.getByIds(ids);
    const existingById = new Map(existingEntries.map((entry) => [entry.id, entry]));
    const rows = updates
      .map((update) => {
        const existing = existingById.get(update.id);
        if (!existing) {
          return null;
        }

        const prepared = prepareEntry({
          ...existing,
          body_rich_text: update.body_rich_text,
          tags: update.tags,
          updated_by: update.updated_by
        });

        return mapEntryToRow(prepared);
      })
      .filter((row): row is SupabaseGlossaryRow => Boolean(row));

    if (!rows.length) {
      return 0;
    }

    const { error } = await getSupabaseAdmin()
      .from("glossary_entries")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      throw new Error(`Supabase bulkUpdateTags failed: ${error.message}`);
    }

    this.invalidateCaches();
    return rows.length;
  }

  private readEntryCache(): GlossaryEntry[] | null {
    if (!cachedSupabaseEntries) {
      return null;
    }

    if (cachedSupabaseEntries.expiresAt <= Date.now()) {
      cachedSupabaseEntries = null;
      return null;
    }

    return cachedSupabaseEntries.value;
  }

  private writeEntryCache(entries: GlossaryEntry[]) {
    cachedSupabaseEntries = {
      value: entries,
      expiresAt: Date.now() + SUPABASE_CACHE_TTL_MS
    };
  }

  private readHeadingOptionCache(): HeadingOption[] | null {
    if (!cachedSupabaseHeadingOptions) {
      return null;
    }

    if (cachedSupabaseHeadingOptions.expiresAt <= Date.now()) {
      cachedSupabaseHeadingOptions = null;
      return null;
    }

    return cachedSupabaseHeadingOptions.value;
  }

  private writeHeadingOptionCache(options: HeadingOption[]) {
    cachedSupabaseHeadingOptions = {
      value: options,
      expiresAt: Date.now() + SUPABASE_CACHE_TTL_MS
    };
  }

  private invalidateCaches() {
    cachedSupabaseEntries = null;
    cachedSupabaseHeadingOptions = null;
  }
}

function mapRowToEntry(row: SupabaseGlossaryRow): GlossaryEntry {
  return {
    id: row.id,
    headword_pinyin: row.headword_pinyin,
    headword_characters: row.headword_characters ?? "",
    heading_rich_text:
      row.heading_rich_text ??
      [row.headword_pinyin, row.headword_characters ?? ""].filter(Boolean).join(" ").trim(),
    sort_key: row.sort_key,
    english_gloss_or_translation: row.english_gloss_or_translation ?? "",
    entry_type: row.entry_type,
    body_rich_text: row.body_rich_text,
    plain_text_search_cache: row.plain_text_search_cache,
    status: row.status,
    tags: row.tags ?? [],
    related_entries: row.related_entries ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by ?? "",
    updated_by: row.updated_by ?? ""
  };
}

function mapEntryToRow(entry: GlossaryEntry): SupabaseGlossaryRow {
  return {
    id: entry.id,
    headword_pinyin: entry.headword_pinyin,
    headword_characters: entry.headword_characters,
    heading_rich_text: entry.heading_rich_text,
    sort_key: entry.sort_key,
    english_gloss_or_translation: entry.english_gloss_or_translation,
    entry_type: entry.entry_type,
    body_rich_text: entry.body_rich_text,
    plain_text_search_cache: entry.plain_text_search_cache,
    status: entry.status,
    tags: entry.tags,
    related_entries: entry.related_entries,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    created_by: null,
    updated_by: null
  };
}

const fileRepository = new FileGlossaryRepository();
const supabaseRepository = new SupabaseGlossaryRepository();

export function getRepository(): GlossaryRepository {
  return hasSupabaseConfig() ? supabaseRepository : fileRepository;
}
