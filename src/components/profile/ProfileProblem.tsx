"use client";

import Link from "next/link";
import { useDict } from "@/i18n/client";
import type { ProfileError } from "@/lib/types";

export function ProfileProblem({ error }: { error: ProfileError }) {
  const t = useDict();
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-semibold">{t.errors.titles[error.kind]}</h1>
      <p className="mt-2 text-soft">{error.message}</p>
      {(error.kind === "not_found" || error.kind === "invalid") && (
        <p className="mt-2 text-sm text-faint">{t.errors.checkSpelling}</p>
      )}
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg border border-edge bg-raised px-4 py-2 text-sm font-medium hover:border-faint"
      >
        {t.errors.backToSearch}
      </Link>
    </div>
  );
}
