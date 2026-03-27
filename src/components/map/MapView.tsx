import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  Episode,
  GospelId,
  PlaceWithOverlay,
} from "../../types/mapTypes";
import {
  buildMapGraphData,
  getCombinedTravelPoints,
  getEpisodesForPlace,
  loadMapDataBundle,
} from "../../data/map/mapDataLoader";

const GOSPELS: GospelId[] = ["matthew", "mark", "luke", "john"];

type PositionedNode = PlaceWithOverlay & {
  x: number;
  y: number;
};

type HoverTooltipData = {
  node: PositionedNode;
  x: number;
  y: number;
};

type TravelStopBadge = {
  gospel: GospelId;
  order: number;
  label: string;
  isStart: boolean;
  isEnd: boolean;
};

type SegmentMarker = {
  gospel: GospelId;
  label: string;
  x: number;
  y: number;
  isRegionTransition?: boolean;
};

const SVG_WIDTH = 1450;
const SVG_HEIGHT = 1220;

const REGION_TEXT_COLORS: Record<string, string> = {
  galilee: "#3B82F6",
  samaria: "#16A34A",
  judea: "#B45309",
  perea: "#0891B2",
  decapolis: "#7C3AED",
  egypt: "#92400E",
"tyre-and-sidon": "#0F766E",
  transjordan: "#0F766E",
  "judean-wilderness": "#78716C",
  default: "#94A3B8",
};

const RELATIONAL_NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  // Galilee
  nazareth: { x: 220, y: 275 },
  capernaum: { x: 410, y: 205 },
  chorazin: { x: 420, y: 330 },
  cana: { x: 555, y: 285 },
  bethsaida: { x: 650, y: 400 },
  magdala: { x: 540, y: 470 },
  "sea-of-galilee": { x: 375, y: 535 },
  nain: { x: 240, y: 455 },
  egypt: { x: 180, y: 1060 },
"tyre-and-sidon": { x: 220, y: 120 },

  // Samaria
  sychar: { x: 735, y: 600 },

  // Perea / Decapolis gateway
  "jordan-river": { x: 1215, y: 620 },

  // Judea
  bethlehem: { x: 835, y: 765 },
  jerusalem: { x: 980, y: 835 },
  gethsemane: { x: 1095, y: 900 },
  "mount-of-olives": { x: 905, y: 955 },
  bethany: { x: 1045, y: 955 },
  wilderness: { x: 1265, y: 940 },
  jericho: { x: 760, y: 1015 },
  "empty-tomb": { x: 950, y: 1125 },
  golgotha: { x: 1115, y: 1135 },
};


const LABEL_OFFSETS: Record<
  string,
  { dx?: number; dy?: number; anchor?: "start" | "middle" | "end" }
> = {
  nazareth: { dx: 0, dy: 18, anchor: "middle" },
  capernaum: { dx: 0, dy: 18, anchor: "middle" },
  chorazin: { dx: 0, dy: 18, anchor: "middle" },
  cana: { dx: 0, dy: 18, anchor: "middle" },
  bethsaida: { dx: 0, dy: 18, anchor: "middle" },
  magdala: { dx: 0, dy: 18, anchor: "middle" },
  "sea-of-galilee": { dx: 0, dy: 20, anchor: "middle" },
  nain: { dx: 0, dy: 18, anchor: "middle" },

  sychar: { dx: 0, dy: 18, anchor: "middle" },
  "jordan-river": { dx: 0, dy: 20, anchor: "middle" },

  bethlehem: { dx: 0, dy: 18, anchor: "middle" },
  jerusalem: { dx: 0, dy: 18, anchor: "middle" },
  gethsemane: { dx: 12, dy: 12, anchor: "start" },
  "mount-of-olives": { dx: 0, dy: 18, anchor: "middle" },
  bethany: { dx: 0, dy: 18, anchor: "middle" },
  wilderness: { dx: 0, dy: 20, anchor: "middle" },
  jericho: { dx: 0, dy: 18, anchor: "middle" },
  golgotha: { dx: 0, dy: 18, anchor: "middle" },
  "empty-tomb": { dx: 0, dy: 18, anchor: "middle" },
};

