import { searchEntries } from "@/lib/entries";
import { sampleEntries } from "@/lib/sample-data";
import { prepareEntry } from "@/lib/entries";

describe("searchEntries", () => {
  it("finds tone-marked pinyin with tone-insensitive input", () => {
    const results = searchEntries(sampleEntries, "Shen Youding");
    expect(results[0]?.entry.headword_pinyin).toBe("Shěn Yǒudǐng");
  });

  it("finds pinyin even when spaces are omitted", () => {
    const results = searchEntries(sampleEntries, "ShenYouding");
    expect(results[0]?.entry.headword_pinyin).toBe("Shěn Yǒudǐng");
  });

  it("finds Han-character matches", () => {
    const results = searchEntries(sampleEntries, "墨子閒詁");
    expect(results[0]?.entry.headword_pinyin).toBe("Mòzǐ jiāngǔ");
  });

  it("supports excluding ordinary words with a leading minus", () => {
    const results = searchEntries(sampleEntries, "Mozi -jiangu");
    expect(results.some((result) => result.entry.headword_pinyin === "Mòzǐ jiāngǔ")).toBe(false);
  });

  it("supports excluding tags with a leading minus", () => {
    const tagged = prepareEntry({
      headword_pinyin: "mòzhě",
      headword_characters: "墨者",
      heading_rich_text: "mòzhě 墨者",
      sort_key: "",
      english_gloss_or_translation: "",
      entry_type: "text",
      body_rich_text: "<p>Mohist figure.</p><p>#draft #people</p>",
      status: "draft",
      tags: [],
      related_entries: [],
      created_by: "editor",
      updated_by: "editor"
    });

    const untagged = prepareEntry({
      headword_pinyin: "gōngméng",
      headword_characters: "公孟",
      heading_rich_text: "gōngméng 公孟",
      sort_key: "",
      english_gloss_or_translation: "",
      entry_type: "text",
      body_rich_text: "<p>Another entry.</p>",
      status: "draft",
      tags: [],
      related_entries: [],
      created_by: "editor",
      updated_by: "editor"
    });

    const results = searchEntries([tagged, untagged], "-#draft", 20);
    expect(results.map((result) => result.entry.id)).toEqual([untagged.id]);
  });

  it("excludes body tags even if the stored tags array is stale", () => {
    const legacyTagged = {
      ...sampleEntries[0],
      body_rich_text: "<p>Legacy entry.</p><p>#placeholder</p>",
      tags: [],
      plain_text_search_cache: "legacy entry #placeholder"
    };

    const results = searchEntries([legacyTagged, sampleEntries[1]], "-#placeholder", 20);
    expect(results.map((result) => result.entry.id)).toEqual([sampleEntries[1].id]);
  });

  it("derives placeholder status from the body tag", () => {
    const placeholder = prepareEntry({
      headword_pinyin: "cèshì",
      headword_characters: "測試",
      heading_rich_text: "cèshì 測試",
      sort_key: "",
      english_gloss_or_translation: "",
      entry_type: "text",
      body_rich_text: "<p>#placeholder</p>",
      status: "draft",
      tags: [],
      related_entries: [],
      created_by: "editor",
      updated_by: "editor"
    });

    expect(placeholder.status).toBe("placeholder");
    expect(placeholder.entry_type).toBe("placeholder");
  });
});
