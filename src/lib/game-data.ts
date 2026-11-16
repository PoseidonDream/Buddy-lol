/**
 * Small static tables for things Riot identifies by number. Champion names
 * and the asset version come from Data Dragon at runtime (see ddragon.ts);
 * the tables here cover ids that have been stable for years.
 */

import type { Position, RankedQueue, Tier } from "./types";

// ---------------------------------------------------------------- queues

export type QueueGroup = "solo" | "flex" | "normal" | "aram" | "other";

interface QueueInfo {
  name: string;
  group: QueueGroup;
}

const QUEUES: Record<number, QueueInfo> = {
  400: { name: "Normal Draft", group: "normal" },
  420: { name: "Ranked Solo", group: "solo" },
  430: { name: "Normal Blind", group: "normal" },
  440: { name: "Ranked Flex", group: "flex" },
  450: { name: "ARAM", group: "aram" },
  480: { name: "Swiftplay", group: "normal" },
  490: { name: "Quickplay", group: "normal" },
  700: { name: "Clash", group: "other" },
  720: { name: "ARAM Clash", group: "aram" },
  830: { name: "Co-op vs AI", group: "other" },
  840: { name: "Co-op vs AI", group: "other" },
  850: { name: "Co-op vs AI", group: "other" },
  870: { name: "Co-op vs AI", group: "other" },
  880: { name: "Co-op vs AI", group: "other" },
  890: { name: "Co-op vs AI", group: "other" },
  900: { name: "ARURF", group: "other" },
  1020: { name: "One for All", group: "other" },
  1300: { name: "Nexus Blitz", group: "other" },
  1400: { name: "Ultimate Spellbook", group: "other" },
  1700: { name: "Arena", group: "other" },
  1710: { name: "Arena", group: "other" },
  1900: { name: "URF", group: "other" },
};

const MODE_NAMES: Record<string, string> = {
  CLASSIC: "Summoner's Rift",
  ARAM: "ARAM",
  CHERRY: "Arena",
  URF: "URF",
  NEXUSBLITZ: "Nexus Blitz",
  ULTBOOK: "Ultimate Spellbook",
  ONEFORALL: "One for All",
  SWIFTPLAY: "Swiftplay",
};

export function queueName(queueId: number, gameMode = ""): string {
  return QUEUES[queueId]?.name ?? MODE_NAMES[gameMode] ?? (gameMode || "Custom");
}

export function queueGroup(queueId: number): QueueGroup {
  return QUEUES[queueId]?.group ?? "other";
}

export const QUEUE_FILTERS: { id: "all" | QueueGroup; label: string }[] = [
  { id: "all", label: "All" },
  { id: "solo", label: "Ranked Solo" },
  { id: "flex", label: "Ranked Flex" },
  { id: "normal", label: "Normal" },
  { id: "aram", label: "ARAM" },
  { id: "other", label: "Other" },
];

export const RANKED_QUEUE_NAMES: Record<RankedQueue, string> = {
  RANKED_SOLO_5x5: "Ranked Solo/Duo",
  RANKED_FLEX_SR: "Ranked Flex",
};

// ----------------------------------------------------------------- tiers

export const TIERS: Tier[] = [
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
];

export const APEX_TIERS = new Set<Tier>(["MASTER", "GRANDMASTER", "CHALLENGER"]);

export const TIER_COLORS: Record<Tier, [string, string]> = {
  IRON: ["#8a817c", "#4d4744"],
  BRONZE: ["#c58b62", "#7a4d30"],
  SILVER: ["#c3ced8", "#77848f"],
  GOLD: ["#f3cf6b", "#b98a27"],
  PLATINUM: ["#6fe0d0", "#2f8f86"],
  EMERALD: ["#58e08d", "#1f8f55"],
  DIAMOND: ["#9cc0ff", "#4d6fe0"],
  MASTER: ["#d79bff", "#8a3fd1"],
  GRANDMASTER: ["#ff8a8a", "#c8323c"],
  CHALLENGER: ["#fff0b3", "#3fb6f2"],
};

