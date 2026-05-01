import 'server-only'

import { query } from '@/lib/db'
import type {
  PaymentObligationBeneficiaryType,
  PaymentObligationCurrency,
  PaymentObligationKind
} from '@/types/payment-obligations'

import { createPaymentObligation } from './create-obligation'

interface PayrollEntryRow extends Record<string, unknown> {
  entry_id: string
  period_id: string
  member_id: string
  display_name: string | null
  currency: string
  pay_regime: string | null
  contract_type_snapshot: string | null
  payroll_via: string | null
  deel_contract_id: string | null
  net_total: number | string
  gross_total: number | string
  sii_retention_amount: number | string | null
  chile_employer_total_cost: number | string | null
  member_space_id: string | null
}

interface SupplierRow extends Record<string, unknown> {
  supplier_id: string
  legal_name: string | null
  trade_name: string | null
}

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const findPreviredSupplier = async (): Promise<SupplierRow | null> => {
  const rows = await query<SupplierRow>(
    `SELECT supplier_id, legal_name, trade_name
       FROM greenhouse_finance.suppliers
      WHERE is_active = TRUE
        AND (
          LOWER(COALESCE(trade_name, '')) LIKE '%previred%'
          OR LOWER(COALESCE(legal_name, '')) LIKE '%previred%'
        )
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, supplier_id ASC
      LIMIT 1`
  )

  return rows[0] ?? null
}

export interface MaterializePayrollObligationsResult {
  periodId: string
  employeeNetPayCreated: number
  employeeNetPaySkipped: number
  employeeWithheldCreated: number
  providerPayrollCreated: number
  employerSocialSecurityCreated: boolean
  employerSocialSecuritySkipped: boolean
  notes: string[]
}

/**
 * Materializa payment_obligations desde un payroll_period exportado.
 *
 * Para cada payroll_entry activo:
 *  - employee_net_pay (siempre que net_total > 0)
 *  - employee_withheld_component si es honorarios y hay sii_retention
 *  - provider_payroll placeholder si payroll_via='deel'
 *
 * Para el periodo entero (consolidado):
 *  - employer_social_security si la suma de chile_employer_total_cost > 0
 *
 * Idempotente: re-export del mismo periodo retorna `skipped` por las
 * obligations existentes en idempotency key.
 */
