/**
 * Coming Soon / "We are launching soon" — configuration SSOT.
 *
 * The launch target is config, NOT hardcoded in the component. The operator
 * sets the real launch instant via the env var `COMING_SOON_LAUNCH_AT` (ISO
 * 8601 WITH offset, e.g. `2026-07-15T09:00:00-04:00` for America/Santiago).
 * Until then a clearly-marked placeholder (~60 days out from a fixed seed) is
 * used so the countdown renders without blocking.
 *
 * The countdown auto-redirects to `COMING_SOON_REDIRECT_PATH` when it reaches
 * zero (operator decision). Keep the redirect target a route that will be
 * genuinely ready at the launch instant.
 *
 * Resolution happens server-side (env is server-only); the resolved ISO string
 * is passed down to the client `ComingSoon` view as a prop — the view never
 * reads env.
 */

/**
 * Placeholder launch instant — used ONLY when `COMING_SOON_LAUNCH_AT` is unset.
 * Fixed seed (not `Date.now()`-relative) so SSR output is deterministic and
 * does not drift between renders. The operator MUST override this via env
 * before this page goes live with a real audience.
 *
 * ⚠️ PLACEHOLDER — replace by setting `COMING_SOON_LAUNCH_AT` in the env.
 */
const PLACEHOLDER_LAUNCH_AT_ISO = '2026-08-01T09:00:00-04:00'

/** Default redirect target when the countdown hits zero. */
const DEFAULT_REDIRECT_PATH = '/'

/**
 * Resolve the launch instant as a UTC-normalized ISO string.
 *
 * Reads `COMING_SOON_LAUNCH_AT` (any valid ISO 8601 with offset); falls back to
 * the placeholder. Invalid values fall back to the placeholder rather than
 * throwing — a misconfigured env must not 500 a public page.
 */
export function getComingSoonLaunchAtIso(): string {
  const raw = process.env.COMING_SOON_LAUNCH_AT?.trim()

  if (raw) {
    const parsed = new Date(raw)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  return new Date(PLACEHOLDER_LAUNCH_AT_ISO).toISOString()
}

/**
 * Whether the configured launch instant is still the placeholder (no real env
 * override). Lets the page surface a discreet operator hint in non-production.
 */
export function isComingSoonLaunchPlaceholder(): boolean {
  return !process.env.COMING_SOON_LAUNCH_AT?.trim()
}

/** Path the countdown redirects to at zero. Override via `COMING_SOON_REDIRECT_PATH`. */
export function getComingSoonRedirectPath(): string {
  const raw = process.env.COMING_SOON_REDIRECT_PATH?.trim()

  return raw && raw.startsWith('/') ? raw : DEFAULT_REDIRECT_PATH
}
