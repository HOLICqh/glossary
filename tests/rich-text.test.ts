import { JSDOM } from "jsdom";

import {
  normalizeInsertedText,
  sanitizePastedHtml,
  sanitizePastedText
} from "@/lib/editor-html";

describe("paste sanitization", () => {
  beforeEach(() => {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    globalThis.DOMParser = dom.window.DOMParser as typeof DOMParser;
    globalThis.Node = dom.window.Node as typeof Node;
  });

  it("removes pasted font styling while keeping emphasis", () => {
    const html =
      '<div><span style="font-family: Arial; font-size: 28px;">Alpha <i>Beta</i></span></div>';

    expect(sanitizePastedHtml(html)).toBe("<p>Alpha <em>Beta</em></p>");
  });

  it("normalizes heading paste to a single inline line", () => {
    const html = "<div><b>Mòzǐ</b> <span style='font-size: 30px;'>墨子</span></div>";

    expect(sanitizePastedHtml(html, true)).toBe("<strong>Mòzǐ</strong> 墨子");
  });

  it("turns plain text paragraphs into normalized HTML", () => {
    const text = "First line\nstill first\n\nSecond paragraph";

    expect(sanitizePastedText(text)).toBe(
      "<p>First line<br>still first</p><p>Second paragraph</p>"
    );
  });

  it("converts straight quotes to smart quotes from context", () => {
    expect(normalizeInsertedText("\"", "")).toBe("“");
    expect(normalizeInsertedText("\"", "quoted")).toBe("”");
    expect(normalizeInsertedText("'", "can")).toBe("’");
    expect(normalizeInsertedText("'", " (")).toBe("‘");
  });
});
