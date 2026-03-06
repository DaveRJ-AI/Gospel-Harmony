import React from "react";
import { useNavigate } from "react-router-dom";
import { loadHarmony, type Pericope } from "../lib/harmony";
import type { Version } from "../lib/refs";

type TagGroup = {
  tag: string;
  items: Pericope[];
};

export default function TypeView() {
  const navigate = useNavigate();

  const [version, setVersion] = React.useState<Version>("KJV");
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [groups, setGroups] = React.useState<TagGroup[]>([]);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const harmony = await loadHarmony();
        if (!alive) return;

        const map = new Map<string, Pericope[]>();

        for (const p of harmony.pericopes) {
          const tags = p.tags || [];
          for (const tag of tags) {
            if (!map.has(tag)) map.set(tag, []);
            map.get(tag)!.push(p);
          }
        }

        const grouped: TagGroup[] = Array.from(map.entries())
          .map(([tag, items]) => ({
            tag,
            items: [...items].sort((a, b) => {
              const sa = a.sortOrder ?? 999999;
              const sb = b.sortOrder ?? 999999;
              if (sa !== sb) return sa - sb;
              return a.title.localeCompare(b.title);
            }),
          }))
          .sort((a, b) => a.tag.localeCompare(b.tag));

        setGroups(grouped);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load event types");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filteredGroups = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;

    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((p) => {
          const hay = [g.tag, p.title, p.summary, ...(p.tags || [])].join(" ").toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  return (
    <div>
      <div className="card">
        <div className="row" style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label>Search type</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search type, title, summary..."
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
          Type View groups Gospel events by category or tag such as miracle, parable, passion week, resurrection, and more.
        </p>
      </div>

      {loading ? <p className="muted" style={{ marginTop: 12 }}>Loading types…</p> : null}
      {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}

      {!loading && !error ? (
        <div style={{ marginTop: 12 }}>
          {filteredGroups.map((group) => (
            <div key={group.tag} className="card" style={{ marginBottom: 12 }}>
              <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18, textTransform: "capitalize" }}>
                {group.tag}
              </h2>

              <div>
                {group.items.map((p) => (
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

          {filteredGroups.length === 0 ? (
            <div className="card">
              <p className="muted">No event types matched your search.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}