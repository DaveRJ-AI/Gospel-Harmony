import React from "react";
import { Link } from "react-router-dom";
import type { GospelId } from "../../types/mapTypes";

type Props = {
  placeId?: string;
  episodeId?: string;
  gospels?: GospelId[];
  label?: string;
};

export default function MapLinkButton({
  placeId,
  episodeId,
  gospels,
  label = "Map",
}: Props) {
  const params = new URLSearchParams();

  if (placeId) params.set("place", placeId);
  if (episodeId) params.set("episode", episodeId);
  if (gospels?.length) params.set("gospels", gospels.join(","));

  const to = `/map${params.toString() ? `?${params.toString()}` : ""}`;

  return (
    <Link
      to={to}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid #CBD5E1",
        background: "#FFFFFF",
        color: "#0F172A",
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 600,
      }}
      title="Open related places on the map"
    >
      <span aria-hidden="true">🗺️</span>
      <span>{label}</span>
    </Link>
  );
}