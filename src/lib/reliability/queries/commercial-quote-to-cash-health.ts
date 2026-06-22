import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySeverity, ReliabilitySignal } from '@/types/reliability'

import { CONTRACT_ONLY_SLA_DAYS } from '@/lib/commercial/quote-to-cash/flags'

/**
 * TASK-1206 — Reliability signals del cierre Quote-to-Cash (rollup bajo `commercial`).
 *
 * Detectan los síntomas observables que el comando canónico `closeQuoteToCash` cierra. La lógica
 * de drift es la misma del readiness reader read-only (Slice 1); acá se expone como signals
 * para `/admin/operations`. Todos `kind: 'data_quality'`.
 *
 * Nota de convergencia: `converted_without_audit` e `issued_without_deal` NO son siempre 0 antes
 * del cutover — el path legacy `convert-to-invoice` (flag OFF) convierte sin audit Q2C, y las
 * cotizaciones emitidas sin deal HubSpot existen legítimamente (se cierran operator-triggered).
 * Por eso son `warning` (no `error`): convergen a 0 tras el cutover / remediación. En cambio
 * `converted_without_income`, `contract_only_sla_breach` y `duplicate_income` SÍ son steady=0
 * duro (`error` si > 0): AR faltante, revenue leakage o doble-AR.
 */

export const Q2C_CONVERTED_WITHOUT_INCOME_SIGNAL_ID = 'commercial.quote_to_cash.converted_without_income'
export const Q2C_CONVERTED_WITHOUT_AUDIT_SIGNAL_ID = 'commercial.quote_to_cash.converted_without_audit'
export const Q2C_ISSUED_WITHOUT_DEAL_SIGNAL_ID = 'commercial.quotation.issued_without_deal'
export const Q2C_CONTRACT_ONLY_SLA_BREACH_SIGNAL_ID = 'commercial.quote_to_cash.contract_only_sla_breach'
export const Q2C_DUPLICATE_INCOME_SIGNAL_ID = 'commercial.quote_to_cash.duplicate_income'

interface CountRow extends Record<string, unknown> {
  n: number
}

