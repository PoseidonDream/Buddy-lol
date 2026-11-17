"use client";

import { useState } from "react";
import { useDict } from "@/i18n/client";
import { championIcon, itemIcon } from "@/lib/assets";
import { initials } from "@/lib/format";
import { SKILL_KEYS as KEYS, maxOrder } from "@/lib/skills";
import type { MatchSummary, MatchTimeline } from "@/lib/types";
import { GameIcon } from "../GameIcon";

/** Purchases bought within the same minute, with repeats counted. */
function groupByMinute(purchases: MatchTimeline["players"][number]["purchases"]) {
  const groups: { minute: number; items: { itemId: number; count: number }[] }[] = [];
  for (const p of purchases) {
    const minute = Math.floor(p.at / 60);
    let group = groups.at(-1);
    if (!group || group.minute !== minute) groups.push((group = { minute, items: [] }));
    const same = group.items.find((i) => i.itemId === p.itemId);
    if (same) same.count++;
    else group.items.push({ itemId: p.itemId, count: 1 });
  }
  return groups;
}

export function BuildOrder({
  match,
  timeline,
  assetVersion,
}: {
  match: MatchSummary;
  timeline: MatchTimeline;
  assetVersion: string;
}) {
  const t = useDict();
  const [puuid, setPuuid] = useState(match.me.puuid);
  const everyone = match.teams.flatMap((t) => t.participants);
  const player = everyone.find((p) => p.puuid === puuid) ?? match.me;
  const line = timeline.players.find((p) => p.puuid === player.puuid);
  const groups = line ? groupByMinute(line.purchases) : [];
  const levels = line?.skills.length ?? 0;

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div role="group" aria-label={t.build.choose} className="flex flex-wrap gap-x-3 gap-y-2">
        {match.teams.map((team) => (
          <div key={team.id} className="flex gap-1">
            {team.participants.map((p) => (
              <button
                key={p.puuid}
                type="button"
                onClick={() => setPuuid(p.puuid)}
                aria-pressed={p.puuid === player.puuid}
                title={`${p.gameName} · ${p.championName}`}
                className={`rounded-lg p-0.5 transition-opacity ${
                  p.puuid === player.puuid ? "ring-2 ring-accent" : "opacity-60 hover:opacity-100"
                }`}
              >
                <GameIcon
                  src={championIcon(assetVersion, p.championKey)}
                  alt={`${p.gameName}, ${p.championName}`}
                  label={initials(p.championName)}
                  className="size-8 rounded-md"
                />
              </button>
            ))}
          </div>
        ))}
      </div>

      <section>
        <h3 className="label-caps mb-2">
          {t.build.items} · {player.gameName} ({player.championName})
        </h3>
        {groups.length === 0 ? (
          <p className="text-sm text-soft">{t.build.none}</p>
        ) : (
          <ol className="flex flex-wrap items-end gap-x-1 gap-y-3">
            {groups.map((g, gi) => (
              <li key={gi} className="flex items-end gap-1">
                <div className="text-center">
                  <div className="flex gap-0.5 rounded-md bg-white/[0.04] p-1">
                    {g.items.map(({ itemId, count }) => (
                      <span key={itemId} className="relative">
                        <GameIcon
                          src={itemIcon(assetVersion, itemId)}
                          alt={timeline.itemNames[itemId] ?? t.build.item(itemId)}
                          className="size-7 rounded"
                        />
                        {count > 1 && (
                          <span className="absolute -bottom-1 -right-1 rounded bg-ink px-0.5 font-mono text-[9px] leading-tight">
                            {count}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-faint">{t.time.minutes(g.minute)}</p>
                </div>
                {gi < groups.length - 1 && (
                  <span className="mb-5 text-faint" aria-hidden="true">
                    ›
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {levels > 0 && line && (
        <section>
          <h3 className="label-caps mb-2">
            {t.build.skills} <span className="ml-1 font-mono normal-case tracking-normal text-soft">{maxOrder(line.skills)}</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0.5 text-center font-mono text-[11px]">
              <caption className="sr-only">{t.build.skillsCaption}</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">{t.build.ability}</th>
                  {line.skills.map((_, i) => (
                    <th key={i} scope="col">
                      {t.champs.level(i + 1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KEYS.map((key, k) => (
                  <tr key={key}>
                    <th scope="row" className="w-6 pr-1 text-left font-semibold text-soft">
                      {key}
                    </th>
                    {line.skills.map((slot, level) => (
                      <td
                        key={level}
                        className={`size-6 min-w-6 rounded ${
                          slot === k + 1 ? (k === 3 ? "bg-gold/80 text-ink" : "bg-brand text-white") : "bg-white/[0.04]"
                        }`}
                      >
                        {slot === k + 1 ? level + 1 : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
