/**
 * Riot IDs are "GameName#TAG". In URLs we write them as "GameName-TAG"
 * (a "#" would be read as a fragment), splitting on the last dash.
 */

export interface RiotId {
  gameName: string;
  tagLine: string;
}

// Deliberately a little looser than Riot's own rules (3-16 / 3-5 characters):
// the API is the source of truth, this only rejects obviously unusable input.
const NAME_RE = /^[^#/\\?%]{1,24}$/u;
const TAG_RE = /^[\p{L}\p{N}]{2,8}$/u;

function normalize(gameName: string, tagLine: string): RiotId | null {
  const name = gameName.trim().replace(/\s+/g, " ");
  const tag = tagLine.trim();
  if (!NAME_RE.test(name) || !TAG_RE.test(tag)) return null;
  return { gameName: name, tagLine: tag };
}

/** Parse what a person typed into the search box. */
export function parseRiotIdInput(input: string, defaultTag: string): RiotId | null {
  const hash = input.lastIndexOf("#");
  if (hash === -1) return normalize(input, defaultTag);
  return normalize(input.slice(0, hash), input.slice(hash + 1) || defaultTag);
}

export function riotIdToSlug({ gameName, tagLine }: RiotId): string {
  return encodeURIComponent(`${gameName}-${tagLine}`);
}

/** Parse the `[riotId]` route segment. Accepts both encoded and decoded input. */
export function riotIdFromSlug(slug: string): RiotId | null {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // Not valid percent-encoding: treat it as already decoded.
  }
  const dash = decoded.lastIndexOf("-");
  if (dash <= 0) return null;
  return normalize(decoded.slice(0, dash), decoded.slice(dash + 1));
}

export function formatRiotId({ gameName, tagLine }: RiotId): string {
  return `${gameName}#${tagLine}`;
}

export function profilePath(regionSlug: string, id: RiotId): string {
  return `/summoner/${regionSlug}/${riotIdToSlug(id)}`;
}
