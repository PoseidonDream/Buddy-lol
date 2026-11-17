import type { MetadataRoute } from "next";

/**
 * Keep crawlers off pages that cost Riot API requests to render: player
 * profiles, multi-search, the JSON API, and every leaderboard page beyond the
 * first. A crawler following every player link would use up the API key's
 * rate limit for real visitors.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/summoner/", "/multisearch", "/api/", "/leaderboards/*?"],
    },
  };
}