const MARKER_NUDGES: Record<string, { dx: number; dy: number }> = {
  "matthew-7": { dx: -22, dy: -12 },
  "matthew-8": { dx: -10, dy: 12 },
  "matthew-9": { dx: 0, dy: -14 },
  "matthew-10": { dx: -14, dy: 6 },
  "matthew-11": { dx: -10, dy: -4 },
  "matthew-12": { dx: -14, dy: 10 },
  "matthew-14": { dx: -16, dy: 6 },
  "matthew-15": { dx: 14, dy: 10 },

  "mark-5": { dx: 10, dy: 8 },
  "mark-6": { dx: 14, dy: -2 },
  "mark-10": { dx: -10, dy: 10 },
  "mark-12": { dx: -10, dy: 8 },
  "mark-14": { dx: -12, dy: 6 },

  "luke-7": { dx: -8, dy: -6 },
  "luke-8": { dx: -12, dy: 10 },
  "luke-9": { dx: -8, dy: 8 },
  "luke-10": { dx: 0, dy: -12 },
  "luke-11": { dx: 6, dy: 10 },
  "luke-12": { dx: 10, dy: 6 },
  "luke-14": { dx: -18, dy: 12 },

  "john-5": { dx: 10, dy: -6 },
  "john-9": { dx: -12, dy: 10 },
  "john-11": { dx: -12, dy: 10 },
  "john-12": { dx: 8, dy: 6 },
  "john-13": { dx: 10, dy: -2 },
  "john-14": { dx: -10, dy: 10 },
  "john-15": { dx: 10, dy: 12 },
  "john-16": { dx: -10, dy: 8 },
  "john-17": { dx: 10, dy: 10 },
};

const panelStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: 12,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 10px 0",
  color: "#64748B",
};

function getRegionColor(region: string | null): string {
  if (!region) return REGION_TEXT_COLORS.default;
  return REGION_TEXT_COLORS[region] ?? REGION_TEXT_COLORS.default;
}

function getNodeRadius(type: string): number {
  switch (type) {
    case "city":
      return 10;
    case "town":
      return 7;
    case "village":
      return 6;
    case "lake":
      return 12;
    case "river":
      return 9;
    case "mount":
      return 7;
    case "garden":
      return 6;
    case "site":
      return 6;
    case "area":
      return 12;
    default:
      return 7;
  }
}

function getNodeFill(
  node: PlaceWithOverlay,
  selectedPlaceId: string | null,
  highlightedPlaceIds: Set<string>
): { fill: string; stroke: string } {
  const selected = selectedPlaceId === node.id;
  const highlighted = highlightedPlaceIds.has(node.id);

  if (selected) return { fill: "#F59E0B", stroke: "#7C2D12" };
  if (highlighted) return { fill: "#38BDF8", stroke: "#075985" };

  if (node.type === "lake") {
    return { fill: "#A5F3FC", stroke: "#0E7490" };
  }

  if (node.type === "river") {
    return { fill: "#CFFAFE", stroke: "#0E7490" };
  }

  if (node.type === "area") {
    return { fill: "#E7E5E4", stroke: "#57534E" };
  }

  return {
    fill: "#FFFFFF",
    stroke: getRegionColor(node.region),
  };
}

function buildRelationalLayout(nodes: PlaceWithOverlay[]): PositionedNode[] {
  return nodes.map((node) => {
    const fallback = { x: 600, y: 410 };
    return {
      ...node,
      ...(RELATIONAL_NODE_POSITIONS[node.id] ?? fallback),
    };
  });
}

function LegendNode({
  fill,
  stroke,
  label,
  size = 14,
  shape = "circle",
}: {
  fill: string;
  stroke: string;
  label: string;
  size?: number;
  shape?: "circle" | "square";
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: "#475569",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" style={{ flex: "0 0 auto" }}>
        {shape === "circle" ? (
          <circle cx="11" cy="11" r={size / 2} fill={fill} stroke={stroke} strokeWidth="2" />
        ) : (
          <rect
            x={11 - size / 2}
            y={11 - size / 2}
            width={size}
            height={size}
            rx="4"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
          />
        )}
      </svg>
      <span>{label}</span>
    </div>
  );
}

function StartPin({
  x,
  y,
  color,
  label,
}: {
  x: number;
  y: number;
  color: string;
  label: string;
}) {
  return (
    <g>
      <circle cx={x} cy={y - 2} r={8} fill={color} stroke="#0F172A" strokeWidth={1.4} />
      <path
        d={`M ${x - 4} ${y + 4} L ${x} ${y + 12} L ${x + 4} ${y + 4} Z`}
        fill={color}
        stroke="#0F172A"
        strokeWidth={1.2}
      />
      <text
        x={x}
        y={y + 1.2}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#FFFFFF"
      >
        {label}
      </text>
    </g>
  );
}

