import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { getDict } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getDict()).privacy;
  return { title: t.title, description: t.description };
}

// Set CONTACT_URL (for example "mailto:you@example.com" or a form link) to
// show visitors where to send questions and removal requests.
const contact = process.env.CONTACT_URL?.trim() || null;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 space-y-3 leading-relaxed text-soft">{children}</div>
    </section>
  );
}

export default async function PrivacyPage() {
  const t = (await getDict()).privacy;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-3 text-soft">{t.intro}</p>

        <Section title={t.players.heading}>
          <p>{t.players.intro}</p>
          <ul className="list-disc space-y-2 pl-5">
            {t.players.items.map(([term, text]) => (
              <li key={term}>
                <strong className="text-fg">{term}</strong>: {text}
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t.visitors.heading}>
          {t.visitors.paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </Section>

        <Section title={t.feedback.heading}>
          <p>{t.feedback.body}</p>
        </Section>

        <Section title={t.services.heading}>
          <p>{t.services.body}</p>
        </Section>

        <Section title={t.questions.heading}>
          {contact ? (
            <p>
              {t.questions.before}
              <a href={contact} className="text-accent underline-offset-2 hover:underline">
                {t.questions.link}
              </a>
              {t.questions.after}
            </p>
          ) : (
            <p>{t.questions.fallback}</p>
          )}
        </Section>
      </main>
    </>
  );
}
