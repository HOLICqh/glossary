import type { GlossaryEntry } from "@/lib/types";

const tagPattern = /#[\p{L}\p{N}_-]+/gu;

export function omitEditorialNote(entry: GlossaryEntry): GlossaryEntry {
  return {
    ...entry,
    body_rich_text: splitEditorialNote(entry.body_rich_text).body,
    plain_text_search_cache: ""
  };
}

export function splitEditorialNote(html: string): { body: string; note: string } {
  const open: { name: string; markup: string }[] = [];
  const tokens = /<!--[^]*?-->|<(?:[^<>"']|"[^"]*"|'[^']*')+>|(?:%|&#0*37;|&#x0*25;|&percnt;){2}/gi;
  for (const token of html.matchAll(tokens)) {
    const markup = token[0];
    if (!markup.startsWith("<")) {
      return {
        body: html.slice(0, token.index) + open.slice().reverse().map(({ name }) => "</" + name + ">").join(""),
        note: open.map((tag) => tag.markup).join("") + html.slice(token.index)
      };
    }
    const tag = markup.match(/^<(\/?)([a-z][\w-]*)\b/i);
    if (!tag) continue;
    const name = tag[2].toLowerCase();
    if (tag[1]) {
      const index = open.map((item) => item.name).lastIndexOf(name);
      if (index >= 0) open.length = index;
    } else if (!/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name)) {
      open.push({ name, markup });
    }
  }
  return { body: html, note: "" };
}

export function extractTagsFromHtml(html: string): string[] {
  return Array.from(splitEditorialNote(html).body.matchAll(tagPattern), (match) => match[0].toLocaleLowerCase());
}

export function stripHashtagsFromHtml(html: string): string {
  return html
    .replace(tagPattern, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?)}\]》〉」』，。：；？！])/gu, "$1")
    .replace(/>[\t\r\n]+</g, "><");
}

export function stripLinksFromHtml(html: string): string {
  return html.replace(/<a\b[^>]*>/gi, "").replace(/<\/a>/gi, "");
}

export function containsPlaceholderTag(html: string): boolean {
  return /#placeholder(?=\s|<|$|[,.!?:;)}\]》〉」』，。：；？！])/iu.test(splitEditorialNote(html).body);
}

export function renderViewBodyHtml(html: string): string {
  return containsPlaceholderTag(html) ? "" : stripHashtagsFromHtml(splitEditorialNote(html).body);
}