function RegionUnderlay({
  cx,
  cy,
  rx,
  ry,
  color,
  rotate = 0,
  isSelected = false,
  onClick,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  rotate?: number;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  return (
    <>
      {isSelected && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx + 6}
          ry={ry + 6}
          fill="none"
          stroke={color}
          strokeWidth={2.2}
          opacity={0.35}
          transform={rotate ? `rotate(${rotate} ${cx} ${cy})` : undefined}
          style={{ cursor: onClick ? "pointer" : "default" }}
          onClick={onClick}
        />
      )}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={color}
        opacity={isSelected ? 0.16 : 0.08}
        transform={rotate ? `rotate(${rotate} ${cx} ${cy})` : undefined}
        style={{ cursor: onClick ? "pointer" : "default" }}
        onClick={onClick}
      />
    </>
  );
}


export default function MapView() {
  const bundle = useMemo(() => loadMapDataBundle(), []);
  const graph = useMemo(() => buildMapGraphData(bundle), [bundle]);

  const [searchParams] = useSearchParams();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const placesListRef = useRef<HTMLDivElement | null>(null);

  const [enabledGospels, setEnabledGospels] = useState<GospelId[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    null
  );
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltipData | null>(null);
  const [placesOverflow, setPlacesOverflow] = useState(false);

  const nodes = useMemo<PositionedNode[]>(() => {
    return buildRelationalLayout(graph.nodes);
  }, [graph.nodes]);

  const nodesById = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    for (const node of nodes) map.set(node.id, node);
    return map;
  }, [nodes]);

  const selectedPlace = selectedPlaceId
    ? nodesById.get(selectedPlaceId) ?? null
    : null;

    const selectedRegionId =
  selectedPlace && selectedPlace.type === "region" ? selectedPlace.id : null;

  const placeEpisodes = useMemo(() => {
    if (!selectedPlaceId) return [];
    return getEpisodesForPlace(selectedPlaceId, bundle);
  }, [selectedPlaceId, bundle]);

  const selectedEpisode: Episode | null = useMemo(() => {
    if (!selectedEpisodeId) return null;
    return bundle.episodes.find((ep) => ep.id === selectedEpisodeId) ?? null;
  }, [selectedEpisodeId, bundle.episodes]);

  const episodeHighlightedPlaceIds = useMemo(() => {
    return new Set(selectedEpisode?.placeIds ?? []);
  }, [selectedEpisode]);

  const travelPoints = useMemo(() => {
    return getCombinedTravelPoints(enabledGospels, bundle);
  }, [enabledGospels, bundle]);

  const travelColorByGospel: Record<GospelId, string> = {
    matthew: "#2563EB",
    mark: "#DC2626",
    luke: "#16A34A",
    john: "#9333EA",
  };

  useEffect(() => {
    const place = searchParams.get("place");
    const episode = searchParams.get("episode");
    const gospelParam = searchParams.get("gospels");

    if (place) {
      setSelectedPlaceId(place);
      setSelectedEpisodeId(null);
    }

    if (episode) {
      setSelectedEpisodeId(episode);
      const found = bundle.episodes.find((ep) => ep.id === episode);
      if (found?.placeIds?.length) {
        setSelectedPlaceId(found.placeIds[0]);
      }
    }

    if (gospelParam) {
      const parsed = gospelParam
        .split(",")
        .map((g) => g.trim().toLowerCase())
        .filter(
          (g): g is GospelId =>
            g === "matthew" || g === "mark" || g === "luke" || g === "john"
        );

      setEnabledGospels(parsed);
    }
  }, [searchParams, bundle.episodes]);

  useEffect(() => {
    const checkOverflow = () => {
      const el = placesListRef.current;
      if (!el) return;
      setPlacesOverflow(el.scrollHeight > el.clientHeight + 4);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [nodes]);

  const travelStopsByPlace = useMemo(() => {
    const map = new Map<string, TravelStopBadge[]>();

    for (const gospel of enabledGospels) {
      const gospelPoints = travelPoints
        .filter((point) => point.gospel === gospel)
        .sort((a, b) => a.order - b.order);

      const lastIndex = gospelPoints.length - 1;

      gospelPoints.forEach((point, index) => {
        const badge: TravelStopBadge = {
          gospel,
          order: point.order,
          label: String(index + 1),
          isStart: index === 0,
          isEnd: index === lastIndex,
        };

        if (!map.has(point.placeId)) {
          map.set(point.placeId, []);
        }
        map.get(point.placeId)!.push(badge);
      });
    }

    for (const badges of map.values()) {
      badges.sort((a, b) => {
        if (a.isStart !== b.isStart) return a.isStart ? -1 : 1;
        if (a.isEnd !== b.isEnd) return a.isEnd ? -1 : 1;
        if (a.gospel === b.gospel) return a.order - b.order;
        return a.gospel.localeCompare(b.gospel);
      });
    }

    return map;
  }, [enabledGospels, travelPoints]);

  const travelNodeMarkersByPlace = useMemo(() => {
    const map = new Map<
      string,
      Array<{ gospel: GospelId; isStart: boolean; isEnd: boolean; label: string }>
    >();

    for (const gospel of enabledGospels) {
      const gospelPoints = travelPoints
        .filter((point) => point.gospel === gospel)
        .sort((a, b) => a.order - b.order);

      if (gospelPoints.length === 0) continue;

      const first = gospelPoints[0];
      const last = gospelPoints[gospelPoints.length - 1];

      if (!map.has(first.placeId)) map.set(first.placeId, []);
      map.get(first.placeId)!.push({
        gospel,
        isStart: true,
        isEnd: false,
        label: "1",
      });

      if (!map.has(last.placeId)) map.set(last.placeId, []);
      map.get(last.placeId)!.push({
        gospel,
        isStart: false,
        isEnd: true,
        label: String(gospelPoints.length),
      });
    }

    return map;
  }, [enabledGospels, travelPoints]);

  const travelSegmentMarkers = useMemo<SegmentMarker[]>(() => {
    const markers: SegmentMarker[] = [];
    const activeCount = enabledGospels.length;

    const gospelOffsets: Record<GospelId, number> = {
      matthew: -16,
      mark: -5,
      luke: 5,
      john: 16,
    };

    const progressByCount: Record<number, number[]> = {
      1: [0.5],
      2: [0.42, 0.58],
      3: [0.36, 0.5, 0.64],
      4: [0.32, 0.44, 0.56, 0.68],
    };

    const gospelOrder: GospelId[] = ["matthew", "mark", "luke", "john"];
    const activeOrdered = gospelOrder.filter((g) => enabledGospels.includes(g));
    const progressValues = progressByCount[Math.min(activeCount, 4)] ?? [0.5];

    for (const gospel of enabledGospels) {
      const gospelPoints = travelPoints
        .filter((point) => point.gospel === gospel)
        .sort((a, b) => a.order - b.order);

      const activeIndex = Math.max(0, activeOrdered.indexOf(gospel));

      for (let i = 0; i < gospelPoints.length - 1; i += 1) {
        const from = nodesById.get(gospelPoints[i].placeId);
        const to = nodesById.get(gospelPoints[i + 1].placeId);
        if (!from || !to) continue;

        const t =
          activeCount <= 1
            ? 0.5
            : progressValues[Math.min(activeIndex, progressValues.length - 1)];

        const baseX = from.x + (to.x - from.x) * t;
        const baseY = from.y + (to.y - from.y) * t;

        let x = baseX;
        let y = baseY;

        if (activeCount > 1) {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const nx = -dy / len;
          const ny = dx / len;
          const normalOffset = gospelOffsets[gospel];

          x = baseX + nx * normalOffset;
          y = baseY + ny * normalOffset;
        }

        const nudgeKey = `${gospel}-${i + 2}`;
        const nudge = MARKER_NUDGES[nudgeKey] ?? { dx: 0, dy: 0 };

        x += nudge.dx;
        y += nudge.dy;

        const isRegionTransition =
  from.type === "region" || to.type === "region";

        markers.push({
          gospel,
          label: String(i + 2),
          x,
          y,
          isRegionTransition,
        });
      }
    }

    return markers;
  }, [enabledGospels, travelPoints, nodesById]);

  function toggleGospel(gospel: GospelId) {
    setEnabledGospels((current) =>
      current.includes(gospel)
        ? current.filter((g) => g !== gospel)
        : [...current, gospel]
    );
  }

  function togglePlace(placeId: string) {
    setSelectedPlaceId((current) => {
      if (current === placeId) return null;
      return placeId;
    });

    setSelectedEpisodeId((currentEpisodeId) => {
      if (selectedPlaceId === placeId) {
        return null;
      }
      return currentEpisodeId;
    });
  }

  function toggleEpisode(episodeId: string) {
    setSelectedEpisodeId((current) => {
      if (current === episodeId) return null;
      return episodeId;
    });

    if (selectedEpisodeId === episodeId) {
      return;
    }

    const episode = bundle.episodes.find((ep) => ep.id === episodeId);
    if (episode?.placeIds?.length) {
      setSelectedPlaceId(episode.placeIds[0]);
    }
  }

  function updateTooltipPosition(
    event: React.MouseEvent,
    node: PositionedNode
  ) {
    if (!mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();

    setHoverTooltip({
      node,
      x: event.clientX - rect.left + 14,
      y: event.clientY - rect.top + 14,
    });
  }

  function getNodeMarkerSlots(node: PositionedNode, radius: number) {
    const x = node.x;
    const y = node.y;
    const d = radius + 10;

    const custom: Record<string, Array<{ x: number; y: number }>> = {
      "jordan-river": [
        { x: x + d + 6, y: y - d - 4 },
        { x: x + d + 20, y: y + 4 },
        { x: x - d - 6, y: y - d - 2 },
        { x: x - d - 18, y: y + 6 },
      ],
      jerusalem: [
        { x: x + d + 2, y: y - d + 2 },
        { x: x - d - 2, y: y - d + 2 },
        { x: x + d + 2, y: y + d - 2 },
        { x: x - d - 2, y: y + d - 2 },
      ],
    };

    if (custom[node.id]) return custom[node.id];

    return [
      { x: x + d, y: y - d },
      { x: x - d, y: y - d },
      { x: x + d, y: y + d - 4 },
      { x: x - d, y: y + d - 4 },
    ];
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "2rem",
            lineHeight: 1.1,
            color: "#0F172A",
          }}
        >
          Gospel Map
        </h2>
        <p
          style={{
            margin: "8px 0 0 0",
            fontSize: "0.95rem",
            color: "#64748B",
          }}
        >
          Relational geography with Gospel travel paths.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          width: "100%",
          flexWrap: "nowrap",
        }}
      >
        <aside
          style={{
            width: 320,
            minWidth: 320,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignSelf: "flex-start",
          }}
        >
          <section style={panelStyle}>
            <h3 style={panelTitleStyle}>Gospel travel sequences</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {GOSPELS.map((gospel) => {
                const active = enabledGospels.includes(gospel);
                const color = travelColorByGospel[gospel];

                return (
                  <button
                    key={gospel}
                    type="button"
                    onClick={() => toggleGospel(gospel)}
                    style={{
                      border: active
                        ? `1px solid ${color}`
                        : "1px solid #E2E8F0",
                      background: active ? `${color}14` : "#FFFFFF",
                      color: active ? color : "#334155",
                      borderRadius: 999,
                      padding: "8px 12px",
                      fontSize: 14,
                      fontWeight: active ? 700 : 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: color,
                        display: "inline-block",
                      }}
                    />
                    <span style={{ textTransform: "capitalize" }}>{gospel}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={panelStyle}>
            <h3 style={panelTitleStyle}>Places</h3>
            <div style={{ position: "relative" }}>
              <div
                ref={placesListRef}
                style={{
                  maxHeight: 340,
                  overflowY: "auto",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  paddingBottom: 8,
                }}
              >
                {nodes
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => {
                        togglePlace(node.id);
                      }}
                      style={{
                        borderRadius: 999,
                        padding: "7px 12px",
                        fontSize: 14,
                        cursor: "pointer",
                        background:
                          selectedPlaceId === node.id ? "#DBEAFE" : "#F1F5F9",
                        color:
                          selectedPlaceId === node.id ? "#1D4ED8" : "#0F172A",
                        fontWeight: selectedPlaceId === node.id ? 700 : 500,
                        border:
                          selectedPlaceId === node.id
                            ? "1px solid #93C5FD"
                            : "1px solid transparent",
                      }}
                    >
                      {node.name}
                    </button>
                  ))}
              </div>

              {placesOverflow && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 22,
                      height: 28,
                      background:
                        "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.92))",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 11,
                      color: "#64748B",
                      marginTop: 4,
                    }}
                  >
                    Scroll for more places
                  </div>
                </>
              )}
            </div>
          </section>

          <section style={panelStyle}>
            <h3 style={panelTitleStyle}>Selected place</h3>
            {!selectedPlace ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#64748B",
                }}
              >
                Select a place on the map or from the list.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 14,
                  color: "#334155",
                }}
              >
                <div>
                  <strong>Name:</strong> {selectedPlace.name}
                </div>
                <div>
                  <strong>Type:</strong> {selectedPlace.type}
                </div>
                <div>
                  <strong>Region:</strong> {selectedPlace.region ?? "—"}
                </div>
                <div>
                  <strong>Certainty:</strong> {selectedPlace.certainty}
                </div>
                {selectedPlace.modernOverlay && (
                  <div>
                    <strong>Modern:</strong>{" "}
                    {selectedPlace.modernOverlay.modernName}
                  </div>
                )}
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <h3 style={panelTitleStyle}>Events at selected place</h3>
            {placeEpisodes.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#64748B",
                }}
              >
                No mapped episodes for this place yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {placeEpisodes.map((episode) => (
                  <button
                    key={episode.id}
                    type="button"
                    onClick={() => toggleEpisode(episode.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      borderRadius: 12,
                      border:
                        selectedEpisodeId === episode.id
                          ? "1px solid #0EA5E9"
                          : "1px solid #E2E8F0",
                      background:
                        selectedEpisodeId === episode.id ? "#F0F9FF" : "#F8FAFC",
                      color:
                        selectedEpisodeId === episode.id
                          ? "#0C4A6E"
                          : "#334155",
                      padding: "10px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{episode.title}</div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "#64748B",
                        textTransform: "capitalize",
                      }}
                    >
                      {episode.gospels.join(", ")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </aside>

        <main
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
                background: "#FFFFFF",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "1.35rem",
                    color: "#0F172A",
                  }}
                >
                  Relational Gospel Map
                </h1>
                <p
                  style={{
                    margin: "6px 0 0 0",
                    fontSize: 14,
                    color: "#64748B",
                  }}
                >
                  {`${nodes.length} places and ${graph.edges.length} relationships`}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {enabledGospels.map((gospel) => (
                  <div
                    key={gospel}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 999,
                      padding: "6px 10px",
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      fontSize: 12,
                      color: "#334155",
                      textTransform: "capitalize",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: travelColorByGospel[gospel],
                      }}
                    />
                    <span>{gospel}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid #E2E8F0",
                background: "#FFFFFF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 14,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LegendNode fill="#FFFFFF" stroke="#334155" label="Town / city / site" size={10} />
                <LegendNode fill="#A5F3FC" stroke="#0E7490" label="Water feature" size={12} />
                <LegendNode fill="#E7E5E4" stroke="#57534E" label="Area / wilderness" size={12} />
                <LegendNode fill="#F59E0B" stroke="#7C2D12" label="Selected place" size={12} />
                <LegendNode fill="#38BDF8" stroke="#075985" label="Episode highlight" size={12} />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "#475569",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <circle cx="12" cy="9" r="6" fill="#2563EB" stroke="#0F172A" strokeWidth="1.4" />
                    <path
                      d="M8.8 13.3 L12 19.5 L15.2 13.3 Z"
                      fill="#2563EB"
                      stroke="#0F172A"
                      strokeWidth="1.1"
                    />
                    <text
                      x="12"
                      y="11.8"
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="700"
                      fill="#FFFFFF"
                    >
                      1
                    </text>
                  </svg>
                  <span>Start</span>
                </div>
                <LegendNode fill="#2563EB" stroke="#0F172A" label="End" size={12} shape="square" />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "#475569",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9.5" fill="#2563EB" />
                    <text
                      x="12"
                      y="15.2"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill="#FFFFFF"
                    >
                      2
                    </text>
                  </svg>
                  <span>Sequence on path</span>
                </div>

                <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "#475569",
  }}
>
  <svg width="24" height="24" viewBox="0 0 24 24">
    <rect
      x="6"
      y="6"
      width="12"
      height="12"
      rx="2"
      transform="rotate(45 12 12)"
      fill="#2563EB"
      stroke="#FFFFFF"
      strokeWidth="1.2"
    />
    <text
      x="12"
      y="15"
      textAnchor="middle"
      fontSize="8"
      fontWeight="700"
      fill="#FFFFFF"
    >
      3
    </text>
  </svg>
  <span>Region transition</span>
</div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "#475569",
                  }}
                >
                  <svg width="34" height="14" viewBox="0 0 34 14">
                    <line
                      x1="1"
                      y1="7"
                      x2="33"
                      y2="7"
                      stroke="#2563EB"
                      strokeWidth="3"
                      strokeDasharray="8 5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>Active Gospel path</span>
                </div>
              </div>
            </div>

            <div
              ref={mapContainerRef}
              style={{
                position: "relative",
                height: 820,
                overflow: "auto",
                background: "#F8FAFC",
              }}
              onMouseLeave={() => setHoverTooltip(null)}
            >
              <svg
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                style={{
                  width: "100%",
                  height: "100%",
                  minWidth: 900,
                  display: "block",
                }}
                role="img"
                aria-label="Gospel map visualization"
              >
