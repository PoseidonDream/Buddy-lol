import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Buddy.lol stores, for how long, and why.",
};

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

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
        <p className="mt-3 text-soft">
          Buddy.lol shows League of Legends statistics from Riot Games&apos; public API. There are
          no accounts, no ads and no tracking. This page lists everything the site keeps.
        </p>

        <Section title="About players">
          <p>
            When someone looks a player up, their rank, games and champion stats are fetched from
            Riot and shown. Two things are kept afterwards:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-fg">Rank snapshots</strong>: tier, LP, wins and losses, with
              the time, stored under Riot&apos;s player ID. They draw the LP history graph, and are
              deleted after 180 days.
            </li>
            <li>
              <strong className="text-fg">Ranked game totals</strong>: which champions, items,
              runes and spells were played and whether they won, added up per champion for the
              tier list. These totals don&apos;t record who played.
            </li>
          </ul>
        </Section>

        <Section title="About visitors">
          <p>
            To stop any one visitor from using up the site&apos;s Riot API allowance, the number
            of lookups from each IP address is counted. Only a one-way hash of the address is
            stored, and the counts are deleted within two days.
          </p>
          <p>
            Your browser remembers your region and the players you recently viewed, in its own
            local storage. That never leaves your device, and clearing your browser data removes it.
            The site sets no cookies.
          </p>
        </Section>

        <Section title="Services used">
          <p>
            The site is hosted by Vercel, which keeps standard request logs. Its database is run
            by Neon in Frankfurt. Player data comes from the Riot Games API, and images from
            Riot&apos;s Data Dragon service.
          </p>
        </Section>

        <Section title="Questions and removal">
          {contact ? (
            <p>
              To ask about your data or have your rank history removed,{" "}
              <a href={contact} className="text-accent underline-offset-2 hover:underline">
                get in touch
              </a>
              .
            </p>
          ) : (
            <p>
              To ask about your data or have your rank history removed, contact the person who
              runs this site.
            </p>
          )}
        </Section>
      </main>
    </>
  );
}
