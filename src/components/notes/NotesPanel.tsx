import { lockNotes } from "@/app/actions/notes";
import { togglePin } from "@/app/actions/pins";
import { MAX_PINNED } from "@/lib/pinned";
import { currentWriter, notesEnabled } from "@/lib/notes-auth";
import { getStore } from "@/lib/store";
import type { PinnedPlayer, PlayerNote } from "@/lib/store/types";
import type { Profile } from "@/lib/types";
import { AddNoteForm, DeleteNoteButton, UnlockNotesForm } from "./NoteForms";
import { TagChip } from "./TagChip";

const when = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

/**
 * Private notes on this player. Hidden entirely unless the site has a
 * NOTES_PASSWORD; only people who have entered it see or write notes.
 */
export async function NotesPanel({ profile }: { profile: Profile }) {
  if (!notesEnabled()) return null;
  const writer = await currentWriter();

  if (!writer) {
    return (
      <section className="card p-4">
        <h2 className="label-caps">Notes</h2>
        <p className="mt-2 text-sm text-soft">Private notes on players, for you and your friends.</p>
        <UnlockNotesForm />
      </section>
    );
  }

  let notes: PlayerNote[] = [];
  let pins: PinnedPlayer[] = [];
  let failed = false;
  try {
    [notes, pins] = await Promise.all([getStore().listNotes(profile.puuid), getStore().listPinned()]);
  } catch (err) {
    console.warn("Could not read notes.", err);
    failed = true;
  }
  const pinned = pins.some((p) => p.puuid === profile.puuid);
  const riotId = `${profile.gameName}#${profile.tagLine}`;

  return (
    <section className="card p-4" aria-labelledby="notes-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="notes-heading" className="label-caps">
          Notes {notes.length > 0 && <span className="text-gold">· {notes.length}</span>}
        </h2>
        <form action={lockNotes} className="text-xs text-faint">
          <a href="/feedback" className="rounded hover:text-fg hover:underline">
            Inbox
          </a>{" "}
          · {writer} ·{" "}
          <button type="submit" className="rounded hover:text-fg hover:underline">
            Lock
          </button>
        </form>
      </div>

      {failed && <p className="mt-2 text-sm text-loss">Notes couldn&apos;t be loaded right now.</p>}

      {!failed && (pinned || pins.length < MAX_PINNED) && (
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
            {pinned ? "Pinned to home page" : "Pin to home page"}
          </button>
        </form>
      )}

      {notes.length > 0 && (
        <ul className="mt-3 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-white/[0.04] p-3">
              {note.tags.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {note.tags.map((tag) => (
                    <TagChip key={tag} tag={tag} />
                  ))}
                </div>
              )}
              {note.body && <p className="whitespace-pre-wrap break-words text-sm">{note.body}</p>}
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-faint">
                <span>
                  {note.author} · {when.format(note.at)}
                  {note.riotId !== riotId && ` · as ${note.riotId}`}
                </span>
                <DeleteNoteButton id={note.id} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <AddNoteForm
          puuid={profile.puuid}
          region={profile.regionSlug}
          riotId={riotId}
        />
      </div>
    </section>
  );
}
