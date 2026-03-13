/**
 * Transforms Supabase storage URLs to go through Vercel's CDN proxy.
 * This reduces Supabase bandwidth usage by caching at the edge.
 *
 * Pattern: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 *       → /cdn/storage/<bucket>/<path>
 */

const SUPABASE_STORAGE_PATTERN =
  /https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/(.+)/;

export function cdnUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;

  const match = url.match(SUPABASE_STORAGE_PATTERN);
  if (!match) return url;

  // Strip any query params (cache-bust) for cleaner CDN paths
  const storagePath = match[1].split("?")[0];
  return `/cdn/storage/${storagePath}`;
}
