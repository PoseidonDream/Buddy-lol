import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { deleteFeedback } from "@/app/actions/feedback";
import { SiteHeader } from "@/components/SiteHeader";
import { UnlockNotesForm } from "@/components/notes/NoteForms";
import { currentWriter, notesEnabled } from "@/lib/notes-auth";
import { getStore } from "@/lib/store";
import type { Feedback } from "@/lib/store/types";

export const metadata: Metadata = { title: "Feedback inbox", robots: { index: false } };

const when = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export default function FeedbackPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Feedback inbox</h1>
        <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-xl bg-raised" />}>
          <Inbox />
        </Suspense>
      </main>
    </>
  );
}

async function Inbox() {
  await connection();
  if (!notesEnabled()) {
    return <p className="mt-4 text-soft">The inbox is off. It needs NOTES_PASSWORD to be set.</p>;
  }
  if (!(await currentWriter())) {
    return (
      <section className="card mt-6 p-4">
        <p className="text-sm text-soft">Messages sent with the feedback button. Same password as notes.</p>
        <UnlockNotesForm />
      </section>
    );
  }

  let items: Feedback[] = [];
  let failed = false;
  try {
    items = await getStore().listFeedback(200);
  } catch (err) {
    console.warn("Could not read feedback.", err);
    failed = true;
  }

  if (failed) return <p className="mt-6 text-loss">The inbox couldn&apos;t be loaded right now.</p>;
  if (items.length === 0) return <p className="mt-6 text-soft">No feedback yet.</p>;

  return (
    <ul className="mt-6 space-y-3">
      {items.map((f) => (
        <li key={f.id} className="card p-4">
          <p className="whitespace-pre-wrap break-words text-sm">{f.body}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
            <span>
              {when.format(f.at)} · from <span className="font-mono">{f.page}</span>
              {f.contact && (
                <>
                  {" "}
                  · reply to <span className="text-soft">{f.contact}</span>
                </>
              )}
            </span>
            <form action={deleteFeedback}>
              <input type="hidden" name="id" value={f.id} />
              <button type="submit" className="rounded hover:text-loss">
                Delete
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
