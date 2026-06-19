insert into public.glossary_entries (
  id,
  headword_pinyin,
  headword_characters,
  heading_rich_text,
  sort_key,
  english_gloss_or_translation,
  entry_type,
  body_rich_text,
  plain_text_search_cache,
  status,
  tags,
  related_entries
)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Mòjīng',
    '墨經',
    'Mòjīng 墨經',
    'mojing',
    'Mohist Canons',
    'text',
    '<p>The Mòjīng is significant for discussions of inference, language, and standards.</p>',
    'Mòjīng Mojing 墨經 Mohist Canons inference language standards',
    'final',
    '{"Mohism","canon"}',
    '[{"id":"00000000-0000-0000-0000-000000000004","relationship":"commentary-on"}]'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Shěn Yǒudǐng',
    '沈有鼎',
    'Shěn Yǒudǐng 沈有鼎',
    'shen youding',
    'Shen Youding',
    'person',
    '<p>Shěn Yǒudǐng is notable for modern studies of Chinese logic and textual interpretation.</p>',
    'Shěn Yǒudǐng Shen Youding 沈有鼎 Chinese logic textual interpretation',
    'reviewed',
    '{"modern scholarship"}',
    '[]'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Mòzǐ jiāngǔ',
    '墨子閒詁',
    'Mòzǐ jiāngǔ 墨子閒詁',
    'mozi jiangu',
    'Annotated Glosses on the Mozi',
    'text',
    '<p>This commentary is important for reconstructing difficult passages and editorial choices.</p>',
    'Mòzǐ jiāngǔ Mozi jiangu 墨子閒詁 commentary reconstructing editorial choices',
    'reviewed',
    '{"commentary"}',
    '[{"id":"00000000-0000-0000-0000-000000000001","relationship":"comments-on"}]'
  );
