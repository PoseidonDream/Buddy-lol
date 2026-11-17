"use server";

import { createHash } from "node:crypto";
import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";
import {
  MAX_NOTE,
  NOTES_COOKIE,
  NOTES_COOKIE_MAX_AGE,
  cleanName,
  currentWriter,
  notesEnabled,
  passwordMatches,
  signSession,
} from "@/lib/notes-auth";
import { dictionaries } from "@/i18n/dictionaries";
import { requestDict } from "@/i18n/request";
import { cleanTags } from "@/lib/note-tags";
import { clientIp } from "@/lib/rate-limit";
import { getRegion } from "@/lib/regions";
import { getStore } from "@/lib/store";

export interface NotesFormState {
  error: string | null;
  /**
   * What was typed, sent back on errors: React clears a form after every
   * submission, so the fields refill from these instead of coming back empty.
   */
  values?: Record<string, string>;
}

/** Wrong passwords allowed per address per hour, against guessing. */
const MAX_ATTEMPTS_PER_HOUR = 10;

export async function unlockNotes(_: NotesFormState, form: FormData): Promise<NotesFormState> {
  const t = (await requestDict()).notes;
  if (!notesEnabled()) return { error: t.notSetUp };

  const ip = clientIp(await headers());
  const hour = 60 * 60 * 1000;
  const windowStart = Math.floor(Date.now() / hour) * hour;
  const visitor = createHash("sha256").update(`notes-login:${ip}`).digest("hex").slice(0, 24);
  const attempts = await getStore()
    .countHits(`notes-login:${visitor}`, windowStart, 1)
    .catch(() => 0);
  if (attempts > MAX_ATTEMPTS_PER_HOUR) {
    return { error: t.tooManyAttempts, values: { name: cleanName(form.get("name")) } };
  }

  const name = cleanName(form.get("name"));
  if (!name) return { error: t.needName };
  if (!passwordMatches(String(form.get("password") ?? ""))) {
    return { error: t.wrongPassword, values: { name } };
  }

  (await cookies()).set(NOTES_COOKIE, signSession(name), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: NOTES_COOKIE_MAX_AGE,
  });
  refresh();
  return { error: null };
}

export async function lockNotes(): Promise<void> {
  (await cookies()).delete(NOTES_COOKIE);
  refresh();
}

/** Comments one address may post per hour and per day, against spam. */
const COMMENTS_PER_HOUR = 5;
const COMMENTS_PER_DAY = 20;
/** Reports one address may send per hour. */
const REPORTS_PER_HOUR = 10;

function visitorKey(kind: string, ip: string): string {
  return createHash("sha256").update(`${kind}:${ip}`).digest("hex").slice(0, 24);
}

/** Counts one more for this visitor and window; true while still under `max`. */
async function underLimit(kind: string, ip: string, windowMs: number, max: number): Promise<boolean> {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const hits = await getStore().countHits(`${kind}:${visitorKey(kind, ip)}`, windowStart, 1);
  return hits <= max;
}

/** A public comment on a player. Anyone can post; the moderators can remove it. */
export async function addComment(_: NotesFormState, form: FormData): Promise<NotesFormState> {
  const t = (await requestDict()).notes;
  const name = cleanName(form.get("name"));
  const body = String(form.get("body") ?? "").trim();
  const typedTags = String(form.get("customTags") ?? "");
  // Typed tags are matched against the preset names in every language.
  const tags = cleanTags(
    [...form.getAll("tag").map(String), ...typedTags.split(",")],
    Object.values(dictionaries).map((d) => d.tags),
  );
  // Sent back on errors so nothing typed or ticked is lost.
  const values = { name, body, customTags: typedTags, tags: tags.join("\n") };

  if (!notesEnabled()) return { error: t.notSetUp, values };
  // A field people never see; bots that fill it in are told it worked.
  if (String(form.get("website") ?? "") !== "") return { error: null };

  const puuid = String(form.get("puuid") ?? "");
  const region = getRegion(String(form.get("region") ?? ""));
  const riotId = String(form.get("riotId") ?? "").slice(0, 40);
  if (!body && tags.length === 0) return { error: t.empty, values };
  if (body.length > MAX_NOTE) return { error: t.tooLong(MAX_NOTE), values };
  if (!region || !puuid || puuid.length > 100 || !riotId) return { error: t.unknownPlayer, values };

  const ip = clientIp(await headers());
  try {
    const hourOk = await underLimit("comment-hour", ip, 60 * 60 * 1000, COMMENTS_PER_HOUR);
    const dayOk = hourOk && (await underLimit("comment-day", ip, 24 * 60 * 60 * 1000, COMMENTS_PER_DAY));
    if (!hourOk || !dayOk) return { error: t.tooMany, values };
    // A moderator's comments carry the name they unlocked with.
    const author = (await currentWriter()) ?? name;
    await getStore().addNote({ puuid, regionSlug: region.slug, riotId, author, body, tags, public: true, at: Date.now() });
  } catch (err) {
    console.warn("Could not save a comment.", err);
    return { error: t.postFailed, values };
  }
  refresh();
  return { error: null };
}

export interface ReportState {
  sent: boolean;
}

/** Sends a comment to the moderators' inbox. */
export async function reportComment(_: ReportState, form: FormData): Promise<ReportState> {
  if (!notesEnabled()) return { sent: false };
  const id = String(form.get("id") ?? "").slice(0, 20);
  const riotId = String(form.get("riotId") ?? "").slice(0, 40);
  const excerpt = String(form.get("excerpt") ?? "").slice(0, 300);
  const rawPage = String(form.get("page") ?? "/");
  const page = rawPage.startsWith("/") ? rawPage.slice(0, 200) : "/";
  try {
    if (!(await underLimit("report", clientIp(await headers()), 60 * 60 * 1000, REPORTS_PER_HOUR))) {
      return { sent: true };
    }
    await getStore().addFeedback({
      body: `Reported comment ${id} on ${riotId}:\n\n${excerpt}`,
      contact: "",
      page,
      at: Date.now(),
    });
  } catch (err) {
    console.warn("Could not save a report.", err);
    return { sent: false };
  }
  return { sent: true };
}

export async function deleteNote(form: FormData): Promise<void> {
  if (!(await currentWriter())) return;
  await getStore().deleteNote(String(form.get("id") ?? ""));
  refresh();
}
