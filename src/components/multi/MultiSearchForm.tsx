"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { MAX_LOBBY_PLAYERS, lobbyToQuery, parseLobby } from "@/lib/lobby";
import { useDict } from "@/i18n/client";
import { DEFAULT_REGION, REGIONS, getRegion } from "@/lib/regions";
import { storeRegion, useStoredRegion } from "@/lib/storage";

const SAMPLE = [
  "Buddy #LOL joined the lobby",
  "Mid Gap #EUW joined the lobby",
  "Baron Thief #EUW joined the lobby",
  "Ward Bot #EUW joined the lobby",
  "Tilt Proof #EUW joined the lobby",
].join("\n");

export function MultiSearchForm({
  initialRegion,
  initialText,
  showSample,
}: {
  /** From the URL; otherwise the visitor's remembered region is used. */
  initialRegion: string | null;
  initialText: string;
  showSample: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const uid = useId();
  const storedRegion = useStoredRegion();
  const [chosenRegion, setChosenRegion] = useState<string | null>(initialRegion);
  const region = getRegion(chosenRegion ?? storedRegion) ?? getRegion(DEFAULT_REGION)!;
  const [text, setText] = useState(initialText);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const { players, rejected, dropped } = parseLobby(text, region.defaultTag);
    if (players.length === 0) {
      setProblem(t.multi.noIds);
      return;
    }
    const notes = [];
    if (rejected.length) notes.push(t.multi.skipped(rejected.length));
    if (dropped) notes.push(t.multi.firstOnly(MAX_LOBBY_PLAYERS));
    setProblem(notes.length ? notes.join(" ") : null);

    const params = new URLSearchParams({ region: region.slug, q: lobbyToQuery(players) });
    startTransition(() => router.push(`/multisearch?${params}`));
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-4" noValidate>
      <label htmlFor={`${uid}-text`} className="block text-sm font-medium">
        {t.multi.label}
      </label>
      <textarea
        id={`${uid}-text`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setProblem(null);
        }}
        rows={5}
        spellCheck={false}
        placeholder={t.multi.placeholder(region.defaultTag)}
        className="w-full resize-y rounded-lg border border-edge bg-ink/60 px-3 py-2 font-mono text-sm text-fg outline-none placeholder:text-faint focus:border-accent"
        aria-describedby={problem ? `${uid}-problem` : undefined}
      />
      {problem && (
        <p id={`${uid}-problem`} role="status" className="text-sm text-gold">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor={`${uid}-region`}>
          {t.search.region}
        </label>
        <select
          id={`${uid}-region`}
          value={region.slug}
          onChange={(e) => {
            setChosenRegion(e.target.value);
            storeRegion(e.target.value);
          }}
          className="h-10 cursor-pointer rounded-lg border border-edge bg-raised px-3 font-mono text-sm"
        >
          {REGIONS.map((r) => (
            <option key={r.slug} value={r.slug} title={t.game.regionName(r.slug)}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-brand px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? t.multi.lookingUp : t.multi.submit}
        </button>
        {showSample && (
          <button
            type="button"
            onClick={() => {
              setText(SAMPLE);
              setChosenRegion("euw");
              setProblem(null);
            }}
            className="text-sm text-accent hover:underline"
          >
            {t.multi.sample}
          </button>
        )}
      </div>
    </form>
  );
}
