export type GospelId = "matthew" | "mark" | "luke" | "john";

export type PlaceType =
  | "town"
  | "village"
  | "city"
  | "lake"
  | "river"
  | "area"
  | "region"
  | "mount"
  | "garden"
  | "site";

export type ConfidenceLevel = "high" | "medium" | "low";

export type PlaceId = string;
export type RelationshipId = string;
export type EpisodeId = string;

export interface Place {
  id: PlaceId;
  name: string;
  type: PlaceType;
  region: string | null;
  aliases: string[];
  tags: string[];
  certainty: ConfidenceLevel;
}

export interface PlacesFile {
  version: string;
  scope: string;
  places: Place[];
}

export interface Relationship {
  id: RelationshipId;
  source: PlaceId;
  target: PlaceId;
  relationType: string;
  weight: number;
  confidence: ConfidenceLevel;
}

export interface RelationshipsFile {
  version: string;
  scope: string;
  relationships: Relationship[];
}

export interface Episode {
  id: EpisodeId;
  title: string;
  placeIds: PlaceId[];
  themes: string[];
  gospels: GospelId[];
  confidence: ConfidenceLevel;
}

export interface EpisodesFile {
  version: string;
  scope: string;
  episodes: Episode[];
}

export interface GospelTravelSegment {
  id: string;
  label: string;
  placeIds: PlaceId[];
}

export interface GospelTravelSequence {
  gospel: GospelId;
  segments: GospelTravelSegment[];
}

export interface GospelTravelSequencesFile {
  version: string;
  scope: string;
  sequenceModel: string;
  notes?: string;
  gospels: GospelTravelSequence[];
}

export interface ModernMapOverlay {
  placeId: PlaceId;
  modernName: string;
  latitude: number;
  longitude: number;
  certainty: ConfidenceLevel;
}

export interface ModernMapOverlaysFile {
  version: string;
  scope: string;
  overlays: ModernMapOverlay[];
}

/**
 * Enriched runtime structures
 */
export interface PlaceWithOverlay extends Place {
  modernOverlay?: ModernMapOverlay;
}

export interface MapNode extends PlaceWithOverlay {
  x?: number;
  y?: number;
}

export interface MapEdge extends Relationship {
  sourcePlace?: Place;
  targetPlace?: Place;
}

export interface GospelRoutePoint {
  gospel: GospelId;
  segmentId: string;
  segmentLabel: string;
  placeId: PlaceId;
  order: number;
}

export interface GospelRouteSegmentResolved {
  gospel: GospelId;
  segmentId: string;
  segmentLabel: string;
  places: PlaceWithOverlay[];
}

export interface MapDataBundle {
  places: Place[];
  relationships: Relationship[];
  episodes: Episode[];
  travelSequences: GospelTravelSequence[];
  overlays: ModernMapOverlay[];
}

export interface MapIndexes {
  placesById: Record<string, Place>;
  overlaysByPlaceId: Record<string, ModernMapOverlay>;
  episodesById: Record<string, Episode>;
  relationshipsById: Record<string, Relationship>;
  travelSequencesByGospel: Partial<Record<GospelId, GospelTravelSequence>>;
}

export interface MapGraphData {
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface GospelRouteFilter {
  enabledGospels: GospelId[];
}

export interface EpisodeFilter {
  gospel?: GospelId;
  theme?: string;
}