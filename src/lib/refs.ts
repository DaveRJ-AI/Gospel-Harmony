export const GOSPELS = ["Matthew", "Mark", "Luke", "John"] as const;
export type Gospel = (typeof GOSPELS)[number];

export type Version = "KJV" | "ESV";

export function otherGospels(primary: Gospel): Gospel[] {
  return GOSPELS.filter((g) => g !== primary);
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function chapterKey(book: string, chapter: number) {
  return `${book}/${chapter}`;
}