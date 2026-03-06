import React from "react";
import { useNavigate } from "react-router-dom";
import { loadHarmony, type Pericope } from "../lib/harmony";
import type { Version } from "../lib/refs";

export default function TimelineView() {
  const navigate = useNavigate();

  const [version, setVersion] = React.useState<Version>("KJV");
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [pericopes, setPericopes] = React.useState<Pericope[]>([]);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const harmony = await loadHarmony();
        if (!alive) return;

        const sorted = [...harmony.pericopes].sort((a, b) => {
          const sa = a.sortOrder ?? 999999;
          const sb = b.sortOrder ?? 999999;
          if (sa !== sb) return sa - sb;
          return a.title.localeCompare(b.title);
        });

        setPericopes(sorted);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load timeline");
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

  const grouped = React.useMemo(() => {
    const sections: Array<{
      id: string;
      title: string;
      items: Pericope[];
    }> = [
      { id: "early", title: "Early Ministry", items: [] },
      { id: "galilee", title: "Galilean Ministry", items: [] },
      { id: "journey", title: "Journey / Later Ministry", items: [] },
      { id: "passion", title: "Passion Week", items: [] },
      { id: "resurrection", title: "Resurrection", items: [] },
    ];

    for (const p of filtered) {
      const tags = p.tags || [];
      const order = p.sortOrder ?? 999999;

      if (tags.includes("resurrection")) {
        sections[4].items.push(p);
      } else if (tags.includes("passion week") || tags.includes("passion")) {
        sections[3].items.push(p);
      } else if (
        tags.includes("birth") ||
        tags.includes("baptism") ||
        tags.includes("temptation") ||
        tags.includes("john the baptist") ||
        order <= 80
      ) {
        sections[0].items.push(p);
      } else if (order <= 300) {
        sections[1].items.push(p);
      } else {
        sections[2].items.push(p);
      }
    }

    return sections.filter((s) => s.items.length > 0);
  }, [filtered]);

  return (
    <div>
      <div className="card">
        <div className="row" style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label>Search timeline</label>
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
          Timeline View shows Gospel events in chronological order. Click any event to open the 4-column harmonized view.
        </p>
      </div>

      {loading ? <p className="muted" style={{ marginTop: 12 }}>Loading timeline…</p> : null}
      {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}

      {!loading && !error ? (
        <div style={{ marginTop: 12 }}>
          {grouped.map((section) => (
            <div key={section.id} className="card" style={{ marginBottom: 12 }}>
              <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>{section.title}</h2>

              <div>
                {section.items.map((p) => (
                  <button
                    key={p.pericopeId}
                    onClick={() => navigate(`/story/${p.pericopeId}?version=${version}`)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      marginBottom: 10,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #e6e6e6",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                    <div className="muted">{p.summary}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {grouped.length === 0 ? (
            <div className="card">
              <p className="muted">No events matched your search.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}