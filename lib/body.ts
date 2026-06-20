export function stripHashtagsFromHtml(html: string): string {
  return html
    .replace(/(^|>|\s)#[\p{L}\p{N}_-]+/gu, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/>\s+</g, "><");
}

export function stripLinksFromHtml(html: string): string {
  return html.replace(/<a\b[^>]*>/gi, "").replace(/<\/a>/gi, "");
}

export function containsPlaceholderTag(html: string): boolean {
  return /(^|>|\s)#placeholder(?=\s|<|$)/iu.test(html);
}

export function renderViewBodyHtml(html: string): string {
  return containsPlaceholderTag(html) ? "" : stripHashtagsFromHtml(html);
}
