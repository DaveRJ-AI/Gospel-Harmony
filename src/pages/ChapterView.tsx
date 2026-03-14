import React from "react";
import ColumnGrid, { type ColumnBlock } from "../components/ColumnGrid";
import { getChapter, getPassage, type PassageRef } from "../lib/bible";
import { loadHarmony, pericopesForChapter, passageForBook } from "../lib/harmony";
import { GOSPELS, otherGospels, type Gospel, type Version } from "../lib/refs";

type ChapterVerse = { book: Gospel; chapter: number; verse: number; text: string };

const CHAPTER_COUNTS: Record<Gospel, number> = {
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
};

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

function formatPassageRef(ref: PassageRef) {
  if (ref.startChapter === ref.endChapter) {
    if (ref.startVerse === ref.endVerse) {
      return `${ref.book} ${ref.startChapter}:${ref.startVerse}`;
    }
    return `${ref.book} ${ref.startChapter}:${ref.startVerse}-${ref.endVerse}`;
  }

  return `${ref.book} ${ref.startChapter}:${ref.startVerse}-${ref.endChapter}:${ref.endVerse}`;
}

function SelectionPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: active ? "1px solid #6b7280" : "1px solid #d1d5db",
        background: active ? "#eef2ff" : "#fff",
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function ChapterView() {
  const [version, setVersion] = React.useState<Version>("KJV");
  const [book, setBook] = React.useState<Gospel>("Matthew");
  const [chapter, setChapter] = React.useState<number>(1);

  const [enableSync, setEnableSync] = React.useState(true);
  const [showDifferences, setShowDifferences] = React.useState(false);

  const [activeBlockId, setActiveBlockId] = React.useState<string | null>(null);
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

  React.useEffect(() => {
    const maxChapter = CHAPTER_COUNTS[book];
    if (chapter > maxChapter) {
      setChapter(maxChapter);
    }
  }, [book, chapter]);

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
        const chapterVerses = (await getChapter(version, book, chapter)) as ChapterVerse[];
        const pericopes = pericopesForChapter(harmony, book, chapter);

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
            title: `${p.title} — ${formatPassageRef(clipped)}`,
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
          if (cursor < r.start) {
            const gapVerses = takeVerses(cursor, r.start - 1);
            if (gapVerses.length > 0) {
              primary.push({
                blockId: `gap-${chapter}-${cursor}`,
                verses: gapVerses,
              });
            }
          }

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

        const others = otherGospels(book);
        const otherMap: Record<Gospel, ColumnBlock[]> = {
          Matthew: [],
          Mark: [],
          Luke: [],
          John: [],
        };

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
                title: `${pericope.title} — ${formatPassageRef(ref)}`,
                verses,
              });
            }
          }

          otherMap[og] = blocks;
        }

        if (!alive) return;

        setPrimaryBlocks(primary);
        setOtherBlocks(otherMap);

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
  const chapterButtons = Array.from({ length: CHAPTER_COUNTS[book] }, (_, i) => i + 1);

  return (
    <div>
      <div className="card">
        <div style={{ display: "grid", gap: 14 }}>
          <div className="row" style={{ alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
            <div>
              <label>Version</label>
              <select value={version} onChange={(e) => setVersion(e.target.value as Version)}>
                <option value="KJV">KJV</option>
                <option value="ESV">ESV</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label>Primary Gospel</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {GOSPELS.map((g) => (
                  <SelectionPill
                    key={g}
                    active={book === g}
                    onClick={() => {
                      setBook(g);
                      setChapter(1);
                    }}
                  >
                    {g}
                  </SelectionPill>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label>Select chapter</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {chapterButtons.map((ch) => (
                <SelectionPill key={ch} active={chapter === ch} onClick={() => setChapter(ch)}>
                  {ch}
                </SelectionPill>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div className="muted" style={{ flex: 1 }}>
            Sync keeps the same story aligned across columns. Differences highlights words unique to each Gospel’s telling.
          </div>

          <div className="row" style={{ alignItems: "center", gap: 12 }}>
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