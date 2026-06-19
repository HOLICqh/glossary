import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { hasSupabaseConfig } from "@/lib/env";
import { prepareEntry, searchEntries } from "@/lib/entries";
import { normalizeHeadingKey, stripHtmlTags } from "@/lib/heading";
import { sampleEntries } from "@/lib/sample-data";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { EntryInput, GlossaryEntry } from "@/lib/types";

export interface GlossaryRepository {
  list(): Promise<GlossaryEntry[]>;
  getById(id: string): Promise<GlossaryEntry | null>;
  search(query: string, limit?: number): Promise<GlossaryEntry[]>;
  findByHeading(heading: string, excludeId?: string): Promise<GlossaryEntry | null>;
  upsert(input: EntryInput): Promise<GlossaryEntry>;
  delete(id: string): Promise<void>;
}

class FileGlossaryRepository implements GlossaryRepository {
  private filePath = path.join(process.cwd(), "data", "glossary.json");

  async list(): Promise<GlossaryEntry[]> {
    return (await this.readAll()).sort((left, right) => left.sort_key.localeCompare(right.sort_key));
  }

  async getById(id: string): Promise<GlossaryEntry | null> {
    return (await this.readAll()).find((entry) => entry.id === id) ?? null;
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

class SupabaseGlossaryRepository implements GlossaryRepository {
  async list(): Promise<GlossaryEntry[]> {
    const { data, error } = await getSupabaseAdmin()
      .from("glossary_entries")
      .select("*")
      .order("sort_key", { ascending: true });

    if (error) {
      throw new Error(`Supabase list failed: ${error.message}`);
    }

    return (data ?? []).map(mapRowToEntry);
  }

  async getById(id: string): Promise<GlossaryEntry | null> {
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

  async search(query: string, limit = 20): Promise<GlossaryEntry[]> {
    return searchEntries(await this.list(), query, limit).map((result) => result.entry);
  }

  async findByHeading(heading: string, excludeId?: string): Promise<GlossaryEntry | null> {
    const target = normalizeHeadingKey(stripHtmlTags(heading));
    const entries = await this.list();
    return (
      entries.find((entry) => {
        if (excludeId && entry.id === excludeId) {
          return false;
        }
        return normalizeHeadingKey(stripHtmlTags(entry.heading_rich_text)) === target;
      }) ?? null
    );
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

    return mapRowToEntry(data as SupabaseGlossaryRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabaseAdmin().from("glossary_entries").delete().eq("id", id);
    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
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
