import 'server-only'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

/**
 * Convención del repo: opt-in con `*_ENABLED` (ver bigquery-write-flag.ts).
 *
 * Default: enabled. Para apagar el sweep en producción sin redeploy, setear
 * RELIABILITY_SYNTHETIC_ENABLED=false en Vercel envs.
 */
export const isReliabilitySyntheticEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => {
  const raw = env.RELIABILITY_SYNTHETIC_ENABLED

  if (raw === undefined) return true

  return TRUE_VALUES.has(raw.trim().toLowerCase())
}
