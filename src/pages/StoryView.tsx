import React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ColumnGrid, { type ColumnBlock } from "../components/ColumnGrid";
import ArtworkModal from "../components/ArtworkModal";
import EventShare from "../components/EventShare";
import { useEsvAvailability } from "../hooks/useEsvAvailability";
import { getPassage, type PassageRef } from "../lib/bible";
import { setEsvDisplayActive } from "../lib/esvDisplayState";
import { artworkForPericope, loadArtworkMap, type ArtworkItem } from "../lib/artwork";
import { loadHarmony, passagesForPericope, type Pericope } from "../lib/harmony";
import { GOSPELS, type Gospel, type Version } from "../lib/refs";

function formatPassageRef(ref: PassageRef) {
  if (ref.startChapter === ref.endChapter) {
    if (ref.startVerse === ref.endVerse) {
      return `${ref.book} ${ref.startChapter}:${ref.startVerse}`;
    }
    return `${ref.book} ${ref.startChapter}:${ref.startVerse}-${ref.endVerse}`;
  }

  return `${ref.book} ${ref.startChapter}:${ref.startVerse}-${ref.endChapter}:${ref.endVerse}`;
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
        border: "1px solid #cbd5e1",
        background: "#fff",
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

export default function StoryView() {
  const { pericopeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { esvAvailable, esvStatusChecked } = useEsvAvailability();

  const initialVersion = (searchParams.get("version") === "ESV" ? "ESV" : "KJV") as Version;
  const returnTo = searchParams.get("returnTo");
  const backLabel = returnTo?.startsWith("/?plan=") ? "Back to reading plan" : returnTo ? "Back to map" : "Back to events";
  const [version, setVersion] = React.useState<Version>(initialVersion);

  const [error, setError] = React.useState<string | null>(null);
  const [allPericopes, setAllPericopes] = React.useState<Pericope[]>([]);
  const [referenceMap, setReferenceMap] = React.useState<Partial<Record<Gospel, string>>>({});
  const [primaryBook, setPrimaryBook] = React.useState<Gospel>("Matthew");
  const [artItems, setArtItems] = React.useState<ArtworkItem[]>([]);
  const [artOpenIndex, setArtOpenIndex] = React.useState<number | null>(null);

  const [cols, setCols] = React.useState<Record<Gospel, ColumnBlock[]>>({
    Matthew: [],
    Mark: [],
    Luke: [],
    John: [],
  });

  React.useEffect(() => {
    if (version === "ESV" && esvStatusChecked && !esvAvailable) {
      setVersion("KJV");
    }
  }, [version, esvAvailable, esvStatusChecked]);

  React.useEffect(() => {
    setEsvDisplayActive(version === "ESV");
    return () => setEsvDisplayActive(false);
  }, [version]);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setError(null);

      try {
        if (!pericopeId) throw new Error("Missing event id");

        const [h, artworkMap] = await Promise.all([loadHarmony(), loadArtworkMap()]);

        const sorted = [...h.pericopes].sort((a, b) => {
          const sa = a.sortOrder ?? 999999;
          const sb = b.sortOrder ?? 999999;
          if (sa !== sb) return sa - sb;
          return a.title.localeCompare(b.title);
        });

        if (!sorted.some((event) => event.pericopeId === pericopeId)) {
          throw new Error("Event not found");
        }

        const blocksByBook: Record<Gospel, ColumnBlock[]> = {
          Matthew: [],
          Mark: [],
          Luke: [],
          John: [],
        };

        const refs: Partial<Record<Gospel, string>> = {};
        let firstAvailable: Gospel | undefined;
        const storyArtItems = artworkForPericope(artworkMap, pericopeId);

        for (const g of GOSPELS) {
          const passages = passagesForPericope(h, pericopeId, g);

          if (passages.length === 0) {
            refs[g] = "—";
            blocksByBook[g] = [
              {
                blockId: pericopeId,
                title: `${g} — no parallel`,
                verses: [],
                emptyLabel: "— (not in this Gospel)",
              },
            ];
            continue;
          }

          firstAvailable ??= g;
          refs[g] = passages.map(formatPassageRef).join(", ");
          for (const [sectionIndex, ref] of passages.entries()) {
            const label = formatPassageRef(ref);
            const verses = await getPassage(version, ref);
            blocksByBook[g].push({
              blockId: pericopeId,
              sectionIndex,
              title: label,
              verses,
              titleAction:
                sectionIndex === 0 && g === firstAvailable && storyArtItems.length > 0 ? (
                  <ArtPill
                    count={storyArtItems.length}
                    onClick={() => {
                      setArtItems(storyArtItems);
                      setArtOpenIndex(0);
                    }}
                  />
                ) : undefined,
            });
          }
        }

        if (!alive) return;

        setAllPericopes(sorted);
        setReferenceMap(refs);
        setPrimaryBook(firstAvailable ?? "Matthew");
        setCols(blocksByBook);
        setArtItems(storyArtItems);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Error");
      }
    })();

    return () => {
      alive = false;
    };
  }, [pericopeId, version]);

  const currentIndex = React.useMemo(() => {
    return allPericopes.findIndex((p) => p.pericopeId === pericopeId);
  }, [allPericopes, pericopeId]);
  const currentEvent = allPericopes[currentIndex];

  React.useEffect(() => {
    if (!currentEvent) return;
    document.title = `${currentEvent.title} | Gospel Harmonics`;
    return () => { document.title = "Gospel Harmonics"; };
  }, [currentEvent]);

  const prevPericope = currentIndex > 0 ? allPericopes[currentIndex - 1] : null;
  const nextPericope =
    currentIndex >= 0 && currentIndex < allPericopes.length - 1 ? allPericopes[currentIndex + 1] : null;

  const goToPericope = (targetId: string) => {
    const params = new URLSearchParams({ version });
    if (returnTo) {
      params.set("returnTo", returnTo);
    }
    navigate(`/story/${targetId}?${params.toString()}`);
  };

  const otherBooks = GOSPELS.filter((g) => g !== primaryBook);

  if (error) {
    return (
      <div className="card">
        <p className="error">{error}</p>
        <p>
          <Link to={returnTo || "/stories"}>{backLabel}</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="row" style={{ alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="muted">
              <Link to={returnTo || "/stories"}>← {backLabel}</Link>
            </div>
            {currentEvent ? (
              <>
                <div className="eventTitle">
                  <h2>{currentEvent.title}</h2>
                  <EventShare
                    key={`${currentEvent.pericopeId}-${version}`}
                    eventId={currentEvent.pericopeId}
                    title={currentEvent.title}
                    version={version}
                  />
                </div>
                <div className="muted">{currentEvent.summary}</div>
              </>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {GOSPELS.map((g) => (
                <div
                  key={g}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: g === primaryBook ? "#eef2ff" : "#fafafa",
                    fontSize: 14,
                  }}
                >
                  <strong>{g}:</strong> {referenceMap[g] || "—"}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label>Version</label>
            <select value={version} onChange={(e) => setVersion(e.target.value as Version)}>
              <option value="KJV">KJV</option>
              <option value="ESV" disabled={esvStatusChecked && !esvAvailable}>ESV</option>
            </select>
            {esvStatusChecked && !esvAvailable ? (
              <div className="muted" style={{ marginTop: 8, fontSize: 12, maxWidth: 220 }}>
                ESV is unavailable until <code>ESV_API_KEY</code> is configured.
              </div>
            ) : null}
          </div>
        </div>

        <div className="row" style={{ marginTop: 12, justifyContent: "space-between", gap: 12 }}>
          <div>
            {prevPericope ? (
              <button onClick={() => goToPericope(prevPericope.pericopeId)}>
                ← Previous: {prevPericope.title}
              </button>
            ) : (
              <button disabled>← Previous</button>
            )}
          </div>

          <div>
            {nextPericope ? (
              <button onClick={() => goToPericope(nextPericope.pericopeId)}>
                Next: {nextPericope.title} →
              </button>
            ) : (
              <button disabled>Next →</button>
            )}
          </div>
        </div>
      </div>

      <ColumnGrid
        version={version}
        enableSync={false}
        activeBlockId={pericopeId ?? null}
        onPrimaryActiveBlockChange={() => {}}
        showDifferences={false}
        scrollPrimaryToTopSignal={0}
        primary={{
          colKey: `${primaryBook}-primary`,
          header: `${primaryBook} (${version})`,
          blocks: cols[primaryBook],
        }}
        others={otherBooks.map((book) => ({
          book,
          colKey: book,
          header: `${book} (${version})`,
          blocks: cols[book],
        }))}
      />

      {artOpenIndex !== null ? (
        <ArtworkModal
          items={artItems}
          initialIndex={artOpenIndex}
          onClose={() => setArtOpenIndex(null)}
        />
      ) : null}
    </div>
  );
}
