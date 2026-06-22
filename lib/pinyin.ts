const combiningMarks = /\p{M}/gu;

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(combiningMarks, "");
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizePinyinForSort(value: string): string {
  return normalizeWhitespace(stripDiacritics(value).toLowerCase());
}

export function normalizeSearchText(value: string): string {
  return normalizeWhitespace(stripDiacritics(value).toLowerCase());
}

export function normalizeCompactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/[^\p{L}\p{N}\p{Script=Han}#]+/gu, "");
}

export function hasToneMarks(value: string): boolean {
  const decomposed = value.normalize("NFD");
  return /\p{M}/u.test(decomposed);
}

export function containsHan(value: string): boolean {
  return /\p{Script=Han}/u.test(value);
}

export function tokens(value: string): string[] {
  return normalizeSearchText(value)
    .split(/[^a-z0-9\u4e00-\u9fff]+/i)
    .filter(Boolean);
}
