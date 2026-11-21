import React from "react";
import ArtworkModal from "../components/ArtworkModal";
import { useEventBrowse } from "../hooks/useEventBrowse";
import { artworkForPericope, loadArtworkMap, type ArtworkItem, type ArtworkMap } from "../lib/artwork";
import { loadHarmony, type Pericope } from "../lib/harmony";
import { getEventSearch, type EventSearch } from "../lib/eventSearch";

export default function StoriesIndex() {
  const [error, setError] = React.useState<string | null>(null);
  const [pericopes, setPericopes] = React.useState<Pericope[]>([]);
  const [eventSearch, setEventSearch] = React.useState<EventSearch>();
  const [artworkMap, setArtworkMap] = React.useState<ArtworkMap>({});
  const [loading, setLoading] = React.useState(true);
  const { version, query, esvUnavailable, setVersion, setQuery, openEvent } = useEventBrowse(!loading && !error);

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
        setEventSearch(getEventSearch(harmony));
        setArtworkMap(artMap);
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
    if (!query.trim() || !eventSearch) return pericopes;
    const byId = new Map(pericopes.map((event) => [event.pericopeId, event]));
    return eventSearch.find(query).flatMap((id) => byId.get(id) ?? []);
  }, [pericopes, query, eventSearch]);

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
              placeholder="Search events or scripture references..."
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label>Version</label>
            <select value={version} onChange={(e) => setVersion(e.target.value)}>
              <option value="KJV">KJV</option>
              <option value="ESV" disabled={esvUnavailable}>ESV</option>
            </select>
          </div>
        </div>

        <p className="muted" style={{ marginTop: 10 }}>
          Events shows Gospel events in harmony order. Click any event to open the 4-column harmonized view.
        </p>
        {esvUnavailable ? (
          <p className="muted" style={{ marginTop: 8 }}>
            ESV is unavailable until <code>ESV_API_KEY</code> is configured.
          </p>
        ) : null}
      </div>

      {loading ? <p className="muted" style={{ marginTop: 12 }}>Loading events…</p> : null}

      {!loading ? (
        <div style={{ marginTop: 12 }}>
          {filtered.map((p) => {
            const artItems = artworkForPericope(artworkMap, p.pericopeId);
            const firstArt = artItems[0];
            const anchor = `event-${p.pericopeId}`;

            return (
              <div
                key={p.pericopeId}
                id={anchor}
                className="interactiveCard"
                onClick={() => openEvent(p.pericopeId, anchor)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    openEvent(p.pericopeId, anchor);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 10,
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: "1px solid #E5E7EB",
                  background: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>{p.title}</div>
                  <div className="muted">{p.summary}</div>
                </div>

                {firstArt ? (
                  <button
                    type="button"
                    className="artThumbButton"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalItems(artItems);
                      setModalIndex(0);
                    }}
                    title={artItems.length > 1 ? `Open ${artItems.length} artwork images` : "Open artwork"}
                    style={{
                      flex: "0 0 auto",
                      border: "1px solid #D1D5DB",
                      borderRadius: 12,
                      padding: 0,
                      background: "#FFFFFF",
                      cursor: "pointer",
                      overflow: "hidden",
                      width: 110,
                    }}
                  >
                    <img
                      src={firstArt.thumbnail || firstArt.image}
                      alt={firstArt.title}
                      style={{
                        width: "100%",
                        height: 70,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </button>
                ) : null}
              </div>
            );
          })}

          {filtered.length === 0 ? (
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
