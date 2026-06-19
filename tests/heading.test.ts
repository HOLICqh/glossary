import { formatHeading, parseHeadingInput } from "@/lib/heading";

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
});