export function tierName(tier: Tier): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

// ------------------------------------------------------------- positions

export const POSITIONS: Position[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

export const POSITION_NAMES: Record<Position, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
};

// -------------------------------------------------------- summoner spells

/** Spell id -> Data Dragon image name (`/img/spell/{name}.png`). */
export const SPELLS: Record<number, { key: string; name: string }> = {
  1: { key: "SummonerBoost", name: "Cleanse" },
  3: { key: "SummonerExhaust", name: "Exhaust" },
  4: { key: "SummonerFlash", name: "Flash" },
  6: { key: "SummonerHaste", name: "Ghost" },
  7: { key: "SummonerHeal", name: "Heal" },
  11: { key: "SummonerSmite", name: "Smite" },
  12: { key: "SummonerTeleport", name: "Teleport" },
  13: { key: "SummonerMana", name: "Clarity" },
  14: { key: "SummonerDot", name: "Ignite" },
  21: { key: "SummonerBarrier", name: "Barrier" },
  32: { key: "SummonerSnowball", name: "Mark" },
  2201: { key: "SummonerCherryHold", name: "Flee" },
  2202: { key: "SummonerCherryFlash", name: "Flash" },
};

// ----------------------------------------------------------------- runes

/** Keystone / rune tree id -> icon path under `ddragon.../cdn/img/`. */
export const RUNES: Record<number, { name: string; icon: string }> = {
  // Trees
  8000: { name: "Precision", icon: "perk-images/Styles/7201_Precision.png" },
  8100: { name: "Domination", icon: "perk-images/Styles/7200_Domination.png" },
  8200: { name: "Sorcery", icon: "perk-images/Styles/7202_Sorcery.png" },
  8300: { name: "Inspiration", icon: "perk-images/Styles/7203_Whimsy.png" },
  8400: { name: "Resolve", icon: "perk-images/Styles/7204_Resolve.png" },
  // Precision
  8005: { name: "Press the Attack", icon: "perk-images/Styles/Precision/PressTheAttack/PressTheAttack.png" },
  8008: { name: "Lethal Tempo", icon: "perk-images/Styles/Precision/LethalTempo/LethalTempoTemp.png" },
  8021: { name: "Fleet Footwork", icon: "perk-images/Styles/Precision/FleetFootwork/FleetFootwork.png" },
  8010: { name: "Conqueror", icon: "perk-images/Styles/Precision/Conqueror/Conqueror.png" },
  // Domination
  8112: { name: "Electrocute", icon: "perk-images/Styles/Domination/Electrocute/Electrocute.png" },
  8128: { name: "Dark Harvest", icon: "perk-images/Styles/Domination/DarkHarvest/DarkHarvest.png" },
  9923: { name: "Hail of Blades", icon: "perk-images/Styles/Domination/HailOfBlades/HailOfBlades.png" },
  // Sorcery
  8214: { name: "Summon Aery", icon: "perk-images/Styles/Sorcery/SummonAery/SummonAery.png" },
  8229: { name: "Arcane Comet", icon: "perk-images/Styles/Sorcery/ArcaneComet/ArcaneComet.png" },
  8230: { name: "Phase Rush", icon: "perk-images/Styles/Sorcery/PhaseRush/PhaseRush.png" },
  // Resolve
  8437: { name: "Grasp of the Undying", icon: "perk-images/Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png" },
  8439: { name: "Aftershock", icon: "perk-images/Styles/Resolve/VeteranAftershock/VeteranAftershock.png" },
  8465: { name: "Guardian", icon: "perk-images/Styles/Resolve/Guardian/Guardian.png" },
  // Inspiration
  8351: { name: "Glacial Augment", icon: "perk-images/Styles/Inspiration/GlacialAugment/GlacialAugment.png" },
  8360: { name: "Unsealed Spellbook", icon: "perk-images/Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png" },
  8369: { name: "First Strike", icon: "perk-images/Styles/Inspiration/FirstStrike/FirstStrike.png" },
};

