import React from "react";
import ArtworkModal from "../components/ArtworkModal";
import { useEventBrowse } from "../hooks/useEventBrowse";
import {
  artworkForPericope,
  loadArtworkMap,
  type ArtworkItem,
  type ArtworkMap,
} from "../lib/artwork";
import { loadHarmony, type Pericope } from "../lib/harmony";
import { createEventSearch, type EventSearch } from "../lib/eventSearch";

type ArtCardItem = {
  id: string;
  pericope: Pericope;
  artworkIndex: number;
  artwork: ArtworkItem;
};

export default function ArtView() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { version, query, esvUnavailable, setVersion, setQuery, openEvent } = useEventBrowse(!loading && !error);

  const [cards, setCards] = React.useState<ArtCardItem[]>([]);
  const [eventSearch, setEventSearch] = React.useState<EventSearch>();
  const [artworkMap, setArtworkMap] = React.useState<ArtworkMap>({});

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

        const pericopeMap = new Map<string, Pericope>();
        for (const p of harmony.pericopes) {
          pericopeMap.set(p.pericopeId, p);
        }

        const nextCards: ArtCardItem[] = [];

        for (const [pericopeId, items] of Object.entries(artMap)) {
          const pericope = pericopeMap.get(pericopeId);
          if (!pericope || !items.length) continue;

          items.forEach((artwork, artworkIndex) => {
            nextCards.push({
              id: `${pericopeId}-${artworkIndex}`,
              pericope,
              artworkIndex,
              artwork,
            });
          });
        }

        nextCards.sort((a, b) => a.pericope.title.localeCompare(b.pericope.title));

        setArtworkMap(artMap);
        setCards(nextCards);
        setEventSearch(createEventSearch(harmony, nextCards));
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load artwork");
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
    if (!query.trim() || !eventSearch) return cards;
    const byId = new Map(cards.map((card) => [card.id, card]));
    return eventSearch.find(query).flatMap((id) => byId.get(id) ?? []);
  }, [cards, query, eventSearch]);

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <div>
      <div className="card">
        <div
          className="row"
          style={{ alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <label>Search artwork</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artwork, events, or references..."
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label>Version</label>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            >
              <option value="KJV">KJV</option>
              <option value="ESV" disabled={esvUnavailable}>
                ESV
              </option>
            </select>
          </div>
        </div>

        <p className="muted" style={{ marginTop: 10 }}>
          Browse artwork by story. View the image or jump directly to the related passages.
        </p>
        {esvUnavailable ? (
          <p className="muted" style={{ marginTop: 8 }}>
            ESV is unavailable until <code>ESV_API_KEY</code> is configured.
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Loading artwork…
        </p>
      ) : null}

      {!loading ? (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((card) => {
            const storyArtItems = artworkForPericope(artworkMap, card.pericope.pericopeId);
            const anchor = `event-${card.id}`;

            return (
              <div
                key={card.id}
                className="card interactiveCard"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <button
                  type="button"
                  className="artThumbButton"
                  onClick={() => {
                    setModalItems(storyArtItems);
                    setModalIndex(card.artworkIndex);
                  }}
                  style={{
                    border: "none",
                    padding: 0,
                    margin: 0,
                    background: "#FFFFFF",
                    cursor: "pointer",
                    display: "block",
                    borderRadius: 0,
                  }}
                  title="Open artwork"
                >
                  <img
                    src={card.artwork.gallery?.image || card.artwork.thumbnail || card.artwork.image}
                    alt={card.artwork.title}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: "100%",
                      aspectRatio: "5 / 4",
                      objectFit: "cover",
                      objectPosition: card.artwork.gallery?.position,
                      display: "block",
                    }}
                  />
                </button>

                <div
                  style={{
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{card.pericope.title}</div>

                  {card.artwork.title && card.artwork.title !== card.pericope.title ? (
                    <div className="muted" style={{ fontSize: 14 }}>
                      {card.artwork.title}
                    </div>
                  ) : null}

                  <div
                    className="muted"
                    style={{
                      fontSize: 14,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {card.pericope.summary}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: "auto",
                      paddingTop: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setModalItems(storyArtItems);
                        setModalIndex(card.artworkIndex);
                      }}
                    >
                      View Art
                    </button>

                    <button
                      type="button"
                      id={anchor}
                      onClick={() => openEvent(card.pericope.pericopeId, anchor)}
                    >
                      Open Story
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 ? (
            <div className="card">
              <p className="muted">No artwork matched your search.</p>
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
