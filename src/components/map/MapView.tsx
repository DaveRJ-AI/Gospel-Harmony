import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

type MapCoordinate = {
  x: number;
  y: number;
};

type EpisodeStoryTarget = {
  episodeId: string;
  pericopeId: string;
  title: string;
  gospels: GospelId[];
};

type TravelSegmentBendKey = `${GospelId}:${string}->${string}`;

const SVG_WIDTH = 1450;
const SVG_HEIGHT = 1220;
const VIEWBOX_X = -240;
const VIEWBOX_Y = -30;
const VIEWBOX_WIDTH = 1800;
const VIEWBOX_HEIGHT = 1280;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
const WHEEL_ZOOM_SENSITIVITY = 0.0008;
const DESIGNER_COORDINATE_ASSIST_ENABLED = true;
const MAP_FULL_UNDERLAY_SRC = "/assets/map/Israel_underlay.png";

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

const REGION_LABEL_COLOR = REGION_TEXT_COLORS.egypt;
const REGION_LABEL_FONT_SIZE = 30;
const REGION_LABEL_SELECTED_FONT_SIZE = 33;

const EPISODE_THEME_TO_HARMONY_TAG: Record<string, string> = {
  atonement: "passion week",
  baptism: "baptism",
  betrayal: "passion week",
  birth: "birth",
  "blind-bartimaeus": "healing",
  "boat-crossings": "miracle",
  burial: "resurrection",
  childhood: "early life",
  compassion: "miracle",
  cross: "passion week",
  disciples: "discipleship",
  entry: "passion week",
  faith: "faith",
  fasting: "temptation",
  fulfillment: "birth",
  "galilean-ministry": "teaching",
  "gentile-ministry": "mission",
  healing: "healing",
  "hidden-years": "early life",
  infancy: "birth",
  "john-the-baptist": "john the baptist",
  "journey-to-jerusalem": "journey",
  lazarus: "miracle",
  "living-water": "teaching",
  miracle: "miracle",
  nativity: "birth",
  passion: "passion",
  "passion-week": "passion week",
  prayer: "prayer",
  protection: "birth",
  resurrection: "resurrection",
  "resurrection-sign": "miracle",
  samaria: "teaching",
  signs: "miracle",
  storm: "miracle",
  teaching: "teaching",
  temptation: "temptation",
  "walking-on-water": "miracle",
  "water-to-wine": "miracle",
  zacchaeus: "journey",
};

const RELATIONAL_NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  // Galilee
  nazareth: { x: 914, y: 236 },
  capernaum: { x: 998, y: 162 },
  chorazin: { x: 958, y: 151 },
  cana: { x: 903, y: 188 },
  bethsaida: { x: 1024, y: 148 },
  magdala: { x: 981, y: 185 },
  "sea-of-galilee": { x: 1025, y: 186 },
  nain: { x: 935, y: 288 },
  galilee: { x: 988, y: 220 },
  egypt: { x: 378, y: 1141 },
"tyre-and-sidon": { x: 827, y: 47 },

  // Samaria
  sychar: { x: 997, y: 395 },

  // Perea / Decapolis gateway
  "jordan-river": { x: 1064, y: 456 },

  // Judea
  bethlehem: { x: 995, y: 664 },
  jerusalem: { x: 994, y: 632 },
  "mount-of-olives": { x: 1021, y: 663 },
  bethany: { x: 1030, y: 645 },
  wilderness: { x: 1038, y: 617 },
  jericho: { x: 1065, y: 565 },
  "empty-tomb": { x: 967, y: 630 },
  golgotha: { x: 985, y: 617 },
  gethsemane: { x: 1008, y: 632 },
  decapolis: { x: 1002, y: -20 },
  samaria: { x: 934, y: 722 },
  judea: { x: 982, y: 700 },
  perea: { x: 1120, y: 520 },
};


const LABEL_OFFSETS: Record<
  string,
  { dx?: number; dy?: number; anchor?: "start" | "middle" | "end" }
