import { useMemo, useState } from "react";
import type {
  Episode,
  GospelId,
  PlaceWithOverlay,
} from "../../types/mapTypes";
import {
  buildMapGraphData,
  getCombinedTravelPoints,
  getEpisodesForPlace,
  getModernOverlayPoints,
  loadMapDataBundle,
} from "../../data/map/mapDataLoader";

const GOSPELS: GospelId[] = ["matthew", "mark", "luke", "john"];

type PositionedNode = PlaceWithOverlay & {
  x: number;
  y: number;
};

const SVG_WIDTH = 1100;
const SVG_HEIGHT = 760;

const REGION_ANCHORS: Record<string, { x: number; y: number }> = {
  galilee: { x: 340, y: 180 },
  samaria: { x: 500, y: 360 },
  judea: { x: 610, y: 560 },
  perea: { x: 800, y: 430 },
  transjordan: { x: 835, y: 340 },
  "judean-wilderness": { x: 760, y: 585 },
  decapolis: { x: 880, y: 250 },
};

const REGION_LAYOUT_OFFSETS: Record<string, Array<{ x: number; y: number }>> = {
  galilee: [
    { x: -110, y: -40 },
    { x: -20, y: -90 },
    { x: 70, y: -20 },
    { x: -70, y: 60 },
    { x: 40, y: 70 },
    { x: 110, y: 25 },
    { x: 0, y: 0 },
    { x: -10, y: 110 },
  ],
  samaria: [
    { x: -40, y: -20 },
    { x: 60, y: 10 },
    { x: 0, y: 70 },
  ],
  judea: [
    { x: -70, y: -80 },
    { x: 20, y: -35 },
    { x: 70, y: 45 },
    { x: -100, y: 50 },
    { x: 0, y: 0 },
    { x: 120, y: -10 },
    { x: 140, y: 70 },
    { x: -10, y: 110 },
  ],
  perea: [
    { x: 0, y: 0 },
    { x: 50, y: 60 },
  ],
  transjordan: [{ x: 0, y: 0 }],
  "judean-wilderness": [{ x: 0, y: 0 }],
  decapolis: [{ x: 0, y: 0 }],
  default: [
    { x: 0, y: 0 },
    { x: 60, y: 30 },
    { x: -60, y: 30 },
    { x: 30, y: -50 },
    { x: -30, y: -50 },
  ],
};

function getNodeRadius(type: string): number {
  switch (type) {
    case "region":
      return 26;
    case "city":
      return 13;
    case "town":
      return 11;
    case "village":
      return 10;
    case "lake":
      return 16;
    case "river":
      return 14;
    case "mount":
      return 11;
    case "garden":
      return 9;
    case "site":
      return 9;
    case "area":
      return 18;
    default:
      return 10;
  }
}

function getNodeClassNames(
  node: PlaceWithOverlay,
  selectedPlaceId: string | null,
  highlightedPlaceIds: Set<string>
): string {
  const selected = selectedPlaceId === node.id;
  const highlighted = highlightedPlaceIds.has(node.id);

  if (selected) {
    return "fill-amber-300 stroke-amber-700";
  }

  if (highlighted) {
    return "fill-sky-300 stroke-sky-700";
  }

  switch (node.type) {
    case "region":
      return "fill-violet-200 stroke-violet-700";
    case "lake":
      return "fill-cyan-200 stroke-cyan-700";
    case "river":
      return "fill-cyan-100 stroke-cyan-700";
    case "area":
      return "fill-stone-200 stroke-stone-700";
    default:
      return "fill-white stroke-slate-700";
  }
}

function buildRelationalLayout(nodes: PlaceWithOverlay[]): PositionedNode[] {
  const grouped = new Map<string, PlaceWithOverlay[]>();

  for (const node of nodes) {
    const key = node.region ?? (node.type === "region" ? node.id : "default");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(node);
  }

  const positioned: PositionedNode[] = [];

  for (const [groupKey, groupNodes] of grouped.entries()) {
    const anchor =
      REGION_ANCHORS[groupKey] ?? REGION_ANCHORS.default ?? { x: 550, y: 380 };
    const offsets =
      REGION_LAYOUT_OFFSETS[groupKey] ?? REGION_LAYOUT_OFFSETS.default;

    groupNodes.forEach((node, index) => {
      const offset = offsets[index % offsets.length];
      const layer = Math.floor(index / offsets.length);
      const spiralShift = layer * 26;

      positioned.push({
        ...node,
        x: anchor.x + offset.x + spiralShift,
        y: anchor.y + offset.y + spiralShift * 0.4,
      });
    });
  }

  return positioned;
}

