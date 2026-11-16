"use client";

import { useState } from "react";

/**
 * A square game asset (champion, item, spell...). Images come from Riot's CDN,
 * so a missing or renamed asset must not leave a broken-image glyph behind:
 * on failure the tile falls back to a short text label.
 */
export function GameIcon({
  src,
  alt,
  label,
  className = "",
}: {
  src: string | null;
  alt: string;
  /** One or two characters shown if the image cannot load. */
  label?: string;
  /** Size and corner radius, e.g. "size-8 rounded-md". */
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && failedSrc !== src;

  return (
    <span
      title={alt || undefined}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-raised text-[10px] font-semibold uppercase text-faint ${className}`}
    >
      {showImage ? (
        // The CDN already serves small, cached PNGs; the optimizer adds nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
          // An image can fail before React attaches onError during hydration.
          ref={(img) => {
            if (img?.complete && img.naturalWidth === 0) setFailedSrc(src);
          }}
        />
      ) : (
        <span aria-hidden={alt ? undefined : true}>{label}</span>
      )}
    </span>
  );
}

export function initials(name: string): string {
  const words = name.split(/[\s']+/).filter(Boolean);
  return words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}
