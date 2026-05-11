import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-863 V1.5.2 — Reliability signal: drift entre el `document_status` actual en DB
 * y el `documentStatusAtRender` del PDF persistido al que apunta `pdf_asset_id`.
 *
 * **Invariante**: cuando un finiquito transita de un estado a otro (rendered →
 * in_review → approved → issued → signed_or_ratified, o paths a voided/rejected/
 * superseded), el helper canonico `regenerateDocumentPdfForStatus` actualiza
 * tanto el `pdf_asset_id` (apunta a un PDF nuevo) como
 * `asset.metadata_json.documentStatusAtRender` (matchea el documentStatus actual).
 *
 * **Cuándo emite drift**:
 *
 *   `document_status != asset.metadata_json->>'documentStatusAtRender'`
 *
 * Casos canónicos de drift:
 *
 * 1. Bug pre-V1.5.2: las transitions `in_review`, `approved`, `voided`, `rejected`,
 *    `superseded` no regeneraban el PDF (solo `issued` y `signed_or_ratified`).
 *    Resultado: doc aprobado pero PDF persistido sigue siendo el del estado
 *    `rendered` (badge "Borrador HR" + watermark "PROYECTO" cuando debería
 *    decir "Aprobado · pendiente de emisión").
 *
 * 2. Regen failure post-V1.5.2: el render del PDF falló (Sentry capture activo
 *    via captureWithDomain), pero la transition de estado en DB commitea (estado
 *    legal es source of truth). Este signal detecta esos casos hasta que el
 *    operador haga reissue.
 *
 * 3. Agente futuro agrega transition nueva al state machine y olvida llamar
 *    `regenerateDocumentPdfForStatus`. Defense-in-depth.
 *
 * **Steady state esperado** = 0 post-deploy + backfill de docs legacy.
 *
 * **Kind**: `drift`. **Severidad**: `warning` si count > 0, `error` si > 24h.
 *
 * Pattern reference: TASK-774 `account-balances-fx-drift.ts` (mismo shape).
 */
export const FINAL_SETTLEMENT_PDF_STATUS_DRIFT_SIGNAL_ID =
  'payroll.final_settlement_document.pdf_status_drift'

const DEFAULT_WINDOW_DAYS = 90
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

export type FinalSettlementPdfStatusDriftRow = {
  finalSettlementDocumentId: string
  offboardingCaseId: string
  memberId: string
  documentVersion: number
  currentDocumentStatus: string
  pdfAssetId: string | null
  documentStatusAtRender: string | null
  pdfUpdatedAt: string | null
  driftAgeHours: number
  detectedAt: string
}

export type FinalSettlementPdfStatusDriftQueryOptions = {
  windowDays?: number
  limit?: number
  finalSettlementDocumentId?: string
}

type FinalSettlementPdfStatusDriftSqlRow = {
  final_settlement_document_id: string
  offboarding_case_id: string
  member_id: string
  document_version: number
  current_document_status: string
  pdf_asset_id: string | null
  document_status_at_render: string | null
  pdf_updated_at: string | null
  drift_age_hours: number | string
  detected_at: string
}

const clampInteger = (value: number | undefined, fallback: number, min: number, max: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback

  return Math.min(Math.max(Math.trunc(value), min), max)
}

