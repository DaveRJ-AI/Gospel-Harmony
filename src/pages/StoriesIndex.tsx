import React from "react";
import { useNavigate } from "react-router-dom";
import StorySearch from "../components/StorySearch";
import { loadHarmony } from "../lib/harmony";

export default function StoriesIndex() {
  const nav = useNavigate();
  const [error, setError] = React.useState<string | null>(null);
  const [pericopes, setPericopes] = React.useState<any[]>([]);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const h = await loadHarmony();
        if (!alive) return;
        setPericopes(h.pericopes);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load events");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: "0 0 6px 0" }}>Events</h2>
        <p className="muted" style={{ margin: 0 }}>
          Search Gospel events and open them in the 4-column harmonized view.
        </p>
      </div>

      <StorySearch pericopes={pericopes} onPick={(id) => nav(`/story/${id}`)} />
    </div>
  );
}