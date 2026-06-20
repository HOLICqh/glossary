import { containsPlaceholderTag, renderViewBodyHtml, stripHashtagsFromHtml, stripLinksFromHtml } from "@/lib/body";

describe("stripHashtagsFromHtml", () => {
  it("hides hashtags in rendered view output", () => {
    const html = "<p>Mòzǐ is discussed here. #draft #school-notes</p>";
    expect(stripHashtagsFromHtml(html)).toContain("Mòzǐ is discussed here.");
    expect(stripHashtagsFromHtml(html)).not.toContain("#draft");
  });

  it("removes nested links for preview cards while keeping the text", () => {
    const html = '<p>See <a href="/entries/mozi"><em>Mòzǐ</em></a> here.</p>';
    expect(stripLinksFromHtml(html)).toBe("<p>See <em>Mòzǐ</em> here.</p>");
  });

  it("treats #placeholder as a body-level visibility flag", () => {
    expect(containsPlaceholderTag("<p>#placeholder</p>")).toBe(true);
    expect(renderViewBodyHtml("<p>Visible text #placeholder</p>")).toBe("");
  });
});
