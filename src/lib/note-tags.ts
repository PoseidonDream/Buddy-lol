/** Quick labels on notes. Presets are stored by id; anything else is custom text. */

export type TagTone = "good" | "bad" | "neutral";

export const PRESET_TAGS = [
  { id: "friendly", tone: "good" },
  { id: "carry", tone: "good" },
  { id: "shotcaller", tone: "good" },
  { id: "good-jungler", tone: "good" },
  { id: "toxic", tone: "bad" },
  { id: "inter", tone: "bad" },
  { id: "tilts", tone: "bad" },
  { id: "afk", tone: "bad" },
  { id: "one-trick", tone: "neutral" },
  { id: "smurf", tone: "neutral" },
  { id: "duo", tone: "neutral" },
] as const satisfies readonly { id: string; tone: TagTone }[];

export type PresetTag = (typeof PRESET_TAGS)[number]["id"];

/** English labels; also what typed text is matched against. */
export const TAG_LABELS: Record<PresetTag, string> = {
  friendly: "Friendly",
  carry: "Carry",
  shotcaller: "Shotcaller",
  "good-jungler": "Good jungler",
  toxic: "Toxic",
  inter: "Inter",
  tilts: "Tilts",
  afk: "AFK",
  "one-trick": "One-trick",
  smurf: "Smurf",
  duo: "Duo",
};

export const MAX_TAGS = 6;
export const MAX_TAG_LENGTH = 24;

const PRESET_IDS = new Set<string>(PRESET_TAGS.map((t) => t.id));

export function isPreset(tag: string): tag is PresetTag {
  return PRESET_IDS.has(tag);
}

export function tagTone(tag: string): TagTone {
  return PRESET_TAGS.find((t) => t.id === tag)?.tone ?? "neutral";
}

const fold = (text: string) => text.toLocaleLowerCase("en").replace(/[\s_-]+/g, "");

/**
 * Tidies tags from a form: trims, turns typed text that names a preset ("good
 * jungler", "Toxic") into that preset, drops duplicates, and caps count and
 * length. Custom tags keep their spelling.
 */
export function cleanTags(raw: string[], extraNames: Record<string, string>[] = []): string[] {
  const byName = new Map<string, string>();
  for (const id of PRESET_IDS) byName.set(fold(id), id);
  for (const labels of [TAG_LABELS, ...extraNames]) {
    for (const [id, label] of Object.entries(labels)) if (PRESET_IDS.has(id)) byName.set(fold(label), id);
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const text = value.replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH).trim();
    if (!text) continue;
    const tag = byName.get(fold(text)) ?? text;
    const key = fold(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length === MAX_TAGS) break;
  }
  return out;
}
