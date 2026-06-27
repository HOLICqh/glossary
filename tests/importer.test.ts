import { parseHtmlImport, parsePlainTextImport, previewImport } from "@/lib/importer";

describe("previewImport", () => {
  it("parses multi-entry file-length input separated by blank lines", () => {
    const preview = previewImport(
      "Mòjīng 墨經 - Mohist Canons\nLine one.\nLine two.\n\nShěn Yǒudǐng 沈有鼎 - Shen Youding\nScholar entry.",
      "editor"
    );

    expect(preview).toHaveLength(2);
    expect(preview[0]?.headword_pinyin).toBe("Mòjīng");
    expect(preview[1]?.headword_characters).toBe("沈有鼎");
  });

  it("skips paragraphs that do not begin with pinyin plus Chinese heading", () => {
    const result = parsePlainTextImport(
      "This is not a glossary entry.\n\nMòjīng 墨經 Body text here.\n\nStill not right.",
      "editor"
    );

    expect(result.paragraphCount).toBe(3);
    expect(result.acceptedCount).toBe(1);
    expect(result.accepted[0]?.headword_pinyin).toBe("Mòjīng");
  });

  it("accepts headings containing Chinese title punctuation", () => {
    const result = parsePlainTextImport("Mòzǐ jiāngǔ 《墨子閒詁》 Body text here.", "editor");
    expect(result.acceptedCount).toBe(1);
    expect(result.accepted[0]?.headword_characters).toBe("《墨子閒詁》");
  });

  it("accepts long headings with Chinese punctuation and quoted English gloss openings", () => {
    const result = parsePlainTextImport(
      "Tán Gōngsūnlóng — jiān lùn “Mòbiàn” sān pài 談公孫龍——兼論《墨辯》三派 ‘On Gōngsūnlóng — also discussing the three schools of the Mòbiàn’, an essay by Shěn Yǒudǐng first published in 1981.",
      "editor"
    );
    expect(result.acceptedCount).toBe(1);
    expect(result.accepted[0]?.headword_characters).toBe("談公孫龍——兼論《墨辯》三派");
  });

  it("preserves body italics when importing general formatted HTML converted from RTF", () => {
    const result = parseHtmlImport(
      `
        <html>
          <body>
            <p><b>Mòzǐ 墨子</b>&nbsp;<i>Italic text</i> with context.</p>
          </body>
        </html>
      `,
      "editor"
    );

    expect(result.acceptedCount).toBe(1);
    expect(result.accepted[0]?.headword_pinyin).toBe("Mòzǐ");
    expect(result.accepted[0]?.body_rich_text).toContain("<i>Italic text</i> with context.");
  });

  it("preserves formatted heading html when importing general formatted HTML converted from RTF", () => {
    const result = parseHtmlImport(
      `
        <html>
          <body>
            <p><b><i>Mòjīng de luójíxué</i> 墨經的邏輯學</b>&nbsp;Body text.</p>
          </body>
        </html>
      `,
      "editor"
    );

    expect(result.acceptedCount).toBe(1);
    expect(result.accepted[0]?.heading_rich_text).toContain("<i>Mòjīng de luójíxué</i>");
    expect(result.accepted[0]?.body_rich_text).toContain("Body text.");
  });
});