function buildModernLayout(nodes: PlaceWithOverlay[]): PositionedNode[] {
  const withCoords = nodes.filter((node) => node.modernOverlay);

  if (withCoords.length === 0) {
    return buildRelationalLayout(nodes);
  }

  const lats = withCoords.map((node) => node.modernOverlay!.latitude);
  const lngs = withCoords.map((node) => node.modernOverlay!.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const padding = 80;
  const innerWidth = SVG_WIDTH - padding * 2;
  const innerHeight = SVG_HEIGHT - padding * 2;

  return nodes.map((node) => {
    if (!node.modernOverlay) {
      const fallback = REGION_ANCHORS[node.region ?? node.id] ?? {
        x: SVG_WIDTH / 2,
        y: SVG_HEIGHT / 2,
      };

      return {
        ...node,
        x: fallback.x,
        y: fallback.y,
      };
    }

    const { latitude, longitude } = node.modernOverlay;

    const x =
      padding + ((longitude - minLng) / Math.max(maxLng - minLng, 0.0001)) * innerWidth;

    const y =
      padding +
      (1 - (latitude - minLat) / Math.max(maxLat - minLat, 0.0001)) * innerHeight;

    return {
      ...node,
      x,
      y,
    };
  });
}

export default function MapView() {
  const bundle = useMemo(() => loadMapDataBundle(), []);
  const graph = useMemo(() => buildMapGraphData(bundle), [bundle]);
  const modernOverlayPoints = useMemo(() => getModernOverlayPoints(bundle), [bundle]);

  const [useModernOverlay, setUseModernOverlay] = useState(false);
  const [enabledGospels, setEnabledGospels] = useState<GospelId[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [showEdges, setShowEdges] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const nodes = useMemo<PositionedNode[]>(() => {
    const baseNodes = graph.nodes;
    return useModernOverlay ? buildModernLayout(baseNodes) : buildRelationalLayout(baseNodes);
  }, [graph.nodes, useModernOverlay]);

  const nodesById = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    for (const node of nodes) map.set(node.id, node);
    return map;
  }, [nodes]);

  const selectedPlace = selectedPlaceId ? nodesById.get(selectedPlaceId) ?? null : null;

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

  const travelPathsByGospel = useMemo(() => {
    const grouped = new Map<GospelId, PositionedNode[]>();

    for (const gospel of enabledGospels) {
      grouped.set(gospel, []);
    }

    for (const point of travelPoints) {
      const node = nodesById.get(point.placeId);
      if (!node) continue;
      grouped.get(point.gospel)?.push(node);
    }

    return grouped;
  }, [enabledGospels, travelPoints, nodesById]);

  const travelColorByGospel: Record<GospelId, string> = {
    matthew: "#2563eb",
    mark: "#dc2626",
    luke: "#16a34a",
    john: "#9333ea",
  };

  function toggleGospel(gospel: GospelId) {
    setEnabledGospels((current) =>
      current.includes(gospel)
        ? current.filter((g) => g !== gospel)
        : [...current, gospel]
    );
  }

  return (
    <div className="flex h-full min-h-[780px] w-full bg-slate-100">
      <aside className="w-[320px] shrink-0 overflow-y-auto border-r border-slate-300 bg-white p-4">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">Gospel Map</h2>
          <p className="mt-1 text-sm text-slate-600">
            Relational geography with optional modern overlay and Gospel travel paths.
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            View Mode
          </h3>

          <label className="mb-2 flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={useModernOverlay}
              onChange={(e) => setUseModernOverlay(e.target.checked)}
            />
            Use modern geographic overlay
          </label>

          <label className="mb-2 flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showEdges}
              onChange={(e) => setShowEdges(e.target.checked)}
            />
            Show relationships
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            Show labels
          </label>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Gospel Travel Sequences
          </h3>

          <div className="space-y-2">
            {GOSPELS.map((gospel) => (
              <label
                key={gospel}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                <span className="capitalize">{gospel}</span>
                <input
                  type="checkbox"
                  checked={enabledGospels.includes(gospel)}
                  onChange={() => toggleGospel(gospel)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Places
          </h3>

          <div className="max-h-[220px] space-y-1 overflow-y-auto pr-1">
            {nodes
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlaceId(node.id);
                    setSelectedEpisodeId(null);
                  }}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                    selectedPlaceId === node.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {node.name}
                </button>
              ))}
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Selected Place
          </h3>

          {!selectedPlace ? (
            <p className="text-sm text-slate-500">Select a place on the map or from the list.</p>
          ) : (
            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <span className="font-semibold">Name:</span> {selectedPlace.name}
              </div>
              <div>
                <span className="font-semibold">Type:</span> {selectedPlace.type}
              </div>
              <div>
                <span className="font-semibold">Region:</span>{" "}
                {selectedPlace.region ?? "—"}
              </div>
              <div>
                <span className="font-semibold">Certainty:</span>{" "}
                {selectedPlace.certainty}
              </div>
              {selectedPlace.modernOverlay && (
                <div>
                  <span className="font-semibold">Modern:</span>{" "}
                  {selectedPlace.modernOverlay.modernName}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Episodes at Selected Place
          </h3>

          {placeEpisodes.length === 0 ? (
            <p className="text-sm text-slate-500">No mapped episodes for this place yet.</p>
          ) : (
            <div className="space-y-2">
              {placeEpisodes.map((episode) => (
                <button
                  key={episode.id}
                  type="button"
                  onClick={() => setSelectedEpisodeId(episode.id)}
                  className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedEpisodeId === episode.id
                      ? "border-sky-500 bg-sky-50 text-sky-900"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-medium">{episode.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {episode.gospels.join(", ")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="relative flex-1 overflow-hidden">
        <div className="border-b border-slate-300 bg-white px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {useModernOverlay ? "Modern Geographic Overlay" : "Relational Gospel Map"}
              </h1>
              <p className="text-sm text-slate-600">
                {useModernOverlay
                  ? `${modernOverlayPoints.length} overlay points available`
                  : `${graph.nodes.length} places and ${graph.edges.length} relationships`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              {enabledGospels.map((gospel) => (
                <div key={gospel} className="flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: travelColorByGospel[gospel] }}
                  />
                  <span className="capitalize text-slate-700">{gospel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="h-full w-full bg-slate-50"
          role="img"
          aria-label="Gospel map visualization"
        >
          {useModernOverlay && (
            <>
              <rect x={50} y={50} width={1000} height={660} className="fill-white" />
              <text x={70} y={90} className="fill-slate-400 text-[14px]">
                Approximate modern-coordinate projection
              </text>
            </>
          )}

          {!useModernOverlay && (
            <>
              <text x={250} y={95} className="fill-slate-400 text-[16px]">Galilee</text>
              <text x={470} y={330} className="fill-slate-400 text-[16px]">Samaria</text>
              <text x={600} y={720} className="fill-slate-400 text-[16px]">Judea</text>
              <text x={835} y={470} className="fill-slate-400 text-[16px]">Perea</text>
              <text x={880} y={210} className="fill-slate-400 text-[16px]">Decapolis</text>
            </>
          )}

          {showEdges &&
            graph.edges.map((edge) => {
              const source = nodesById.get(edge.source);
              const target = nodesById.get(edge.target);
              if (!source || !target) return null;

              const highlighted =
                episodeHighlightedPlaceIds.has(source.id) &&
                episodeHighlightedPlaceIds.has(target.id);

              return (
                <line
                  key={edge.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={highlighted ? "#0284c7" : "#cbd5e1"}
                  strokeWidth={highlighted ? 3 : Math.max(1.5, edge.weight * 2)}
                  strokeDasharray={
                    edge.relationType.includes("travel") || edge.relationType.includes("sequence")
                      ? "7 5"
                      : undefined
                  }
                  opacity={0.9}
                />
              );
            })}

          {enabledGospels.map((gospel) => {
            const pathNodes = travelPathsByGospel.get(gospel) ?? [];
            if (pathNodes.length < 2) return null;

            const points = pathNodes.map((node) => `${node.x},${node.y}`).join(" ");

            return (
              <polyline
                key={gospel}
                points={points}
                fill="none"
                stroke={travelColorByGospel[gospel]}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.75}
              />
            );
          })}

          {nodes.map((node) => {
            const radius = getNodeRadius(node.type);
            const classNames = getNodeClassNames(
              node,
              selectedPlaceId,
              episodeHighlightedPlaceIds
            );

            return (
              <g
                key={node.id}
                onClick={() => {
                  setSelectedPlaceId(node.id);
                  setSelectedEpisodeId(null);
                }}
                className="cursor-pointer"
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  className={`${classNames} stroke-[2] transition-all`}
                />
                {enabledGospels.some((gospel) =>
                  (travelPathsByGospel.get(gospel) ?? []).some((p) => p.id === node.id)
                ) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + 6}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                )}
                {showLabels && (
                  <text
                    x={node.x}
                    y={node.y + radius + 18}
                    textAnchor="middle"
                    className="fill-slate-700 text-[13px] font-medium"
                  >
                    {node.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {selectedEpisode && (
          <div className="absolute bottom-4 right-4 max-w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
            <div className="mb-1 text-sm font-semibold text-slate-900">
              {selectedEpisode.title}
            </div>
            <div className="mb-2 text-xs text-slate-500">
              Gospels: {selectedEpisode.gospels.join(", ")}
            </div>
            <div className="mb-2 text-sm text-slate-700">
              Themes: {selectedEpisode.themes.join(", ")}
            </div>
            <div className="text-xs text-slate-500">
              Highlighted places: {selectedEpisode.placeIds.join(", ")}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}