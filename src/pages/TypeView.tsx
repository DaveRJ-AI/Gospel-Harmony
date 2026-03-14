import React from "react";
import { useNavigate } from "react-router-dom";
import ArtworkModal from "../components/ArtworkModal";
import { artworkForPericope, loadArtworkMap, type ArtworkItem, type ArtworkMap } from "../lib/artwork";
import { loadHarmony, type Pericope } from "../lib/harmony";
import type { Version } from "../lib/refs";

type TagGroup = {
  tag: string;
  items: Pericope[];
};

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

export default function TypeView() {
  const navigate = useNavigate();

  const [version, setVersion] = React.useState<Version>("KJV");
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [groups, setGroups] = React.useState<TagGroup[]>([]);
  const [artworkMap, setArtworkMap] = React.useState<ArtworkMap>({});
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  const [modalItems, setModalItems] = React.useState<ArtworkItem[]>([]);
  const [modalIndex, setModalIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [harmony, artMap] = await Promise.all([loadHarmony(), loadArtworkMap()]);
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
        setArtworkMap(artMap);
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

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const next: Record<string, boolean> = {};
      for (const group of filteredGroups) next[group.tag] = prev[group.tag] ?? false;
      return next;
    });
  }, [filteredGroups]);

  const toggleGroup = (tag: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [tag]: !prev[tag],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const group of filteredGroups) next[group.tag] = true;
    setOpenGroups(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    for (const group of filteredGroups) next[group.tag] = false;
    setOpenGroups(next);
  };

  return (
    <div>
      <div className="card">
        <div className="row" style={{ alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
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

        <div className="row" style={{ marginTop: 10, justifyContent: "space-between", gap: 12 }}>
          <p className="muted" style={{ margin: 0, flex: 1 }}>
            Type View groups Gospel events by category or tag such as miracle, parable, passion week, resurrection, and more.
          </p>

          <div className="row" style={{ gap: 8 }}>
            <button onClick={expandAll}>Expand all</button>
            <button onClick={collapseAll}>Collapse all</button>
          </div>
        </div>
      </div>

      {loading ? <p className="muted" style={{ marginTop: 12 }}>Loading types…</p> : null}
      {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}

      {!loading && !error ? (
        <div style={{ marginTop: 12 }}>
          {filteredGroups.map((group) => {
            const isOpen = !!openGroups[group.tag];

            return (
              <div key={group.tag} className="card" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.tag)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom: 0,
                      fontSize: 18,
                      textTransform: "capitalize",
                    }}
                  >
                    {group.tag}
                  </h2>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {isOpen ? "Hide" : "Show"} ({group.items.length})
                  </span>
                </button>

                {isOpen ? (
                  <div style={{ marginTop: 12 }}>
                    {group.items.map((p) => {
                      const artItems = artworkForPericope(artworkMap, p.pericopeId);

                      return (
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
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                              <div className="muted">{p.summary}</div>
                            </div>

                            {artItems.length > 0 ? (
                              <ArtPill
                                count={artItems.length}
                                onClick={() => {
                                  setModalItems(artItems);
                                  setModalIndex(0);
                                }}
                              />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}

          {filteredGroups.length === 0 ? (
            <div className="card">
              <p className="muted">No event types matched your search.</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {modalIndex !== null ? (
        <ArtworkModal
          items={modalItems}
          initialIndex={modalIndex}
          onClose={() => {
            setModalIndex(null);
            setModalItems([]);
          }}
        />
      ) : null}
    </div>
  );
}