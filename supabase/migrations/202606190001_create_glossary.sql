create extension if not exists pg_trgm;

create table if not exists public.glossary_entries (
  id uuid primary key default gen_random_uuid(),
  headword_pinyin text not null,
  headword_characters text not null default '',
  sort_key text not null,
  english_gloss_or_translation text not null,
  entry_type text not null check (entry_type in ('text', 'person', 'concept', 'school', 'chapter', 'placeholder', 'other')),
  body_rich_text text not null default '<p></p>',
  plain_text_search_cache text not null default '',
  status text not null check (status in ('draft', 'placeholder', 'reviewed', 'final')),
  tags text[] not null default '{}',
  related_entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index if not exists glossary_entries_sort_key_idx
  on public.glossary_entries (sort_key);

create index if not exists glossary_entries_search_cache_trgm_idx
  on public.glossary_entries
  using gin (plain_text_search_cache gin_trgm_ops);

alter table public.glossary_entries enable row level security;

create policy "public can view glossary"
  on public.glossary_entries
  for select
  using (true);

create policy "editors can insert glossary"
  on public.glossary_entries
  for insert
  to authenticated
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor', false));

create policy "editors can update glossary"
  on public.glossary_entries
  for update
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor', false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor', false));

create policy "editors can delete glossary"
  on public.glossary_entries
  for delete
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor', false));

create or replace function public.touch_glossary_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists glossary_entries_touch_updated_at on public.glossary_entries;
create trigger glossary_entries_touch_updated_at
before update on public.glossary_entries
for each row
execute function public.touch_glossary_updated_at();
