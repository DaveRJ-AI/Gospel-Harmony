import type { Gospel, Version } from "./refs";

export type Verse = {
  book: Gospel;
  chapter: number;
  verse: number;
  text: string;
};

export type PassageRef = {
  book: Gospel;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
};

function rangeLabel(r: PassageRef) {
  const a = `${r.book} ${r.startChapter}:${r.startVerse}`;
  const b = `${r.endChapter}:${r.endVerse}`;
  return r.startChapter === r.endChapter ? `${a}-${r.endVerse}` : `${a}-${r.book} ${b}`;
}

export async function getChapterKJV(book: Gospel, chapter: number): Promise<Verse[]> {
  // generated file path: /public/data/kjv/Matthew/1.json etc
  const res = await fetch(`/data/kjv/${encodeURIComponent(book)}/${chapter}.json`);
  if (!res.ok) return [];
  return (await res.json()) as Verse[];
}

export async function getPassageKJV(ref: PassageRef): Promise<Verse[]> {
  // Simple approach: load chapters needed and filter verses.
  // Good enough for v1; still fast because it’s only 1–2 chapters most of the time.
  const chapters: number[] = [];
  for (let c = ref.startChapter; c <= ref.endChapter; c++) chapters.push(c);

  const all = (await Promise.all(chapters.map((c) => getChapterKJV(ref.book, c)))).flat();

  return all.filter((v) => {
    if (v.chapter < ref.startChapter || v.chapter > ref.endChapter) return false;
    if (v.chapter === ref.startChapter && v.verse < ref.startVerse) return false;
    if (v.chapter === ref.endChapter && v.verse > ref.endVerse) return false;
    return true;
  });
}

export async function getPassageESV(ref: PassageRef): Promise<Verse[]> {
  const q = rangeLabel(ref);
  const res = await fetch(`/api/esvPassage?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { text: string };

  // ESV API returns text; we keep it as “verse-like” blocks for v1.
  // Advanced versioning could parse verse numbers if you configure ESV API options.
  const text = data.text?.trim() || "";
  if (!text) return [];
  return [{ book: ref.book, chapter: ref.startChapter, verse: ref.startVerse, text }];
}

export async function getChapter(version: Version, book: Gospel, chapter: number) {
  if (version === "KJV") return getChapterKJV(book, chapter);
  // For ESV chapter, we fetch whole chapter as a passage (ESV API handles it)
  return getPassageESV({ book, startChapter: chapter, startVerse: 1, endChapter: chapter, endVerse: 999 });
}

export async function getPassage(version: Version, ref: PassageRef) {
  if (version === "KJV") return getPassageKJV(ref);
  return getPassageESV(ref);
}