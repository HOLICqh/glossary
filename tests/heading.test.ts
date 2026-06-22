import { formatHeading, parseHeadingInput, stripHtmlTags } from "@/lib/heading";

describe("heading helpers", () => {
  it("formats heading as a single user-facing unit", () => {
    expect(
      formatHeading({
        headword_pinyin: "Mòzǐ jiāngǔ",
        headword_characters: "墨子閒詁",
        heading_rich_text: "Mòzǐ jiāngǔ 墨子閒詁"
      })
    ).toBe("Mòzǐ jiāngǔ 墨子閒詁");
  });

  it("splits a combined heading back into pinyin and characters", () => {
    expect(parseHeadingInput("Mòzǐ jiāngǔ 墨子閒詁")).toEqual({
      headword_pinyin: "Mòzǐ jiāngǔ",
      headword_characters: "墨子閒詁"
    });
  });

  it("strips tags and decodes HTML entities in headings", () => {
    expect(stripHtmlTags("T&aacute;n&nbsp;<em>Gōngsūnlóng</em>&nbsp;《墨辯》")).toBe(
      "Tán Gōngsūnlóng 《墨辯》"
    );
  });
});
