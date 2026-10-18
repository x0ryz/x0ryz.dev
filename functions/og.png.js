// Cloudflare Pages Function: /og.png, the link preview image, follows the season like the
// page does (see site/season-pick.js) and serves /og-<season>.png
const SEASONS = ["winter", "spring", "summer", "autumn"];

export async function onRequest({ request, env }) {
  const season = SEASONS[Math.floor(((new Date().getUTCMonth() + 1) % 12) / 3)];
  const image = await env.ASSETS.fetch(new URL(`/og-${season}.png`, request.url));
  const response = new Response(image.body, image);
  // Previews are cached for a day, so a new season shows up within a day of starting
  response.headers.set("Cache-Control", "public, max-age=86400");
  return response;
}
