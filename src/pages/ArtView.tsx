import React from "react";
import { useNavigate } from "react-router-dom";
import ArtworkModal from "../components/ArtworkModal";
import {
  artworkForPericope,
  loadArtworkMap,
  type ArtworkItem,
  type ArtworkMap,
} from "../lib/artwork";
import { loadHarmony, type Pericope } from "../lib/harmony";
import type { Version } from "../lib/refs";

type ArtCardItem = {
  pericopeId: string;
  storyTitle: string;
  summary: string;
  artworkIndex: number;
  artwork: ArtworkItem;
};

export default function ArtView() {
  const navigate = useNavigate();

  const [version, setVersion] = React.useState<Version>("KJV");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [cards, setCards] = React.useState<ArtCardItem[]>([]);
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
              pericopeId,
              storyTitle: pericope.title,
              summary: pericope.summary,
              artworkIndex,
              artwork,
            });
          });
        }

        nextCards.sort((a, b) => a.storyTitle.localeCompare(b.storyTitle));

        setArtworkMap(artMap);
        setCards(nextCards);
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
    const q = query.trim().toLowerCase();
    if (!q) return cards;

    return cards.filter((card) => {
      const hay = [
        card.storyTitle,
        card.summary,
        card.artwork.title,
        card.artwork.caption || "",
        card.artwork.artist || "",
        card.artwork.source || "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [cards, query]);

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
              placeholder="Search story title or artwork..."
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label>Version</label>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value as Version)}
            >
              <option value="KJV">KJV</option>
              <option value="ESV">ESV</option>
            </select>
          </div>
        </div>

        <p className="muted" style={{ marginTop: 10 }}>
          Browse artwork by story. View the image or jump directly to the related passages.
        </p>
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
            const storyArtItems = artworkForPericope(artworkMap, card.pericopeId);

            return (
              <div
                key={`${card.pericopeId}-${card.artworkIndex}-${card.artwork.image}`}
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
                    src={card.artwork.thumbnail || card.artwork.image}
                    alt={card.artwork.title}
                    style={{
                      width: "100%",
                      height: 180,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </button>

                <div style={{ padding: 14, display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>{card.storyTitle}</div>

                  {card.artwork.title && card.artwork.title !== card.storyTitle ? (
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
                    {card.summary}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
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
                      onClick={() =>
                        navigate(`/story/${card.pericopeId}?version=${version}`)
                      }
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