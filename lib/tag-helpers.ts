import { extractTagsFromHtml } from "@/lib/body";

export function normalizeTagValue(raw: string): string {
  const trimmed = raw.trim().replace(/^#+/, "");
  return trimmed ? `#${trimmed.toLocaleLowerCase()}` : "";
}

export function summarizeTags(htmlEntries: string[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();

  for (const html of htmlEntries) {
    const uniqueTags = new Set(extractTagsFromHtml(html).map(normalizeTagValue).filter(Boolean));
    for (const tag of uniqueTags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => left.tag.localeCompare(right.tag));
}
