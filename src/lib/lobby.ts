/**
 * Pulling Riot IDs out of whatever someone pastes: a block copied from the
 * client's lobby or champion select chat ("Name #TAG joined the lobby"), or
 * a list of IDs separated by commas or new lines.
 */

import { parseRiotIdInput, type RiotId } from "./riot-id";

export const MAX_LOBBY_PLAYERS = 5;

const CHAT_NOISE = /\s+(joined|left) the (lobby|room|game|champ(ion)? select)\.?\s*$/i;

export interface LobbyParse {
  players: RiotId[];
  /** Lines that looked like something but could not be read as a Riot ID. */
  rejected: string[];
  /** Valid IDs beyond the first MAX_LOBBY_PLAYERS. */
  dropped: number;
}

export function parseLobby(text: string, defaultTag: string): LobbyParse {
  const players: RiotId[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  for (const raw of text.split(/[\n,]+/)) {
    // The client writes "Name #TAG"; a space before the # is not part of the name.
    const line = raw.replace(CHAT_NOISE, "").replace(/\s+#/, "#").trim();
    if (!line) continue;

    const id = parseRiotIdInput(line, defaultTag);
    if (!id) {
      rejected.push(line);
      continue;
    }
    const key = `${id.gameName}#${id.tagLine}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (players.length < MAX_LOBBY_PLAYERS) players.push(id);
    else dropped++;
  }

  return { players, rejected, dropped };
}

/** The form a lobby takes in a URL: "Name#TAG,Other#TAG". */
export function lobbyToQuery(players: RiotId[]): string {
  return players.map((p) => `${p.gameName}#${p.tagLine}`).join(",");
}