> = {
  nazareth: { dx: 0, dy: 18, anchor: "middle" },
  capernaum: { dx: 14, dy: 4, anchor: "start" },
  chorazin: { dx: 0, dy: 18, anchor: "middle" },
  cana: { dx: 0, dy: 18, anchor: "middle" },
  bethsaida: { dx: 0, dy: 18, anchor: "middle" },
  magdala: { dx: 0, dy: 18, anchor: "middle" },
  "sea-of-galilee": { dx: 18, dy: 4, anchor: "start" },
  nain: { dx: 0, dy: 18, anchor: "middle" },

  sychar: { dx: 0, dy: 18, anchor: "middle" },
  "jordan-river": { dx: 0, dy: 20, anchor: "middle" },

  bethlehem: { dx: 0, dy: 18, anchor: "middle" },
  jerusalem: { dx: 0, dy: 18, anchor: "middle" },
  gethsemane: { dx: 14, dy: 4, anchor: "start" },
  "mount-of-olives": { dx: 14, dy: 4, anchor: "start" },
  bethany: { dx: 14, dy: 4, anchor: "start" },
  wilderness: { dx: 0, dy: -14, anchor: "middle" },
  jericho: { dx: 14, dy: 4, anchor: "start" },
  golgotha: { dx: -14, dy: 4, anchor: "end" },
  "empty-tomb": { dx: -14, dy: 4, anchor: "end" },
};

const MAP_GEOGRAPHY_LABELS: Array<{
  id: string;
  text: string;
  x: number;
  y: number;
  anchor?: "start" | "middle" | "end";
  fontSize?: number;
  opacity?: number;
}> = [
  {
    id: "tyre-and-sidon-label",
    text: "Tyre and Sidon",
    x: 900,
    y: 56,
    anchor: "middle",
    fontSize: 22,
    opacity: 0.92,
  },
  {
    id: "dead-sea-label",
    text: "Dead Sea",
    x: 1106,
    y: 703,
    anchor: "middle",
    fontSize: 22,
    opacity: 0.92,
  },
  {
    id: "damascus-label",
    text: "Damascus",
    x: 987,
    y: 12,
    anchor: "middle",
    fontSize: 22,
    opacity: 0.92,
  },
];

const TRAVEL_SEGMENT_BENDS: Partial<Record<TravelSegmentBendKey, MapCoordinate[]>> =
  {
    "matthew:egypt->nazareth": [{ x: 696, y: 979 }],
    "matthew:galilee->tyre-and-sidon": [{ x: 925, y: 126 }],
    "mark:galilee->tyre-and-sidon": [{ x: 925, y: 126 }],
    "luke:sea-of-galilee->galilee": [{ x: 1000, y: 210 }],
    "luke:galilee->samaria": [{ x: 978, y: 300 }],
    "john:sychar->galilee": [{ x: 980, y: 300 }],
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getTravelSegmentBendPoints(
  gospel: GospelId,
  fromPlaceId: string,
  toPlaceId: string
): MapCoordinate[] {
  const key = `${gospel}:${fromPlaceId}->${toPlaceId}` as TravelSegmentBendKey;
  return TRAVEL_SEGMENT_BENDS[key] ?? [];
}

function getTravelSegmentPathPoints(
  gospel: GospelId,
  from: PositionedNode,
  to: PositionedNode
): MapCoordinate[] {
  return [
    { x: from.x, y: from.y },
    ...getTravelSegmentBendPoints(gospel, from.id, to.id),
    { x: to.x, y: to.y },
  ];
}

function getPointAlongPolyline(points: MapCoordinate[], t: number): MapCoordinate {
  if (points.length <= 1) return points[0] ?? { x: 0, y: 0 };

  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    const length = Math.max(Math.sqrt(dx * dx + dy * dy), 0.0001);

    return {
      from: point,
      to: next,
      dx,
      dy,
      length,
    };
  });

  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  const targetLength = totalLength * clamp(t, 0, 1);

  let traversed = 0;
  for (const segment of segments) {
    if (traversed + segment.length >= targetLength) {
      const localT = (targetLength - traversed) / segment.length;
      return {
        x: segment.from.x + segment.dx * localT,
        y: segment.from.y + segment.dy * localT,
      };
    }
    traversed += segment.length;
  }

  return points[points.length - 1];
}

