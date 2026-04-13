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

function getEsvEndpoint() {
  return "/.netlify/functions/esvPassage";
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
  const endpoint = `${getEsvEndpoint()}?q=${encodeURIComponent(q)}`;
  const res = await fetch(endpoint);
  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const detail = contentType.includes("application/json")
      ? JSON.stringify(await res.json())
      : await res.text();
    throw new Error(`ESV request failed (${res.status}): ${detail.slice(0, 240)}`);
  }

  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      `ESV endpoint did not return JSON. Received: ${text.slice(0, 120)}`
    );
  }

  const data = (await res.json()) as { text?: string; error?: string; detail?: string };

  if (data.error) {
    throw new Error(data.detail ? `${data.error}: ${data.detail}` : data.error);
  }

  // ESV API returns text; we keep it as “verse-like” blocks for v1.
  const text = data.text?.trim() || "";
  if (!text) return [];

  return parseEsvVerses(ref, text);
}

function parseEsvVerses(ref: PassageRef, text: string): Verse[] {
  const cleaned = text
    .replace(/\s*\(ESV\)\s*$/i, "")
    .replace(/\r/g, "")
    .trim();

  const matches = Array.from(cleaned.matchAll(/\[(\d+)\]\s*/g));
  if (matches.length === 0) {
    return [
      {
        book: ref.book,
        chapter: ref.startChapter,
        verse: ref.startVerse,
        text: cleaned,
      },
    ];
  }

  const verses: Verse[] = [];

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const verseNumber = Number(current[1]);
    const start = current.index! + current[0].length;
    const end = next ? next.index! : cleaned.length;
    const verseText = cleaned.slice(start, end).replace(/\s+/g, " ").trim();

    if (!verseText) continue;

    verses.push({
      book: ref.book,
      chapter: ref.startChapter,
      verse: verseNumber,
      text: verseText,
    });
  }

  return verses.length > 0
    ? verses
    : [
        {
          book: ref.book,
          chapter: ref.startChapter,
          verse: ref.startVerse,
          text: cleaned,
        },
      ];
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
