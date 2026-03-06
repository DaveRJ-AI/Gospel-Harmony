import React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ColumnGrid, { type ColumnBlock } from "../components/ColumnGrid";
import { getPassage } from "../lib/bible";
import { loadHarmony, passagesForPericope, type Pericope } from "../lib/harmony";
import { GOSPELS, type Gospel, type Version } from "../lib/refs";

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

        const passages = passagesForPericope(h, pericopeId);

        for (const g of GOSPELS) {
          const ref = passages.find((x) => x.book === g) || null;

          if (!ref) {
            blocksByBook[g] = [
              {
                blockId: pericopeId,
                title: p.title,
                verses: [],
                emptyLabel: "— (not in this Gospel)",
              },
            ];
          } else {
            const verses = await getPassage(version, ref);
            blocksByBook[g] = [
              {
                blockId: pericopeId,
                title: p.title,
                verses,
              },
            ];
          }
        }

        if (!alive) return;

        setTitle(p.title);
        setSummary(p.summary);
        setAllPericopes(sorted);
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
        <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="muted">
              <Link to="/stories">← Back to events</Link>
            </div>
            <h2 style={{ margin: "6px 0" }}>{title}</h2>
            <div className="muted">{summary}</div>
          </div>

          <div>
            <label>Version</label>
            <select value={version} onChange={(e) => setVersion(e.target.value as Version)}>
              <option value="KJV">KJV</option>
              <option value="ESV">ESV</option>
            </select>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
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
        primary={{ colKey: "Matthew", header: `Matthew (${version})`, blocks: cols.Matthew }}
        others={[
          { book: "Mark", colKey: "Mark", header: `Mark (${version})`, blocks: cols.Mark },
          { book: "Luke", colKey: "Luke", header: `Luke (${version})`, blocks: cols.Luke },
          { book: "John", colKey: "John", header: `John (${version})`, blocks: cols.John },
        ]}
      />
    </div>
  );
}