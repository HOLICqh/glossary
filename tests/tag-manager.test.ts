import { extractTagsFromHtml } from "@/lib/body";
import { normalizeTagValue } from "@/lib/tag-helpers";
import { normalizeEntryBodyTags } from "@/lib/tag-manager";

describe("tag manager", () => {
  it("moves scattered tags into one deduplicated cluster at the end", () => {
    const html = "<p>Alpha #draft text.</p><p><em>#draft</em> Beta #review</p>";
    const normalized = normalizeEntryBodyTags(html);

    expect(normalized.tags).toEqual(["#draft", "#review"]);
    expect(normalized.html).toContain("<p>#draft #review</p>");
    expect(normalized.html).not.toContain("<em>#draft</em>");
  });

  it("adds and removes tags without duplicates", () => {
    const added = normalizeEntryBodyTags("<p>Alpha.</p><p>#draft</p>", { addTag: "#draft" });
    expect(added.tags).toEqual(["#draft"]);

    const removed = normalizeEntryBodyTags(added.html, { removeTag: "#draft" });
    expect(removed.tags).toEqual([]);
    expect(extractTagsFromHtml(removed.html)).toEqual([]);
  });

  it("normalizes and removes tags that were attached directly to text", () => {
    const normalized = normalizeEntryBodyTags("<p>Alpha#draft beta.</p>");
    expect(normalized.tags).toEqual(["#draft"]);
    expect(normalized.html).toContain("<p>Alpha beta.</p>");
    expect(normalized.html).toContain("<p>#draft</p>");
  });

  it("normalizes tag input to a lowercase hashtag", () => {
    expect(normalizeTagValue("  Mohism  ")).toBe("#mohism");
  });
});
