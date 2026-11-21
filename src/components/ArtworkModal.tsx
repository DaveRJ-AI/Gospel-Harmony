import React from "react";
import type { ArtworkItem } from "../lib/artwork";

export default function ArtworkModal(props: {
  items: ArtworkItem[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const { items, initialIndex = 0, onClose } = props;
  const [index, setIndex] = React.useState(initialIndex);
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();

  const item = items[index];
  const hasItem = Boolean(item);

  React.useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!hasItem || !dialog) return;

    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    closeButtonRef.current?.focus();

    return () => {
      dialog.close();
      document.body.style.overflow = prevOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [hasItem]);

  function changeImage(offset: number) {
    setIndex((current) => (current + offset + items.length) % items.length);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Tab") {
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.target === (event.shiftKey ? first : last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
      return;
    }

    if (items.length < 2 || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      changeImage(event.key === "ArrowLeft" ? -1 : 1);
    }
  }

  if (!item) return null;

  return (
    <dialog
      ref={dialogRef}
      className="artworkDialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          maxHeight: "92vh",
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
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
            <div id={titleId} style={{ fontWeight: 700 }}>{item.title}</div>
            {item.caption ? (
              <div style={{ color: "#6b7280", fontSize: 14 }}>{item.caption}</div>
            ) : null}
          </div>

          <button ref={closeButtonRef} onClick={onClose} type="button">
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
              <button type="button" onClick={() => changeImage(-1)}>
                Previous
              </button>
              <button type="button" onClick={() => changeImage(1)}>
                Next
              </button>
            </div>
          ) : <div />}
        </div>
      </div>
    </dialog>
  );
}
