"use server";

import { requestDict } from "@/i18n/request";
import { createHash } from "node:crypto";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { currentWriter, notesEnabled } from "@/lib/notes-auth";
import { clientIp } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

const MAX_FEEDBACK = 2000;
const MAX_CONTACT = 120;
/** Messages one address may send per hour. */
const MAX_PER_HOUR = 5;

export interface FeedbackState {
  sent: boolean;
  error: string | null;
  /** Sent back on errors so the form refills (React clears it after submitting). */
  values?: { body: string; contact: string };
}

export async function sendFeedback(_: FeedbackState, form: FormData): Promise<FeedbackState> {
  // Feedback is read on the password-protected inbox; without a password
  // nobody could read it, so it isn't collected at all.
  const t = (await requestDict()).feedback;
  if (!notesEnabled()) return { sent: false, error: t.notSetUp };

  const body = String(form.get("body") ?? "").trim();
  const contact = String(form.get("contact") ?? "").trim();
  const values = { body, contact };

  // A field people never see. Bots that fill in every field give themselves
  // away; they are told it worked and nothing is stored.
  if (String(form.get("website") ?? "") !== "") return { sent: true, error: null };

  if (!body) return { sent: false, error: t.empty, values };
  if (body.length > MAX_FEEDBACK) {
    return { sent: false, error: t.tooLong(MAX_FEEDBACK), values };
  }
  if (contact.length > MAX_CONTACT) {
    return { sent: false, error: t.contactTooLong, values };
  }

  const ip = clientIp(await headers());
  const hour = 60 * 60 * 1000;
  const windowStart = Math.floor(Date.now() / hour) * hour;
  const visitor = createHash("sha256").update(`feedback:${ip}`).digest("hex").slice(0, 24);
  try {
    const store = getStore();
    const sentThisHour = await store.countHits(`feedback:${visitor}`, windowStart, 1);
    if (sentThisHour > MAX_PER_HOUR) {
      return { sent: false, error: t.tooMany, values };
    }
    const rawPage = String(form.get("page") ?? "/");
    const page = rawPage.startsWith("/") ? rawPage.slice(0, 200) : "/";
    await store.addFeedback({ body, contact, page, at: Date.now() });
  } catch (err) {
    console.warn("Could not save feedback.", err);
    return { sent: false, error: t.failed, values };
  }
  return { sent: true, error: null };
}

export async function deleteFeedback(form: FormData): Promise<void> {
  if (!(await currentWriter())) return;
  await getStore().deleteFeedback(String(form.get("id") ?? ""));
  refresh();
}
