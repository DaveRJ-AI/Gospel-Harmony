import placesJson from "./places.json";
import relationshipsJson from "./relationships.json";
import episodesJson from "./episodes.json";
import gospelTravelSequencesJson from "./gospel-travel-sequences.json";
import modernMapOverlaysJson from "./modern-map-overlays.json";

import type {
  Episode,
  EpisodeFilter,
  EpisodesFile,
  GospelId,
  GospelRoutePoint,
  GospelRouteSegmentResolved,
  GospelTravelSequence,
  GospelTravelSequencesFile,
  MapDataBundle,
  MapEdge,
  MapGraphData,
  MapIndexes,
  MapNode,
  ModernMapOverlay,
  ModernMapOverlaysFile,
  Place,
  PlaceWithOverlay,
  PlacesFile,
  Relationship,
  RelationshipsFile,
} from "../../types/mapTypes";

/**
 * Typed JSON casts
 */
const typedPlacesJson = placesJson as PlacesFile;
const typedRelationshipsJson = relationshipsJson as RelationshipsFile;
const typedEpisodesJson = episodesJson as EpisodesFile;
const typedTravelSequencesJson =
  gospelTravelSequencesJson as GospelTravelSequencesFile;
const typedModernMapOverlaysJson =
  modernMapOverlaysJson as ModernMapOverlaysFile;

/**
 * Small normalization guard for known ID drift
 * Example: "deca polis" -> "decapolis"
 */
