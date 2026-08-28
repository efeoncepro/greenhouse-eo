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

/**
 * TASK-1664 — Keyword discovery (DataForSEO Labs, seed expansion + enrichment). Default OFF.
 *
 * 🔴 **Prender esto habilita corridas que GASTAN** (Labs Live cobra por request y por fila).
 * Con el flag OFF, `queueKeywordDiscovery` devuelve `disabled` sin insertar run y el runner
 * del worker no procesa pendientes: cero llamadas, cero costo.
 *
 * ⚠️ **Lo leen DOS runtimes** (mismo contrato multi-runtime que `GROWTH_SEO_ENABLED`):
 *   1. **Vercel** — gatea el enqueue/preview (route admin + lane ecosystem + MCP write).
 *   2. **ops-worker** (`services/ops-worker/deploy.sh`, SoT declarativo) — gatea el drain
 *      que ejecuta las corridas. Prenderlo en un solo runtime deja la capacidad coja.
 *   Además el Cloud Scheduler `ops-seo-keyword-discovery-drain` nace PAUSADO: dos frenos
 *   independientes, igual que el market-data de TASK-1661.
 *
 * Es SUBORDINADO a `GROWTH_SEO_ENABLED`: con el módulo apagado no hay discovery aunque este
 * flag esté ON. Registrar cambios en docs/operations/FEATURE_FLAG_STATE_LEDGER.md.
 */
export const GROWTH_SEO_KEYWORD_DISCOVERY_FLAG = 'GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED'

/** Gate del keyword discovery. Default OFF: prenderlo compromete gasto de proveedor. */
export const isSeoKeywordDiscoveryEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_SEO_KEYWORD_DISCOVERY_FLAG])

/**
 * TASK-1775 — Captura mensual de la foto de dominio (DataForSEO Labs `domain_rank_overview`
 * sobre el target y sus competidores declarados).
 *
 * ⚠️ **Se lee SOLO en el ops-worker** — la captura es lo único que gatea y vive ahí (el hook
 * de spend está cableado en ese entrypoint). Prenderlo en Vercel es INERTE, y creer que se
 * prendió porque aparece en Vercel es el fallo silencioso que documenta el ledger de flags.
 * SoT declarativo: `services/ops-worker/deploy.sh` (su `--set-env-vars` es destructivo);
 * efecto inmediato con `gcloud run services update ... --update-env-vars`.
 *
 * Además el Cloud Scheduler `ops-seo-domain-overview` nace PAUSADO: dos frenos independientes,
 * igual que el market-data de TASK-1661. Es SUBORDINADO a `GROWTH_SEO_ENABLED`.
 * Registrar cambios en docs/operations/FEATURE_FLAG_STATE_LEDGER.md.
 */
export const GROWTH_SEO_DOMAIN_OVERVIEW_FLAG = 'GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED'

/** Gate de la foto de dominio. Default OFF: prenderlo compromete gasto de proveedor. */
export const isSeoDomainOverviewEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_SEO_DOMAIN_OVERVIEW_FLAG])

/**
 * TASK-1776 — Visibilidad de mercado por URL/subdominio/subcarpeta (`ranked_keywords` sobre
 * el target y sus competidores + primitives on-demand `relevant_pages`/`subdomains`).
 *
 * ⚠️ **Se lee SOLO en el ops-worker** (la captura vive ahí; en Vercel es inerte). SoT
 * declarativo: `services/ops-worker/deploy.sh`; efecto inmediato con `--update-env-vars`.
 * El Cloud Scheduler `ops-seo-url-visibility` nace PAUSADO: dos frenos independientes.
 * Es SUBORDINADO a `GROWTH_SEO_ENABLED`. Registrar cambios en el ledger de flags.
 */
export const GROWTH_SEO_URL_VISIBILITY_FLAG = 'GROWTH_SEO_URL_VISIBILITY_ENABLED'

/** Gate de la visibilidad por sujeto-página. Default OFF: prenderlo compromete gasto. */
export const isSeoUrlVisibilityEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_SEO_URL_VISIBILITY_FLAG])

/**
 * TASK-1777 — Drill-down nominal del perfil de enlaces (paso post-batch del snapshot
 * semanal de TASK-1304; SIN scheduler nuevo — un cron aparte desincronizaría el detalle de
 * su snapshot padre).
 *
 * ⚠️ **Se lee SOLO en el ops-worker** (el pase vive en el batch semanal; en Vercel es
 * inerte). SoT declarativo: `services/ops-worker/deploy.sh`; efecto inmediato con
 * `--update-env-vars`. Es SUBORDINADO a `GROWTH_SEO_ENABLED`. Registrar cambios en el
 * ledger de flags.
 */
