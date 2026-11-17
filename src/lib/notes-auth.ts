import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { MAX_NAME } from "./notes-limits";

export { MAX_NAME, MAX_NOTE } from "./notes-limits";

/**
 * NOTES_PASSWORD is the moderators' password: it turns comments on, and
 * whoever enters it can remove comments, pin players and read the inbox.
 * Entering it once sets a cookie holding the moderator's name, signed with
 * the password, so changing the password signs everyone out.
 */
export const NOTES_COOKIE = "buddy_notes";
export const NOTES_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;

function password(): string | null {
  return process.env.NOTES_PASSWORD?.trim() || null;
}

/** Notes exist only on sites that have set a password. */
export function notesEnabled(): boolean {
  return password() !== null;
}

/** Hash both sides first, so the comparison takes the same time whatever was typed. */
export function passwordMatches(attempt: string): boolean {
  const expected = password();
  if (!expected) return false;
  const a = createHash("sha256").update(attempt).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function signature(name: string, key: string): string {
  return createHmac("sha256", key).update(`notes:${name}`).digest("base64url");
}

export function signSession(name: string): string {
  return `${encodeURIComponent(name)}.${signature(name, password() ?? "")}`;
}

/** The writer's name, or `null` if the cookie is missing, forged or from an old password. */
export function readSession(value: string | undefined): string | null {
  const key = password();
  if (!key || !value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  let name: string;
  try {
    name = decodeURIComponent(value.slice(0, dot));
  } catch {
    return null;
  }
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(signature(name, key));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return name;
}

/** Who is reading, for server components and actions. */
export async function currentWriter(): Promise<string | null> {
  if (!notesEnabled()) return null;
  return readSession((await cookies()).get(NOTES_COOKIE)?.value);
}

/** Collapse whitespace and cap the length of a display name. */
export function cleanName(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}
