"use client";

import { useDict } from "@/i18n/client";

export function DemoBanner() {
  const t = useDict();
  return (
    <p className="border-b border-accent/30 bg-brand/15 px-4 py-2 text-center text-sm text-accent">
      <strong className="font-semibold">{t.demo.title}</strong> {t.demo.body}
    </p>
  );
}