<RegionUnderlay
  cx={400}
  cy={380}
  rx={360}
  ry={250}
  color={REGION_TEXT_COLORS.galilee}
  rotate={-8}
    isSelected={selectedRegionId === "galilee"}
    onClick={() => togglePlace("galilee")}
/>

<RegionUnderlay
  cx={760}
  cy={620}
  rx={130}
  ry={100}
  color={REGION_TEXT_COLORS.samaria}
  rotate={8}
  isSelected={selectedRegionId === "samaria"}
  onClick={() => togglePlace("samaria")}
/>

<RegionUnderlay
  cx={1010}
  cy={930}
  rx={340}
  ry={235}
  color={REGION_TEXT_COLORS.judea}
  rotate={6}
   isSelected={selectedRegionId === "judea"}
   onClick={() => togglePlace("judea")}
/>

<RegionUnderlay
  cx={1205}
  cy={620}
  rx={125}
  ry={100}
  color={REGION_TEXT_COLORS.perea}
  rotate={-10}
   isSelected={selectedRegionId === "perea"}
   onClick={() => togglePlace("perea")}
/>

<RegionUnderlay
  cx={1290}
  cy={400}
  rx={170}
  ry={120}
  color={REGION_TEXT_COLORS.decapolis}
  rotate={8}
   isSelected={selectedRegionId === "decapolis"}
   onClick={() => togglePlace("decapolis")}
