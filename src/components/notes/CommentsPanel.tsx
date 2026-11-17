import Link from "next/link";
import { lockNotes } from "@/app/actions/notes";
import { togglePin } from "@/app/actions/pins";
import type { Dict } from "@/i18n/dictionaries";
import { getDict } from "@/i18n/server";
import { timeAgo } from "@/lib/format";
import { currentWriter, notesEnabled } from "@/lib/notes-auth";
import { MAX_PINNED } from "@/lib/pinned";
import { getStore } from "@/lib/store";
import type { PinnedPlayer, PlayerNote } from "@/lib/store/types";
import type { Profile } from "@/lib/types";
import { CommentForm, DeleteNoteButton, ReportButton } from "./NoteForms";
import { ScrollToComments } from "./ScrollToComments";
import { TagChip } from "./TagChip";

/** Comments shown before "Show all". */
const SHOWN = 5;

async function load(puuid: string) {
  const store = getStore();
  const [comments, pins] = await Promise.all([store.listNotes(puuid), store.listPinned()]);
  return { comments, pins, at: Date.now() };
}

/**
 * Public comments on this player, newest first, like reviews: anyone can
 * write one and report one. People with the moderator password (set in
 * NOTES_PASSWORD) can delete them and pin the player to their home page.
 * Without that password nobody could remove abuse, so comments stay off.
 */
export async function CommentsPanel({ profile }: { profile: Profile }) {
  if (!notesEnabled()) return null;
  const [moderator, t] = await Promise.all([currentWriter(), getDict()]);
  const riotId = `${profile.gameName}#${profile.tagLine}`;

  let comments: PlayerNote[] = [];
  let pins: PinnedPlayer[] = [];
  let now = 0;
  let failed = false;
  try {
    ({ comments, pins, at: now } = await load(profile.puuid));
  } catch (err) {
    console.warn("Could not read comments.", err);
    failed = true;
  }
  const pinned = pins.some((p) => p.puuid === profile.puuid);

  const item = (c: PlayerNote) => (
    <Comment key={c.id} comment={c} riotId={riotId} now={now} moderator={moderator !== null} t={t} />
  );

  return (
    <section id="comments" className="card scroll-mt-20 p-4" aria-labelledby="comments-heading">
      <ScrollToComments />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="comments-heading" className="label-caps">
          {t.notes.heading} {comments.length > 0 && <span className="text-gold">· {comments.length}</span>}
        </h2>
        {moderator && (
          <form action={lockNotes} className="text-xs text-faint">
            {t.notes.moderating(moderator)} ·{" "}
            <Link href="/feedback" className="rounded hover:text-fg hover:underline">
              {t.notes.inbox}
            </Link>{" "}
            ·{" "}
            <button type="submit" className="rounded hover:text-fg hover:underline">
              {t.notes.lock}
            </button>
          </form>
        )}
      </div>

      {moderator && !failed && (pinned || pins.length < MAX_PINNED) && (
        <form action={togglePin} className="mt-2">
          <input type="hidden" name="puuid" value={profile.puuid} />
          <input type="hidden" name="region" value={profile.regionSlug} />
          <input type="hidden" name="riotId" value={riotId} />
          <input type="hidden" name="pinned" value={pinned ? "1" : "0"} />
          <button
            type="submit"
            aria-pressed={pinned}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              pinned
                ? "border-gold/40 bg-gold/10 text-gold hover:border-gold"
                : "border-edge text-soft hover:border-faint hover:text-fg"
            }`}
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z" strokeLinejoin="round" />
            </svg>
            {pinned ? t.notes.pinned : t.notes.pin}
          </button>
        </form>
      )}

      {failed ? (
        <p className="mt-2 text-sm text-loss">{t.notes.failed}</p>
      ) : comments.length === 0 ? (
        <p className="mt-2 text-sm text-soft">{t.notes.none}</p>
      ) : (
        <>
          <ul className="mt-3 space-y-3">{comments.slice(0, SHOWN).map(item)}</ul>
          {comments.length > SHOWN && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-accent hover:underline">
                {t.notes.showAll(comments.length)}
              </summary>
              <ul className="mt-3 space-y-3">{comments.slice(SHOWN).map(item)}</ul>
            </details>
          )}
        </>
      )}

      <details className="group mt-4" open={comments.length === 0 && !failed}>
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-sm font-medium text-soft transition-colors hover:border-faint hover:text-fg group-open:hidden [&::-webkit-details-marker]:hidden">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 5h16v11H8l-4 4V5Z" strokeLinejoin="round" />
          </svg>
          {t.notes.write}
        </summary>
        <div className="mt-1">
          <CommentForm puuid={profile.puuid} region={profile.regionSlug} riotId={riotId} moderator={moderator} />
        </div>
      </details>
    </section>
  );
}

function Comment({
  comment,
  riotId,
  now,
  moderator,
  t,
}: {
  comment: PlayerNote;
  riotId: string;
  now: number;
  moderator: boolean;
  t: Dict;
}) {
  const name = comment.author || t.notes.anonymous;
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          comment.author ? "bg-brand/25 text-accent" : "bg-raised text-faint"
        }`}
      >
        {name.slice(0, 1).toLocaleUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{name}</span>
          <span className="text-xs text-faint">
            {" "}
            · {timeAgo(comment.at, now, t.time)}
            {comment.riotId !== riotId && ` · ${t.notes.renamed(comment.riotId)}`}
          </span>
        </p>
        {comment.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {comment.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}
        {comment.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-soft">{comment.body}</p>}
        <div className="mt-1">
          {moderator ? (
            <DeleteNoteButton id={comment.id} />
          ) : (
            <ReportButton id={comment.id} riotId={riotId} excerpt={`${name}: ${comment.body} [${comment.tags.join(", ")}]`} />
          )}
        </div>
      </div>
    </li>
  );
}
