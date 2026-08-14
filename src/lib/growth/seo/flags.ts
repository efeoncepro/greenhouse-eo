/**
 * TASK-1302 — Feature flag del módulo SEO (default OFF).
 *
 * Gatea el batch diario de materialización GSC en el ops-worker. Con el flag OFF el
 * handler hace no-op prod-safe: cero queries, cero llamadas a Google, cero ruido en
 * Sentry — el Cloud Scheduler puede existir sin acoplarse a producción.
 *
 * ⚠️ LO LEEN **DOS** RUNTIMES, y prenderlo es un flip de **tres pasos**:
 *   1. `services/ops-worker/deploy.sh` — Cloud Run. Gatea el batch diario (TASK-1302).
 *   2. Vercel — gatea el lane ecosystem/MCP (`api-platform/resources/ecosystem-growth-seo.ts`,
 *      TASK-1645) y el reader del cruce SEO↔AEO (`gap/read-seo-aeo-gap.ts`, TASK-1305).
 *   3. Despausar el Cloud Scheduler `ops-seo-gsc-snapshot`, cuyo estado se declara en el
 *      5.º argumento de `upsert_scheduler_job` (se re-aplica en CADA deploy).
 *
 * Prenderlo en un solo runtime deja la mitad del módulo muerta, y **apagarlo sólo en el
 * worker NO apaga el módulo**: el lane de Vercel sigue sirviendo. Cada uno tiene su SoT
 * distinto (CLAUDE.md §Feature Flag State Ledger: prender un flag es multi-runtime).
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

/**
 * TASK-1661 — Captura de datos de mercado por keyword (DataForSEO Labs). Default OFF.
 *
 * 🔴 **Prender esto empieza a gastar.** A diferencia de `GROWTH_SEO_ENABLED`, que gatea
 * lecturas y batches ya presupuestados, este flag habilita una corrida que le paga al
 * proveedor por cada fila devuelta. Nace apagado y se enciende por organización.
 *
 * ⚠️ **Runtime: `ops-worker` ÚNICAMENTE** (el fetch es async). El SoT es
 * `services/ops-worker/deploy.sh`, cuyos `--set-env-vars` son DESTRUCTIVOS: aplicarlo sólo
 * en vivo con `--update-env-vars` lo borra en el próximo deploy, en silencio. Declararlo en
 * Vercel no sirve de nada — ahí no corre el fetch.
 *
 * Es SUBORDINADO a `GROWTH_SEO_ENABLED`: con el módulo apagado la captura no corre aunque
 * este flag esté ON. Dos condiciones independientes, no una.
 *
 * Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md (gate docs:closure-check).
 */
export const GROWTH_SEO_KEYWORD_MARKET_DATA_FLAG = 'GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED'

/** Gate de la captura de mercado. Default OFF: prenderlo compromete gasto de proveedor. */
export const isSeoKeywordMarketDataEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_SEO_KEYWORD_MARKET_DATA_FLAG])
