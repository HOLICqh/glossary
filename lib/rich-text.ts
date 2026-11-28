import { JSDOM } from "jsdom";
import { splitEditorialNote } from "@/lib/body";

import type { GlossaryEntry, GlossaryLinkTarget } from "@/lib/types";

export function richTextToPlainText(html: string): string {
  const dom = new JSDOM(`<body>${html}</body>`);
  return dom.window.document.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

export function extractInternalLinks(html: string): string[] {
  const dom = new JSDOM(`<body>${html}</body>`);
  return Array.from(dom.window.document.querySelectorAll("[data-entry-id]"))
    .map((node) => node.getAttribute("data-entry-id") ?? "")
    .filter(Boolean);
}

export function findLinkingEntries(entries: GlossaryEntry[], targetIds: string[]): GlossaryEntry[] {
  const targets = new Set(targetIds);
  return entries.filter(({ body_rich_text }) => {
    const { body: html } = splitEditorialNote(body_rich_text);
    if (!html.includes("/entries/") && !html.includes("data-entry-id")) return false;

    const { window } = new JSDOM(`<body>${html}</body>`);
    const matches = Array.from(window.document.querySelectorAll("a")).some((link) => {
      const href = link.getAttribute("href") ?? "";
      const target = href.match(/^\/entries\/([^/?#]+)(?:[?#].*)?$/)?.[1];
      return targets.has(target ?? link.getAttribute("data-entry-id") ?? "");
    });
    window.close();
    return matches;
  });
}

export function markSelectionWithLink(
  html: string,
  selectedText: string,
  target: GlossaryLinkTarget
): string {
  const needle = selectedText.trim();
  if (!needle) {
    return html;
  }

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const replacement =
    `<a href="/entries/${target.id}" data-entry-id="${target.id}" ` +
    `data-entry-status="${target.status}" class="glossary-link">${needle}</a>`;

  return html.replace(new RegExp(escaped), replacement);
}

export function createPlaceholderFromText(
  selectedText: string,
  userId: string
): GlossaryEntry {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    headword_pinyin: selectedText.trim(),
    headword_characters: "",
    heading_rich_text: selectedText.trim(),
    sort_key: selectedText.trim().toLowerCase(),
    english_gloss_or_translation: "Placeholder entry",
    entry_type: "placeholder",
    body_rich_text: "<p>#placeholder</p>",
    plain_text_search_cache: selectedText.trim().toLowerCase(),
    status: "placeholder",
    tags: [],
    related_entries: [],
    created_at: now,
    updated_at: now,
    created_by: userId,
    updated_by: userId
  };
}
