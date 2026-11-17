import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { SearchBar } from "./SearchBar";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      buddy<span className="text-accent">.lol</span>
    </span>
  );
}

export function SiteHeader({ showSearch = false }: { showSearch?: boolean }) {
  return (
    <header className="border-b border-edge bg-ink/90 backdrop-blur sm:sticky sm:top-0 sm:z-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:h-16 sm:flex-row sm:items-center sm:gap-6 sm:py-0">
        <div className="flex items-center justify-between gap-4 sm:justify-start">
          <Link href="/" className="rounded text-xl" aria-label="Buddy.lol home">
            <Wordmark />
          </Link>
          <NavLinks />
        </div>
        {showSearch && (
          <div className="w-full sm:ml-auto sm:max-w-md">
            <SearchBar size="sm" />
          </div>
        )}
      </div>
    </header>
  );
}
