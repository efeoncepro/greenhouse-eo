/**
 * TASK-1282 — Growth Search Console connection · Feature flag.
 *
 * `GROWTH_SEARCH_CONSOLE_ENABLED` (default OFF). Con OFF, el entrypoint OAuth
 * (`oauth/start`) y el reader resuelven disabled (no exponen el flujo): nadie puede
 * conectar ni leer. Flip a `true` SOLO tras la verificación del consent screen de
 * Google (scope sensible `webmasters.readonly`) + smoke en staging. Lectura pura de
 * env (testeable). Registrado en docs/operations/FEATURE_FLAG_STATE_LEDGER.md.
 */

export const GROWTH_SEARCH_CONSOLE_FLAG = 'GROWTH_SEARCH_CONSOLE_ENABLED'

const isTrue = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

/** Kill switch del flujo Search Console. Default OFF. */
export const isSearchConsoleEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_SEARCH_CONSOLE_FLAG])
