import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real module refuses to load outside a server component.
vi.mock("server-only", () => ({}));

import { RiotApiError, riotGet } from "./client";

function respond(status: number, body: unknown = {}, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

describe("riotGet", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("RIOT_API_KEY", "RGAPI-test");
    vi.stubEnv("RIOT_API_BASE_URL", "");
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("sends the key as a header to the right host", async () => {
    fetchMock.mockResolvedValue(respond(200, { ok: true }));
    await expect(riotGet("euw1", "/lol/thing", 60)).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://euw1.api.riotgames.com/lol/thing");
    expect(init.headers).toEqual({ "X-Riot-Token": "RGAPI-test" });
    expect(init.next).toEqual({ revalidate: 60 });
  });

  it("can be pointed at another base URL", async () => {
    vi.stubEnv("RIOT_API_BASE_URL", "http://localhost:4000/{host}/");
    fetchMock.mockResolvedValue(respond(200));
    await riotGet("europe", "/riot/x", 60);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:4000/europe/riot/x");
  });

  it("returns null for a 404", async () => {
    fetchMock.mockResolvedValue(respond(404));
    await expect(riotGet("euw1", "/missing", 60)).resolves.toBeNull();
  });

  it("throws with the status for other failures", async () => {
    fetchMock.mockResolvedValue(respond(403));
    await expect(riotGet("euw1", "/x", 60)).rejects.toMatchObject({ status: 403 });
  });

  it("reports a network failure as status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const error: unknown = await riotGet("euw1", "/x", 60).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RiotApiError);
    expect(error).toMatchObject({ status: 0 });
  });

  it("refuses to call out without a key", async () => {
    vi.stubEnv("RIOT_API_KEY", "  ");
    await expect(riotGet("euw1", "/x", 60)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("waits out a short rate limit and retries once", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(respond(429, {}, { "retry-after": "1" }))
      .mockResolvedValueOnce(respond(200, { ok: true }));

    const pending = riotGet("euw1", "/x", 60);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up straight away on a long rate limit", async () => {
    fetchMock.mockResolvedValue(respond(429, {}, { "retry-after": "87" }));
    await expect(riotGet("euw1", "/x", 60)).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry more than once", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(respond(429, {}, { "retry-after": "1" }));

    const pending = riotGet("euw1", "/x", 60).catch((e) => e);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
