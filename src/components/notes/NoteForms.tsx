"use client";

import { useActionState, useId } from "react";
import { addNote, deleteNote, unlockNotes, type NotesFormState } from "@/app/actions/notes";

const input =
  "w-full rounded-lg border border-edge bg-ink/60 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-accent";
const button =
  "rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";
const initial: NotesFormState = { error: null };

export function UnlockNotesForm() {
  const uid = useId();
  const [state, action, pending] = useActionState(unlockNotes, initial);
  return (
    <form action={action} className="mt-3 space-y-2">
      <label htmlFor={`${uid}-name`} className="sr-only">
        Your name
      </label>
      <input
        id={`${uid}-name`}
        name="name"
        defaultValue={state.values?.name}
        placeholder="Your name"
        autoComplete="nickname"
        maxLength={24}
        className={input}
      />
      <label htmlFor={`${uid}-password`} className="sr-only">
        Notes password
      </label>
      <input
        id={`${uid}-password`}
        name="password"
        type="password"
        placeholder="Notes password"
        autoComplete="current-password"
        className={input}
      />
      {state.error && (
        <p role="alert" className="text-sm text-loss">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Checking…" : "Unlock notes"}
      </button>
    </form>
  );
}

export function AddNoteForm({
  puuid,
  region,
  riotId,
}: {
  puuid: string;
  region: string;
  riotId: string;
}) {
  const uid = useId();
  const [state, action, pending] = useActionState(addNote, initial);
  return (
    // React resets the form after a successful submission.
    <form action={action} className="space-y-2">
      <input type="hidden" name="puuid" value={puuid} />
      <input type="hidden" name="region" value={region} />
      <input type="hidden" name="riotId" value={riotId} />
      <label htmlFor={`${uid}-body`} className="sr-only">
        New note
      </label>
      <textarea
        id={`${uid}-body`}
        name="body"
        defaultValue={state.values?.body}
        rows={3}
        maxLength={1000}
        placeholder="Add a note about this player…"
        className={`${input} resize-y`}
      />
      {state.error && (
        <p role="alert" className="text-sm text-loss">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Saving…" : "Save note"}
      </button>
    </form>
  );
}

export function DeleteNoteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteNote}
      onSubmit={(e) => {
        if (!window.confirm("Delete this note?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded text-xs text-faint hover:text-loss">
        Delete
      </button>
    </form>
  );
}