function normalizeId(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeSpecialPlaceId(value: string): string {
  const normalized = normalizeId(value);

  if (normalized === "deca-polis") return "decapolis";
  return normalized;
}

function normalizePlace(place: Place): Place {
  return {
    ...place,
    id: normalizeSpecialPlaceId(place.id),
    region: place.region ? normalizeSpecialPlaceId(place.region) : null,
  };
}

function normalizeRelationship(rel: Relationship): Relationship {
  return {
    ...rel,
    source: normalizeSpecialPlaceId(rel.source),
    target: normalizeSpecialPlaceId(rel.target),
  };
}

function normalizeEpisode(ep: Episode): Episode {
  return {
    ...ep,
    placeIds: ep.placeIds.map(normalizeSpecialPlaceId),
  };
}

function normalizeTravelSequence(
  seq: GospelTravelSequence
): GospelTravelSequence {
  return {
    ...seq,
    segments: seq.segments.map((segment) => ({
      ...segment,
      placeIds: segment.placeIds.map(normalizeSpecialPlaceId),
    })),
  };
}

function normalizeOverlay(overlay: ModernMapOverlay): ModernMapOverlay {
  return {
    ...overlay,
    placeId: normalizeSpecialPlaceId(overlay.placeId),
  };
}

/**
 * Raw data access
 */
export function loadMapDataBundle(): MapDataBundle {
  return {
    places: typedPlacesJson.places.map(normalizePlace),
    relationships: typedRelationshipsJson.relationships.map(
      normalizeRelationship
    ),
    episodes: typedEpisodesJson.episodes.map(normalizeEpisode),
    travelSequences: typedTravelSequencesJson.gospels.map(
      normalizeTravelSequence
    ),
    overlays: typedModernMapOverlaysJson.overlays.map(normalizeOverlay),
  };
}

/**
 * Index builders
 */
export function buildMapIndexes(bundle: MapDataBundle): MapIndexes {
  const placesById: Record<string, Place> = {};
  const overlaysByPlaceId: Record<string, ModernMapOverlay> = {};
  const episodesById: Record<string, Episode> = {};
  const relationshipsById: Record<string, Relationship> = {};
  const travelSequencesByGospel: Partial<Record<GospelId, GospelTravelSequence>> =
    {};

  for (const place of bundle.places) {
    placesById[place.id] = place;
  }

  for (const overlay of bundle.overlays) {
    overlaysByPlaceId[overlay.placeId] = overlay;
  }

  for (const episode of bundle.episodes) {
    episodesById[episode.id] = episode;
  }

  for (const relationship of bundle.relationships) {
    relationshipsById[relationship.id] = relationship;
  }

  for (const sequence of bundle.travelSequences) {
    travelSequencesByGospel[sequence.gospel] = sequence;
  }

  return {
    placesById,
    overlaysByPlaceId,
    episodesById,
    relationshipsById,
    travelSequencesByGospel,
  };
}

/**
 * Enrichment helpers
 */
export function getPlaceWithOverlay(
  placeId: string,
  indexes: MapIndexes
): PlaceWithOverlay | undefined {
  const normalizedId = normalizeSpecialPlaceId(placeId);
  const place = indexes.placesById[normalizedId];
  if (!place) return undefined;

  const overlay = indexes.overlaysByPlaceId[normalizedId];
  return overlay ? { ...place, modernOverlay: overlay } : { ...place };
}

export function getAllPlacesWithOverlays(
  bundle?: MapDataBundle
): PlaceWithOverlay[] {
  const data = bundle ?? loadMapDataBundle();
  const indexes = buildMapIndexes(data);

  return data.places.map((place) => getPlaceWithOverlay(place.id, indexes)!);
}

/**
 * Graph creation for relational view
 */
export function buildMapGraphData(bundle?: MapDataBundle): MapGraphData {
  const data = bundle ?? loadMapDataBundle();
  const indexes = buildMapIndexes(data);

  const nodes: MapNode[] = data.places.map((place) => {
    const enriched = getPlaceWithOverlay(place.id, indexes)!;
    return { ...enriched };
  });

  const edges: MapEdge[] = data.relationships.map((relationship) => ({
    ...relationship,
    sourcePlace: indexes.placesById[relationship.source],
    targetPlace: indexes.placesById[relationship.target],
  }));

  return { nodes, edges };
}

/**
 * Filter helpers
 */
export function getEpisodesForPlace(
  placeId: string,
  bundle?: MapDataBundle
): Episode[] {
  const data = bundle ?? loadMapDataBundle();
  const normalizedId = normalizeSpecialPlaceId(placeId);

  return data.episodes.filter((episode) =>
    episode.placeIds.includes(normalizedId)
  );
}

export function filterEpisodes(
  filter: EpisodeFilter,
  bundle?: MapDataBundle
): Episode[] {
  const data = bundle ?? loadMapDataBundle();

  return data.episodes.filter((episode) => {
    if (filter.gospel && !episode.gospels.includes(filter.gospel)) {
      return false;
    }

    if (
      filter.theme &&
      !episode.themes.some(
        (theme) => theme.toLowerCase() === filter.theme?.toLowerCase()
      )
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Gospel route helpers
 */
export function getTravelSequenceForGospel(
  gospel: GospelId,
  bundle?: MapDataBundle
): GospelTravelSequence | undefined {
  const data = bundle ?? loadMapDataBundle();
  return data.travelSequences.find((sequence) => sequence.gospel === gospel);
}

export function resolveTravelSequenceForGospel(
  gospel: GospelId,
  bundle?: MapDataBundle
): GospelRouteSegmentResolved[] {
  const data = bundle ?? loadMapDataBundle();
  const indexes = buildMapIndexes(data);
  const sequence = getTravelSequenceForGospel(gospel, data);

  if (!sequence) return [];

  return sequence.segments.map((segment) => ({
    gospel,
    segmentId: segment.id,
    segmentLabel: segment.label,
    places: segment.placeIds
      .map((placeId) => getPlaceWithOverlay(placeId, indexes))
      .filter((place): place is PlaceWithOverlay => Boolean(place)),
  }));
}

export function flattenTravelSequencePoints(
  gospel: GospelId,
  bundle?: MapDataBundle
): GospelRoutePoint[] {
  const resolved = resolveTravelSequenceForGospel(gospel, bundle);
  const points: GospelRoutePoint[] = [];

  let order = 0;

  for (const segment of resolved) {
    for (const place of segment.places) {
      points.push({
        gospel,
        segmentId: segment.segmentId,
        segmentLabel: segment.segmentLabel,
        placeId: place.id,
        order,
      });
      order += 1;
    }
  }

  return points;
}

export function getCombinedTravelPoints(
  gospels: GospelId[],
  bundle?: MapDataBundle
): GospelRoutePoint[] {
  return gospels.flatMap((gospel) =>
    flattenTravelSequencePoints(gospel, bundle)
  );
}

/**
 * Modern map helpers
 */
export function getModernOverlayPoints(bundle?: MapDataBundle): Array<
  PlaceWithOverlay & {
    latitude: number;
    longitude: number;
    modernName: string;
  }
> {
  const data = bundle ?? loadMapDataBundle();
  const indexes = buildMapIndexes(data);

  return data.overlays
    .map((overlay) => {
      const place = getPlaceWithOverlay(overlay.placeId, indexes);
      if (!place || !place.modernOverlay) return undefined;

      return {
        ...place,
        latitude: overlay.latitude,
        longitude: overlay.longitude,
        modernName: overlay.modernName,
      };
    })
    .filter(
      (
        value
      ): value is PlaceWithOverlay & {
        latitude: number;
        longitude: number;
        modernName: string;
      } => Boolean(value)
    );
}

/**
 * Validation helpers
 */
export interface MapValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMapData(bundle?: MapDataBundle): MapValidationResult {
  const data = bundle ?? loadMapDataBundle();
  const errors: string[] = [];
  const warnings: string[] = [];

  const placeIds = new Set(data.places.map((place) => place.id));

  for (const relationship of data.relationships) {
    if (!placeIds.has(relationship.source)) {
      errors.push(
        `Relationship ${relationship.id} has unknown source: ${relationship.source}`
      );
    }

    if (!placeIds.has(relationship.target)) {
      errors.push(
        `Relationship ${relationship.id} has unknown target: ${relationship.target}`
      );
    }
  }

  for (const episode of data.episodes) {
    for (const placeId of episode.placeIds) {
      if (!placeIds.has(placeId)) {
        errors.push(`Episode ${episode.id} references unknown place: ${placeId}`);
      }
    }
  }

  for (const sequence of data.travelSequences) {
    for (const segment of sequence.segments) {
      for (const placeId of segment.placeIds) {
        if (!placeIds.has(placeId)) {
          errors.push(
            `Travel sequence ${sequence.gospel}/${segment.id} references unknown place: ${placeId}`
          );
        }
      }
    }
  }

  for (const overlay of data.overlays) {
    if (!placeIds.has(overlay.placeId)) {
      errors.push(`Overlay references unknown place: ${overlay.placeId}`);
    }
  }

  for (const place of data.places) {
    if (place.region && !placeIds.has(place.region)) {
      warnings.push(
        `Place ${place.id} references region ${place.region} that is not present as a place id`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}