const buildSql = (options: FinalSettlementPdfStatusDriftQueryOptions = {}, mode: 'count' | 'rows') => {
  const params: Array<string | number> = []
  const filters: string[] = []

  const windowDays = clampInteger(options.windowDays, DEFAULT_WINDOW_DAYS, 1, 365)
  const limit = clampInteger(options.limit, DEFAULT_LIMIT, 1, MAX_LIMIT)

  params.push(windowDays)
  filters.push(`fsd.created_at >= NOW() - ($${params.length}::int * INTERVAL '1 day')`)

  if (options.finalSettlementDocumentId) {
    params.push(options.finalSettlementDocumentId)
    filters.push(`fsd.final_settlement_document_id = $${params.length}`)
  }

  // Filtrar documentos `rendered` cuyo asset coincide (no es drift; ése es el estado
  // inicial canónico al crear el draft).
  // Drift = documentStatus en DB != documentStatusAtRender del asset.
  // NULL pdf_asset_id NO es drift (sin PDF aún).
  // NULL documentStatusAtRender en asset (legacy pre-V1.5.2) ES drift solo si
  // documentStatus != 'rendered' (legacy nació en rendered).
  const driftCondition = `(
    fsd.pdf_asset_id IS NOT NULL
    AND (
      (a.metadata_json->>'documentStatusAtRender' IS NULL AND fsd.document_status != 'rendered')
      OR (a.metadata_json->>'documentStatusAtRender' IS NOT NULL
          AND a.metadata_json->>'documentStatusAtRender' != fsd.document_status)
    )
  )`

  const limitClause = mode === 'rows' ? `LIMIT ${limit}` : ''

  const selectClause =
    mode === 'count'
      ? 'SELECT COUNT(*)::int AS n'
      : `SELECT
          fsd.final_settlement_document_id,
          fsd.offboarding_case_id,
          fsd.member_id,
          fsd.document_version,
          fsd.document_status AS current_document_status,
          fsd.pdf_asset_id,
          a.metadata_json->>'documentStatusAtRender' AS document_status_at_render,
          a.updated_at::text AS pdf_updated_at,
          EXTRACT(EPOCH FROM (NOW() - a.updated_at)) / 3600 AS drift_age_hours,
          NOW()::text AS detected_at`

  return {
    sql: `
      ${selectClause}
      FROM greenhouse_payroll.final_settlement_documents fsd
      LEFT JOIN greenhouse_core.assets a ON a.asset_id = fsd.pdf_asset_id
      WHERE ${filters.join('\n        AND ')}
        AND ${driftCondition}
      ${mode === 'rows' ? 'ORDER BY a.updated_at ASC NULLS LAST' : ''}
      ${limitClause}
    `,
    params
  }
}

const mapRow = (row: FinalSettlementPdfStatusDriftSqlRow): FinalSettlementPdfStatusDriftRow => ({
  finalSettlementDocumentId: row.final_settlement_document_id,
  offboardingCaseId: row.offboarding_case_id,
  memberId: row.member_id,
  documentVersion: row.document_version,
  currentDocumentStatus: row.current_document_status,
  pdfAssetId: row.pdf_asset_id,
  documentStatusAtRender: row.document_status_at_render,
  pdfUpdatedAt: row.pdf_updated_at,
  driftAgeHours: Number(row.drift_age_hours ?? 0),
  detectedAt: row.detected_at
})

export const listFinalSettlementPdfStatusDriftRows = async (
  options: FinalSettlementPdfStatusDriftQueryOptions = {}
): Promise<FinalSettlementPdfStatusDriftRow[]> => {
  const { sql, params } = buildSql(options, 'rows')
  const rows = await query<FinalSettlementPdfStatusDriftSqlRow>(sql, params)

  return rows.map(mapRow)
}

export const countFinalSettlementPdfStatusDriftRows = async (
  options: Omit<FinalSettlementPdfStatusDriftQueryOptions, 'limit'> = {}
): Promise<number> => {
  const { sql, params } = buildSql(options, 'count')
  const rows = await query<{ n: number }>(sql, params)

  return Number(rows[0]?.n ?? 0)
}

export const getFinalSettlementPdfStatusDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await listFinalSettlementPdfStatusDriftRows({ limit: 10 })
    const count = rows.length === 10 ? await countFinalSettlementPdfStatusDriftRows() : rows.length
    const maxAgeHours = rows.reduce((acc, row) => Math.max(acc, row.driftAgeHours), 0)

    const severity: ReliabilitySignal['severity'] =
      count === 0 ? 'ok' : maxAgeHours > 24 ? 'error' : 'warning'

    return {
      signalId: FINAL_SETTLEMENT_PDF_STATUS_DRIFT_SIGNAL_ID,
      moduleKey: 'payroll',
      kind: 'drift',
      source: 'getFinalSettlementPdfStatusDriftSignal',
      label: 'Finiquito PDF status drift',
      severity,
      summary:
        count === 0
          ? 'Sin drift entre document_status y PDF persistido en los últimos 90 días.'
          : `${count} finiquito${count === 1 ? '' : 's'} con drift entre document_status y PDF persistido (max ${maxAgeHours.toFixed(1)}h). El operador puede regenerar via reissue.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'metric', label: 'max_age_hours', value: maxAgeHours.toFixed(1) },
        { kind: 'metric', label: 'window_days', value: String(DEFAULT_WINDOW_DAYS) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md (Delta V1.5.2)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'payroll', {
      tags: { source: 'reliability_signal_final_settlement_pdf_status_drift' }
    })

    return {
      signalId: FINAL_SETTLEMENT_PDF_STATUS_DRIFT_SIGNAL_ID,
      moduleKey: 'payroll',
      kind: 'drift',
      source: 'getFinalSettlementPdfStatusDriftSignal',
      label: 'Finiquito PDF status drift',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }
      ]
    }
  }
}
