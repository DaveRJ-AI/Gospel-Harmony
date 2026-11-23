import React from "react";
import { Link } from "react-router-dom";
import ColumnGrid, { type ColumnBlock } from "../components/ColumnGrid";
import ArtworkModal from "../components/ArtworkModal";
import ReaderControls, { revealReadingControl } from "../components/ReaderControls";
import ReadingPlans from "../components/ReadingPlans";
import { useEsvAvailability } from "../hooks/useEsvAvailability";
import { getChapter, getPassage, type PassageRef } from "../lib/bible";
import { setEsvDisplayActive } from "../lib/esvDisplayState";
import { artworkForPericope, loadArtworkMap, type ArtworkItem, type ArtworkMap } from "../lib/artwork";
import { loadHarmony, passagesForPericope, pericopesForChapter } from "../lib/harmony";
import { readPreference, writePreference } from "../lib/preferences";
import { GOSPELS, otherGospels, type Gospel, type Version } from "../lib/refs";
import { overlapsReading, readingLabel, type ChapterReading } from "../lib/readingPlans";

type ChapterVerse = { book: Gospel; chapter: number; verse: number; text: string };

const INTRO_DISMISSED_KEY = "gospel-harmonics.hide-chapter-intro";

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
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const tooltipRef = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!open || !anchor || !tooltip) return;

    const fitTooltip = () => {
      const right = anchor.getBoundingClientRect().right;
      tooltip.style.right = `${Math.min(0, right - tooltip.offsetWidth - 12)}px`;
    };
    fitTooltip();
    window.addEventListener("resize", fitTooltip);
    return () => window.removeEventListener("resize", fitTooltip);
  }, [open]);

  return (
    <span
      ref={anchorRef}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 6 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`${label}: ${description}`}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
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
        <span
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "min(240px, calc(100vw - 24px))",
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
        </span>
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
  const { esvAvailable, esvStatusChecked } = useEsvAvailability();
  const [version, setVersion] = React.useState<Version>("KJV");
  const [book, setBook] = React.useState<Gospel>("Matthew");
  const [chapter, setChapter] = React.useState<number>(1);
  const [assignedReading, setAssignedReading] = React.useState<ChapterReading | null>(null);
  const [showIntroduction, setShowIntroduction] = React.useState(
    () => readPreference(INTRO_DISMISSED_KEY) !== "1",
  );
  const versionPickerRef = React.useRef<HTMLSelectElement>(null);
  const chapterReaderRef = React.useRef<HTMLDivElement>(null);
  const revealDemo = React.useRef(false);
  const readerRef = React.useRef<HTMLDivElement>(null);
  const revealAssignedReading = React.useRef(false);

  const [enableSync, setEnableSync] = React.useState(true);
  const [showDifferences, setShowDifferences] = React.useState(false);

  const [activeBlockId, setActiveBlockId] = React.useState<string | null>(null);
  const [scrollPrimaryToTopSignal, setScrollPrimaryToTopSignal] = React.useState(0);

  React.useEffect(() => {
    if (version === "ESV" && esvStatusChecked && !esvAvailable) {
      setVersion("KJV");
    }
  }, [version, esvAvailable, esvStatusChecked]);

  React.useEffect(() => {
    setEsvDisplayActive(version === "ESV");
    return () => setEsvDisplayActive(false);
  }, [version]);

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
  }, [book, chapter, version, assignedReading]);

  React.useEffect(() => {
    if (!assignedReading || !revealAssignedReading.current) return;
    revealAssignedReading.current = false;
    readerRef.current?.focus({ preventScroll: true });
    if (readerRef.current) revealReadingControl(readerRef.current);
  }, [assignedReading]);

  const openAssignedReading = React.useCallback((reading: ChapterReading | null, reveal = true) => {
    revealAssignedReading.current = Boolean(reading && reveal);
    setAssignedReading(reading && { ...reading });
    if (!reading) return;
    setLoading(true);
    setError(null);
    setBook(reading.book);
    setChapter(reading.chapter);
  }, []);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setError(null);
      setLoading(true);

      try {
        const harmony = await loadHarmony();
        const chapterVerses = (await getChapter(version, book, chapter)) as ChapterVerse[];
        const firstVerse = assignedReading?.startVerse ?? 1;
        const chapterEnd = chapterVerses[chapterVerses.length - 1]?.verse ?? 0;
        const lastVerse = Math.min(chapterEnd, assignedReading?.endVerse ?? chapterEnd);
        const chapterEvents = pericopesForChapter(harmony, book, chapter);
        const pericopes = assignedReading ? chapterEvents.filter((event) =>
          passagesForPericope(harmony, event.pericopeId, book).some((ref) => overlapsReading(ref, assignedReading)),
        ) : chapterEvents;

        const ranges: Array<{ blockId: string; sectionIndex: number; title: string; start: number; end: number }> = [];

        for (const p of pericopes) {
          const passages = passagesForPericope(harmony, p.pericopeId, book);
          for (const [sectionIndex, ref] of passages.entries()) {
            const clipped = overlapWithinChapter(ref, chapter);
            if (!clipped) continue;
            if (assignedReading) {
              clipped.startVerse = Math.max(clipped.startVerse, firstVerse);
              clipped.endVerse = Math.min(clipped.endVerse, lastVerse);
              if (clipped.startVerse > clipped.endVerse) continue;
            }

            ranges.push({
              blockId: p.pericopeId,
              sectionIndex,
              title: `${p.title} — ${formatPassageRef(clipped)}`,
              start: pos(chapter, clipped.startVerse),
              end: pos(chapter, clipped.endVerse),
            });
          }
        }

        ranges.sort((a, b) => a.start - b.start || a.end - b.end);

        const takeVerses = (startPos: number, endPos: number) =>
          chapterVerses.filter((v) => {
            const p = pos(v.chapter, v.verse);
            return p >= startPos && p <= endPos;
          });

        const primary: ColumnBlock[] = [];
        let cursor = pos(chapter, firstVerse);

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

          const storyVerses = takeVerses(assignedReading ? Math.max(cursor, r.start) : r.start, r.end);
          if (storyVerses.length > 0) {
            const artItems = artworkForPericope(artworkMap, r.blockId);

            primary.push({
              blockId: r.blockId,
              sectionIndex: r.sectionIndex,
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

        const endPos = pos(chapter, lastVerse);

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
            const passages = passagesForPericope(harmony, pericope.pericopeId, og);

            if (passages.length === 0) {
              blocks.push({
                blockId: pericope.pericopeId,
                title: pericope.title,
                verses: [],
                emptyLabel: "— (no parallel)",
              });
            }

            for (const [sectionIndex, ref] of passages.entries()) {
              const verses = await getPassage(version, ref);
              blocks.push({
                blockId: pericope.pericopeId,
                sectionIndex,
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
  }, [version, book, chapter, artworkMap, assignedReading]);

  const others = otherGospels(book);
  const chapterButtons = Array.from({ length: CHAPTER_COUNTS[book] }, (_, i) => i + 1);

  function focusChapterReader() {
    chapterReaderRef.current?.focus({ preventScroll: true });
    chapterReaderRef.current?.scrollIntoView({
      block: matchMedia("(min-width: 761px)").matches ? "nearest" : "start",
    });
  }

  React.useLayoutEffect(() => {
    if (!revealDemo.current) return;
    revealDemo.current = false;
    focusChapterReader();
  }, [book, chapter, assignedReading]);

  function dismissIntroduction() {
    writePreference(INTRO_DISMISSED_KEY, "1");
    setShowIntroduction(false);
    versionPickerRef.current?.focus({ preventScroll: true });
  }

  function tryDemo() {
    if (book === "Luke" && chapter === 22 && !assignedReading) {
      focusChapterReader();
      return;
    }
    revealDemo.current = true;
    setAssignedReading(null);
    setBook("Luke");
    setChapter(22);
  }

  return (
    <div className="readerPage">
      <ReaderControls>
        <div className="card">
          <div className="chapterPanel">
            <ReadingPlans
              version={version}
              assignedReading={assignedReading}
              onRead={openAssignedReading}
            >
              {(picker, activePlan) => (
                <>
                  {showIntroduction && !activePlan && (
                    <section className="chapterIntro" aria-labelledby="chapter-intro-title">
                      <div>
                        <h2 id="chapter-intro-title">Compare the Gospels side by side</h2>
                        <p>Choose a Gospel and chapter to see how the other Gospels tell the same events.</p>
                      </div>
                      <div className="chapterIntroActions">
                        <button type="button" className="chapterIntroAction chapterIntroDemo" onClick={tryDemo}>Try Luke 22</button>
                        <Link
                          className="chapterIntroAction chapterIntroEvents"
                          to="/stories"
                          onClick={(event) => {
                            if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
                            window.scrollTo(0, 0);
                          }}
                        >
                          Browse Events
                        </Link>
                        <button
                          type="button"
                          className="chapterIntroAction chapterIntroDismiss"
                          onClick={dismissIntroduction}
                        >
                          Don’t show again
                        </button>
                      </div>
                    </section>
                  )}
                  <div className="chapterSettings">
                    <div className="chapterVersionPicker">
                      <label>Version</label>
                      <select ref={versionPickerRef} value={version} onChange={(e) => setVersion(e.target.value as Version)}>
                        <option value="KJV">KJV</option>
                        <option value="ESV" disabled={esvStatusChecked && !esvAvailable}>ESV</option>
                      </select>
                      {esvStatusChecked && !esvAvailable ? (
                        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                          ESV unavailable
                        </div>
                      ) : null}
                    </div>

                    <div className="primaryGospelPicker">
                      <label>
                        Primary Gospel
                        <InfoTooltip
                          label="Primary Gospel"
                          description="Choose the Gospel you want to read in the main column. The other columns show parallel passages for the same events."
                        />
                      </label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {GOSPELS.map((g) => (
                          <SelectionPill
                            key={g}
                            active={book === g}
                            onClick={() => {
                              setAssignedReading(null);
                              setBook(g);
                              setChapter(1);
                            }}
                          >
                            {g}
                          </SelectionPill>
                        ))}
                      </div>
                    </div>

                    {picker}

                    <div className="chapterReadingOptions">
                      <div>
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

                      <div>
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
                  </div>

                  <div>
                    <label>Select chapter</label>
                    <div className="chapterNumberButtons">
                      {chapterButtons.map((ch) => (
                        <SelectionPill key={ch} active={chapter === ch} onClick={() => {
                          setAssignedReading(null);
                          setChapter(ch);
                        }}>
                          {ch}
                        </SelectionPill>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </ReadingPlans>
          </div>
        </div>

        {assignedReading && (
          <div className="assignedReading" ref={readerRef} tabIndex={-1} aria-label="Assigned reading">
            <h2>{readingLabel(assignedReading)}</h2>
            <div className="readingPlanActions">
              <a
                href="#reading-plan-card"
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
                  const planCard = document.getElementById("reading-plan-card");
                  if (!planCard) return;
                  event.preventDefault();
                  planCard.focus({ preventScroll: true });
                  revealReadingControl(planCard);
                }}
              >
                Back to reading plan
              </a>
              <button type="button" onClick={() => setAssignedReading(null)}>
                {assignedReading.startVerse === undefined ? "Return to chapter view" : "Show full chapter"}
              </button>
            </div>
          </div>
        )}
        {error ? <p className="error" style={{ marginTop: 10 }}>{error}</p> : null}
        {loading ? <p className="muted">Loading…</p> : null}
      </ReaderControls>

      <div className="readerPanes">
        {(!assignedReading || (!loading && !error)) && (
          <div
            ref={chapterReaderRef}
            className="chapterReader"
            role="region"
            tabIndex={-1}
            aria-label={`${book} ${chapter} and parallel passages`}
          >
            <ColumnGrid
              version={version}
              enableSync={enableSync}
              activeBlockId={activeBlockId}
              onPrimaryActiveBlockChange={setActiveBlockId}
              showDifferences={showDifferences}
              scrollPrimaryToTopSignal={scrollPrimaryToTopSignal}
              primary={{
                colKey: `${book}-primary`,
                header: assignedReading ? `Assigned reading · ${readingLabel(assignedReading)}` : `Primary: ${book} ${chapter}`,
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
        )}
      </div>

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
