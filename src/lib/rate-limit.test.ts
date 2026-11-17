import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { clientIp, takeLookups } from "./rate-limit";
import { getStore } from "./store";

const dir = mkdtempSync(join(tmpdir(), "buddy-rl-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("RIOT_API_KEY", "RGAPI-test");
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("BUDDY_DATA_FILE", join(dir, "data.json"));
  vi.stubEnv("RATE_LIMIT_PER_MINUTE", "3");
  vi.stubEnv("RATE_LIMIT_PER_HOUR", "5");
});

const T0 = Date.UTC(2026, 0, 1, 12, 0, 10);

describe("takeLookups", () => {
  it("allows up to the per-minute limit, then asks the visitor to wait", async () => {
    const ip = "203.0.113.1";
    for (let i = 0; i < 3; i++) expect(await takeLookups(ip, 1, T0)).toEqual({ ok: true });
    const blocked = await takeLookups(ip, 1, T0 + 1000);
    expect(blocked).toEqual({ ok: false, retryAfterSec: 49 });
  });

  it("starts over in the next minute, up to the hourly limit", async () => {
    const ip = "203.0.113.2";
    for (let i = 0; i < 3; i++) await takeLookups(ip, 1, T0);
    expect(await takeLookups(ip, 1, T0 + 60_000)).toEqual({ ok: true });
    expect(await takeLookups(ip, 1, T0 + 60_000)).toEqual({ ok: true }); // 5th this hour
    const blocked = await takeLookups(ip, 1, T0 + 120_000);
    expect(blocked.ok).toBe(false);
    // The hourly window decides how long to wait.
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(60);
  });

  it("keeps visitors apart and charges multi-step lookups in full", async () => {
    expect(await takeLookups("203.0.113.3", 3, T0)).toEqual({ ok: true });
    expect((await takeLookups("203.0.113.3", 1, T0)).ok).toBe(false);
    expect(await takeLookups("203.0.113.4", 1, T0)).toEqual({ ok: true });
  });

  it("never limits sample-data mode", async () => {
    vi.stubEnv("RIOT_API_KEY", "");
    for (let i = 0; i < 10; i++) expect(await takeLookups("203.0.113.5", 1, T0)).toEqual({ ok: true });
  });

  it("lets requests through if the counter fails", async () => {
    const spy = vi.spyOn(getStore(), "countHits").mockRejectedValue(new Error("db down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await takeLookups("203.0.113.6", 1, T0)).toEqual({ ok: true });
    spy.mockRestore();
    warn.mockRestore();
  });

  it("never stores the address itself", async () => {
    const spy = vi.spyOn(getStore(), "countHits");
    await takeLookups("198.51.100.77", 1, T0);
    for (const [bucket] of spy.mock.calls) expect(bucket).not.toContain("198.51.100.77");
    spy.mockRestore();
  });
});

describe("clientIp", () => {
  it("prefers x-real-ip, then the first x-forwarded-for address", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientIp(new Headers({ "x-forwarded-for": "2.2.2.2, 10.0.0.1" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
