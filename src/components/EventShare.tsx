import React from "react";
import type { Version } from "../lib/refs";

export default function EventShare({ eventId, title, version }: {
  eventId: string;
  title: string;
  version: Version;
}) {
  const path = `/story/${encodeURIComponent(eventId)}${version === "ESV" ? "?version=ESV" : ""}`;
  return <ShareLink path={path} title={title} linkLabel="Event link" />;
}

export function ShareLink({ path, title, label = "Share", linkLabel }: {
  path: string;
  title: string;
  label?: string;
  linkLabel: string;
}) {
  const [feedback, setFeedback] = React.useState<"copied" | "manual" | null>(null);
  const [sharing, setSharing] = React.useState(false);
  const url = new URL(path, window.location.origin);

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
      <button type="button" onClick={share} disabled={sharing}>{label}</button>
      <span className="muted" role="status">
        {feedback === "copied" ? "Link copied" : null}
        {feedback === "manual" ? "Copy the link below." : null}
      </span>
      {feedback === "manual" ? (
        <input
          aria-label={linkLabel}
          value={url.href}
          readOnly
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
