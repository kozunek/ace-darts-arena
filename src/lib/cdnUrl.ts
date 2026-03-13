/**
 * Transforms Supabase storage URLs to go through Vercel's CDN proxy.
 * This reduces Supabase bandwidth usage by caching at the edge.
 *
 * Pattern: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 *       → /cdn/storage/<bucket>/<path>
 */

const SUPABASE_STORAGE_PATTERN =
  /https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/(.+)/;

/** CDN proxy is only available on the production Vercel domain */
const IS_VERCEL =
  typeof window !== "undefined" &&
  (window.location.hostname === "edartpolska.pl" ||
   window.location.hostname.endsWith(".vercel.app"));

export function cdnUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (!IS_VERCEL) return url;

  const match = url.match(SUPABASE_STORAGE_PATTERN);
  if (!match) return url;

  // Strip any query params (cache-bust) for cleaner CDN paths
  const storagePath = match[1].split("?")[0];
  return `/cdn/storage/${storagePath}`;
}
