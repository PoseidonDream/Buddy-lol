"use client";

import { usePathname } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { sendFeedback, type FeedbackState } from "@/app/actions/feedback";
import { useDict } from "@/i18n/client";

const initial: FeedbackState = { sent: false, error: null };
const input =
  "w-full rounded-lg border border-edge bg-ink/60 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-accent";

/** "Send feedback" in the footer: opens a small form in a dialog. */
export function FeedbackButton() {
  const t = useDict();
  const dialog = useRef<HTMLDialogElement>(null);
  // Bumped on every opening, so each one starts with a fresh form.
  const [opened, setOpened] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpened((n) => n + 1);
          dialog.current?.showModal();
        }}
        className="rounded-lg border border-edge bg-panel px-3 py-1.5 text-xs font-medium text-soft transition-colors hover:border-faint hover:text-fg"
      >
        {t.feedback.button}
      </button>

      <dialog
        ref={dialog}
        aria-label={t.feedback.button}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-edge bg-panel p-0 text-fg backdrop:bg-black/60"
        // Clicking the dimmed backdrop closes it.
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <FeedbackForm key={opened} onDone={() => dialog.current?.close()} />
      </dialog>
    </>
  );
}

function FeedbackForm({ onDone }: { onDone: () => void }) {
  const t = useDict();
  const uid = useId();
  const pathname = usePathname();
  const [state, action, pending] = useActionState(sendFeedback, initial);

  // Close a moment after a message goes through.
  useEffect(() => {
    if (!state.sent) return;
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [state, onDone]);

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 id={`${uid}-title`} className="text-lg font-semibold">
          {t.feedback.button}
        </h2>
        <button type="button" onClick={onDone} className="rounded text-sm text-faint hover:text-fg" aria-label={t.common.close}>
          ✕
        </button>
      </div>

      {state.sent ? (
        <p role="status" className="mt-4 text-sm text-win">
          {t.feedback.sent}
        </p>
      ) : (
        <form action={action} className="mt-3 space-y-3">
          <p className="text-sm text-soft">{t.feedback.intro}</p>
          <input type="hidden" name="page" value={pathname} />
          {/* Hidden from people; only bots fill it in. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label htmlFor={`${uid}-body`} className="sr-only">
            {t.feedback.message}
          </label>
          <textarea
            id={`${uid}-body`}
            name="body"
            rows={5}
            maxLength={2000}
            defaultValue={state.values?.body}
            placeholder={t.feedback.messagePlaceholder}
            className={`${input} resize-y`}
          />
          <label htmlFor={`${uid}-contact`} className="sr-only">
            {t.feedback.contact}
          </label>
          <input
            id={`${uid}-contact`}
            name="contact"
            maxLength={120}
            defaultValue={state.values?.contact}
            placeholder={t.feedback.contactPlaceholder}
            className={input}
          />
          {state.error && (
            <p role="alert" className="text-sm text-loss">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? t.feedback.sending : t.feedback.send}
          </button>
        </form>
      )}
    </div>
  );
}