// ------------------------------------------------------------- champions

export interface ChampionInfo {
  id: number;
  /** Data Dragon id, e.g. "MonkeyKing". */
  key: string;
  name: string;
}

type Row = [id: number, key: string, name: string];

function rows(position: Position, list: Row[]) {
  return list.map(([id, key, name]) => ({ id, key, name, position }));
}

/**
 * A subset of the roster, grouped by the role each champion is usually played
 * in. It feeds the sample-data generator and is the fallback for champion
 * names when Data Dragon cannot be reached.
 */
export const CHAMPION_POOL: (ChampionInfo & { position: Position })[] = [
  ...rows("TOP", [
    [266, "Aatrox", "Aatrox"],
    [122, "Darius", "Darius"],
    [86, "Garen", "Garen"],
    [114, "Fiora", "Fiora"],
    [164, "Camille", "Camille"],
    [24, "Jax", "Jax"],
    [875, "Sett", "Sett"],
    [516, "Ornn", "Ornn"],
    [54, "Malphite", "Malphite"],
    [92, "Riven", "Riven"],
    [897, "KSante", "K'Sante"],
    [82, "Mordekaiser", "Mordekaiser"],
  ]),
  ...rows("JUNGLE", [
    [64, "LeeSin", "Lee Sin"],
    [234, "Viego", "Viego"],
    [121, "Khazix", "Kha'Zix"],
    [104, "Graves", "Graves"],
    [254, "Vi", "Vi"],
    [59, "JarvanIV", "Jarvan IV"],
    [60, "Elise", "Elise"],
    [76, "Nidalee", "Nidalee"],
    [11, "MasterYi", "Master Yi"],
    [245, "Ekko", "Ekko"],
    [200, "Belveth", "Bel'Veth"],
    [233, "Briar", "Briar"],
  ]),
  ...rows("MIDDLE", [
    [103, "Ahri", "Ahri"],
    [238, "Zed", "Zed"],
    [157, "Yasuo", "Yasuo"],
    [777, "Yone", "Yone"],
    [61, "Orianna", "Orianna"],
    [134, "Syndra", "Syndra"],
    [112, "Viktor", "Viktor"],
    [84, "Akali", "Akali"],
    [55, "Katarina", "Katarina"],
    [99, "Lux", "Lux"],
    [517, "Sylas", "Sylas"],
    [711, "Vex", "Vex"],
    [910, "Hwei", "Hwei"],
  ]),
  ...rows("BOTTOM", [
    [222, "Jinx", "Jinx"],
    [51, "Caitlyn", "Caitlyn"],
    [81, "Ezreal", "Ezreal"],
    [145, "Kaisa", "Kai'Sa"],
    [202, "Jhin", "Jhin"],
    [67, "Vayne", "Vayne"],
    [236, "Lucian", "Lucian"],
    [22, "Ashe", "Ashe"],
    [21, "MissFortune", "Miss Fortune"],
    [119, "Draven", "Draven"],
    [523, "Aphelios", "Aphelios"],
    [498, "Xayah", "Xayah"],
    [360, "Samira", "Samira"],
  ]),
  ...rows("UTILITY", [
    [412, "Thresh", "Thresh"],
    [89, "Leona", "Leona"],
    [117, "Lulu", "Lulu"],
    [111, "Nautilus", "Nautilus"],
    [555, "Pyke", "Pyke"],
    [497, "Rakan", "Rakan"],
    [25, "Morgana", "Morgana"],
    [53, "Blitzcrank", "Blitzcrank"],
    [235, "Senna", "Senna"],
    [902, "Milio", "Milio"],
  ]),
];
