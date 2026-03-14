import React from "react";
import type { Gospel, Version } from "../lib/refs";
import type { Verse } from "../lib/bible";

export type ColumnBlock = {
  blockId: string; // shared id (pericopeId) for syncing
  title?: string;
  verses: Verse[];
  emptyLabel?: string;
};

export default function ColumnGrid(props: {
  version: Version;

  // Sync/highlight options
  enableSync: boolean;
  activeBlockId: string | null;
  onPrimaryActiveBlockChange: (blockId: string | null) => void;

  // Differences options
  showDifferences: boolean;

  // Chapter-change behavior
  scrollPrimaryToTopSignal: number; // increment to trigger scroll-to-top

  primary: { colKey: string; header: string; blocks: ColumnBlock[] };
  others: Array<{ book: Gospel; colKey: string; header: string; blocks: ColumnBlock[] }>;
}) {
  const {
    primary,
    others,
    enableSync,
    activeBlockId,
    onPrimaryActiveBlockChange,
    showDifferences,
    scrollPrimaryToTopSignal,
  } = props;

  const primaryActiveWordSet = React.useMemo(() => {
    if (!showDifferences) return null;
    if (!activeBlockId) return null;

    const b = primary.blocks.find((x) => x.blockId === activeBlockId);
    if (!b) return null;

    const text = b.verses.map((v) => v.text).join(" ");
    return makeWordSet(text);
  }, [showDifferences, activeBlockId, primary.blocks]);

  return (
    <div className="grid4">
      <Column
        colKey={primary.colKey}
        header={primary.header}
        blocks={primary.blocks}
        isPrimary={true}
        enableSync={enableSync}
        activeBlockId={activeBlockId}
        onPrimaryActiveBlockChange={onPrimaryActiveBlockChange}
        showDifferences={false}
        primaryWordSet={null}
        scrollToTopSignal={scrollPrimaryToTopSignal}
      />

      {others.map((c) => (
        <Column
          key={c.book}
          colKey={c.colKey}
          header={c.header}
          blocks={c.blocks}
          isPrimary={false}
          enableSync={enableSync}
          activeBlockId={activeBlockId}
          onPrimaryActiveBlockChange={() => {}}
          showDifferences={showDifferences}
          primaryWordSet={primaryActiveWordSet}
          scrollToTopSignal={0}
        />
      ))}
    </div>
  );
}

