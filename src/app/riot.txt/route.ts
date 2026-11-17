import { connection } from "next/server";

/**
 * GET /riot.txt: the code Riot asks for when verifying the site for a
 * production API key. It comes from the RIOT_VERIFICATION_CODE setting, so it
 * never has to be committed. Riot wants the file to hold the code and nothing
 * else.
 */
export async function GET() {
  // Read at request time, so a code added later only needs a redeploy.
  await connection();
  const code = process.env.RIOT_VERIFICATION_CODE?.trim();
  if (!code) return new Response("Not found", { status: 404 });
  return new Response(code, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