/>

<RegionUnderlay
  cx={180}
  cy={1060}
  rx={130}
  ry={95}
  color={REGION_TEXT_COLORS.egypt}
  rotate={-8}
  isSelected={selectedRegionId === "egypt"}
  onClick={() => togglePlace("egypt")}
/>

<RegionUnderlay
  cx={160}
  cy={95}
  rx={110}
  ry={68}
  color={REGION_TEXT_COLORS["tyre-and-sidon"]}
  rotate={-10}
  isSelected={selectedRegionId === "tyre-and-sidon"}
  onClick={() => togglePlace("tyre-and-sidon")}
/>

<text
  x={395}
  y={170}
  textAnchor="middle"
  fontSize={selectedRegionId === "galilee" ? "22" : "20"}
  fontWeight={selectedRegionId === "galilee" ? 700 : 400}
  fill={REGION_TEXT_COLORS.galilee}
  opacity={selectedRegionId === "galilee" ? 0.85 : 0.55}
  style={{ cursor: "pointer" }}
onClick={() => togglePlace("galilee")}
>
  Galilee
</text>

<text
  x={790}
  y={590}
  textAnchor="middle"
  fontSize={selectedRegionId === "samaria" ? "22" : "20"}
  fontWeight={selectedRegionId === "samaria" ? 700 : 400}
  fill={REGION_TEXT_COLORS.samaria}
  opacity={selectedRegionId === "samaria" ? 0.85 : 0.55}
  style={{ cursor: "pointer" }}
