import React from "react";
import { useNavigate } from "react-router-dom";
import { loadHarmony, type Pericope } from "../lib/harmony";
import type { Version } from "../lib/refs";

export default function StoriesIndex() {
  const nav = useNavigate();

  const [version, setVersion] = React.useState<Version>("KJV");
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pericopes, setPericopes] = React.useState<Pericope[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const h = await loadHarmony();
        if (!alive) return;

        const sorted = [...h.pericopes].sort((a, b) => {
          const sa = a.sortOrder ?? 999999;
          const sb = b.sortOrder ?? 999999;
          if (sa !== sb) return sa - sb;
          return a.title.localeCompare(b.title);
        });

        setPericopes(sorted);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load events");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pericopes;

    return pericopes.filter((p) => {
      const hay = [p.title, p.summary, ...(p.tags || [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [pericopes, query]);

  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <div className="card">
        <div className="row" style={{ alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label>Search events</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, summary, or type..."
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label>Version</label>
            <select value={version} onChange={(e) => setVersion(e.target.value as Version)}>
              <option value="KJV">KJV</option>
              <option value="ESV">ESV</option>
            </select>
          </div>
        </div>

        <p className="muted" style={{ marginTop: 10 }}>
          Events shows Gospel events in harmony order. Click any event to open the 4-column harmonized view.
        </p>
      </div>

      {loading ? <p className="muted" style={{ marginTop: 12 }}>Loading events…</p> : null}

      {!loading ? (
        <div style={{ marginTop: 12 }}>
          {filtered.map((p) => (
            <button
              key={p.pericopeId}
              onClick={() => nav(`/story/${p.pericopeId}?version=${version}`)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                marginBottom: 10,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #e6e6e6",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
              <div className="muted">{p.summary}</div>
            </button>
          ))}

          {filtered.length === 0 ? (
            <div className="card">
              <p className="muted">No events matched your search.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}