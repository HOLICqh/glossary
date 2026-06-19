alter table public.glossary_entries
add column if not exists heading_rich_text text;

update public.glossary_entries
set heading_rich_text = trim(concat_ws(' ', headword_pinyin, nullif(headword_characters, '')))
where heading_rich_text is null or btrim(heading_rich_text) = '';

alter table public.glossary_entries
alter column heading_rich_text set not null;
