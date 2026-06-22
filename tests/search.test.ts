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
