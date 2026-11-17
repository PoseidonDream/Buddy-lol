"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";

/** Switches patch by rewriting the `patch` query parameter of the current page. */
export function PatchSelect({ patches, current, basePath, keep }: {
  patches: string[];
  current: string;
  basePath: string;
  /** Other query parameters to carry over. */
  keep?: Record<string, string>;
}) {
  const router = useRouter();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="label-caps">
        Patch
      </label>
      <select
        id={id}
        value={current}
        onChange={(e) => {
          const params = new URLSearchParams({ ...keep, patch: e.target.value });
          router.push(`${basePath}?${params}`);
        }}
        className="h-9 cursor-pointer rounded-lg border border-edge bg-raised px-2 font-mono text-sm"
      >
        {patches.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}
