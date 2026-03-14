import React from "react";
import type { ArtworkItem } from "../lib/artwork";

export default function ArtworkModal(props: {
  items: ArtworkItem[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const { items, initialIndex = 0, onClose } = props;
  const [index, setIndex] = React.useState(initialIndex);

  const item = items[index];

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && items.length > 1) {
        setIndex((i) => (i + 1) % items.length);
      }
      if (e.key === "ArrowLeft" && items.length > 1) {
        setIndex((i) => (i - 1 + items.length) % items.length);
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [items.length, onClose]);

  if (!item) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, 96vw)",
          maxHeight: "92vh",
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{item.title}</div>
            {item.caption ? (
              <div style={{ color: "#6b7280", fontSize: 14 }}>{item.caption}</div>
            ) : null}
          </div>

          <button onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "#f8fafc",
            overflow: "auto",
          }}
        >
          <img
            src={item.image}
            alt={item.title}
            style={{
              maxWidth: "100%",
              maxHeight: "72vh",
              objectFit: "contain",
              borderRadius: 10,
            }}
          />
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ color: "#6b7280", fontSize: 14 }}>
            {items.length > 1 ? `${index + 1} of ${items.length}` : "Artwork"}
          </div>

          {items.length > 1 ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}>
                Previous
              </button>
              <button type="button" onClick={() => setIndex((i) => (i + 1) % items.length)}>
                Next
              </button>
            </div>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}