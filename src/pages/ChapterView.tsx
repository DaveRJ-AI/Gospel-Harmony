import React from "react";
import BookChapterPicker from "../components/BookChapterPicker";
import ColumnGrid, { type ColumnBlock } from "../components/ColumnGrid";
import { getChapter, getPassage, type PassageRef } from "../lib/bible";
import { loadHarmony, pericopesForChapter, passageForBook } from "../lib/harmony";
import { otherGospels, type Gospel, type Version } from "../lib/refs";

type ChapterVerse = { book: Gospel; chapter: number; verse: number; text: string };

function pos(ch: number, v: number) {
  return ch * 1000 + v;
}

function overlapWithinChapter(ref: PassageRef, chapter: number) {
  if (chapter < ref.startChapter || chapter > ref.endChapter) return null;

  const startVerse = ref.startChapter === chapter ? ref.startVerse : 1;
  const endVerse = ref.endChapter === chapter ? ref.endVerse : 999;

  return {
    ...ref,
    startChapter: chapter,
    endChapter: chapter,
    startVerse,
    endVerse,
  };
}

export default function ChapterView() {
  const [version, setVersion] = React.useState<Version>("KJV");
  const [book, setBook] = React.useState<Gospel>("Matthew");
  const [chapter, setChapter] = React.useState<number>(1);

  const [enableSync, setEnableSync] = React.useState(true);
  const [showDifferences, setShowDifferences] = React.useState(false);

  const [activeBlockId, setActiveBlockId] = React.useState<string | null>(null);

  // Increment this to tell ColumnGrid to scroll the primary column to the top
  const [scrollPrimaryToTopSignal, setScrollPrimaryToTopSignal] = React.useState(0);

  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const [primaryBlocks, setPrimaryBlocks] = React.useState<ColumnBlock[]>([]);
  const [otherBlocks, setOtherBlocks] = React.useState<Record<Gospel, ColumnBlock[]>>({
    Matthew: [],
    Mark: [],
    Luke: [],
    John: [],
  });

  // When selection changes, scroll primary column to top
  React.useEffect(() => {
    setScrollPrimaryToTopSignal((n) => n + 1);
  }, [book, chapter, version]);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setError(null);
      setLoading(true);

      try {
        const harmony = await loadHarmony();

        // Full chapter text (always displayed in primary)
        const chapterVerses = (await getChapter(version, book, chapter)) as ChapterVerse[];

        // Pericopes that touch this chapter in the primary gospel
        const pericopes = pericopesForChapter(harmony, book, chapter);

        // Build PRIMARY blocks in reading order:
        // - gaps (unmapped verses) become blocks too (no title)
        // - pericope ranges become titled blocks
        const ranges: Array<{
          blockId: string;
          title?: string;
          start: number;
          end: number;
        }> = [];

        for (const p of pericopes) {
          const ref = passageForBook(harmony, p.pericopeId, book);
          if (!ref) continue;

          const clipped = overlapWithinChapter(ref, chapter);
          if (!clipped) continue;

          ranges.push({
            blockId: p.pericopeId,
            title: p.title,
            start: pos(chapter, clipped.startVerse),
            end: pos(chapter, clipped.endVerse),
          });
        }

        ranges.sort((a, b) => a.start - b.start || a.end - b.end);

        const takeVerses = (startPos: number, endPos: number) => {
          return chapterVerses.filter((v) => {
            const p = pos(v.chapter, v.verse);
            return p >= startPos && p <= endPos;
          });
        };

        const primary: ColumnBlock[] = [];
        let cursor = pos(chapter, 1);

        for (const r of ranges) {
          // Gap before story
          if (cursor < r.start) {
            const gapVerses = takeVerses(cursor, r.start - 1);
            if (gapVerses.length > 0) {
              primary.push({
                blockId: `gap-${chapter}-${cursor}`,
                verses: gapVerses,
              });
            }
          }

          // Story block (titled)
          const storyVerses = takeVerses(r.start, r.end);
          if (storyVerses.length > 0) {
            primary.push({
              blockId: r.blockId,
              title: r.title,
              verses: storyVerses,
            });
          }

          cursor = Math.max(cursor, r.end + 1);
        }

        // Trailing gap to end of chapter
        const lastVerseNum = chapterVerses.length ? chapterVerses[chapterVerses.length - 1].verse : 0;
        const endPos = pos(chapter, lastVerseNum || 999);

        if (cursor <= endPos) {
          const tailVerses = takeVerses(cursor, endPos);
          if (tailVerses.length > 0) {
            primary.push({
              blockId: `gap-${chapter}-${cursor}`,
              verses: tailVerses,
            });
          }
        }

        // Build OTHER columns: pericope-aligned blocks only (same pericopeId blockId)
        const others = otherGospels(book);
        const otherMap: Record<Gospel, ColumnBlock[]> = { Matthew: [], Mark: [], Luke: [], John: [] };

        for (const og of others) {
          const blocks: ColumnBlock[] = [];
          for (const pericope of pericopes) {
            const ref = passageForBook(harmony, pericope.pericopeId, og);

            if (!ref) {
              blocks.push({
                blockId: pericope.pericopeId,
                title: pericope.title,
                verses: [],
                emptyLabel: "— (no parallel)",
              });
            } else {
              const verses = await getPassage(version, ref);
              blocks.push({
                blockId: pericope.pericopeId,
                title: pericope.title,
                verses,
              });
            }
          }
          otherMap[og] = blocks;
        }

        if (!alive) return;

        setPrimaryBlocks(primary);
        setOtherBlocks(otherMap);

        // Initialize active story block to the first titled story
        const firstStory = primary.find((b) => !!b.title);
        setActiveBlockId(firstStory?.blockId ?? null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Error loading data");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [version, book, chapter]);

  const others = otherGospels(book);

  return (
    <div>
      <BookChapterPicker
        version={version}
        setVersion={setVersion}
        book={book}
        setBook={setBook}
        chapter={chapter}
        setChapter={setChapter}
      />

      <div className="card" style={{ marginTop: 10 }}>
        <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
          <div className="muted">
            Sync keeps the same story aligned across columns. Differences highlights words unique to each Gospel’s telling.
          </div>

          <div className="row" style={{ alignItems: "center" }}>
            <div>
              <label style={{ margin: 0 }}>Sync</label>
              <select value={enableSync ? "on" : "off"} onChange={(e) => setEnableSync(e.target.value === "on")}>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>

            <div>
              <label style={{ margin: 0 }}>Differences</label>
              <select
                value={showDifferences ? "on" : "off"}
                onChange={(e) => setShowDifferences(e.target.value === "on")}
              >
                <option value="off">Off</option>
                <option value="on">On</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <p className="error" style={{ marginTop: 10 }}>
          {error}
        </p>
      ) : null}
      {loading ? <p className="muted">Loading…</p> : null}

      <ColumnGrid
        version={version}
        enableSync={enableSync}
        activeBlockId={activeBlockId}
        onPrimaryActiveBlockChange={setActiveBlockId}
        showDifferences={showDifferences}
        scrollPrimaryToTopSignal={scrollPrimaryToTopSignal}
        primary={{
          colKey: `${book}-primary`,
          header: `${book} ${chapter} (${version})`,
          blocks: primaryBlocks,
        }}
        others={others.map((og) => ({
          book: og,
          colKey: og,
          header: `${og} parallels`,
          blocks: otherBlocks[og] || [],
        }))}
      />
    </div>
  );
}