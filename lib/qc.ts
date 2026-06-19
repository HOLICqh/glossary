import { containsHan, hasToneMarks, normalizeSearchText } from "@/lib/pinyin";
import { extractInternalLinks, richTextToPlainText } from "@/lib/rich-text";
import type { GlossaryEntry, QualityIssue } from "@/lib/types";

export function qualityChecks(entries: GlossaryEntry[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const normalizedSeen = new Map<string, GlossaryEntry>();

  for (const entry of entries) {
    if (!hasToneMarks(entry.headword_pinyin)) {
      issues.push({
        entryId: entry.id,
        severity: "warning",
        code: "missing-tones",
        message: "Headword pinyin appears to be missing tone marks."
      });
    }

    const bodyText = richTextToPlainText(entry.body_rich_text);
    if (containsHan(bodyText)) {
      issues.push({
        entryId: entry.id,
        severity: "warning",
        code: "body-han",
        message: "Body text contains Chinese characters; confirm that they are intentional."
      });
    }

    for (const targetId of extractInternalLinks(entry.body_rich_text)) {
      const target = byId.get(targetId);
      if (!target) {
        issues.push({
          entryId: entry.id,
          severity: "error",
          code: "missing-link-target",
          message: "An internal link points to a missing entry."
        });
      } else if (entry.status === "final" && target.status === "placeholder") {
        issues.push({
          entryId: entry.id,
          severity: "warning",
          code: "placeholder-referenced-by-final",
          message: "A final entry links to a placeholder target."
        });
      }
    }

    const normalizedHeadword = normalizeSearchText(entry.headword_pinyin);
    const existing = normalizedSeen.get(normalizedHeadword);
    if (existing && existing.id !== entry.id) {
      issues.push({
        entryId: entry.id,
        severity: "warning",
        code: "duplicate-headword",
        message: `Possible duplicate with ${existing.headword_pinyin}.`
      });
    } else {
      normalizedSeen.set(normalizedHeadword, entry);
    }

    if (!/relevance|important|significant|notable|discussed/i.test(bodyText)) {
      issues.push({
        entryId: entry.id,
        severity: "warning",
        code: "missing-relevance-sentence",
        message: "No obvious relevance sentence found in the body."
      });
    }
  }

  return issues;
}
