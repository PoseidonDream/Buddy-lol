"use client";

import { useEffect } from "react";

export default function ProfileError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <div className="card mx-auto max-w-xl p-8 text-center">
        <h1 className="text-xl font-semibold">This profile couldn&apos;t be loaded</h1>
        <p className="mt-2 text-soft">Something went wrong on our side, not yours.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
