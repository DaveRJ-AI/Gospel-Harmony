import React from "react";
import type { Gospel, Version } from "../lib/refs";
import type { Verse } from "../lib/bible";

export type ColumnBlock = {
  blockId: string;
  title?: string;
  verses: Verse[];
  emptyLabel?: string;
  titleAction?: React.ReactNode;
};

export default function ColumnGrid(props: {
  version: Version;
  enableSync: boolean;
  activeBlockId: string | null;
  onPrimaryActiveBlockChange: (blockId: string | null) => void;
  showDifferences: boolean;
  scrollPrimaryToTopSignal: number;

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

  React.useEffect(() => {
    if (!isPrimary) return;
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "auto" });
  }, [isPrimary, scrollToTopSignal]);

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
              {b.title ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <div className="blockTitle" style={{ marginBottom: 0 }}>
                    {b.title}
                  </div>
                  {b.titleAction ? <div>{b.titleAction}</div> : null}
                </div>
              ) : null}

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

const STORY_PALETTE = [
  { bg: "rgba(237, 247, 255, 0.95)", accent: "rgba(59, 130, 246, 0.95)", outline: "rgba(37, 99, 235, 0.28)" },   // blue
  { bg: "rgba(236, 253, 245, 0.95)", accent: "rgba(34, 197, 94, 0.95)", outline: "rgba(22, 163, 74, 0.28)" },    // green
  { bg: "rgba(255, 247, 237, 0.95)", accent: "rgba(249, 115, 22, 0.95)", outline: "rgba(234, 88, 12, 0.28)" },   // orange
  { bg: "rgba(250, 245, 255, 0.95)", accent: "rgba(168, 85, 247, 0.95)", outline: "rgba(147, 51, 234, 0.28)" },  // violet
  { bg: "rgba(255, 241, 242, 0.95)", accent: "rgba(244, 63, 94, 0.95)", outline: "rgba(225, 29, 72, 0.28)" },    // rose
  { bg: "rgba(240, 253, 250, 0.95)", accent: "rgba(20, 184, 166, 0.95)", outline: "rgba(13, 148, 136, 0.28)" },  // teal
  { bg: "rgba(254, 249, 195, 0.95)", accent: "rgba(202, 138, 4, 0.95)", outline: "rgba(161, 98, 7, 0.28)" },     // amber
  { bg: "rgba(243, 244, 246, 0.95)", accent: "rgba(107, 114, 128, 0.95)", outline: "rgba(75, 85, 99, 0.28)" },   // slate
];

function storyColorStyle(blockId: string, isActive: boolean): React.CSSProperties {
  const idx = stableIndex(blockId, STORY_PALETTE.length);
  const choice = STORY_PALETTE[idx];

  return {
    // @ts-ignore
    "--story-bg": choice.bg,
    // @ts-ignore
    "--story-accent": choice.accent,
    // @ts-ignore
    "--story-outline": isActive
      ? choice.accent.replace("0.95", "0.45")
      : choice.outline,
  } as React.CSSProperties;
}

function stableIndex(input: string, size: number): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h % size;
}

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