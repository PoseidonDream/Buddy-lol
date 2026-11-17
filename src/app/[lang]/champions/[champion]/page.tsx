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
  type MatchupView,
  type PickRow,
} from "@/lib/champions";
import { getStaticData } from "@/lib/ddragon";
import { initials } from "@/lib/format";
import type { Dict } from "@/i18n/dictionaries";
import { getDict, getLocale } from "@/i18n/server";
import { formatNumber } from "@/lib/format";

type Props = PageProps<"/[lang]/champions/[champion]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { champion } = await params;
  // Champion names come from Data Dragon; fetch them for the request, not the prerendered shell.
  await connection();
  const known = (await getStaticData(await getLocale())).championByKey(champion);
  const t = (await getDict()).championPage;
  return known ? { title: t.metaTitle(known.name), description: t.metaDescription(known.name) } : { title: t.notFound };
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
    await getLocale(),
  );
  if (!page) notFound();
  const { version } = await getStaticData();
  const t = await getDict();

  const role = page.positions.find((p) => p.position === page.position);
  const enough = page.games >= minGamesFor(page.matches);

  return (
    <>
      {page.source === "demo" && <DemoBanner />}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/champions" className="rounded text-sm text-accent hover:underline">
          ← {t.championPage.back}
        </Link>

        <header className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-4">
          <GameIcon
            src={championIcon(version, page.championKey)}
            alt=""
            label={initials(page.championName)}
            className="size-20 rounded-2xl text-lg ring-1 ring-edge"
          />
          <div className="min-w-40 flex-1">
            <p className="label-caps">{page.patch ? t.championPage.patchLine(page.patch) : t.championPage.rankedSolo}</p>
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
            {t.championPage.noGames(page.championName, page.patch)}
          </p>
        ) : (
          <Stats page={page} role={role} enough={enough} version={version} t={t} />
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
  version,
  t,
}: {
  page: ChampionPage;
  role: ChampionPage["positions"][number] | undefined;
  enough: boolean;
  version: string;
  t: Dict;
}) {
  const games = role?.games ?? page.games;
  const wins = role?.wins ?? page.wins;

  return (
    <>
      {page.positions.length > 1 && (
        <nav aria-label={t.tierList.role} className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-edge bg-panel p-1">
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
                {t.game.position(p.position)}
                <span className={`ml-1.5 font-mono text-xs ${active ? "text-white/75" : "text-faint"}`}>
                  {pct(p.games / page.games)}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={role ? `${t.game.winRate} · ${t.game.position(role.position)}` : t.game.winRate} value={pct(wins / games)} />
        <Tile label={t.championPage.pickRate} value={pct(games / page.matches)} />
        <Tile label={t.championPage.banRate} value={pct(page.bans / page.matches)} />
        <Tile label={t.ladder.games} value={formatNumber(games)} />
      </dl>

      {!enough && (
        <p className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
          {t.championPage.fewGames(page.games)}
        </p>
      )}

      {page.position && (
        <Matchups page={page} roleName={t.game.position(page.position)} version={version} t={t} />
      )}

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        <PickList title={t.scoreboard.items} rows={page.picks.item.slice(0, 8)} total={page.games} t={t} square />
        <div className="grid gap-4">
          <PickList title={t.championPage.keystones} rows={page.picks.keystone.slice(0, 4)} total={page.games} t={t} />
          <PickList title={t.championPage.secondary} rows={page.picks.secondary.slice(0, 3)} total={page.games} t={t} />
          <PickList title={t.championPage.spells} rows={page.picks.spells.slice(0, 3)} total={page.games} t={t} square />
        </div>
      </div>
      <p className="mt-4 text-xs text-faint">
        {t.championPage.buildsNote(page.championName)}
      </p>
    </>
  );
}

function Matchups({ page, roleName, version, t }: { page: ChampionPage; roleName: string; version: string; t: Dict }) {
  const { best, worst, minGames, opponents } = page.matchups;
  return (
    <section className="mt-6" aria-labelledby="matchups-heading">
      <h2 id="matchups-heading" className="text-lg font-semibold">
        {t.championPage.matchups} <span className="font-normal text-soft">· {roleName}</span>
      </h2>
      {best.length === 0 && worst.length === 0 ? (
        <p className="card mt-3 p-5 text-sm text-soft">
          {opponents === 0
            ? t.championPage.noMatchups(page.championName)
            : t.championPage.thinMatchups(opponents, minGames)}
        </p>
      ) : (
        <>
          <div className="mt-3 grid items-start gap-4 sm:grid-cols-2">
            <MatchupList title={t.championPage.best} tone="win" rows={best} page={page} version={version} t={t} />
            <MatchupList title={t.championPage.worst} tone="loss" rows={worst} page={page} version={version} t={t} />
          </div>
          <p className="mt-2 text-xs text-faint">
            {t.championPage.matchupNote(roleName, opponents, minGames)}
          </p>
        </>
      )}
    </section>
  );
}

function MatchupList({
  title,
  tone,
  rows,
  page,
  version,
  t,
}: {
  title: string;
  tone: "win" | "loss";
  rows: MatchupView[];
  page: ChampionPage;
  version: string;
  t: Dict;
}) {
  return (
    <div className="card">
      <h3 className={`label-caps px-4 pt-4 ${tone === "win" ? "text-win" : "text-loss"}`}>{title}</h3>
      {rows.length === 0 ? (
        <p className="px-4 pb-4 pt-2 text-sm text-soft">{t.championPage.noneYet}</p>
      ) : (
        <ul className="mt-2 divide-y divide-edge">
          {rows.map((m) => {
            const params = new URLSearchParams();
            if (page.position) params.set("position", POSITION_SLUGS[page.position]);
            if (page.patch) params.set("patch", page.patch);
            return (
              <li key={m.championKey} className="flex items-center gap-3 px-4 py-2">
                <GameIcon
                  src={championIcon(version, m.championKey)}
                  alt=""
                  label={initials(m.championName)}
                  className="size-8 rounded-lg"
                />
                <Link href={`/champions/${m.championKey}?${params}`} className="min-w-0 flex-1 truncate rounded text-sm hover:underline">
                  {m.championName}
                </Link>
                <span className="text-right leading-tight">
                  <span className={`block font-mono text-sm font-semibold tabular-nums ${tone === "win" ? "text-win" : "text-loss"}`}>
                    {pct(m.wins / m.games)}
                  </span>
                  <span className="block font-mono text-[11px] text-faint">{t.game.games(m.games)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
  t,
}: {
  title: string;
  rows: PickRow[];
  total: number;
  square?: boolean;
  t: Dict;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="card">
      <h2 className="label-caps px-4 pt-4">{title}</h2>
      <table className="mt-2 w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th scope="col">{t.championPage.choice}</th>
            <th scope="col">{t.championPage.picked}</th>
            <th scope="col">{t.game.winRate}</th>
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
                <span className="mt-1 inline-block">{t.championPage.pickedShare(pct(r.games / total))}</span>
              </td>
              <td className="py-2 pr-4 text-right font-mono tabular-nums">
                {pct(r.wins / r.games)}
                <span className="block text-[11px] text-faint">{t.championPage.winLabel}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
