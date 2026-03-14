import React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ColumnGrid, { type ColumnBlock } from "../components/ColumnGrid";
import { getPassage, type PassageRef } from "../lib/bible";
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

export default function StoryView() {
  const { pericopeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialVersion = (searchParams.get("version") === "ESV" ? "ESV" : "KJV") as Version;
  const [version, setVersion] = React.useState<Version>(initialVersion);

  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState<string>("");
  const [summary, setSummary] = React.useState<string>("");
  const [allPericopes, setAllPericopes] = React.useState<Pericope[]>([]);
  const [referenceMap, setReferenceMap] = React.useState<Partial<Record<Gospel, string>>>({});
  const [primaryBook, setPrimaryBook] = React.useState<Gospel>("Matthew");

  const [cols, setCols] = React.useState<Record<Gospel, ColumnBlock[]>>({
    Matthew: [],
    Mark: [],
    Luke: [],
    John: [],
  });

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setError(null);

      try {
        if (!pericopeId) throw new Error("Missing event id");

        const h = await loadHarmony();
        const sorted = [...h.pericopes].sort((a, b) => {
          const sa = a.sortOrder ?? 999999;
          const sb = b.sortOrder ?? 999999;
          if (sa !== sb) return sa - sb;
          return a.title.localeCompare(b.title);
        });

        const p = sorted.find((x) => x.pericopeId === pericopeId) as Pericope | undefined;
        if (!p) throw new Error("Event not found");

        const blocksByBook: Record<Gospel, ColumnBlock[]> = {
          Matthew: [],
          Mark: [],
          Luke: [],
          John: [],
        };

        const refs: Partial<Record<Gospel, string>> = {};
        const passages = passagesForPericope(h, pericopeId);

        const firstAvailable = GOSPELS.find((g) => passages.some((x) => x.book === g)) || "Matthew";

        for (const g of GOSPELS) {
          const ref = passages.find((x) => x.book === g) || null;

          if (!ref) {
            refs[g] = "—";
            blocksByBook[g] = [
              {
                blockId: pericopeId,
                title: `${g} — no parallel`,
                verses: [],
                emptyLabel: "— (not in this Gospel)",
              },
            ];
          } else {
            const label = formatPassageRef(ref);
            const verses = await getPassage(version, ref);
            refs[g] = label;

            blocksByBook[g] = [
              {
                blockId: pericopeId,
                title: label,
                verses,
              },
            ];
          }
        }

        if (!alive) return;

        setTitle(p.title);
        setSummary(p.summary);
        setAllPericopes(sorted);
        setReferenceMap(refs);
        setPrimaryBook(firstAvailable);
        setCols(blocksByBook);
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

  const prevPericope = currentIndex > 0 ? allPericopes[currentIndex - 1] : null;
  const nextPericope =
    currentIndex >= 0 && currentIndex < allPericopes.length - 1 ? allPericopes[currentIndex + 1] : null;

  const goToPericope = (targetId: string) => {
    navigate(`/story/${targetId}?version=${version}`);
  };

  const otherBooks = GOSPELS.filter((g) => g !== primaryBook);

  if (error) {
    return (
      <div className="card">
        <p className="error">{error}</p>
        <p>
          <Link to="/stories">Back to events</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="muted">
              <Link to="/stories">← Back to events</Link>
            </div>
            <h2 style={{ margin: "6px 0" }}>{title}</h2>
            <div className="muted">{summary}</div>

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
              <option value="ESV">ESV</option>
            </select>
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
    </div>
  );
}