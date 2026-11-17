"use client";

import { useActionState, useId } from "react";
import { addNote, deleteNote, unlockNotes, type NotesFormState } from "@/app/actions/notes";
import { MAX_TAG_LENGTH, PRESET_TAGS, TAG_LABELS } from "@/lib/note-tags";

const PILL_TONES = {
  good: "has-checked:border-win has-checked:bg-win/20 has-checked:text-win",
  bad: "has-checked:border-loss has-checked:bg-loss/20 has-checked:text-loss",
  neutral: "has-checked:border-faint has-checked:bg-white/15 has-checked:text-fg",
} as const;

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
  const checked = new Set(state.values?.tags?.split("\n"));
  return (
    // React resets the form after a successful submission.
    <form action={action} className="space-y-2">
      <input type="hidden" name="puuid" value={puuid} />
      <input type="hidden" name="region" value={region} />
      <input type="hidden" name="riotId" value={riotId} />
      <fieldset>
        <legend className="sr-only">Tags</legend>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_TAGS.map((tag) => (
            <label
              key={tag.id}
              className={`cursor-pointer select-none rounded-full border border-edge px-2.5 py-0.5 text-xs text-soft transition-colors hover:border-faint has-focus-visible:outline-2 has-focus-visible:outline-accent ${PILL_TONES[tag.tone]}`}
            >
              <input
                type="checkbox"
                name="tag"
                value={tag.id}
                defaultChecked={checked.has(tag.id)}
                className="sr-only"
              />
              {TAG_LABELS[tag.id]}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${uid}-tags`} className="sr-only">
        Other tags, separated by commas
      </label>
      <input
        id={`${uid}-tags`}
        name="customTags"
        defaultValue={state.values?.customTags}
        maxLength={MAX_TAG_LENGTH * 3}
        placeholder="Other tags, e.g. duo with Kaori"
        className={input}
      />
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
