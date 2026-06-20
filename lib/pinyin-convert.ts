import { pinyin } from "pinyin-pro";

export function convertChineseSelectionToPinyin(text: string): string {
  return text.replace(/\p{Script=Han}+/gu, (chunk) => pinyin(chunk));
}