onClick={() => togglePlace("samaria")}
>
  Samaria
</text>

<text
  x={1100}
  y={750}
  fontSize={selectedRegionId === "judea" ? "22" : "20"}
  fontWeight={selectedRegionId === "judea" ? 700 : 400}
  fill={REGION_TEXT_COLORS.judea}
  opacity={selectedRegionId === "judea" ? 0.85 : 0.55}
  style={{ cursor: "pointer" }}
onClick={() => togglePlace("judea")}
>
  Judea
</text>

<text
  x={1205}
  y={570}
  fontSize={selectedRegionId === "perea" ? "22" : "20"}
  fontWeight={selectedRegionId === "perea" ? 700 : 400}
  fill={REGION_TEXT_COLORS.perea}
  opacity={selectedRegionId === "perea" ? 0.85 : 0.55}
  style={{ cursor: "pointer" }}
onClick={() => togglePlace("perea")}
>
  Perea
</text>

<text
  x={1255}
  y={345}
  fontSize={selectedRegionId === "decapolis" ? "22" : "20"}
  fontWeight={selectedRegionId === "decapolis" ? 700 : 400}
  fill={REGION_TEXT_COLORS.decapolis}
  opacity={selectedRegionId === "decapolis" ? 0.85 : 0.55}
  style={{ cursor: "pointer" }}
