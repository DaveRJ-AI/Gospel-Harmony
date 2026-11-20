import React from "react";
import type { Version } from "../lib/refs";

export default function EventShare({ eventId, title, version }: {
  eventId: string;
  title: string;
  version: Version;
}) {
  const [feedback, setFeedback] = React.useState<"copied" | "manual" | null>(null);
  const [sharing, setSharing] = React.useState(false);
  const url = new URL(`/story/${encodeURIComponent(eventId)}`, window.location.origin);
  if (version === "ESV") url.searchParams.set("version", version);

  async function share() {
    setFeedback(null);
    setSharing(true);
    try {
      const data = { title, url: url.href };
      if (navigator.share) {
        try {
          await navigator.share(data);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }

      try {
        await navigator.clipboard.writeText(url.href);
        setFeedback("copied");
      } catch {
        setFeedback("manual");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="eventShare">
      <button type="button" onClick={share} disabled={sharing}>Share</button>
      <span className="muted" role="status">
        {feedback === "copied" ? "Link copied" : null}
        {feedback === "manual" ? "Copy the event link below." : null}
      </span>
      {feedback === "manual" ? (
        <input
          aria-label="Event link"
          value={url.href}
          readOnly
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
