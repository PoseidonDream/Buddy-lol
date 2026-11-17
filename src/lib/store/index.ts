import "server-only";

import { join } from "node:path";
import { riotApiKey } from "../riot/client";
import { MemoryStore } from "./memory";
import { PostgresStore } from "./postgres";
import type { Store } from "./types";

let store: Store | undefined;

/**
 * Postgres when DATABASE_URL is set. Otherwise a JSON file under .data/,
 * which is fine on one machine but is lost on hosts with no lasting disk
 * (Vercel included). In sample-data mode nothing real is stored at all.
 */
export function getStore(): Store {
  if (store) return store;
  const url = process.env.DATABASE_URL?.trim();
  if (url) store = new PostgresStore(url);
  else if (riotApiKey() === null) store = new MemoryStore();
  else store = new MemoryStore(process.env.BUDDY_DATA_FILE?.trim() || join(process.cwd(), ".data", "buddy.json"));
  return store;
}
