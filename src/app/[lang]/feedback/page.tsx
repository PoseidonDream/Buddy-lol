import { INTL_LOCALE } from "@/i18n/config";
import { getDict, getLocale } from "@/i18n/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { deleteFeedback } from "@/app/actions/feedback";
import { SiteHeader } from "@/components/SiteHeader";
import { UnlockNotesForm } from "@/components/notes/NoteForms";
import { currentWriter, notesEnabled } from "@/lib/notes-auth";
import { getStore } from "@/lib/store";
import type { Feedback } from "@/lib/store/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).inbox.title, robots: { index: false } };
}


export default async function FeedbackPage() {
  const t = await getDict();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{t.inbox.title}</h1>
        <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-xl bg-raised" />}>
          <Inbox />
        </Suspense>
      </main>
    </>
  );
}

async function Inbox() {
  await connection();
  const [t, locale] = await Promise.all([getDict(), getLocale()]);
  const when = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
  if (!notesEnabled()) {
    return <p className="mt-4 text-soft">{t.inbox.off}</p>;
  }
  if (!(await currentWriter())) {
    return (
      <section className="card mt-6 p-4">
        <p className="text-sm text-soft">{t.inbox.intro}</p>
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

  if (failed) return <p className="mt-6 text-loss">{t.inbox.failed}</p>;
  if (items.length === 0) return <p className="mt-6 text-soft">{t.inbox.empty}</p>;

  return (
    <ul className="mt-6 space-y-3">
      {items.map((f) => (
        <li key={f.id} className="card p-4">
          <p className="whitespace-pre-wrap break-words text-sm">{f.body}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
            <span>
              {when.format(f.at)} · {t.inbox.from} <span className="font-mono">{f.page}</span>
              {f.contact && (
                <>
                  {" "}
                  · {t.inbox.replyTo} <span className="text-soft">{f.contact}</span>
                </>
              )}
            </span>
            <form action={deleteFeedback}>
              <input type="hidden" name="id" value={f.id} />
              <button type="submit" className="rounded hover:text-loss">
                {t.common.delete}
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
