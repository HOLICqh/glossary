import { expect, it } from "vitest";

import { findLinkingEntries } from "@/lib/rich-text";
import { sampleEntries } from "@/lib/sample-data";

it("finds entries linking to either target once and ignores plain text and partial matches", () => {
  const bodies = [
    '<p><a href="/entries/one">One</a> and <a href="/entries/two">Two</a></p>',
    '<p><a href="/entries/two">Another link</a></p>',
    '<p><a href="/entries/one-more">Different entry</a></p>',
    '<p>See /entries/one in the link.</p>'
  ];
  const entries = bodies.map((body_rich_text, index) => ({
    ...sampleEntries[index],
    body_rich_text
  }));

  expect(findLinkingEntries(entries, ["one", "two"])).toEqual(entries.slice(0, 2));
});
