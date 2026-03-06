import type { Gospel } from "./refs";

export type Pericope = {
  pericopeId: string;
  title: string;
  summary: string;
  tags?: string[];
  sortOrder?: number;
};

export type PericopePassage = {
  pericopeId: string;
  book: Gospel;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
};

export type HarmonyData = {
  pericopes: Pericope[];
  passages: PericopePassage[];
};

let cache: HarmonyData | null = null;

export async function loadHarmony(): Promise<HarmonyData> {
  if (cache) return cache;
  const res = await fetch("/data/harmony.json");
  if (!res.ok) throw new Error("Missing /public/data/harmony.json");
  cache = (await res.json()) as HarmonyData;
  return cache;
}

export function pericopesForChapter(h: HarmonyData, book: Gospel, chapter: number): Pericope[] {
  const touched = new Set<string>();
  for (const p of h.passages) {
    if (p.book !== book) continue;
    if (chapter < p.startChapter || chapter > p.endChapter) continue;
    touched.add(p.pericopeId);
  }
  const list = h.pericopes.filter((x) => touched.has(x.pericopeId));
  return list.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.title.localeCompare(b.title));
}

export function passagesForPericope(h: HarmonyData, pericopeId: string) {
  return h.passages.filter((p) => p.pericopeId === pericopeId);
}

export function passageForBook(h: HarmonyData, pericopeId: string, book: Gospel) {
  return h.passages.find((p) => p.pericopeId === pericopeId && p.book === book) || null;
}