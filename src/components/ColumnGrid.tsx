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

const STORY_PALETTE = [
  { bg: "#EDF7FF", accent: "#3B82F6", outline: "#BFDBFE" }, // blue
  { bg: "#ECFDF5", accent: "#22C55E", outline: "#BBF7D0" }, // green
  { bg: "#FFF7ED", accent: "#F97316", outline: "#FED7AA" }, // orange
  { bg: "#FAF5FF", accent: "#A855F7", outline: "#DDD6FE" }, // violet
  { bg: "#FFF1F2", accent: "#F43F5E", outline: "#FECDD3" }, // rose
  { bg: "#F0FDFA", accent: "#14B8A6", outline: "#99F6E4" }, // teal
  { bg: "#FEF9C3", accent: "#CA8A04", outline: "#FDE68A" }, // amber
  { bg: "#F3F4F6", accent: "#6B7280", outline: "#D1D5DB" }, // slate
];

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

  const storyColorIndexByBlockId = React.useMemo(() => {
    const map = new Map<string, number>();
    let storyIndex = 0;

    for (const block of primary.blocks) {
      if (!block.title) continue;
      if (map.has(block.blockId)) continue;

      map.set(block.blockId, storyIndex % STORY_PALETTE.length);
      storyIndex += 1;
    }

    return map;
  }, [primary.blocks]);

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
        storyColorIndexByBlockId={storyColorIndexByBlockId}
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
          storyColorIndexByBlockId={storyColorIndexByBlockId}
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
  storyColorIndexByBlockId: Map<string, number>;
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
    storyColorIndexByBlockId,
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

        {blocks.map((b, index) => {
          const isActive = enableSync && activeBlockId && b.blockId === activeBlockId;
          const isStory = !!b.title;

          const paletteIndex = storyColorIndexByBlockId.get(b.blockId);
          const storyStyle =
            isStory && paletteIndex !== undefined
              ? storyColorStyle(paletteIndex, !!isActive)
              : undefined;

          const className =
            "blockWrap" +
            (isStory ? " storyBlock" : "") +
            (isActive ? " blockActive" : "") +
            (index === 0 ? " firstBlock" : "");

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
                    marginBottom: 8,
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

function storyColorStyle(index: number, isActive: boolean): React.CSSProperties {
  const choice = STORY_PALETTE[index % STORY_PALETTE.length];

  return {
    // @ts-ignore
    "--story-bg": choice.bg,
    // @ts-ignore
    "--story-accent": choice.accent,
    // @ts-ignore
    "--story-outline": isActive ? choice.accent : choice.outline,
  } as React.CSSProperties;
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