/** Image URLs on Riot's Data Dragon CDN. Pure helpers, safe on the client. */

import { RUNES, SPELLS } from "./game-data";

const CDN = "https://ddragon.leagueoflegends.com/cdn";

export function championIcon(version: string, championKey: string): string {
  return `${CDN}/${version}/img/champion/${championKey}.png`;
}

export function itemIcon(version: string, itemId: number): string {
  return `${CDN}/${version}/img/item/${itemId}.png`;
}

export function profileIcon(version: string, iconId: number): string {
  return `${CDN}/${version}/img/profileicon/${iconId}.png`;
}

export function spellIcon(version: string, spellId: number): string | null {
  const spell = SPELLS[spellId];
  return spell ? `${CDN}/${version}/img/spell/${spell.key}.png` : null;
}

export function runeIcon(runeId: number | null): string | null {
  const rune = runeId === null ? undefined : RUNES[runeId];
  return rune ? `${CDN}/img/${rune.icon}` : null;
}
