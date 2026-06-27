import {
  exportEntriesToCurrentListText,
  exportEntriesToCurrentListRtf,
  exportEntriesToRtf,
  sortEntriesForExport
} from "@/lib/export";
import { sampleEntries } from "@/lib/sample-data";

describe("export helpers", () => {
  it("orders entries by sort key", () => {
    const ordered = sortEntriesForExport([
      sampleEntries.find((entry) => entry.headword_pinyin === "Shěn Yǒudǐng")!,
      sampleEntries.find((entry) => entry.headword_pinyin === "Mòjīng")!
    ]);

    expect(ordered.map((entry) => entry.headword_pinyin)).toEqual(["Mòjīng", "Shěn Yǒudǐng"]);
  });

  it("preserves italic formatting in RTF export", () => {
    const rtf = exportEntriesToRtf([
      {
        ...sampleEntries[0],
        body_rich_text: "<p><em>Italic text</em> with context.</p>"
      }
    ]);

    expect(rtf).toContain("{\\i Italic text} with context.");
  });

  it("exports current list as one paragraph per entry in sorted order", () => {
    const text = exportEntriesToCurrentListText([
      sampleEntries.find((entry) => entry.headword_pinyin === "Shěn Yǒudǐng")!,
      sampleEntries.find((entry) => entry.headword_pinyin === "Mòjīng")!
    ]);

    expect(text.split("\n\n")[0]).toContain("Mòjīng 墨經");
    expect(text.split("\n\n")[1]).toContain("Shěn Yǒudǐng 沈有鼎");
  });

  it("normalizes heading formatting in current list RTF export", () => {
    const rtf = exportEntriesToCurrentListRtf([
      {
        ...sampleEntries[0],
        headword_pinyin: "Mòzǐ",
        headword_characters: "",
        heading_rich_text: "<strong>Mòzǐ</strong><em>墨子</em>"
      }
    ]);

    expect(rtf).toContain("\\b M\\u242?z\\u464?");
    expect(rtf).not.toContain("\\i \\u22696?\\u23376?\\i0");
    expect(rtf).toContain("M\\u242?z\\u464?\\~\\u22696?\\u23376?");
    expect(rtf).not.toContain("\\tab");
    expect(rtf).toContain("\\~");
  });

  it("preserves intentional pinyin italics in RTF headings", () => {
    const rtf = exportEntriesToCurrentListRtf([
      {
        ...sampleEntries[0],
        headword_pinyin: "Mòzǐ jiāngǔ",
        headword_characters: "墨子閒詁",
        heading_rich_text: "<em>Mòzǐ jiāngǔ</em><strong>墨子閒詁</strong>"
      }
    ]);

    expect(rtf).toContain("\\i M\\u242?z\\u464? ji\\u257?ng\\u468?\\i0");
    expect(rtf).toContain("\\i M\\u242?z\\u464? ji\\u257?ng\\u468?\\i0\\~\\u22696?\\u23376?\\u38290?");
    expect(rtf).toContain("\\u22696?\\u23376?\\u38290?");
  });

  it("repairs missing pinyin-hanzi spacing from malformed stored heading fields", () => {
    const rtf = exportEntriesToCurrentListRtf([
      {
        ...sampleEntries[0],
        headword_pinyin: "Dàozàng道藏",
        headword_characters: "",
        heading_rich_text: "Dàozàng道藏"
      }
    ]);

    expect(rtf).toContain("D\\u224?oz\\u224?ng\\~\\u36947?\\u34255?");
  });

  it("can strip hashtags from plain-text current-list export", () => {
    const text = exportEntriesToCurrentListText(
      [
        {
          ...sampleEntries[0],
          body_rich_text: "<p>Visible text. #draft #placeholder</p>"
        }
      ],
      { stripTags: true }
    );

    expect(text).toContain("Visible text.");
    expect(text).not.toContain("#draft");
    expect(text).not.toContain("#placeholder");
  });

  it("strips hashtags from export even when they were attached directly to text", () => {
    const text = exportEntriesToCurrentListText(
      [
        {
          ...sampleEntries[0],
          body_rich_text: "<p>Visible text.#draft</p>"
        }
      ],
      { stripTags: true }
    );

    expect(text).toContain("Visible text.");
    expect(text).not.toContain("#draft");
  });

  it("can strip hashtags from RTF current-list export while preserving italics", () => {
    const rtf = exportEntriesToCurrentListRtf(
      [
        {
          ...sampleEntries[0],
          body_rich_text: "<p><em>Italic text</em> with #draft tag.</p>"
        }
      ],
      { stripTags: true }
    );

    expect(rtf).toContain("{\\i Italic text} with tag.");
    expect(rtf).not.toContain("#draft");
  });

  it("preserves the visible space after italic body text in current-list RTF export", () => {
    const rtf = exportEntriesToCurrentListRtf([
      {
        ...sampleEntries[0],
        body_rich_text: "<p><em>Mòzǐ</em> jiāngǔ</p>"
      }
    ]);

    expect(rtf).toContain("{\\i M\\u242?z\\u464?} ji\\u257?ng\\u468?");
  });
});