function Column(props: {
  colKey: string;
  header: string;
  blocks: ColumnBlock[];
  isPrimary: boolean;

  enableSync: boolean;
  activeBlockId: string | null;
  onPrimaryActiveBlockChange: (blockId: string | null) => void;

  showDifferences: boolean;
  primaryWordSet: Set<string> | null;

  scrollToTopSignal: number;
}) {
  const {
    colKey,
    header,
    blocks,
    isPrimary,
    enableSync,
    activeBlockId,
    onPrimaryActiveBlockChange,
    showDifferences,
    primaryWordSet,
    scrollToTopSignal,
  } = props;

  const bodyRef = React.useRef<HTMLDivElement | null>(null);

  // PRIMARY: scroll to top when chapter/book/version changes
  React.useEffect(() => {
    if (!isPrimary) return;
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "auto" });
  }, [isPrimary, scrollToTopSignal]);

  // PRIMARY: determine which block is active based on what's visible
  React.useEffect(() => {
    if (!isPrimary) return;
    if (!enableSync) return;

    const rootEl = bodyRef.current;
    if (!rootEl) return;

    const blockEls = Array.from(rootEl.querySelectorAll<HTMLElement>("[data-blockid]"));
    if (blockEls.length === 0) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rootTop = rootEl.getBoundingClientRect().top;
        let bestId: string | null = null;
        let bestDist = Number.POSITIVE_INFINITY;

        for (const el of blockEls) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom < rootTop + 10) continue;

          const dist = Math.abs(rect.top - rootTop);
          if (dist < bestDist) {
            bestDist = dist;
            bestId = el.dataset.blockid || null;
          }
        }

        onPrimaryActiveBlockChange(bestId);
      });
    };

    rootEl.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      cancelAnimationFrame(raf);
      rootEl.removeEventListener("scroll", onScroll);
    };
  }, [isPrimary, enableSync, blocks, onPrimaryActiveBlockChange]);

  // OTHER COLUMNS: scroll active block inside the column only
  React.useEffect(() => {
    if (isPrimary) return;
    if (!enableSync) return;
    if (!activeBlockId) return;

    const rootEl = bodyRef.current;
    if (!rootEl) return;

    const target = rootEl.querySelector<HTMLElement>(
      `#${CSS.escape(blockDomId(colKey, activeBlockId))}`
    );
    if (!target) return;

    const rootRect = rootEl.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const currentTop = rootEl.scrollTop;
    const relativeTop = targetRect.top - rootRect.top + currentTop;

    rootEl.scrollTo({
      top: relativeTop,
      behavior: "smooth",
    });
  }, [activeBlockId, enableSync, isPrimary, colKey]);

  return (
    <div className="col">
      <div className="colHeader">
        <span>{header}</span>
      </div>

      <div className="colBody" ref={bodyRef}>
        {blocks.length === 0 ? <p className="muted">No content</p> : null}

        {blocks.map((b) => {
          const isActive = enableSync && activeBlockId && b.blockId === activeBlockId;
          const isStory = !!b.title;

          const storyStyle = isStory ? storyColorStyle(b.blockId, !!isActive) : undefined;

          const className =
            "blockWrap" + (isStory ? " storyBlock" : "") + (isActive ? " blockActive" : "");

          return (
            <div
              key={b.blockId}
              id={blockDomId(colKey, b.blockId)}
              data-blockid={b.blockId}
              className={className}
              style={storyStyle}
            >
              {b.title ? <div className="blockTitle">{b.title}</div> : null}

              {b.verses.length === 0 ? (
                <p className="muted">{b.emptyLabel ?? "—"}</p>
              ) : (
                b.verses.map((v, idx) => (
                  <p className="verse" key={`${v.book}-${v.chapter}-${v.verse}-${idx}`}>
                    <span className="verseNum">{Number.isFinite(v.verse) ? v.verse : ""}</span>
                    <span>
                      {showDifferences && primaryWordSet && isActive
                        ? highlightDiff(v.text, primaryWordSet)
                        : v.text}
                    </span>
                  </p>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function blockDomId(colKey: string, blockId: string) {
  return `col-${colKey}-block-${blockId}`;
}

// --- Story color helpers ---

function storyColorStyle(blockId: string, isActive: boolean): React.CSSProperties {
  const hue = hashToHue(blockId);
  const bg = `hsla(${hue}, 70%, 92%, 0.9)`;
  const accent = `hsla(${hue}, 70%, 45%, 0.9)`;
  const outline = isActive
    ? `hsla(${hue}, 80%, 35%, 0.55)`
    : `hsla(${hue}, 60%, 35%, 0.25)`;

  return {
    // @ts-ignore
    "--story-bg": bg,
    // @ts-ignore
    "--story-accent": accent,
    // @ts-ignore
    "--story-outline": outline,
  } as React.CSSProperties;
}

function hashToHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

// --- Differences helpers ---

function makeWordSet(text: string): Set<string> {
  const words = tokenizeWords(text);
  return new Set(words);
}

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function highlightDiff(text: string, primaryWords: Set<string>) {
  const parts = text.split(/(\s+)/);
  return parts.map((part, i) => {
    if (/^\s+$/.test(part)) return <React.Fragment key={i}>{part}</React.Fragment>;

    const norm = part
      .toLowerCase()
      .replace(/[\u2019']/g, "")
      .replace(/[^a-z0-9]/g, "");

    if (!norm) return <React.Fragment key={i}>{part}</React.Fragment>;

    if (!primaryWords.has(norm)) {
      return (
        <mark key={i} className="diff">
          {part}
        </mark>
      );
    }

    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}