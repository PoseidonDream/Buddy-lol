"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useDict } from "@/i18n/client";
import { DEFAULT_REGION, REGIONS, getRegion } from "@/lib/regions";
import { parseRiotIdInput, profilePath } from "@/lib/riot-id";
import { storeRegion, useStoredRegion } from "@/lib/storage";

export function SearchBar({
  size = "lg",
  autoFocus = false,
}: {
  size?: "sm" | "lg";
  autoFocus?: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  // Next keeps recently visited pages mounted but hidden, so a fixed id could
  // appear twice in the document.
  const uid = useId();
  const regionId = `${uid}-region`;
  const inputId = `${uid}-riot-id`;
  const errorId = `${uid}-error`;
  const storedRegion = useStoredRegion();
  const region = getRegion(storedRegion) ?? getRegion(DEFAULT_REGION)!;
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const id = parseRiotIdInput(value, region.defaultTag);
    if (!id) {
      setError(true);
      return;
    }
    startTransition(() => router.push(profilePath(region.slug, id)));
    // This page stays mounted after navigating away; don't leave the old
    // query sitting in the box for when the visitor comes back.
    setValue("");
  }

  const large = size === "lg";
  const height = large ? "h-14" : "h-10";

  return (
    <form onSubmit={submit} role="search" aria-label={t.search.label} noValidate>
      <div
        className={`flex ${height} items-stretch rounded-xl border bg-panel transition-colors focus-within:border-accent ${
          error ? "border-loss" : "border-edge"
        }`}
      >
        <label className="sr-only" htmlFor={regionId}>
          {t.search.region}
        </label>
        <select
          id={regionId}
          value={region.slug}
          onChange={(e) => storeRegion(e.target.value)}
          className={`cursor-pointer rounded-l-xl border-r border-edge bg-raised font-mono font-medium text-fg ${
            large ? "px-3 text-sm" : "px-2 text-xs"
          }`}
        >
          {REGIONS.map((r) => (
            <option key={r.slug} value={r.slug} title={t.game.regionName(r.slug)}>
              {r.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor={inputId}>
          Riot ID
        </label>
        <input
          id={inputId}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder={t.search.placeholder(region.defaultTag)}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={error}
          aria-describedby={error ? errorId : undefined}
          className={`min-w-0 flex-1 bg-transparent px-3 text-fg outline-none placeholder:text-faint ${
            large ? "text-lg" : "text-sm"
          }`}
        />

        <button
          type="submit"
          disabled={pending}
          className={`m-1 rounded-lg bg-brand font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${
            large ? "px-5 text-base" : "px-3 text-sm"
          }`}
        >
          {pending ? t.search.searching : t.search.submit}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-loss">
          {t.search.invalidBefore}
          <span className="font-mono">{t.search.invalidExample(region.defaultTag)}</span>
          {t.search.invalidAfter}
        </p>
      )}
    </form>
  );
}
