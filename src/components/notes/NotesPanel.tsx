import { lockNotes } from "@/app/actions/notes";
import { currentWriter, notesEnabled } from "@/lib/notes-auth";
import { getStore } from "@/lib/store";
import type { PlayerNote } from "@/lib/store/types";
import type { Profile } from "@/lib/types";
import { AddNoteForm, DeleteNoteButton, UnlockNotesForm } from "./NoteForms";

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
  let failed = false;
  try {
    notes = await getStore().listNotes(profile.puuid);
  } catch (err) {
    console.warn("Could not read notes.", err);
    failed = true;
  }

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

      {notes.length > 0 && (
        <ul className="mt-3 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-white/[0.04] p-3">
              <p className="whitespace-pre-wrap break-words text-sm">{note.body}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-faint">
                <span>
                  {note.author} · {when.format(note.at)}
                  {note.riotId !== `${profile.gameName}#${profile.tagLine}` && ` · as ${note.riotId}`}
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
          riotId={`${profile.gameName}#${profile.tagLine}`}
        />
      </div>
    </section>
  );
}