function clampPan(
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } {
  if (zoom <= 1) {
    return { x: 0, y: 0 };
  }

  const minX = VIEWBOX_X;
  const maxX = VIEWBOX_X + VIEWBOX_WIDTH;
  const minY = VIEWBOX_Y;
  const maxY = VIEWBOX_Y + VIEWBOX_HEIGHT;

  const minPanX = maxX * (1 - zoom);
  const maxPanX = minX * (1 - zoom);
  const minPanY = maxY * (1 - zoom);
  const maxPanY = minY * (1 - zoom);

  return {
    x: clamp(pan.x, minPanX, maxPanX),
    y: clamp(pan.y, minPanY, maxPanY),
  };
}

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

function resolveEpisodeThemesToHarmonyTags(episode: Episode): string[] {
  const resolved = (episode.themes ?? [])
    .map((theme) => EPISODE_THEME_TO_HARMONY_TAG[theme] ?? null)
    .filter((theme): theme is string => Boolean(theme));

  return Array.from(new Set(resolved));
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
  scale = 1,
}: {
  x: number;
  y: number;
  color: string;
  label: string;
  scale?: number;
}) {
  const circleRadius = 8 * scale;
  const strokeWidth = 1.4 * scale;
  const triangleStrokeWidth = 1.2 * scale;
  const triangleHalfWidth = 4 * scale;
  const triangleTopY = y + 4 * scale;
  const triangleBottomY = y + 12 * scale;
  const labelFontSize = 9 * scale;

  return (
    <g>
      <circle
        cx={x}
        cy={y - 2 * scale}
        r={circleRadius}
        fill={color}
        stroke="#0F172A"
        strokeWidth={strokeWidth}
      />
      <path
        d={`M ${x - triangleHalfWidth} ${triangleTopY} L ${x} ${triangleBottomY} L ${x + triangleHalfWidth} ${triangleTopY} Z`}
        fill={color}
        stroke="#0F172A"
        strokeWidth={triangleStrokeWidth}
      />
      <text
        x={x}
        y={y + 1.2 * scale}
        textAnchor="middle"
        fontSize={labelFontSize}
        fontWeight="700"
        fill="#FFFFFF"
      >
        {label}
      </text>
    </g>
  );
}