export async function materializePayrollObligationsForExportedPeriod(args: {
  periodId: string
  year: number
  month: number
}): Promise<MaterializePayrollObligationsResult> {
  const { periodId, year, month } = args

  const periodEnd = `${year}-${String(month).padStart(2, '0')}-01`

  // member.space_id NO existe directamente; el resolver definitivo vive en
  // person_memberships o en el ambito operativo. Para V1 dejamos space_id NULL
  // a nivel obligation (consistente con expense bridge actual). Cuando emerja
  // resolver canonico se actualiza via UPDATE futuro.
  const entries = await query<PayrollEntryRow>(
    `SELECT
        e.entry_id,
        e.period_id,
        e.member_id,
        m.display_name,
        e.currency,
        e.pay_regime,
        e.contract_type_snapshot,
        e.payroll_via,
        e.deel_contract_id,
        e.net_total,
        e.gross_total,
        e.sii_retention_amount,
        e.chile_employer_total_cost,
        NULL::text AS member_space_id
       FROM greenhouse_payroll.payroll_entries AS e
       INNER JOIN greenhouse_core.members AS m
         ON m.member_id = e.member_id
      WHERE e.period_id = $1
        AND e.is_active = TRUE
      ORDER BY m.display_name ASC NULLS LAST, e.entry_id ASC`,
    [periodId]
  )

  const result: MaterializePayrollObligationsResult = {
    periodId,
    employeeNetPayCreated: 0,
    employeeNetPaySkipped: 0,
    employeeWithheldCreated: 0,
    providerPayrollCreated: 0,
    employerSocialSecurityCreated: false,
    employerSocialSecuritySkipped: false,
    notes: []
  }

  if (entries.length === 0) {
    result.notes.push(`Periodo ${periodId} no tiene entries activos`)

    return result
  }

  for (const entry of entries) {
    const memberSpaceId = entry.member_space_id ?? null
    const currency = (entry.currency === 'USD' ? 'USD' : 'CLP') as PaymentObligationCurrency
    const netTotal = toNumber(entry.net_total)
    const beneficiaryType: PaymentObligationBeneficiaryType = 'member'
    const isDeel = entry.payroll_via === 'deel'

    // 1) employee_net_pay
    const obligationKind: PaymentObligationKind = isDeel ? 'provider_payroll' : 'employee_net_pay'

    if (netTotal > 0 || isDeel) {
      const created = await createPaymentObligation({
        spaceId: memberSpaceId,
        sourceKind: 'payroll',
        sourceRef: entry.period_id,
        periodId: entry.period_id,
        beneficiaryType,
        beneficiaryId: entry.member_id,
        beneficiaryName: entry.display_name,
        obligationKind,
        // En Deel V1 dejamos amount=0 placeholder + metadata referencia, ya que
        // Greenhouse no es owner del pago final.
        amount: isDeel ? 0 : netTotal,
        currency,
        dueDate: periodEnd,
        metadata: {
          payrollEntryId: entry.entry_id,
          contractTypeSnapshot: entry.contract_type_snapshot ?? null,
          payRegime: entry.pay_regime ?? null,
          payrollVia: entry.payroll_via ?? null,
          deelContractId: entry.deel_contract_id ?? null,
          referenceNet: isDeel ? netTotal : null,
          grossTotal: toNumber(entry.gross_total)
        }
      })

      if (isDeel) {
        if (created.created) result.providerPayrollCreated += 1
      } else {
        if (created.created) result.employeeNetPayCreated += 1
        else result.employeeNetPaySkipped += 1
      }
    }

    // 2) employee_withheld_component (SII retention para honorarios)
    const siiRetention = toNumber(entry.sii_retention_amount)

    if (
      !isDeel &&
      entry.contract_type_snapshot === 'honorarios' &&
      siiRetention > 0
    ) {
      const sii = await createPaymentObligation({
        spaceId: memberSpaceId,
        sourceKind: 'payroll',
        sourceRef: entry.period_id,
        periodId: entry.period_id,
        beneficiaryType: 'tax_authority',
        beneficiaryId: 'cl_sii',
        beneficiaryName: 'Servicio de Impuestos Internos (Chile)',
        obligationKind: 'employee_withheld_component',
        amount: siiRetention,
        currency: 'CLP',
        dueDate: periodEnd,
        metadata: {
          payrollEntryId: entry.entry_id,
          memberId: entry.member_id,
          memberName: entry.display_name,
          retentionType: 'sii_honorarios'
        }
      })

      if (sii.created) result.employeeWithheldCreated += 1
    }
  }

  // 3) employer_social_security consolidado (Previred)
  const employerTotal = entries.reduce(
    (sum, e) => sum + toNumber(e.chile_employer_total_cost),
    0
  )

  if (employerTotal > 0) {
    const previred = await findPreviredSupplier()

    const created = await createPaymentObligation({
      spaceId: null,
      sourceKind: 'payroll',
      sourceRef: periodId,
      periodId,
      beneficiaryType: previred ? 'supplier' : 'tax_authority',
      beneficiaryId: previred?.supplier_id ?? 'cl_previred',
      beneficiaryName: previred?.legal_name ?? previred?.trade_name ?? 'Previred',
      obligationKind: 'employer_social_security',
      amount: employerTotal,
      currency: 'CLP',
      dueDate: periodEnd,
      metadata: {
        consolidatedFromEntries: entries.length,
        sourcePeriod: periodId
      }
    })

    if (created.created) {
      result.employerSocialSecurityCreated = true
    } else {
      result.employerSocialSecuritySkipped = true
    }
  } else {
    result.notes.push('No hay chile_employer_total_cost > 0 — no se materializa employer_social_security')
  }

  return result
}
