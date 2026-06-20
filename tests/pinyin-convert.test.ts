import { convertChineseSelectionToPinyin } from "@/lib/pinyin-convert";

describe("convertChineseSelectionToPinyin", () => {
  it("converts Han text to tone-marked pinyin", () => {
    expect(convertChineseSelectionToPinyin("墨經")).toBe("mò jīng");
  });

  it("preserves surrounding punctuation while converting Han text", () => {
    expect(convertChineseSelectionToPinyin("《墨辯》三派")).toBe("《mò biàn》sān pài");
  });
});
