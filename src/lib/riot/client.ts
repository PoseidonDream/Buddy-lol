import "server-only";

export class RiotApiError extends Error {
  constructor(
    /** HTTP status, or 0 when the request never got a response. */
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RiotApiError";
  }
}

export function riotApiKey(): string | null {
  return process.env.RIOT_API_KEY?.trim() || null;
}

/**
 * GET a Riot API resource. Responses are stored in Next's fetch cache for
 * `revalidate` seconds, which is what keeps us inside the key's rate limit.
 * Returns `null` for a 404; throws `RiotApiError` for everything else.
 */
export async function riotGet<T>(
  host: string,
  path: string,
  revalidate: number,
): Promise<T | null> {
  const key = riotApiKey();
  if (!key) throw new RiotApiError(401, "RIOT_API_KEY is not set");

  // RIOT_API_BASE_URL replaces the host for every call. It exists so the app
  // can be pointed at a caching proxy or a local stub; "{host}" is substituted.
  const override = process.env.RIOT_API_BASE_URL?.trim();
  const base = override
    ? override.replace("{host}", host).replace(/\/$/, "")
    : `https://${host}.api.riotgames.com`;

  let res: Response;
  try {
    res = await fetch(base + path, {
      headers: { "X-Riot-Token": key },
      next: { revalidate },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new RiotApiError(0, `Could not reach the Riot API (${host})`);
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new RiotApiError(res.status, `Riot API responded ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}