export const GROWTH_SEO_BACKLINK_DETAIL_FLAG = 'GROWTH_SEO_BACKLINK_DETAIL_ENABLED'

/** Gate del drill-down de enlaces. Default OFF: prenderlo compromete gasto condicional. */
export const isSeoBacklinkDetailEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_SEO_BACKLINK_DETAIL_FLAG])

/**
 * TASK-1709 — Diagnóstico de prospecto (tier `prospect`, corrida única). Default OFF.
 *
 * 🔴 **Prender esto habilita un command que GASTA** (~USD 0,25 por diagnóstico, Labs +
 * Backlinks live), con tope duro por diagnóstico (`GROWTH_SEO_PROSPECT_DIAGNOSTIC_CEILING_USD`)
 * y tope diario por actor. Con el flag OFF, `runProspectDiagnostic` devuelve `disabled`
 * sin una sola llamada al proveedor.
 *
 * ⚠️ **Runtime: Vercel ÚNICAMENTE (V1).** La corrida es inline en el command (todas las
 * fuentes son live: Labs, Backlinks, reads OnPage post-crawl y el sustrato propio) — no
 * hay batch en el ops-worker, no hay Cloud Scheduler, y NO DEBE haberlo: la captura
 * recurrente sobre un prospecto está prohibida por regla dura de la task; un scheduler
 * que lea `seo_prospect_diagnostics` es una regresión, no una mejora.
 *
 * Es SUBORDINADO a `GROWTH_SEO_ENABLED`: con el módulo apagado no hay diagnóstico aunque
 * este flag esté ON. Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md.
 */
export const GROWTH_SEO_PROSPECT_DIAGNOSTIC_FLAG = 'GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED'

/** Gate del diagnóstico de prospecto. Default OFF: prenderlo compromete gasto por corrida. */
export const isSeoProspectDiagnosticEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isSeoModuleEnabled(env) && isTrue(env[GROWTH_SEO_PROSPECT_DIAGNOSTIC_FLAG])

/**
 * TASK-1662 — Cobertura de keywords de competidores (keyword gap competitivo,
 * `labs/google/domain_intersection` por competidor declarado).
 *
 * ⚠️ **Se lee SOLO en el ops-worker** (la captura vive ahí; en Vercel es inerte). SoT
 * declarativo: `services/ops-worker/deploy.sh`; efecto inmediato con `--update-env-vars`.
 * El Cloud Scheduler `ops-seo-competitor-coverage` nace PAUSADO: dos frenos independientes.
 * Es SUBORDINADO a `GROWTH_SEO_ENABLED`. Registrar cambios en el ledger de flags.
 *
 * 🔴 El universo de keywords de un competidor no tiene techo natural: además del flag, el
 * gasto está acotado por el techo de competidores por target, el row limit por llamada y
 * el gate `enforceSeoRunEntitlement` con dry-run previo (V1: un competidor por corrida).
 */
export const GROWTH_SEO_COMPETITOR_GAP_FLAG = 'GROWTH_SEO_COMPETITOR_GAP_ENABLED'

/** Gate de la cobertura de competidores. Default OFF: prenderlo empieza a gastar. */
export const isSeoCompetitorGapEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_SEO_COMPETITOR_GAP_FLAG])

/**
 * TASK-1699 — Persistencia del top-N del SERP que el rank capture YA paga (costo marginal
 * CERO: cero llamadas nuevas, cero cambio de depth/flags de la compra).
 *
 * ⚠️ **DUAL-RUNTIME**: el ops-worker lo lee para la ESCRITURA (dentro del batch del cron
 * `ops-seo-rank-capture` — es el runtime que importa: sin él no hay serie) y Vercel para la
 * LECTURA de los lanes (que no expongan una tabla vacía). SoT declarativo:
 * `services/ops-worker/deploy.sh` + env var en Vercel; efecto inmediato con
 * `--update-env-vars`. Es SUBORDINADO a `GROWTH_SEO_ENABLED`. Registrar cambios en el
 * ledger de flags.
 *
 * 🔴 Cada día con este flag apagado en el worker es un día de serie PERDIDO PARA SIEMPRE
 * (el SERP de ayer no se recompra) — por eso, a diferencia de sus hermanos de gasto, el
 * default declarativo va ON apenas el código llegue al worker.
 */
export const GROWTH_SEO_SERP_TOP_RESULTS_FLAG = 'GROWTH_SEO_SERP_TOP_RESULTS_ENABLED'

/** Gate de la persistencia del top-N. No gasta: gatea escritura ya pagada y lectura. */
export const isSeoSerpTopResultsEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_SEO_SERP_TOP_RESULTS_FLAG])
