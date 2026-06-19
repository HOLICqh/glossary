import {
  exportEntriesToCurrentListText,
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

    expect(rtf).toContain("\\i Italic text\\i0");
  });

  it("exports current list as one paragraph per entry in sorted order", () => {
    const text = exportEntriesToCurrentListText([
      sampleEntries.find((entry) => entry.headword_pinyin === "Shěn Yǒudǐng")!,
      sampleEntries.find((entry) => entry.headword_pinyin === "Mòjīng")!
    ]);

    expect(text.split("\n\n")[0]).toContain("Mòjīng 墨經");
    expect(text.split("\n\n")[1]).toContain("Shěn Yǒudǐng 沈有鼎");
  });
});
