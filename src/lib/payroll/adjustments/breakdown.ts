// TASK-745d — Source of truth canonico para renderizar adjustments en
// receipts (PDF, UI), exports (Excel, CSV) y boletas SII. Cualquier surface
// que necesite explicar al colaborador/auditor por que el neto difiere del
// calculo natural debe consumir este helper, no parchear localmente.

import type { PayrollAdjustment, AdjustmentStatus } from '@/types/payroll-adjustments'
import {
  ADJUSTMENT_REASON_LABELS,
  type AdjustmentReasonCode
} from './reason-codes'

export interface BreakdownLine {
  label: string
  valueLabel: string
  tone: 'normal' | 'discount' | 'warning' | 'override'
  // Identificador opcional para tracing (e.g. enlazar fila PDF a adjustment_id en audit).
  adjustmentId?: string
}

export interface FixedDeductionEntry {
  adjustmentId: string
  amount: number
  currency: string
  reasonCode: AdjustmentReasonCode
  reasonLabel: string
  reasonNote: string
  requestedBy: string
  requestedAt: string
}

export interface ManualOverrideEntry {
  adjustmentId: string
  netAmount: number
  currency: string
  reasonCode: AdjustmentReasonCode
  reasonLabel: string
  reasonNote: string
  requestedBy: string
  requestedAt: string
}

export interface ExclusionEntry {
  adjustmentId: string
  reasonCode: AdjustmentReasonCode
  reasonLabel: string
  reasonNote: string
  requestedBy: string
  requestedAt: string
}

export interface EntryAdjustmentBreakdown {
  hasActiveAdjustments: boolean
  excluded: ExclusionEntry | null
  factorApplied: number
  fixedDeductions: FixedDeductionEntry[]
  manualOverride: ManualOverrideEntry | null
  // Suma de fixed_deductions en moneda del entry (aplicada despues de SII y previsional).
  totalFixedDeductionAmount: number
  // Lineas pre-formateadas listas para render en PDF/UI/Excel.
  // Cada surface aplica su propia traduccion final (formato moneda, etilo).
  totalActiveAdjustments: number
}

const isAdjustmentActive = (status: AdjustmentStatus): boolean => status === 'active'

const reasonLabel = (code: string): string =>
  ADJUSTMENT_REASON_LABELS[code as AdjustmentReasonCode] ?? code

/**
 * Construye el breakdown canonico de adjustments para un entry. Resultado puro:
 * mismas inputs siempre devuelven mismo output. Sin DB, sin formato.
 *
 * Surfaces (PDF, ReceiptCard, Excel, etc.) consumen este struct y aplican su
 * propia presentacion.
 */
export function getEntryAdjustmentBreakdown(
  adjustments: readonly PayrollAdjustment[]
): EntryAdjustmentBreakdown {
  const active = adjustments.filter(a => isAdjustmentActive(a.status))

  // Exclude tiene prioridad — corto circuito como en compute-net.
  const excludeAdj = active.find(a => a.kind === 'exclude')
  let excluded: ExclusionEntry | null = null

  if (excludeAdj) {
    excluded = {
      adjustmentId: excludeAdj.adjustmentId,
      reasonCode: excludeAdj.reasonCode,
      reasonLabel: reasonLabel(excludeAdj.reasonCode),
      reasonNote: excludeAdj.reasonNote,
      requestedBy: excludeAdj.requestedBy,
      requestedAt: excludeAdj.requestedAt
    }
  }

  // Factor multiplicativo (todos los gross_factor) o per-component
  let factor = 1

  for (const a of active) {
    if (a.kind === 'gross_factor') {
      const f = Number((a.payload as { factor?: number }).factor)

      if (Number.isFinite(f) && f >= 0) factor *= f
    }
  }

  // Fixed deductions
  const fixedDeductions: FixedDeductionEntry[] = active
    .filter(a => a.kind === 'fixed_deduction')
    .map(a => {
      const payload = a.payload as { amount?: number; currency?: string }
      const amount = Number(payload.amount ?? 0)

      return {
        adjustmentId: a.adjustmentId,
        amount: Number.isFinite(amount) ? amount : 0,
        currency: payload.currency ?? 'CLP',
        reasonCode: a.reasonCode,
        reasonLabel: reasonLabel(a.reasonCode),
        reasonNote: a.reasonNote,
        requestedBy: a.requestedBy,
        requestedAt: a.requestedAt
      }
    })

  const totalFixedDeductionAmount = fixedDeductions.reduce((sum, fd) => sum + fd.amount, 0)

  // Manual override
  const overrideAdj = active.find(a => a.kind === 'manual_override')
  let manualOverride: ManualOverrideEntry | null = null

  if (overrideAdj) {
    const payload = overrideAdj.payload as {
      netAmount?: number
      netClp?: number
      currency?: string
    }

    const netAmount = Number(payload.netAmount ?? payload.netClp ?? 0)

    manualOverride = {
      adjustmentId: overrideAdj.adjustmentId,
      netAmount: Number.isFinite(netAmount) ? netAmount : 0,
      currency: payload.currency ?? 'CLP',
      reasonCode: overrideAdj.reasonCode,
      reasonLabel: reasonLabel(overrideAdj.reasonCode),
      reasonNote: overrideAdj.reasonNote,
      requestedBy: overrideAdj.requestedBy,
      requestedAt: overrideAdj.requestedAt
    }
  }

  return {
    hasActiveAdjustments: active.length > 0,
    excluded,
    factorApplied: Math.round(factor * 10000) / 10000,
    fixedDeductions,
    manualOverride,
    totalFixedDeductionAmount: Math.round(totalFixedDeductionAmount * 100) / 100,
    totalActiveAdjustments: active.length
  }
}
