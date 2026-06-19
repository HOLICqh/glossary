import { createPlaceholderFromText, markSelectionWithLink } from "@/lib/rich-text";

describe("placeholder workflow", () => {
  it("creates a placeholder entry from selected text", () => {
    const placeholder = createPlaceholderFromText("yìlǐ", "editor");
    expect(placeholder.headword_pinyin).toBe("yìlǐ");
    expect(placeholder.status).toBe("placeholder");
    expect(placeholder.entry_type).toBe("placeholder");
  });

  it("wraps selected text in an internal glossary link", () => {
    const html = "<p>The term yìlǐ matters for this passage.</p>";
    const updated = markSelectionWithLink(html, "yìlǐ", {
      id: "abc",
      headword_pinyin: "yìlǐ",
      status: "placeholder"
    });

    expect(updated).toContain('data-entry-id="abc"');
    expect(updated).toContain(">yìlǐ</a>");
  });
});
