import React from "react";
import ColumnGrid, { type ColumnBlock } from "../components/ColumnGrid";
import ArtworkModal from "../components/ArtworkModal";
import { getChapter, getPassage, type PassageRef } from "../lib/bible";
import { artworkForPericope, loadArtworkMap, type ArtworkItem, type ArtworkMap } from "../lib/artwork";
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
    if (ref.startVerse === ref.endVerse) return `${ref.book} ${ref.startChapter}:${ref.startVerse}`;
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
        padding: "8px 14px",
        borderRadius: 999,
        border: active ? "1px solid #64748B" : "1px solid #CBD5E1",
        background: active ? "#EEF4FF" : "#FFFFFF",
        fontWeight: active ? 800 : 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function InfoTooltip({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 6 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`${label}: ${description}`}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "1px solid #CBD5E1",
          background: "#FFFFFF",
          color: "#64748B",
          fontSize: 12,
          fontWeight: 700,
          cursor: "help",
          padding: 0,
          lineHeight: 1,
        }}
      >
        i
      </button>

      {open ? (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 240,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #DBE3EF",
            background: "#FFFFFF",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.14)",
            color: "#475569",
            fontSize: 13,
            fontWeight: 500,
            zIndex: 20,
          }}
        >
          {description}
        </div>
      ) : null}
    </span>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        width: 52,
        height: 30,
        borderRadius: 999,
        border: "1px solid " + (checked ? "#93C5FD" : "#D1D5DB"),
        background: checked ? "#60A5FA" : "#E5E7EB",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
        transition: "all 160ms ease",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 24 : 2,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#FFFFFF",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left 160ms ease",
        }}
      />
    </button>
  );
}

function ArtPill({
  onClick,
  count,
}: {
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={count > 1 ? `Open ${count} artwork images` : "Open artwork"}
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid #CBD5E1",
        background: "#FFFFFF",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      Art
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

  const [artworkMap, setArtworkMap] = React.useState<ArtworkMap>({});
  const [modalItems, setModalItems] = React.useState<ArtworkItem[]>([]);
  const [modalIndex, setModalIndex] = React.useState<number | null>(null);

  const [primaryBlocks, setPrimaryBlocks] = React.useState<ColumnBlock[]>([]);
  const [otherBlocks, setOtherBlocks] = React.useState<Record<Gospel, ColumnBlock[]>>({
    Matthew: [],
    Mark: [],
    Luke: [],
    John: [],
  });

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const map = await loadArtworkMap();
        if (!alive) return;
        setArtworkMap(map);
      } catch {
        if (!alive) return;
        setArtworkMap({});
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    const maxChapter = CHAPTER_COUNTS[book];
    if (chapter > maxChapter) setChapter(maxChapter);
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

        const ranges: Array<{ blockId: string; title?: string; start: number; end: number }> = [];

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

        const takeVerses = (startPos: number, endPos: number) =>
          chapterVerses.filter((v) => {
            const p = pos(v.chapter, v.verse);
            return p >= startPos && p <= endPos;
          });

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
            const artItems = artworkForPericope(artworkMap, r.blockId);

            primary.push({
              blockId: r.blockId,
              title: r.title,
              verses: storyVerses,
              titleAction:
                artItems.length > 0 ? (
                  <ArtPill
                    count={artItems.length}
                    onClick={() => {
                      setModalItems(artItems);
                      setModalIndex(0);
                    }}
                  />
                ) : undefined,
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
  }, [version, book, chapter, artworkMap]);

  const others = otherGospels(book);
  const chapterButtons = Array.from({ length: CHAPTER_COUNTS[book] }, (_, i) => i + 1);

  return (
    <div>
      <div className="card">
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              alignItems: "flex-end",
            }}
          >
            <div style={{ minWidth: 140 }}>
              <label>Version</label>
              <select value={version} onChange={(e) => setVersion(e.target.value as Version)}>
                <option value="KJV">KJV</option>
                <option value="ESV">ESV</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 280 }}>
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

            <div style={{ minWidth: 110 }}>
              <label>
                Sync
                <InfoTooltip
                  label="Sync"
                  description="Keeps the same story aligned across the parallel columns as you move through the primary column."
                />
              </label>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <Switch checked={enableSync} onChange={setEnableSync} label="Sync" />
                <span style={{ fontSize: 14, color: "#64748B", fontWeight: 700 }}>
                  {enableSync ? "On" : "Off"}
                </span>
              </div>
            </div>

            <div style={{ minWidth: 130 }}>
              <label>
                Differences
                <InfoTooltip
                  label="Differences"
                  description="Highlights words in an active parallel passage that do not appear in the active primary passage."
                />
              </label>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <Switch checked={showDifferences} onChange={setShowDifferences} label="Differences" />
                <span style={{ fontSize: 14, color: "#64748B", fontWeight: 700 }}>
                  {showDifferences ? "On" : "Off"}
                </span>
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

      {error ? <p className="error" style={{ marginTop: 10 }}>{error}</p> : null}
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
          header: `Primary: ${book} ${chapter}`,
          blocks: primaryBlocks,
        }}
        others={others.map((og) => ({
          book: og,
          colKey: og,
          header: `${og} parallels`,
          blocks: otherBlocks[og] || [],
        }))}
      />

      {modalIndex !== null ? (
        <ArtworkModal
          items={modalItems}
          initialIndex={modalIndex}
          onClose={() => {
            setModalIndex(null);
            setModalItems([]);
          }}
        />
      ) : null}
    </div>
  );
}