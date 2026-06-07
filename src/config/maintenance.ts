/**
 * Maintenance mode — configuration SSOT (env-driven gate).
 *
 * Lets an operator put the WHOLE portal (or any non-allowlisted route) behind
 * the canonical `/maintenance` page during a planned maintenance window, without
 * a code change — only an env flip + redeploy.
 *
 * Design (arch-architect 4-pillar):
 *  - Safety: default OFF. With `MAINTENANCE_MODE` unset/≠'true' the gate is a
 *    pure pass-through (zero behavior change on merge). An optional operator
 *    bypass (`MAINTENANCE_BYPASS_SECRET`) lets ops keep browsing to verify /
 *    disable while everyone else sees maintenance.
 *  - Robustness: pure env + path string checks (Proxy-safe, no IO). The
 *    proxy fails OPEN — a bug in the gate must never take the portal down.
 *  - Resilience: stateless; toggling is `MAINTENANCE_MODE=true` + redeploy on
 *    the target (Vercel reads env at deploy time). Honest HTTP 503 + Retry-After
 *    so monitors/bots treat it as a temporary outage, not a permanent error.
 *  - Scalability: O(1) per request; negligible vs. request cost.
 *
 * ⚠️ ROLLOUT (Runtime Rollout Completion Gate): shipping this code does NOT put
 * anything in maintenance. To actually use it, set on the target environment
 * (Production / Staging / Preview) and redeploy:
 *   - `MAINTENANCE_MODE=true`
 *   - `MAINTENANCE_BYPASS_SECRET=<openssl rand -hex 32>` (optional, recommended)
 * Then ops can verify the live site via `https://<host>/?gh_bypass=<secret>`
 * (sets an httpOnly bypass cookie for the session). To end the window, set
 * `MAINTENANCE_MODE=false` (or remove it) and redeploy.
 */

/** Canonical maintenance route (served by `(blank-layout-pages)/maintenance`). */
export const MAINTENANCE_PATH = '/maintenance'

/** httpOnly cookie that carries the operator bypass token once granted. */
export const MAINTENANCE_BYPASS_COOKIE = 'gh-maintenance-bypass'

/** Query param that grants the bypass (`/?gh_bypass=<secret>`). */
export const MAINTENANCE_BYPASS_QUERY = 'gh_bypass'

/** Bypass cookie lifetime (seconds) — one ops session (8h). */
export const MAINTENANCE_BYPASS_MAX_AGE_SECONDS = 60 * 60 * 8

/** Retry-After header value (seconds) sent with the 503 maintenance response. */
export const MAINTENANCE_RETRY_AFTER_SECONDS = 3600

/** Whether maintenance mode is active. Default OFF (only the literal 'true'). */
export function isMaintenanceModeEnabled(): boolean {
  return process.env.MAINTENANCE_MODE?.trim().toLowerCase() === 'true'
}

/** Operator bypass secret. Empty string ⇒ bypass disabled (no one bypasses). */
export function getMaintenanceBypassSecret(): string {
  return process.env.MAINTENANCE_BYPASS_SECRET?.trim() ?? ''
}

/**
 * Paths that must NEVER be gated even during maintenance: the maintenance page
 * itself (avoid a rewrite loop), framework internals, auth + agent-session +
 * health (so ops/monitors keep working), and brand/illustration assets the
 * maintenance page needs. Static files (with a dot) are already excluded by the
 * proxy matcher; these cover the dot-less routes.
 */
const ALWAYS_ALLOWED_PREFIXES = [
  MAINTENANCE_PATH, // /maintenance
  '/_next', // framework chunks / images
  '/api/auth', // NextAuth + /api/auth/agent-session (ops verify)
  '/api/health', // uptime monitors
  '/branding', // wordmark used by the maintenance footer
  '/images', // misc-mask + character illustration
  '/animations' // lottie assets (if any)
] as const

/** True when `pathname` is in the never-gate allowlist. */
export function isMaintenanceAllowedPath(pathname: string): boolean {
  return ALWAYS_ALLOWED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Constant-time-ish string compare (Edge-safe — no Node `crypto`). Low-stakes
 * bypass token, but avoid trivial early-exit timing leaks anyway.
 */
export function maintenanceBypassMatches(candidate: string | undefined | null, secret: string): boolean {
  if (!secret || !candidate || candidate.length !== secret.length) return false

  let mismatch = 0

  for (let i = 0; i < candidate.length; i++) {
    mismatch |= candidate.charCodeAt(i) ^ secret.charCodeAt(i)
  }

  return mismatch === 0
}