export default function MapView() {
  const bundle = useMemo(() => loadMapDataBundle(), []);
  const graph = useMemo(() => buildMapGraphData(bundle), [bundle]);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapSvgRef = useRef<SVGSVGElement | null>(null);
  const placesListRef = useRef<HTMLDivElement | null>(null);
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    pointerId: number;
  } | null>(null);
  const suppressMapClickRef = useRef(false);

  const [enabledGospels, setEnabledGospels] = useState<GospelId[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    null
  );
  const [placesExpanded, setPlacesExpanded] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [designerCoordinateMode, setDesignerCoordinateMode] = useState(false);
  const [designerMouseCoordinate, setDesignerMouseCoordinate] =
    useState<MapCoordinate | null>(null);

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

  const selectedDesignerNode =
    selectedPlace && selectedPlace.type !== "region" ? selectedPlace : null;

    const selectedRegionId =
  selectedPlace && selectedPlace.type === "region" ? selectedPlace.id : null;

  const placeEpisodes = useMemo(() => {
    if (!selectedPlaceId) return [];
    return getEpisodesForPlace(selectedPlaceId, bundle);
  }, [selectedPlaceId, bundle]);

  const placeStoryEpisodes = useMemo(() => {
    const storyTargets = placeEpisodes.flatMap((episode): EpisodeStoryTarget[] => {
      if (episode.storyTargets?.length) {
        return episode.storyTargets.map((target) => ({
          episodeId: episode.id,
          pericopeId: target.pericopeId,
          title: target.title,
          gospels: episode.gospels,
        }));
      }

      if (episode.pericopeId) {
        return [
          {
            episodeId: episode.id,
            pericopeId: episode.pericopeId,
            title: episode.title,
            gospels: episode.gospels,
          },
        ];
      }

      return [];
    });

    const seen = new Set<string>();
    return storyTargets.filter((target) => {
      const key = `${target.pericopeId}:${target.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [placeEpisodes]);

  const placeThemes = useMemo(() => {
    return Array.from(
      new Set(
        placeEpisodes.flatMap((episode) => resolveEpisodeThemesToHarmonyTags(episode))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [placeEpisodes]);

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
    if (selectedPlaceId) {
      setPlacesExpanded(false);
    }
  }, [selectedPlaceId]);

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

        const segmentPathPoints = getTravelSegmentPathPoints(gospel, from, to);

        const t =
          activeCount <= 1
            ? 0.5
            : progressValues[Math.min(activeIndex, progressValues.length - 1)];

        const basePoint = getPointAlongPolyline(segmentPathPoints, t);
        const baseX = basePoint.x;
        const baseY = basePoint.y;

        let x = baseX;
        let y = baseY;

        if (activeCount > 1) {
          const segmentMidIndex = Math.max(
            0,
            Math.floor((segmentPathPoints.length - 1) / 2) - 1
          );
          const normalFrom = segmentPathPoints[segmentMidIndex];
          const normalTo = segmentPathPoints[segmentMidIndex + 1] ?? normalFrom;
          const dx = normalTo.x - normalFrom.x;
          const dy = normalTo.y - normalFrom.y;
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
    const episode = bundle.episodes.find((ep) => ep.id === episodeId);
    if (!episode) return;

    const returnTo = `/map?place=${selectedPlaceId ?? episode.placeIds[0] ?? ""}&episode=${episode.id}`;

    if (episode.storyTargets?.length) {
      const params = new URLSearchParams({
        version: "KJV",
        returnTo,
      });
      navigate(`/story/${episode.storyTargets[0].pericopeId}?${params.toString()}`);
      return;
    }

    if (episode.pericopeId) {
      const params = new URLSearchParams({
        version: "KJV",
        returnTo,
      });
      navigate(`/story/${episode.pericopeId}?${params.toString()}`);
      return;
    }

    const resolvedThemes = resolveEpisodeThemesToHarmonyTags(episode);

    if (resolvedThemes.length) {
      const params = new URLSearchParams({
        theme: resolvedThemes[0],
        returnTo,
      });
      navigate(`/types?${params.toString()}`);
      return;
    }

    setSelectedEpisodeId((current) => {
      if (current === episodeId) return null;
      return episodeId;
    });

    if (episode.placeIds?.length) {
      setSelectedPlaceId(episode.placeIds[0]);
    }
  }

  function openTheme(theme: string) {
    const params = new URLSearchParams({
      theme,
      returnTo: `/map?place=${selectedPlaceId ?? ""}`,
    });
    navigate(`/types?${params.toString()}`);
  }

  function openStoryTarget(target: EpisodeStoryTarget) {
    const params = new URLSearchParams({
      version: "KJV",
      returnTo: `/map?place=${selectedPlaceId ?? ""}&episode=${target.episodeId}`,
    });
    navigate(`/story/${target.pericopeId}?${params.toString()}`);
  }

  function clampZoom(value: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
  }

  function setZoomAnchored(
    nextZoom: number,
    clientX?: number,
    clientY?: number
  ) {
    const svg = mapSvgRef.current;
    const normalized = clampZoom(nextZoom);

    if (!svg || normalized === zoom) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      setZoom(normalized);
      return;
    }

    const pointerX =
      clientX !== undefined ? clientX - rect.left : rect.width / 2;
    const pointerY =
      clientY !== undefined ? clientY - rect.top : rect.height / 2;

    const svgX = VIEWBOX_X + (pointerX / rect.width) * VIEWBOX_WIDTH;
    const svgY = VIEWBOX_Y + (pointerY / rect.height) * VIEWBOX_HEIGHT;

    const mapXBefore = (svgX - panX) / zoom;
    const mapYBefore = (svgY - panY) / zoom;

    const nextPan = clampPan(
      {
        x: svgX - mapXBefore * normalized,
        y: svgY - mapYBefore * normalized,
      },
      normalized
    );

    setZoom(normalized);
    setPanX(nextPan.x);
    setPanY(nextPan.y);
  }

  function handleMapWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const deltaMultiplier =
      event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1;
    const rawIntensity = Math.min(Math.abs(event.deltaY * deltaMultiplier), 120);
    const zoomDelta = rawIntensity * WHEEL_ZOOM_SENSITIVITY;
    const zoomFactor = event.deltaY < 0 ? 1 + zoomDelta : 1 / (1 + zoomDelta);
    const nextZoom = zoom * zoomFactor;
    setZoomAnchored(nextZoom, event.clientX, event.clientY);
  }

  function beginPan(event: React.PointerEvent<SVGSVGElement>) {
    if (zoom <= 1 || event.button !== 0) return;
    const target = event.target as Element | null;
    if (target?.closest?.("[data-map-selectable='true']")) return;

    panStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      panX,
      panY,
      pointerId: event.pointerId,
    };
    suppressMapClickRef.current = false;

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  }

  function handlePanMove(event: React.PointerEvent<SVGSVGElement>) {
    const panState = panStateRef.current;
    const svg = mapSvgRef.current;
    if (!panState || !svg) return;

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const deltaX = event.clientX - panState.startX;
    const deltaY = event.clientY - panState.startY;
    const svgDeltaX = (deltaX / rect.width) * VIEWBOX_WIDTH;
    const svgDeltaY = (deltaY / rect.height) * VIEWBOX_HEIGHT;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      suppressMapClickRef.current = true;
    }

    const nextPan = clampPan(
      {
        x: panState.panX + svgDeltaX,
        y: panState.panY + svgDeltaY,
      },
      zoom
    );

    setPanX(nextPan.x);
    setPanY(nextPan.y);
  }

  function endPan(event?: React.PointerEvent<SVGSVGElement>) {
    const panState = panStateRef.current;
    if (!panState) return;

    if (event && event.currentTarget.hasPointerCapture(panState.pointerId)) {
      event.currentTarget.releasePointerCapture(panState.pointerId);
    }

    panStateRef.current = null;
    setIsPanning(false);
  }

  function suppressClickAfterPan(event: React.MouseEvent<SVGSVGElement>) {
    if (!suppressMapClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressMapClickRef.current = false;
  }

  function handleMapBackgroundClick(event: React.MouseEvent<SVGSVGElement>) {
    if (suppressMapClickRef.current) {
      suppressMapClickRef.current = false;
      return;
    }

    const target = event.target as Element | null;
    if (target?.closest?.("[data-map-selectable='true']")) return;

    setSelectedPlaceId(null);
    setSelectedEpisodeId(null);
  }

  const zoomPercent = Math.round(zoom * 100);

  function getMapCoordinateFromClientPosition(
    clientX: number,
    clientY: number
  ): MapCoordinate | null {
    const svg = mapSvgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    const svgX = VIEWBOX_X + (pointerX / rect.width) * VIEWBOX_WIDTH;
    const svgY = VIEWBOX_Y + (pointerY / rect.height) * VIEWBOX_HEIGHT;

    return {
      x: Math.round((svgX - panX) / zoom),
      y: Math.round((svgY - panY) / zoom),
    };
  }

  function updateDesignerMouseCoordinate(event: React.MouseEvent<SVGSVGElement>) {
    if (!designerCoordinateMode) return;
    setDesignerMouseCoordinate(
      getMapCoordinateFromClientPosition(event.clientX, event.clientY)
    );
  }

  function clearDesignerMouseCoordinate() {
    setDesignerMouseCoordinate(null);
  }

  const denseZoom = zoom >= 2.2;
  const veryDenseZoom = zoom >= 3.2;
  const placeLabelFontSize = veryDenseZoom ? 9 : denseZoom ? 10 : 11;
  const placeLabelStrokeWidth = veryDenseZoom ? 2.2 : denseZoom ? 2.6 : 3;
  const sequenceMarkerScale = veryDenseZoom ? 0.76 : denseZoom ? 0.88 : 1;
  const sequenceMarkerRadius = 8.2 * sequenceMarkerScale;
  const sequenceMarkerRectSize = 14.4 * sequenceMarkerScale;
  const sequenceMarkerRectInset = sequenceMarkerRectSize / 2;
  const sequenceMarkerRectRadius = 2 * sequenceMarkerScale;
  const sequenceMarkerStrokeWidth = 1.2 * sequenceMarkerScale;
  const sequenceMarkerFontSize = 9.2 * sequenceMarkerScale;
  const sequenceMarkerTextYOffset = 3.6 * sequenceMarkerScale;
  const regionLabelScale = veryDenseZoom ? 0.72 : denseZoom ? 0.84 : 1;
  const geographyLabelScale = veryDenseZoom ? 0.78 : denseZoom ? 0.88 : 1;
  const regionBaseOpacity = veryDenseZoom ? 0.62 : denseZoom ? 0.8 : 0.99;
  const geographyBaseOpacity = veryDenseZoom ? 0.62 : denseZoom ? 0.78 : 0.92;
  const startPinScale = veryDenseZoom ? 0.8 : denseZoom ? 0.9 : 1;

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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <h3 style={{ ...panelTitleStyle, margin: 0 }}>Places</h3>
              {!placesExpanded ? (
                <button
                  type="button"
                  onClick={() => {
                    setPlacesExpanded(true);
                    setSelectedPlaceId(null);
                    setSelectedEpisodeId(null);
                  }}
                  style={{
                    borderRadius: 999,
                    padding: "6px 12px",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#334155",
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                  aria-label="Expand places list"
                  title="Expand places list"
                >
                  Expand
                </button>
              ) : null}
            </div>
            <div style={{ position: "relative" }}>
              <div
                ref={placesListRef}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {(placesExpanded || !selectedPlace
                  ? nodes
                  : nodes.filter((node) => node.id === selectedPlace.id))
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
            <h3 style={panelTitleStyle}>Stories at selected place</h3>
            {placeStoryEpisodes.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#64748B",
                }}
              >
                No direct story links for this place yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {placeStoryEpisodes.map((storyTarget) => (
                  <div
                    key={`${storyTarget.episodeId}-${storyTarget.pericopeId}`}
                    onClick={() => openStoryTarget(storyTarget)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openStoryTarget(storyTarget);
                      }
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      background: "#F8FAFC",
                      color: "#334155",
                      padding: "10px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{storyTarget.title}</div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "#64748B",
                            textTransform: "capitalize",
                          }}
                        >
                          {storyTarget.gospels.join(", ")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <h3 style={panelTitleStyle}>Themes at selected place</h3>
            {placeThemes.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#64748B",
                }}
              >
                No mapped themes for this place yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {placeThemes.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => openTheme(theme)}
                    style={{
                      borderRadius: 999,
                      padding: "7px 12px",
                      fontSize: 13,
                      cursor: "pointer",
                      background: "#F8FAFC",
                      color: "#334155",
                      fontWeight: 600,
                      border: "1px solid #E2E8F0",
                      textTransform: "capitalize",
                    }}
                  >
                    {theme}
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
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 10,
                  flex: "0 0 auto",
                }}
                >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
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

                <div
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {DESIGNER_COORDINATE_ASSIST_ENABLED ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        background: designerCoordinateMode ? "#EFF6FF" : "#FFFFFF",
                        border: designerCoordinateMode
                          ? "1px solid #93C5FD"
                          : "1px solid #E2E8F0",
                        borderRadius: 16,
                        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
                        maxWidth: "100%",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setDesignerCoordinateMode((current) => {
                            const next = !current;
                            if (!next) {
                              setDesignerMouseCoordinate(null);
                            }
                            return next;
                          });
                        }}
                        style={{
                          borderRadius: 999,
                          padding: "6px 12px",
                          border: designerCoordinateMode
                            ? "1px solid #60A5FA"
                            : "1px solid #CBD5E1",
                          background: designerCoordinateMode ? "#DBEAFE" : "#FFFFFF",
                          color: designerCoordinateMode ? "#1D4ED8" : "#334155",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {designerCoordinateMode ? "Designer coords on" : "Designer coords"}
                      </button>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#334155",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {selectedDesignerNode
                            ? selectedDesignerNode.name
                            : "Select a node"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748B",
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            whiteSpace: "nowrap",
                          }}
                        >
                          current:{" "}
                          {selectedDesignerNode
                            ? `x ${selectedDesignerNode.x}, y ${selectedDesignerNode.y}`
                            : "x -, y -"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: designerCoordinateMode ? "#1D4ED8" : "#94A3B8",
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            whiteSpace: "nowrap",
                          }}
                        >
                          mouse:{" "}
                          {designerCoordinateMode && designerMouseCoordinate
                            ? `x ${designerMouseCoordinate.x}, y ${designerMouseCoordinate.y}`
                            : "x -, y -"}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: 8,
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: 999,
                      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setZoomAnchored(zoom - ZOOM_STEP)}
                      disabled={zoom <= MIN_ZOOM}
                      aria-label="Zoom out"
                      style={{ borderRadius: 999, padding: "6px 10px" }}
                    >
                      -
                    </button>
                    <div
                      style={{
                        minWidth: 58,
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#334155",
                      }}
                    >
                      {zoomPercent}%
                    </div>
                    <button
                      type="button"
                      onClick={() => setZoomAnchored(zoom + ZOOM_STEP)}
                      disabled={zoom >= MAX_ZOOM}
                      aria-label="Zoom in"
                      style={{ borderRadius: 999, padding: "6px 10px" }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomAnchored(1)}
                      disabled={Math.abs(zoom - 1) < 0.01}
                      style={{ borderRadius: 999, padding: "6px 12px" }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
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
                overflow: "hidden",
                background: "#F8FAFC",
                borderTop: "1px solid #E2E8F0",
                cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default",
              }}
              onWheel={handleMapWheel}
            >
              <svg
                ref={mapSvgRef}
                viewBox={`${VIEWBOX_X} ${VIEWBOX_Y} ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  userSelect: "none",
                }}
                role="img"
                aria-label="Gospel map visualization"
                onClickCapture={suppressClickAfterPan}
                onClick={handleMapBackgroundClick}
                onMouseMove={updateDesignerMouseCoordinate}
                onMouseLeave={clearDesignerMouseCoordinate}
                onPointerDown={beginPan}
                onPointerMove={handlePanMove}
                onPointerUp={endPan}
                onPointerLeave={endPan}
                >
                <g transform={`translate(${panX} ${panY}) scale(${zoom})`}>
                  <image
                    href={MAP_FULL_UNDERLAY_SRC}
                    x={VIEWBOX_X}
                    y={VIEWBOX_Y}
                    width={VIEWBOX_WIDTH}
                    height={VIEWBOX_HEIGHT}
                    preserveAspectRatio="none"
                    style={{ pointerEvents: "none" }}
                  />

<text
  x={934}
  y={352}
  textAnchor="middle"
  fontSize={
    selectedRegionId === "samaria"
      ? REGION_LABEL_SELECTED_FONT_SIZE * regionLabelScale
      : REGION_LABEL_FONT_SIZE * regionLabelScale
  }
  fontWeight={selectedRegionId === "samaria" ? 700 : 400}
  fill={REGION_LABEL_COLOR}
  opacity={selectedRegionId === "samaria" ? 0.55 : regionBaseOpacity}
  style={{ cursor: "pointer" }}
data-map-selectable="true"
onClick={() => togglePlace("samaria")}
>
  Samaria
</text>

<text
  x={965}
  y={750}
  fontSize={
    selectedRegionId === "judea"
      ? REGION_LABEL_SELECTED_FONT_SIZE * regionLabelScale
      : REGION_LABEL_FONT_SIZE * regionLabelScale
  }
  fontWeight={selectedRegionId === "judea" ? 700 : 400}
  fill={REGION_LABEL_COLOR}
  opacity={selectedRegionId === "judea" ? 0.85 : regionBaseOpacity}
  style={{ cursor: "pointer" }}
data-map-selectable="true"
onClick={() => togglePlace("judea")}
>
  Judea
</text>


<text
  x={280}
  y={1153}
  textAnchor="middle"
  fontSize={
    selectedRegionId === "egypt"
      ? REGION_LABEL_SELECTED_FONT_SIZE * regionLabelScale
      : REGION_LABEL_FONT_SIZE * regionLabelScale
  }
  fontWeight={selectedRegionId === "egypt" ? 700 : 400}
  fill={REGION_LABEL_COLOR}
  opacity={selectedRegionId === "egypt" ? 0.85 : regionBaseOpacity}
  style={{ cursor: "pointer" }}
data-map-selectable="true"
onClick={() => togglePlace("egypt")}
>
  Egypt
</text>

                {MAP_GEOGRAPHY_LABELS.map((label) => (
                  <text
                    key={label.id}
                    x={label.x}
                    y={label.y}
                    textAnchor={label.anchor ?? "middle"}
                    fontSize={(label.fontSize ?? 22) * geographyLabelScale}
                    fontWeight={400}
                    fill={REGION_LABEL_COLOR}
                    opacity={(label.opacity ?? geographyBaseOpacity) * (denseZoom ? 0.92 : 1)}
                    style={{ pointerEvents: "none" }}
                  >
                    {label.text}
                  </text>
                ))}

                {enabledGospels.map((gospel) => {
                  const gospelPoints = travelPoints
                    .filter((point) => point.gospel === gospel)
                    .sort((a, b) => a.order - b.order);

                  const pathNodes = gospelPoints
                    .map((point) => nodesById.get(point.placeId))
                    .filter((node): node is PositionedNode => Boolean(node));

                  if (pathNodes.length < 2) return null;

                  const polylinePoints: string[] = [];
                  for (let i = 0; i < pathNodes.length - 1; i += 1) {
                    const from = pathNodes[i];
                    const to = pathNodes[i + 1];
                    const segmentPoints = getTravelSegmentPathPoints(
                      gospel,
                      from,
                      to
                    );

                    segmentPoints.forEach((point, index) => {
                      if (i > 0 && index === 0) return;
                      polylinePoints.push(`${point.x},${point.y}`);
                    });
                  }

                  return (
                    <polyline
                      key={gospel}
                      points={polylinePoints.join(" ")}
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
        x={marker.x - sequenceMarkerRectInset}
        y={marker.y - sequenceMarkerRectInset}
        width={sequenceMarkerRectSize}
        height={sequenceMarkerRectSize}
        rx={sequenceMarkerRectRadius}
        transform={`rotate(45 ${marker.x} ${marker.y})`}
        fill={travelColorByGospel[marker.gospel]}
        stroke="#FFFFFF"
        strokeWidth={sequenceMarkerStrokeWidth}
      />
    ) : (
      <circle
        cx={marker.x}
        cy={marker.y}
        r={sequenceMarkerRadius}
        fill={travelColorByGospel[marker.gospel]}
        stroke="#FFFFFF"
        strokeWidth={sequenceMarkerStrokeWidth}
      />
    )}

    <text
      x={marker.x}
      y={marker.y + sequenceMarkerTextYOffset}
      textAnchor="middle"
      fontSize={sequenceMarkerFontSize}
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
                      data-map-selectable="true"
                      onClick={() => {
                        togglePlace(node.id);
                      }}
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
                      {(() => {
                        const labelOffset = LABEL_OFFSETS[node.id] ?? {};
                        const labelDx = labelOffset.dx ?? 0;
                        const labelDy =
                          labelOffset.dy ??
                          (node.id === "jordan-river" ? 20 : 18);
                        const labelAnchor = labelOffset.anchor ?? "middle";
                        return (
                      <text
                        x={node.x + labelDx}
                        y={node.y + labelDy}
                        textAnchor={labelAnchor}
                        fontSize={placeLabelFontSize}
                        fontWeight="600"
                        fill="#334155"
                        style={{
                          paintOrder: "stroke",
                          stroke: "#F8FAFC",
                          strokeWidth: placeLabelStrokeWidth,
                        }}
                      >
                        {node.name}
                      </text>
                        );
                      })()}

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
                                scale={startPinScale}
                              />
                            </g>
                          );
                        })}
                    </g>
                  );
                })}
                </g>
              </svg>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
