import 'server-only'

import type { OtdBucket } from './otd-bucket-types'

/**
 * TASK-927 — Constantes canónicas del writeback del bucket OTD a Notion.
 *
 * Greenhouse escribe el bucket OTD **freeze-corregido** (M2,
 * `task_attributable_lateness_shadow.bucket_attributable`, PG) a una propiedad
 * **read-only** `[GH] OTD` (select) en la DB Tareas de Efeonce + Sky. Display-only:
 * coexiste con la fórmula legacy `Indicador de Performance`, NO toca el bono.
 * Boundary canónico Notion = OS / Greenhouse = motor (la propiedad `[GH]` es el
 * destino read-only del writeback, NUNCA una fórmula Notion).
 *
 * Los labels del select replican EXACTAMENTE los de la propiedad legacy
 * `Indicador de Performance` (synced a `tasks.performance_indicator_label`) para
 * que el operador pueda comparar `[GH] OTD` (freeze-aware) vs el legacy lado a
 * lado en la misma vista de Notion — el propósito del display.
 */

export const NOTION_PROPERTY_OTD_BUCKET = '[GH] OTD'

export const OTD_WRITEBACK_FORMULA_VERSION = 'otd_writeback_v1.0'

/**
 * Mapping canónico `OtdBucket` → nombre de la opción del select `[GH] OTD`.
 * Verbatim de los labels legacy `Indicador de Performance` (verificado en PG
 * 2026-06-19): 🟢 On-Time / 🟡 Late Drop / 🔴 Overdue / 🔵 Carry-Over; `—` para
 * `not_applicable` (mismo glifo que muestra el legacy cuando no hay clasificación).
 */
export const OTD_BUCKET_SELECT_NAME: Record<OtdBucket, string> = {
  on_time: '🟢 On-Time',
  late_drop: '🟡 Late Drop',
  overdue: '🔴 Overdue',
  carry_over: '🔵 Carry-Over',
  not_applicable: '—'
}

/** Opciones del select `[GH] OTD` a crear en Notion (rollout out-of-band). */
export const OTD_BUCKET_SELECT_OPTIONS: readonly string[] = Object.values(OTD_BUCKET_SELECT_NAME)

/** Workspaces productivos del writeback OTD (demo excluido). */
export const OTD_WRITEBACK_PRODUCTIVE_WORKSPACES: ReadonlySet<string> = new Set(['efeonce', 'sky'])

/**
 * Gate del writeback OTD (default OFF — no escribe a Notion hasta el flip gated
 * por el operador). Override per-cliente `NOTION_OTD_WRITEBACK_ENABLED_<EFEONCE|SKY>`
 * gana sobre el global `NOTION_OTD_WRITEBACK_ENABLED` (mirror del patrón FTR/RpA,
 * permite prender un solo cliente). Display-only — NUNCA toca el bono.
 */
export const isOtdWritebackEnabled = (workspaceId?: string): boolean => {
  if (workspaceId) {
    const perClient = process.env[`NOTION_OTD_WRITEBACK_ENABLED_${workspaceId.toUpperCase()}`]

    if (perClient === 'true') {
      return true
    }

    if (perClient === 'false') {
      return false // override explícito por-cliente gana
    }
  }

  return process.env.NOTION_OTD_WRITEBACK_ENABLED === 'true'
}
