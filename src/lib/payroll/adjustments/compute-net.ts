// TASK-745 — Pure, idempotent net computation given active adjustments.
//
// Aplica adjustments en orden canonico:
//   1) exclude -> bruto=0, neto=0 (cortocircuito)
//   2) gross_factor (multiplicativos) y/o gross_factor_per_component
//   3) recompute deducciones (SII honorarios, previsional Chile) sobre bruto efectivo
//   4) fixed_deduction (suma) reduce el neto
//   5) manual_override (si presente) gana sobre todo, fija el neto final
//
// Diseñado puro para ser testeable y reusable desde calculate-payroll, receipts,
// API previews y proyecciones a Finance.

import type {
  AdjustmentKind,
  AdjustmentStatus,
  PayrollAdjustment,
  PayrollEntryNetComputation
} from '@/types/payroll-adjustments'

// Snapshot minimo del entry necesario para el calculo.
// Trabajamos con CLP-equivalentes; los entries USD ya vienen pre-convertidos a CLP en su propio campo.
export interface PayrollEntryComputeSnapshot {
  payRegime: 'chile' | 'international'
  contractTypeSnapshot: string | null
  // Bruto natural compuesto (base + remoto + bonos + ajustes por asistencia, antes de adjustments).
  naturalGrossClp: number
  // Componentes individuales (para gross_factor_per_component).
  components?: {
    base?: number
    remoteAllowance?: number
    bonusOtd?: number
    bonusRpa?: number
    fixedBonus?: number
    [other: string]: number | undefined
  }
  // Tasa SII honorarios (e.g. 0.135 para 13.5%). Solo aplica si contract='honorarios'.
  siiRetentionRate: number | null
  // Funcion para recomputar deducciones Chile dependiente sobre bruto efectivo.
  // Retorna 0 si no aplica (international, honorarios). Inyectada por el caller para
  // mantener compute-net puro y agnostico de calculate-chile-deductions.
  recomputeChileDeductionsClp?: (effectiveGrossClp: number) => number
}

const isAdjustmentActive = (status: AdjustmentStatus): boolean => status === 'active'

const KIND_PRIORITY: Record<AdjustmentKind, number> = {
  exclude: 0,
  gross_factor: 1,
  gross_factor_per_component: 2,
  fixed_deduction: 3,
  manual_override: 4
}

const sortByApplicationOrder = (a: PayrollAdjustment, b: PayrollAdjustment): number => {
  const byKind = (KIND_PRIORITY[a.kind] ?? 99) - (KIND_PRIORITY[b.kind] ?? 99)

  if (byKind !== 0) return byKind

  // Within same kind, deterministic order by effective_at then adjustment_id
  const aT = Date.parse(a.effectiveAt)
  const bT = Date.parse(b.effectiveAt)

  if (aT !== bT) return aT - bT

  return a.adjustmentId.localeCompare(b.adjustmentId)
}

const computeGrossFromComponents = (
  components: PayrollEntryComputeSnapshot['components'],
  factorMap: Record<string, number>,
  fallbackGross: number
): number => {
  if (!components) return fallbackGross

  let total = 0
  let touched = false

  for (const [key, value] of Object.entries(components)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    const factor = factorMap[key] ?? 1

    total += value * factor
    touched = true
  }

  return touched ? total : fallbackGross
}

const round2 = (value: number): number => Math.round(value * 100) / 100

export function computePayrollEntryNet(
  snapshot: PayrollEntryComputeSnapshot,
  adjustments: readonly PayrollAdjustment[]
): PayrollEntryNetComputation {
  const active = [...adjustments]
    .filter(a => isAdjustmentActive(a.status))
    .sort(sortByApplicationOrder)

  const naturalGrossClp = round2(Math.max(0, snapshot.naturalGrossClp))

  // 1) Exclude short-circuit
  const excludeAdj = active.find(a => a.kind === 'exclude')

  if (excludeAdj) {
    return {
      excluded: true,
      naturalGrossClp,
      effectiveGrossClp: 0,
      factorApplied: 0,
      siiRetentionClp: 0,
      chileDeductionsClp: 0,
      fixedDeductionClp: 0,
      netBeforeOverride: 0,
      netClp: 0,
      overrideApplied: false,
      appliedAdjustmentIds: [excludeAdj.adjustmentId]
    }
  }

  // 2) Apply gross_factor (multiplicativos)
  let factor = 1
  const appliedIds: string[] = []

  for (const a of active) {
    if (a.kind !== 'gross_factor') continue
    const f = Number((a.payload as { factor?: number }).factor)

    if (Number.isFinite(f) && f >= 0) {
      factor *= f
      appliedIds.push(a.adjustmentId)
    }
  }

  let effectiveGrossClp = round2(naturalGrossClp * factor)

  // 3) Apply per-component override (gana sobre factor uniforme cuando se provee)
  const perCompAdj = active.find(a => a.kind === 'gross_factor_per_component')

  if (perCompAdj) {
    const map = (perCompAdj.payload as { components?: Record<string, number> }).components ?? {}

    effectiveGrossClp = round2(computeGrossFromComponents(snapshot.components, map, naturalGrossClp))
    appliedIds.push(perCompAdj.adjustmentId)
    // Si hay per-component, el factor uniforme reportado es el ratio efectivo
    factor = naturalGrossClp > 0 ? effectiveGrossClp / naturalGrossClp : 0
  }

  // 4) Recompute deducciones legales sobre bruto efectivo
  const isHonorarios =
    snapshot.contractTypeSnapshot === 'honorarios' && (snapshot.siiRetentionRate ?? 0) > 0

  const isChileDependent =
    snapshot.payRegime === 'chile' &&
    (snapshot.contractTypeSnapshot === 'indefinido' || snapshot.contractTypeSnapshot === 'plazo_fijo')

  const siiRetentionClp = isHonorarios
    ? round2(effectiveGrossClp * (snapshot.siiRetentionRate ?? 0))
    : 0

  const chileDeductionsClp = isChileDependent && snapshot.recomputeChileDeductionsClp
    ? round2(Math.max(0, snapshot.recomputeChileDeductionsClp(effectiveGrossClp)))
    : 0

  // 5) Apply fixed_deduction(s) — sum
  let fixedDeductionClp = 0

  for (const a of active) {
    if (a.kind !== 'fixed_deduction') continue
    const amt = Number((a.payload as { amount?: number }).amount)

    if (Number.isFinite(amt) && amt > 0) {
      fixedDeductionClp += amt
      appliedIds.push(a.adjustmentId)
    }
  }

  fixedDeductionClp = round2(fixedDeductionClp)

  const netBeforeOverride = round2(
    effectiveGrossClp - siiRetentionClp - chileDeductionsClp - fixedDeductionClp
  )

  // 6) manual_override gana sobre todo
  const overrideAdj = active.find(a => a.kind === 'manual_override')

  let netClp = netBeforeOverride
  let overrideApplied = false

  if (overrideAdj) {
    const v = Number((overrideAdj.payload as { netClp?: number }).netClp)

    if (Number.isFinite(v)) {
      netClp = round2(v)
      overrideApplied = true
      appliedIds.push(overrideAdj.adjustmentId)
    }
  }

  return {
    excluded: false,
    naturalGrossClp,
    effectiveGrossClp,
    factorApplied: round2(factor),
    siiRetentionClp,
    chileDeductionsClp,
    fixedDeductionClp,
    netBeforeOverride,
    netClp,
    overrideApplied,
    appliedAdjustmentIds: appliedIds
  }
}
