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
  if (!notesEnabled()) return { error: "Notes are not set up on this site." };

  const ip = clientIp(await headers());
  const hour = 60 * 60 * 1000;
  const windowStart = Math.floor(Date.now() / hour) * hour;
  const visitor = createHash("sha256").update(`notes-login:${ip}`).digest("hex").slice(0, 24);
  const attempts = await getStore()
    .countHits(`notes-login:${visitor}`, windowStart, 1)
    .catch(() => 0);
  if (attempts > MAX_ATTEMPTS_PER_HOUR) {
    return { error: "Too many attempts. Try again in an hour.", values: { name: cleanName(form.get("name")) } };
  }

  const name = cleanName(form.get("name"));
  if (!name) return { error: "Enter your name, so notes show who wrote them." };
  if (!passwordMatches(String(form.get("password") ?? ""))) {
    return { error: "That password isn't right.", values: { name } };
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

export async function addNote(_: NotesFormState, form: FormData): Promise<NotesFormState> {
  const body = String(form.get("body") ?? "").trim();
  const typedTags = String(form.get("customTags") ?? "");
  const tags = cleanTags([...form.getAll("tag").map(String), ...typedTags.split(",")]);
  // Sent back on errors so nothing typed or ticked is lost.
  const values = { body, customTags: typedTags, tags: tags.join("\n") };

  const author = await currentWriter();
  if (!author) return { error: "Your notes session has ended. Unlock notes again.", values };

  const puuid = String(form.get("puuid") ?? "");
  const region = getRegion(String(form.get("region") ?? ""));
  const riotId = String(form.get("riotId") ?? "").slice(0, 40);
  if (!body && tags.length === 0) return { error: "Write something or pick a tag first.", values };
  if (body.length > MAX_NOTE) return { error: `Notes can be up to ${MAX_NOTE} characters.`, values };
  if (!region || !puuid || puuid.length > 100 || !riotId) return { error: "Unknown player.", values };

  await getStore().addNote({ puuid, regionSlug: region.slug, riotId, author, body, tags, at: Date.now() });
  refresh();
  return { error: null };
}

export async function deleteNote(form: FormData): Promise<void> {
  if (!(await currentWriter())) return;
  await getStore().deleteNote(String(form.get("id") ?? ""));
  refresh();
}
