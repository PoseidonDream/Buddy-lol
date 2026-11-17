import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoBanner } from "@/components/DemoBanner";
import { GameIcon } from "@/components/GameIcon";
import { SiteHeader } from "@/components/SiteHeader";
import { PatchSelect } from "@/components/champions/PatchSelect";
import { championIcon } from "@/lib/assets";
import {
  POSITION_SLUGS,
  getChampionPage,
  minGamesFor,
  type ChampionPage,
  type PickRow,
} from "@/lib/champions";
import { getStaticData } from "@/lib/ddragon";
import { initials } from "@/lib/format";
import { POSITION_NAMES } from "@/lib/game-data";

type Props = PageProps<"/champions/[champion]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { champion } = await params;
  const known = (await getStaticData()).championByKey(champion);
  return known
    ? {
        title: `${known.name} build and stats`,
        description: `${known.name}'s win rate, pick rate, items, runes and summoner spells in ranked solo queue.`,
      }
    : { title: "Champion not found" };
}

export default function ChampionPageRoute({ params, searchParams }: Props) {
  return (
    <>
      <SiteHeader showSearch />
      <Suspense
        fallback={
          <main className="mx-auto max-w-5xl px-4 py-8">
            <div className="h-24 animate-pulse rounded-xl bg-raised" />
            <div className="mt-6 h-96 animate-pulse rounded-xl bg-raised" />
          </main>
        }
      >
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

async function Content({ params, searchParams }: Props) {
  const { champion } = await params;
  const query = await searchParams;
  await connection();

  const page = await getChampionPage(
    champion,
    typeof query.patch === "string" ? query.patch : undefined,
    typeof query.position === "string" ? positionKey(query.position) : undefined,
  );
  if (!page) notFound();
  const { version } = await getStaticData();

  const role = page.positions.find((p) => p.position === page.position);
  const enough = page.games >= minGamesFor(page.matches);

  return (
    <>
      {page.source === "demo" && <DemoBanner />}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/champions" className="rounded text-sm text-accent hover:underline">
          ← Tier list
        </Link>

        <header className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-4">
          <GameIcon
            src={championIcon(version, page.championKey)}
            alt=""
            label={initials(page.championName)}
            className="size-20 rounded-2xl text-lg ring-1 ring-edge"
          />
          <div className="min-w-40 flex-1">
            <p className="label-caps">{page.patch ? `Patch ${page.patch} · ranked solo` : "Ranked solo"}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{page.championName}</h1>
          </div>
          {page.patch && page.patches.length > 1 && (
            <PatchSelect
              patches={page.patches}
              current={page.patch}
              basePath={`/champions/${page.championKey}`}
              keep={page.position ? { position: POSITION_SLUGS[page.position] } : undefined}
            />
          )}
        </header>

        {page.games === 0 ? (
          <p className="card mt-6 p-8 text-center text-soft">
            No ranked games with {page.championName} have been counted
            {page.patch ? ` on patch ${page.patch}` : ""} yet.
          </p>
        ) : (
          <Stats page={page} role={role} enough={enough} />
        )}
      </main>
    </>
  );
}

function positionKey(slug: string): string | undefined {
  const entry = Object.entries(POSITION_SLUGS).find(([, s]) => s === slug);
  return entry?.[0];
}

function Stats({
  page,
  role,
  enough,
}: {
  page: ChampionPage;
  role: ChampionPage["positions"][number] | undefined;
  enough: boolean;
}) {
  const games = role?.games ?? page.games;
  const wins = role?.wins ?? page.wins;

  return (
    <>
      {page.positions.length > 1 && (
        <nav aria-label="Role" className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-edge bg-panel p-1">
          {page.positions.map((p) => {
            const active = p.position === page.position;
            const params = new URLSearchParams({ position: POSITION_SLUGS[p.position] });
            if (page.patch) params.set("patch", page.patch);
            return (
              <Link
                key={p.position}
                href={`/champions/${page.championKey}?${params}`}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-brand text-white" : "text-soft hover:bg-raised hover:text-fg"
                }`}
              >
                {POSITION_NAMES[p.position]}
                <span className={`ml-1.5 font-mono text-xs ${active ? "text-white/75" : "text-faint"}`}>
                  {pct(p.games / page.games)}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={role ? `Win rate · ${POSITION_NAMES[role.position]}` : "Win rate"} value={pct(wins / games)} />
        <Tile label="Pick rate" value={pct(games / page.matches)} />
        <Tile label="Ban rate" value={pct(page.bans / page.matches)} />
        <Tile label="Games" value={games.toLocaleString("en-US")} />
      </dl>

      {!enough && (
        <p className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
          Only {page.games} games so far, so these numbers can still swing a lot.
        </p>
      )}

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        <PickList title="Items" rows={page.picks.item.slice(0, 8)} total={page.games} square />
        <div className="grid gap-4">
          <PickList title="Keystones" rows={page.picks.keystone.slice(0, 4)} total={page.games} />
          <PickList title="Secondary tree" rows={page.picks.secondary.slice(0, 3)} total={page.games} />
          <PickList title="Summoner spells" rows={page.picks.spells.slice(0, 3)} total={page.games} square />
        </div>
      </div>
      <p className="mt-4 text-xs text-faint">
        Builds, runes and spells cover every role {page.championName} was played in. An item counts
        when a player finished the game holding it.
      </p>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <dt className="label-caps">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function PickList({
  title,
  rows,
  total,
  square = false,
}: {
  title: string;
  rows: PickRow[];
  total: number;
  square?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="card">
      <h2 className="label-caps px-4 pt-4">{title}</h2>
      <table className="mt-2 w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th scope="col">Choice</th>
            <th scope="col">Picked</th>
            <th scope="col">Win rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {rows.map((r) => (
            <tr key={r.choice}>
              <td className="py-2 pl-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-0.5">
                    {(r.icons.length ? r.icons : [null]).map((src, i) => (
                      <GameIcon
                        key={i}
                        src={src}
                        alt=""
                        label={r.label.slice(0, 1)}
                        className={`size-7 ${square ? "rounded-md" : "rounded-full bg-ink/60"}`}
                      />
                    ))}
                  </div>
                  <span>{r.label}</span>
                </div>
              </td>
              <td className="py-2 text-right font-mono text-xs tabular-nums text-soft">
                <div className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-raised">
                  <div className="h-full bg-chart" style={{ width: `${(r.games / total) * 100}%` }} />
                </div>
                <span className="mt-1 inline-block">{pct(r.games / total)} picked</span>
              </td>
              <td className="py-2 pr-4 text-right font-mono tabular-nums">
                {pct(r.wins / r.games)}
                <span className="block text-[11px] text-faint">win</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
