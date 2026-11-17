"use client";

import { usePathname } from "next/navigation";
import { useActionState, useId } from "react";
import {
  addComment,
  deleteNote,
  reportComment,
  unlockNotes,
  type NotesFormState,
  type ReportState,
} from "@/app/actions/notes";
import { useDict } from "@/i18n/client";
import { MAX_NOTE } from "@/lib/notes-limits";
import { MAX_TAG_LENGTH, PRESET_TAGS } from "@/lib/note-tags";

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

/** The moderators' login: removes comments, pins players, reads the inbox. */
export function UnlockNotesForm() {
  const t = useDict();
  const uid = useId();
  const [state, action, pending] = useActionState(unlockNotes, initial);
  return (
    <form action={action} className="mt-3 space-y-2">
      <label htmlFor={`${uid}-name`} className="sr-only">
        {t.notes.moderatorName}
      </label>
      <input
        id={`${uid}-name`}
        name="name"
        defaultValue={state.values?.name}
        placeholder={t.notes.moderatorName}
        autoComplete="nickname"
        maxLength={24}
        className={input}
      />
      <label htmlFor={`${uid}-password`} className="sr-only">
        {t.notes.password}
      </label>
      <input
        id={`${uid}-password`}
        name="password"
        type="password"
        placeholder={t.notes.password}
        autoComplete="current-password"
        className={input}
      />
      {state.error && (
        <p role="alert" className="text-sm text-loss">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={button}>
        {pending ? t.notes.checking : t.notes.unlock}
      </button>
    </form>
  );
}

/** A public comment on a player: optional name, quick tags and text. */
export function CommentForm({
  puuid,
  region,
  riotId,
  moderator,
}: {
  puuid: string;
  region: string;
  riotId: string;
  /** A logged-in moderator posts under their own name. */
  moderator: string | null;
}) {
  const t = useDict();
  const uid = useId();
  const [state, action, pending] = useActionState(addComment, initial);
  const checked = new Set(state.values?.tags?.split("\n"));
  return (
    // React resets the form after a successful submission.
    <form action={action} className="space-y-2">
      <input type="hidden" name="puuid" value={puuid} />
      <input type="hidden" name="region" value={region} />
      <input type="hidden" name="riotId" value={riotId} />
      {/* Hidden from people; only bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {!moderator && (
        <>
          <label htmlFor={`${uid}-name`} className="sr-only">
            {t.notes.name}
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            defaultValue={state.values?.name}
            placeholder={t.notes.name}
            autoComplete="nickname"
            maxLength={24}
            className={input}
          />
        </>
      )}
      <fieldset>
        <legend className="sr-only">{t.notes.tagsLegend}</legend>
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
              {t.tags[tag.id]}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${uid}-tags`} className="sr-only">
        {t.notes.otherTags}
      </label>
      <input
        id={`${uid}-tags`}
        name="customTags"
        defaultValue={state.values?.customTags}
        maxLength={MAX_TAG_LENGTH * 3}
        placeholder={t.notes.otherTagsPlaceholder}
        className={input}
      />
      <label htmlFor={`${uid}-body`} className="sr-only">
        {t.notes.newNote}
      </label>
      <textarea
        id={`${uid}-body`}
        name="body"
        defaultValue={state.values?.body}
        rows={3}
        maxLength={MAX_NOTE}
        placeholder={t.notes.placeholder}
        className={`${input} resize-y`}
      />
      {state.error && (
        <p role="alert" className="text-sm text-loss">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={button}>
          {pending ? t.notes.saving : t.notes.save}
        </button>
        <p className="text-[11px] leading-snug text-faint">{t.notes.publicNote}</p>
      </div>
    </form>
  );
}

/** For moderators: removes a comment. */
export function DeleteNoteButton({ id }: { id: string }) {
  const t = useDict();
  return (
    <form
      action={deleteNote}
      onSubmit={(e) => {
        if (!window.confirm(t.notes.confirmDelete)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded text-xs text-faint hover:text-loss">
        {t.common.delete}
      </button>
    </form>
  );
}

const reportInitial: ReportState = { sent: false };

/** For everyone: sends a comment to the moderators' inbox. */
export function ReportButton({ id, riotId, excerpt }: { id: string; riotId: string; excerpt: string }) {
  const t = useDict();
  const page = usePathname();
  const [state, action, pending] = useActionState(reportComment, reportInitial);
  if (state.sent) return <span className="text-xs text-faint">{t.notes.reported}</span>;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t.notes.confirmReport)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="riotId" value={riotId} />
      <input type="hidden" name="excerpt" value={excerpt} />
      <input type="hidden" name="page" value={page} />
      <button type="submit" disabled={pending} className="rounded text-xs text-faint hover:text-loss">
        {t.notes.report}
      </button>
    </form>
  );
}
