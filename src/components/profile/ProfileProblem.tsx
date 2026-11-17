import Link from "next/link";
import type { ProfileError, ProfileErrorKind } from "@/lib/types";

const TITLES: Record<ProfileErrorKind, string> = {
  invalid: "That isn't a Riot ID",
  not_found: "Player not found",
  rate_limited: "Too many lookups",
  auth: "The Riot API key was rejected",
  upstream: "Riot's servers are having trouble",
};

export function ProfileProblem({ error }: { error: ProfileError }) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-semibold">{TITLES[error.kind]}</h1>
      <p className="mt-2 text-soft">{error.message}</p>
      {(error.kind === "not_found" || error.kind === "invalid") && (
        <p className="mt-2 text-sm text-faint">
          Check the spelling, the tag after the #, and the region in the search box.
        </p>
      )}
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg border border-edge bg-raised px-4 py-2 text-sm font-medium hover:border-faint"
      >
        Back to search
      </Link>
    </div>
  );
}
