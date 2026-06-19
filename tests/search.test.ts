import { searchEntries } from "@/lib/entries";
import { sampleEntries } from "@/lib/sample-data";

describe("searchEntries", () => {
  it("finds tone-marked pinyin with tone-insensitive input", () => {
    const results = searchEntries(sampleEntries, "Shen Youding");
    expect(results[0]?.entry.headword_pinyin).toBe("Shěn Yǒudǐng");
  });

  it("finds Han-character matches", () => {
    const results = searchEntries(sampleEntries, "墨子閒詁");
    expect(results[0]?.entry.headword_pinyin).toBe("Mòzǐ jiāngǔ");
  });
});
