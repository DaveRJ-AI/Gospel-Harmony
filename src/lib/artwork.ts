export type ArtworkItem = {
  image: string;
  thumbnail?: string;
  title: string;
  caption?: string;
  artist?: string;
  source?: string;
};

export type ArtworkMap = Record<string, ArtworkItem[]>;

let artworkCache: ArtworkMap | null = null;

export async function loadArtworkMap(): Promise<ArtworkMap> {
  if (artworkCache) return artworkCache;

  const res = await fetch("/data/artwork.json");
  if (!res.ok) {
    throw new Error(`Failed to load artwork.json: ${res.status}`);
  }

  const json = (await res.json()) as ArtworkMap;
  artworkCache = json;
  return json;
}

export function artworkForPericope(map: ArtworkMap, pericopeId: string | null | undefined): ArtworkItem[] {
  if (!pericopeId) return [];
  return map[pericopeId] || [];
}