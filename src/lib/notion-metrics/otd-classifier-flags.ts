import 'server-only'

/**
 * TASK-923 (M1) — Feature flag canonical del clasificador OTD GH-owned.
 *
 * Patrón canonical Greenhouse `process.env.X === 'true'` (sin drift, default OFF),
 * mirror de `src/lib/notion-metrics/status-transitions-flags.ts` +
 * `src/lib/ico-engine/materialize-flags.ts`.
 *
 * **Default OFF es load-bearing**: en M1 la columna `gh_otd_bucket` se computa
 * siempre en `v_tasks_enriched` (shadow), pero NINGÚN consumer la lee — el bono
 * sigue leyendo `performance_indicator_code` legacy synced de Notion. Este flag
 * es el switch declarado que M2/M3 usarán para que consumers empiecen a leer la
 * columna GH (cutover gated, 8 stop-gates + sign-off HR — ADR §16 M3). En M1 no
 * gatea nada crítico: garantiza cero impacto en otd_pct / nómina al merge.
 */
export const isOtdClassifierGhShadowEnabled = (): boolean =>
  process.env.OTD_CLASSIFIER_GH_SHADOW_ENABLED === 'true'
