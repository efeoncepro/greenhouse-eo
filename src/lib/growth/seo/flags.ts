/**
 * TASK-1302 — Feature flag del módulo SEO (default OFF).
 *
 * Gatea el batch diario de materialización GSC en el ops-worker. Con el flag OFF el
 * handler hace no-op prod-safe: cero queries, cero llamadas a Google, cero ruido en
 * Sentry — el Cloud Scheduler puede existir sin acoplarse a producción.
 *
 * ⚠️ El runtime que LEE este flag es el **ops-worker (Cloud Run)**, NO Vercel. Prenderlo
 * sólo en Vercel dejaría el materializer muerto (CLAUDE.md §Feature Flag State Ledger:
 * prender un flag es multi-runtime). En Cloud Run el SoT es `services/ops-worker/deploy.sh`.
 *
 * Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md (gate docs:closure-check).
 *
 * Distinto de `GROWTH_SEARCH_CONSOLE_ENABLED` (TASK-1282), que gatea la conexión GSC en
 * sí: sin aquél el reader degrada a `disabled` y este módulo no tendría de dónde leer.
 * Los env-knobs de allowance/budget de TASK-1301 (`GROWTH_SEO_*_PER_MONTH`) NO son flags
 * y no viven acá.
 */
export const GROWTH_SEO_FLAG = 'GROWTH_SEO_ENABLED'

const isTrue = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

/** Kill switch del módulo SEO. Default OFF. */
export const isSeoModuleEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => isTrue(env[GROWTH_SEO_FLAG])
