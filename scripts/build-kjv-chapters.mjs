import fs from "node:fs";
import path from "node:path";

const inFile = path.resolve("source/kjv.json");
const outDir = path.resolve("public/data/kjv");

if (!fs.existsSync(inFile)) {
  console.error("Missing source/kjv.json");
  process.exit(1);
}

function safeBookDir(book) {
  return String(book).replace(/[^\w-]/g, "");
}

function isVerseArray(data) {
  return Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === "object" && "book" in data[0] && "chapter" in data[0] && "verse" in data[0];
}

function isBookChapterArray(data) {
  // Typical structure: [{ abbrev, name, chapters: [ [v1,v2...], [v1,v2...] ] }]
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    data[0] &&
    typeof data[0] === "object" &&
    ("chapters" in data[0]) &&
    Array.isArray(data[0].chapters)
  );
}

function normalizeToVerseObjects(raw) {
  // Case 1: already verse objects
  if (isVerseArray(raw)) {
    return raw.map((v) => ({
      book: String(v.book),
      chapter: Number(v.chapter),
      verse: Number(v.verse),
      text: String(v.text ?? v.verseText ?? v.t ?? ""),
    }));
  }

  // Case 2: books -> chapters -> verse strings
  if (isBookChapterArray(raw)) {
    const verses = [];
    for (const bookObj of raw) {
      const bookName = String(bookObj.name ?? bookObj.book ?? bookObj.title ?? "");
      if (!bookName) continue;

      const chapters = bookObj.chapters;
      for (let c = 0; c < chapters.length; c++) {
        const chapterArr = chapters[c];
        if (!Array.isArray(chapterArr)) continue;

        for (let i = 0; i < chapterArr.length; i++) {
          const verseText = chapterArr[i];
          // verses are strings in this format
          verses.push({
            book: bookName,
            chapter: c + 1,
            verse: i + 1,
            text: String(verseText),
          });
        }
      }
    }
    return verses;
  }

  throw new Error(
    "Unrecognized KJV JSON format. Expected either: (1) array of {book,chapter,verse,text} or (2) array of books with {name, chapters:[[...]]}."
  );
}

// Read + parse
let rawText = fs.readFileSync(inFile, "utf8");

// Sometimes files include a BOM (weird invisible char). Remove it.
rawText = rawText.replace(/^\uFEFF/, "");

let raw;
try {
  raw = JSON.parse(rawText);
} catch (e) {
  console.error("Could not parse JSON. First 200 chars of file:");
  console.error(rawText.slice(0, 200));
  throw e;
}

const verseObjects = normalizeToVerseObjects(raw);

fs.mkdirSync(outDir, { recursive: true });

const grouped = new Map(); // key book|||chapter -> verses[]
for (const v of verseObjects) {
  const book = v.book;
  const chapter = Number(v.chapter);
  const key = `${book}|||${chapter}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push({
    book,
    chapter,
    verse: Number(v.verse),
    text: String(v.text),
  });
}

for (const [key, verses] of grouped.entries()) {
  verses.sort((a, b) => a.verse - b.verse);
  const [book, chapterStr] = key.split("|||");
  const bookDir = path.join(outDir, safeBookDir(book));
  fs.mkdirSync(bookDir, { recursive: true });
  fs.writeFileSync(path.join(bookDir, `${chapterStr}.json`), JSON.stringify(verses));
}

console.log(`Wrote ${grouped.size} chapter files into ${outDir}`);