"use client";

import { useEffect } from "react";
import { useDict } from "@/i18n/client";

export default function ProfileError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const t = useDict();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <div className="card mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold">{t.profile.crashTitle}</h1>
        <p className="mt-2 text-soft">{t.profile.crashBody}</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {t.common.tryAgain}
        </button>
      </div>
    </main>
  );
}
