import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-1206 Slice 1 — Quote-to-Cash readiness report (READ-ONLY).
 *
 * Reporte de solo lectura que le dice a Commercial qué cotizaciones pueden cerrar Q2C y
 * cuáles necesitan remediación (deal HubSpot, etc.) ANTES de construir/cablear el command
 * canónico de cierre. NO muta nada. Es el artefacto que la spec pide para decidir el primer
 * smoke y para detectar drift (converted sin income / sin audit).
 *
 * Detecta los mismos drifts que después serán reliability signals (steady=0):
 * - `converted_without_income`: quote `converted` pero `converted_to_income_id IS NULL` (AR faltante).
 * - `converted_without_audit`: quote `converted` sin fila Q2C en `commercial_operations_audit` (camino
 *   que se saltó el substrate comercial — el bug class que el command canónico cierra).
 * - `issued_without_deal`: quote emitida sin `hubspot_deal_id` (el autopromoter no la puede cerrar).
 * - `contract_only_suspended`: Q2C en `contract_only` suspendido (deal sin AR — revenue leakage si excede SLA).
 */

export type Q2CQuotationStatus = 'issued' | 'sent' | 'approved' | 'converted'

export interface Q2CReadinessRow {
  quotationId: string
  status: string
  organizationId: string | null
  hubspotDealId: string | null
  convertedToIncomeId: string | null
  contractId: string | null
  hasQ2cAudit: boolean
  q2cAuditStatus: string | null
  /** Emitida + con organización → puede cerrar por simple_invoice. */
  canCloseSimple: boolean
  /** Emitida sin deal HubSpot → el autopromoter no la puede cerrar (remediar primero). */
  issuedWithoutDeal: boolean
  /** `converted` sin income enlazado → AR faltante (drift). */
  convertedWithoutIncome: boolean
  /** `converted` sin audit Q2C → se saltó el substrate comercial (drift). */
  convertedWithoutAudit: boolean
  /** Q2C suspendido en `contract_only` → deal sin AR (revenue leakage si excede SLA). */
  contractOnlySuspended: boolean
}

export interface Q2CReadinessReport {
  generatedAt: string
  totals: {
    rows: number
    canCloseSimple: number
    issuedWithoutDeal: number
    convertedWithoutIncome: number
    convertedWithoutAudit: number
    contractOnlySuspended: number
  }
  rows: Q2CReadinessRow[]
}

interface ReadinessQueryRow extends Record<string, unknown> {
  quotation_id: string
  status: string
  organization_id: string | null
  hubspot_deal_id: string | null
  converted_to_income_id: string | null
  contract_id: string | null
  has_q2c_audit: boolean
  q2c_audit_status: string | null
}

const READINESS_SQL = `
  SELECT
    q.quotation_id,
    q.status,
    q.organization_id,
    q.hubspot_deal_id,
    q.converted_to_income_id,
    c.contract_id,
    (a.operation_id IS NOT NULL) AS has_q2c_audit,
    a.status AS q2c_audit_status
  FROM greenhouse_commercial.quotations q
  LEFT JOIN LATERAL (
    SELECT ct.contract_id
    FROM greenhouse_commercial.contracts ct
    WHERE ct.originator_quote_id = q.quotation_id
    ORDER BY ct.contract_id
    LIMIT 1
  ) c ON TRUE
  LEFT JOIN LATERAL (
    SELECT ca.operation_id, ca.status
    FROM greenhouse_commercial.commercial_operations_audit ca
    WHERE ca.quotation_id = q.quotation_id
      AND ca.operation_type = 'quote_to_cash'
    ORDER BY ca.started_at DESC
    LIMIT 1
  ) a ON TRUE
  WHERE q.status IN ('issued', 'sent', 'approved', 'converted')
  ORDER BY q.status, q.quotation_id
`

const isOpenForClose = (status: string) => status === 'issued' || status === 'sent' || status === 'approved'

export const buildQ2CReadinessRow = (row: ReadinessQueryRow): Q2CReadinessRow => {
  const open = isOpenForClose(row.status)
  const converted = row.status === 'converted'

  return {
    quotationId: row.quotation_id,
    status: row.status,
    organizationId: row.organization_id,
    hubspotDealId: row.hubspot_deal_id,
    convertedToIncomeId: row.converted_to_income_id,
    contractId: row.contract_id,
    hasQ2cAudit: row.has_q2c_audit,
    q2cAuditStatus: row.q2c_audit_status,
    canCloseSimple: open && row.organization_id != null,
    issuedWithoutDeal: open && row.hubspot_deal_id == null,
    convertedWithoutIncome: converted && row.converted_to_income_id == null,
    convertedWithoutAudit: converted && !row.has_q2c_audit,
    contractOnlySuspended: row.has_q2c_audit && row.q2c_audit_status === 'suspended'
  }
}

export const getQuoteToCashReadinessReport = async (): Promise<Q2CReadinessReport> => {
  const raw = await query<ReadinessQueryRow>(READINESS_SQL)
  const rows = raw.map(buildQ2CReadinessRow)

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      rows: rows.length,
      canCloseSimple: rows.filter(r => r.canCloseSimple).length,
      issuedWithoutDeal: rows.filter(r => r.issuedWithoutDeal).length,
      convertedWithoutIncome: rows.filter(r => r.convertedWithoutIncome).length,
      convertedWithoutAudit: rows.filter(r => r.convertedWithoutAudit).length,
      contractOnlySuspended: rows.filter(r => r.contractOnlySuspended).length
    },
    rows
  }
}