onClick={() => togglePlace("<decapolis>")}
>
  Decapolis
</text>

<text
  x={180}
  y={1035}
  textAnchor="middle"
  fontSize={selectedRegionId === "egypt" ? "22" : "20"}
  fontWeight={selectedRegionId === "egypt" ? 700 : 400}
  fill={REGION_TEXT_COLORS.egypt}
  opacity={selectedRegionId === "egypt" ? 0.85 : 0.55}
  style={{ cursor: "pointer" }}
onClick={() => togglePlace("<egypt")}
>
  Egypt
</text>

<text
  x={160}
  y={78}
  textAnchor="middle"
  fontSize={selectedRegionId === "tyre-and-sidon" ? "22" : "20"}
  fontWeight={selectedRegionId === "tyre-and-sidon" ? 700 : 400}
  fill={REGION_TEXT_COLORS["tyre-and-sidon"]}
  opacity={selectedRegionId === "tyre-and-sidon" ? 0.85 : 0.55}
  style={{ cursor: "pointer" }}
onClick={() => togglePlace("<tyre-and-sidon")}
>
  Tyre & Sidon
</text>

                {enabledGospels.map((gospel) => {
                  const gospelPoints = travelPoints
                    .filter((point) => point.gospel === gospel)
                    .sort((a, b) => a.order - b.order);

                  const pathNodes = gospelPoints
                    .map((point) => nodesById.get(point.placeId))
                    .filter((node): node is PositionedNode => Boolean(node));

                  if (pathNodes.length < 2) return null;

                  const points = pathNodes
                    .map((node) => `${node.x},${node.y}`)
                    .join(" ");

                  return (
                    <polyline
                      key={gospel}
                      points={points}
                      fill="none"
                      stroke={travelColorByGospel[gospel]}
                      strokeWidth={3.1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="10 6"
                      opacity={0.72}
                    />
                  );
                })}

                {enabledGospels.length === 1 &&
                  travelSegmentMarkers.map((marker, index) => (
  <g key={`${marker.gospel}-${marker.label}-${index}`}>
    {marker.isRegionTransition ? (
      <rect
        x={marker.x - 7.2}
        y={marker.y - 7.2}
        width={14.4}
        height={14.4}
        rx={2}
        transform={`rotate(45 ${marker.x} ${marker.y})`}
        fill={travelColorByGospel[marker.gospel]}
        stroke="#FFFFFF"
        strokeWidth={1.2}
      />
    ) : (
      <circle
        cx={marker.x}
        cy={marker.y}
        r={8.2}
        fill={travelColorByGospel[marker.gospel]}
        stroke="#FFFFFF"
        strokeWidth={1.2}
      />
    )}

    <text
      x={marker.x}
      y={marker.y + 3.6}
      textAnchor="middle"
      fontSize="9.2"
      fontWeight="700"
      fill="#FFFFFF"
    >
      {marker.label}
    </text>
  </g>
))}

                {nodes
                  .filter((node) => node.type !== "region")
                  .map((node) => {
                  const radius = getNodeRadius(node.type);
                  const { fill, stroke } = getNodeFill(
                    node,
                    selectedPlaceId,
                    episodeHighlightedPlaceIds
                  );

                  const nodeMarkers = travelNodeMarkersByPlace.get(node.id) ?? [];
                  const markerSlots = getNodeMarkerSlots(node, radius);

                  return (
                    <g
                      key={node.id}
                      onClick={() => {
                        togglePlace(node.id);
                      }}
                      onMouseEnter={(event) => updateTooltipPosition(event, node)}
                      onMouseMove={(event) => updateTooltipPosition(event, node)}
                      style={{ cursor: "pointer" }}
                    >
                      {selectedPlaceId === node.id && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={radius + 8}
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                        />
                      )}

                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={2}
                      />

                      <text
                        x={node.x}
                        y={node.y + radius + (node.id === "jordan-river" ? 18 : 12)}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#334155"
                        style={{
                          paintOrder: "stroke",
                          stroke: "#F8FAFC",
                          strokeWidth: 3,
                        }}
                      >
                        {node.name}
                      </text>

                      {nodeMarkers
                        .filter((marker) => marker.isStart)
                        .slice(0, markerSlots.length)
                        .map((marker, index) => {
                          const slot = markerSlots[index];
                          const color = travelColorByGospel[marker.gospel];

                          return (
                            <g key={`${node.id}-${marker.gospel}-start`}>
                              <StartPin
                                x={slot.x}
                                y={slot.y}
                                color={color}
                                label="1"
                              />
                            </g>
                          );
                        })}
                    </g>
                  );
                })}
              </svg>

              {hoverTooltip && (
                <div
                  style={{
                    position: "absolute",
                    left: hoverTooltip.x,
                    top: hoverTooltip.y,
                    pointerEvents: "none",
                    zIndex: 20,
                    maxWidth: 260,
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: 12,
                    padding: "10px 12px",
                    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.10)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0F172A",
                      marginBottom: 6,
                    }}
                  >
                    {hoverTooltip.node.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                    <div>
                      <strong>Type:</strong> {hoverTooltip.node.type}
                    </div>
                    <div>
                      <strong>Region:</strong> {hoverTooltip.node.region ?? "—"}
                    </div>
                    <div>
                      <strong>Certainty:</strong> {hoverTooltip.node.certainty}
                    </div>
                    {hoverTooltip.node.modernOverlay && (
                      <div>
                        <strong>Modern:</strong>{" "}
                        {hoverTooltip.node.modernOverlay.modernName}
                      </div>
                    )}
                    {travelStopsByPlace.get(hoverTooltip.node.id)?.length ? (
                      <div style={{ marginTop: 4 }}>
                        <strong>Travel stops:</strong>{" "}
                        {travelStopsByPlace
                          .get(hoverTooltip.node.id)!
                          .map((stop) => `${stop.gospel} ${stop.label}`)
                          .join(", ")}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}