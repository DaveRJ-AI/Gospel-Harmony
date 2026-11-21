import MiniSearch from "minisearch";
import type { ArtworkItem } from "./artwork";
import type { HarmonyData, Pericope } from "./harmony";
import type { Gospel } from "./refs";

const aliases: Record<string, string> = {
  "feeding-4000": "4000 loaves and fishes",
  "feeding-5000": "5000 loaves and fishes",
  "triumphal-entry": "Palm Sunday",
};

const gospelNames = new Map<string, Gospel>([
  ["matthew", "Matthew"], ["matt", "Matthew"], ["mt", "Matthew"],
  ["mark", "Mark"], ["mrk", "Mark"], ["mk", "Mark"],
  ["luke", "Luke"], ["luk", "Luke"], ["lk", "Luke"],
  ["john", "John"], ["jhn", "John"], ["jn", "John"],
]);

type SearchDocument = {
  id: string;
  pericope: Pericope;
  artwork?: ArtworkItem;
};

export type EventSearch = {
  find: (query: string) => string[];
};

function tokenize(text: string) {
  return text.normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\b\d{1,3}(?:[,\s]\d{3})+\b/g, (number) => number.replace(/[,\s]/g, ""))
    .replace(/['’]/g, "")
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

function processTerm(term: string) {
  return term.toLowerCase()
    .replace(/^bapti(?:sms?|[sz](?:e[ds]?|ing))$/, "baptism")
    .replace(/^fishes$/, "fish");
}

function versePosition(chapter: number, verse: number) {
  return chapter * 1000 + verse;
}

function parseGospelReference(query: string) {
  const match = /^([a-z]+)\.?\s*([1-9]\d{0,2})(?:\s*:\s*([1-9]\d{0,2}))?(?:\s*[-–—]\s*([1-9]\d{0,2})(?:\s*:\s*([1-9]\d{0,2}))?)?$/i.exec(query.trim());
  if (!match) return null;

  const [, name, firstChapter, firstVerse, lastNumber, lastVerse] = match;
  const book = gospelNames.get(name.toLowerCase());
  if (!book) return null;

  const endChapter = lastVerse || !firstVerse ? lastNumber ?? firstChapter : firstChapter;
  const endVerse = lastVerse ?? (firstVerse ? lastNumber ?? firstVerse : "999");
  return {
    book,
    start: versePosition(Number(firstChapter), Number(firstVerse ?? "1")),
    end: versePosition(Number(endChapter), Number(endVerse)),
  };
}

export function createEventSearch(harmony: HarmonyData, documents: SearchDocument[]): EventSearch {
  const index = new MiniSearch({
    fields: ["title", "aliases", "tags", "summary", "artwork"],
    tokenize,
    processTerm,
    searchOptions: {
      combineWith: "AND",
      boost: { title: 4, aliases: 3, tags: 1.5 },
      prefix: (term, position, terms) => position === terms.length - 1 && !/^\d/.test(term),
    },
  });
  index.addAll(documents.map(({ id, pericope, artwork }) => ({
    id,
    title: pericope.title,
    aliases: aliases[pericope.pericopeId] ?? "",
    tags: pericope.tags?.join(" ") ?? "",
    summary: pericope.summary,
    artwork: artwork ? [artwork.title, artwork.caption, artwork.artist, artwork.source].join(" ") : "",
  })));

  return {
    find(query) {
      const reference = parseGospelReference(query);
      if (reference) {
        if (reference.end < reference.start) return [];
        const events = new Set(harmony.passages
          .filter((passage) => passage.book === reference.book &&
            versePosition(passage.startChapter, passage.startVerse) <= reference.end &&
            versePosition(passage.endChapter, passage.endVerse) >= reference.start)
          .map((passage) => passage.pericopeId));
        return documents.filter(({ pericope }) => events.has(pericope.pericopeId)).map(({ id }) => id);
      }

      const matches = index.search(query);
      const results = matches.length ? matches : index.search(query, {
        fuzzy: (term) => /^\p{L}{5,}$/u.test(term) ? 1 : false,
      });
      return results.map(({ id }) => String(id));
    },
  };
}

const eventIndexes = new WeakMap<HarmonyData, EventSearch>();

export function getEventSearch(harmony: HarmonyData) {
  let search = eventIndexes.get(harmony);
  if (!search) {
    search = createEventSearch(harmony, harmony.pericopes.map((pericope) => ({
      id: pericope.pericopeId,
      pericope,
    })));
    eventIndexes.set(harmony, search);
  }
  return search;
}
