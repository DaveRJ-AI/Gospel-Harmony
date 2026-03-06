import React from "react";
import type { Pericope } from "../lib/harmony";

export default function StorySearch(props: {
  pericopes: Pericope[];
  onPick: (id: string) => void;
}) {
  const { pericopes, onPick } = props;
  const [q, setQ] = React.useState("");

  const list = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pericopes;
    return pericopes.filter((p) => {
      const hay = `${p.title} ${p.summary} ${(p.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(s);
    });
  }, [q, pericopes]);

  return (
    <div className="card">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label>Search stories</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g., feeding, storm, baptism, trial..."
            style={{ width: "100%" }}
          />
        </div>
        <div className="pill">{list.length} results</div>
      </div>

      <div style={{ marginTop: 10 }}>
        {list.slice(0, 200).map((p) => (
          <div key={p.pericopeId} style={{ padding: "10px 0", borderTop: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.title}</div>
                <div className="muted">{p.summary}</div>
              </div>
              <div>
                <button onClick={() => onPick(p.pericopeId)}>Open</button>
              </div>
            </div>
          </div>
        ))}
        {list.length > 200 ? <p className="muted">Showing first 200 matches.</p> : null}
      </div>
    </div>
  );
}