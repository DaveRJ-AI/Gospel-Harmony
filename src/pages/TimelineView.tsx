import React from "react";
import { useNavigate } from "react-router-dom";
import ArtworkModal from "../components/ArtworkModal";
import { artworkForPericope, loadArtworkMap, type ArtworkItem, type ArtworkMap } from "../lib/artwork";
import { loadHarmony, type Pericope } from "../lib/harmony";
import type { Version } from "../lib/refs";

type TimelineSection = {
  id: string;
  title: string;
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

export default function TimelineView() {
  const navigate = useNavigate();

  const [version, setVersion] = React.useState<Version>("KJV");
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [pericopes, setPericopes] = React.useState<Pericope[]>([]);
  const [artworkMap, setArtworkMap] = React.useState<ArtworkMap>({});
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});

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

        const sorted = [...harmony.pericopes].sort((a, b) => {
          const sa = a.sortOrder ?? 999999;
          const sb = b.sortOrder ?? 999999;
          if (sa !== sb) return sa - sb;
          return a.title.localeCompare(b.title);
        });

        setPericopes(sorted);
        setArtworkMap(artMap);
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

  const grouped = React.useMemo<TimelineSection[]>(() => {
    const sections: TimelineSection[] = [
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

  React.useEffect(() => {
    setOpenSections((prev) => {
      const next: Record<string, boolean> = {};
      for (const section of grouped) {
        next[section.id] = prev[section.id] ?? false;
      }
      return next;
    });
  }, [grouped]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const section of grouped) next[section.id] = true;
    setOpenSections(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    for (const section of grouped) next[section.id] = false;
    setOpenSections(next);
  };

  return (
    <div>
      <div className="card">
        <div className="row" style={{ alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
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

        <div className="row" style={{ marginTop: 10, justifyContent: "space-between", gap: 12 }}>
          <p className="muted" style={{ margin: 0, flex: 1 }}>
            Timeline View shows Gospel events in chronological order. Expand a section, then click an event to open the 4-column harmonized view.
          </p>

          <div className="row" style={{ gap: 8 }}>
            <button onClick={expandAll}>Expand all</button>
            <button onClick={collapseAll}>Collapse all</button>
          </div>
        </div>
      </div>

      {loading ? <p className="muted" style={{ marginTop: 12 }}>Loading timeline…</p> : null}
      {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}

      {!loading && !error ? (
        <div style={{ marginTop: 12 }}>
          {grouped.map((section) => {
            const isOpen = !!openSections[section.id];

            return (
              <div key={section.id} className="card" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
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
                  <h2 style={{ marginTop: 0, marginBottom: 0, fontSize: 18 }}>{section.title}</h2>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {isOpen ? "Hide" : "Show"} ({section.items.length})
                  </span>
                </button>

                {isOpen ? (
                  <div style={{ marginTop: 12 }}>
                    {section.items.map((p) => {
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

          {grouped.length === 0 ? (
            <div className="card">
              <p className="muted">No events matched your search.</p>
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