const buildCountSignal = async ({
  signalId,
  label,
  sql,
  params,
  severityOnPositive,
  okSummary,
  positiveSummary,
  sqlEvidence,
  source
}: {
  signalId: string
  label: string
  sql: string
  params?: unknown[]
  severityOnPositive: ReliabilitySeverity
  okSummary: string
  positiveSummary: (count: number) => string
  sqlEvidence: string
  source: string
}): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<CountRow>(sql, params)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId,
      moduleKey: 'commercial',
      kind: 'data_quality',
      source,
      label,
      severity: count === 0 ? 'ok' : severityOnPositive,
      summary: count === 0 ? okSummary : positiveSummary(count),
      observedAt,
      evidence: [
        { kind: 'sql', label: 'Query', value: sqlEvidence },
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1206-commercial-q2c-canonical-close-command.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', { tags: { source } })

    return {
      signalId,
      moduleKey: 'commercial',
      kind: 'data_quality',
      source,
      label,
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}

/** Cotización `converted` sin income enlazado → AR faltante (steady=0 duro, error). */
export const getQ2cConvertedWithoutIncomeSignal = (): Promise<ReliabilitySignal> =>
  buildCountSignal({
    signalId: Q2C_CONVERTED_WITHOUT_INCOME_SIGNAL_ID,
    label: 'Cotizaciones convertidas sin income (AR faltante)',
    source: 'getQ2cConvertedWithoutIncomeSignal',
    sql: `SELECT COUNT(*)::int AS n
            FROM greenhouse_commercial.quotations
            WHERE status = 'converted' AND converted_to_income_id IS NULL`,
    sqlEvidence: "SELECT COUNT(*) FROM greenhouse_commercial.quotations WHERE status='converted' AND converted_to_income_id IS NULL",
    severityOnPositive: 'error',
    okSummary: 'Toda cotización convertida tiene income enlazado (sin AR faltante).',
    positiveSummary: count =>
      `${count} cotización${count === 1 ? '' : 'es'} 'converted' sin income enlazado (AR faltante). closeQuoteToCash materializa income ANTES de convertir — investigar conversiones por fuera del comando.`
  })

/** Cotización `converted` sin fila Q2C en el audit → bypass del substrate (warning; converge a 0 post-cutover). */
export const getQ2cConvertedWithoutAuditSignal = (): Promise<ReliabilitySignal> =>
  buildCountSignal({
    signalId: Q2C_CONVERTED_WITHOUT_AUDIT_SIGNAL_ID,
    label: 'Cotizaciones convertidas sin audit Q2C',
    source: 'getQ2cConvertedWithoutAuditSignal',
    sql: `SELECT COUNT(*)::int AS n
            FROM greenhouse_commercial.quotations q
            WHERE q.status = 'converted'
              AND NOT EXISTS (
                SELECT 1 FROM greenhouse_commercial.commercial_operations_audit a
                WHERE a.quotation_id = q.quotation_id AND a.operation_type = 'quote_to_cash'
              )`,
    sqlEvidence: "SELECT COUNT(*) FROM greenhouse_commercial.quotations q WHERE q.status='converted' AND NOT EXISTS (SELECT 1 FROM greenhouse_commercial.commercial_operations_audit a WHERE a.quotation_id=q.quotation_id AND a.operation_type='quote_to_cash')",
    severityOnPositive: 'warning',
    okSummary: 'Toda cotización convertida tiene fila Q2C en commercial_operations_audit.',
    positiveSummary: count =>
      `${count} cotización${count === 1 ? '' : 'es'} 'converted' sin audit Q2C. Esperado mientras el path legacy (convert-to-invoice, flag OFF) siga activo; debe converger a 0 tras el cutover a closeQuoteToCash.`
  })

/** Cotización emitida sin deal HubSpot → el autopromoter no la puede cerrar (warning; requiere remediación). */
export const getQ2cIssuedWithoutDealSignal = (): Promise<ReliabilitySignal> =>
  buildCountSignal({
    signalId: Q2C_ISSUED_WITHOUT_DEAL_SIGNAL_ID,
    label: 'Cotizaciones emitidas sin deal HubSpot',
    source: 'getQ2cIssuedWithoutDealSignal',
    sql: `SELECT COUNT(*)::int AS n
            FROM greenhouse_commercial.quotations
            WHERE status IN ('issued', 'sent', 'approved') AND hubspot_deal_id IS NULL`,
    sqlEvidence: "SELECT COUNT(*) FROM greenhouse_commercial.quotations WHERE status IN ('issued','sent','approved') AND hubspot_deal_id IS NULL",
    severityOnPositive: 'warning',
    okSummary: 'Toda cotización emitida tiene deal HubSpot (el autopromoter puede cerrarla).',
    positiveSummary: count =>
      `${count} cotización${count === 1 ? '' : 'es'} emitida${count === 1 ? '' : 's'} sin deal HubSpot. El autopromoter (commercial.deal.won) no las cierra; pueden cerrarse operator-triggered o remediar el deal.`
  })

/** Q2C suspendido `contract_only` más allá del SLA sin income → revenue leakage (steady=0 duro, error). */
export const getQ2cContractOnlySlaBreachSignal = (): Promise<ReliabilitySignal> =>
  buildCountSignal({
    signalId: Q2C_CONTRACT_ONLY_SLA_BREACH_SIGNAL_ID,
    label: 'Cierres contract_only suspendidos más allá del SLA',
    source: 'getQ2cContractOnlySlaBreachSignal',
    sql: `SELECT COUNT(*)::int AS n
            FROM greenhouse_commercial.commercial_operations_audit a
            WHERE a.operation_type = 'quote_to_cash'
              AND a.status = 'suspended'
              AND a.started_at < (CURRENT_DATE - ($1)::int)
              AND NOT EXISTS (
                SELECT 1 FROM greenhouse_commercial.quotations q
                WHERE q.quotation_id = a.quotation_id AND q.converted_to_income_id IS NOT NULL
              )`,
    params: [CONTRACT_ONLY_SLA_DAYS],
    sqlEvidence: `SELECT COUNT(*) FROM greenhouse_commercial.commercial_operations_audit a WHERE a.operation_type='quote_to_cash' AND a.status='suspended' AND a.started_at < (CURRENT_DATE - ${CONTRACT_ONLY_SLA_DAYS}) AND NOT EXISTS (SELECT 1 FROM greenhouse_commercial.quotations q WHERE q.quotation_id=a.quotation_id AND q.converted_to_income_id IS NOT NULL)`,
    severityOnPositive: 'error',
    okSummary: `Ninguna operación contract_only lleva más de ${CONTRACT_ONLY_SLA_DAYS} días suspendida sin income.`,
    positiveSummary: count =>
      `${count} operación${count === 1 ? '' : 'es'} contract_only suspendida${count === 1 ? '' : 's'} más de ${CONTRACT_ONLY_SLA_DAYS} días sin income (deal ganado sin AR = revenue leakage). Resolver la conversión real o cancelar.`
  })

/** Más de un income por cotización (simple) o por HES → doble AR (steady=0 duro, error). */
export const getQ2cDuplicateIncomeSignal = (): Promise<ReliabilitySignal> =>
  buildCountSignal({
    signalId: Q2C_DUPLICATE_INCOME_SIGNAL_ID,
    label: 'Income duplicado por cotización/HES (doble AR)',
    source: 'getQ2cDuplicateIncomeSignal',
    // Simple branch: >1 income (source_hes_id NULL) por quotation_id. Enterprise: >1 income por
    // source_hes_id. NO cuenta el multi-HES legítimo (cada HES = un income distinto).
    sql: `SELECT COUNT(*)::int AS n FROM (
            SELECT quotation_id
              FROM greenhouse_finance.income
              WHERE quotation_id IS NOT NULL AND source_hes_id IS NULL
              GROUP BY quotation_id HAVING COUNT(*) > 1
            UNION ALL
            SELECT source_hes_id
              FROM greenhouse_finance.income
              WHERE source_hes_id IS NOT NULL
              GROUP BY source_hes_id HAVING COUNT(*) > 1
          ) d`,
    sqlEvidence: 'SELECT COUNT(*) FROM ( SELECT quotation_id FROM greenhouse_finance.income WHERE quotation_id IS NOT NULL AND source_hes_id IS NULL GROUP BY quotation_id HAVING COUNT(*)>1 UNION ALL SELECT source_hes_id FROM greenhouse_finance.income WHERE source_hes_id IS NOT NULL GROUP BY source_hes_id HAVING COUNT(*)>1 ) d',
    severityOnPositive: 'error',
    okSummary: 'Ninguna cotización (simple) ni HES tiene income duplicado.',
    positiveSummary: count =>
      `${count} cotización/HES con income DUPLICADO (doble AR). closeQuoteToCash es idempotente (lookup antes de insertar) — investigar y revertir vía audit trail, NUNCA borrar income a ciegas.`
  })
