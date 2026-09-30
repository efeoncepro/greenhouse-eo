export const XRAY_PUBLIC_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Accept'
} as const
export const XRAY_PUBLIC_STATUS = { ok: 200, not_found: 404, gone: 410, rate_limited: 429, unavailable: 503 } as const
