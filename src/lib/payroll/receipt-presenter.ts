/**
 * TASK-758 — Canonical receipt presenter for Payroll receipts.
 *
 * Single source of truth for the visual contract of payroll receipts (preview MUI,
 * downloadable PDF, projection view). Pure, server-safe, no MUI/react-pdf imports
 * so consumers from any environment can compose declarative output.
 *
 * Closes the root bug `isChile = entry.payRegime === 'chile'` that made honorarios
 * render the Chile dependent deduction block with empty rows. The canonical
 * detector is `contractTypeSnapshot` with defensive fallbacks for legacy data.
 *
 * Mockup vinculante: docs/mockups/task-758-receipt-render-4-regimes.html
 */

import {
  CONTRACT_LABELS,
  getSiiRetentionRate,
  type ContractType
} from '@/types/hr-contracts'
import { formatCurrency as formatLocaleCurrency, formatPercent as formatLocalePercent } from '@/lib/format'

import type { EntryAdjustmentBreakdown } from './adjustments/breakdown'

// ──────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────

export type ReceiptRegime =
  | 'chile_dependent'
  | 'honorarios'
  | 'international_deel'
  | 'international_internal'

/** Stable canonical display order shared across receipt + period report surfaces. */
export const RECEIPT_REGIME_DISPLAY_ORDER: readonly ReceiptRegime[] = [
  'chile_dependent',
  'honorarios',
  'international_deel',
  'international_internal'
] as const

export type ReceiptRegimeBadge = {
  /** Short uppercase token shown inside the receipt header chip. */
  code: 'CL-DEP' | 'HON' | 'DEEL' | 'INT'
  /** Spanish label shown next to the badge or as group divider title. */
  label: string
  /** Background hex from the approved mockup. */
  background: string
  /** Foreground hex from the approved mockup. */
  foreground: string
}

export const RECEIPT_REGIME_BADGES: Record<ReceiptRegime, ReceiptRegimeBadge> = {
  chile_dependent: {
    code: 'CL-DEP',
    label: 'Chile dependiente',
    background: '#d4edda',
    foreground: '#155724'
  },
  honorarios: {
    code: 'HON',
    label: 'Honorarios',
    background: '#ffe8c2',
    foreground: '#8a4a00'
  },
  international_deel: {
    code: 'DEEL',
    label: 'Internacional Deel',
    background: '#fff3d6',
    foreground: '#8a6010'
  },
  international_internal: {
    code: 'INT',
    label: 'Internacional interno',
    background: '#e0e7ff',
    foreground: '#2c3e91'
  }
}

export type ReceiptRow = {
  /** Stable key for React render diffing. */
  key: string
  label: string
  /** Pre-formatted currency string (e.g. `$120.000` or `US$ 100,00`) — surfaces render verbatim. */
  amount: string
  /** Rendering hint — `indent` for AFP cotización/comisión sub-rows. */
  variant?: 'normal' | 'indent'
}

export type ReceiptDeductionSection = {
  title: string
  rows: ReceiptRow[]
  totalLabel: string
  /** Pre-formatted currency string. */
  totalAmount: string
}

export type ReceiptInfoBlockVariant = 'info' | 'warning' | 'error'

export type ReceiptInfoBlock = {
  variant: ReceiptInfoBlockVariant
  title: string
  body: string
  /** Optional secondary line — e.g. `Contrato Deel: deel-cnt-...`. Omit when null/undefined. */
  meta?: string
}

export type ReceiptHeroVariant = 'primary' | 'degraded'

export type ReceiptHero = {
  variant: ReceiptHeroVariant
  label: string
  amount: string
  /** Optional disclaimer text shown below the hero (italic, muted). */
  footnote?: string
}

export type ReceiptEmployeeField = {
  /** UPPERCASE token for the field label (e.g. `NOMBRE`, `TIPO DE CONTRATO`). */
  label: string
  value: string
  /** Optional secondary text (smaller, muted). */
  meta?: string
}

export type ReceiptPresentation = {
  regime: ReceiptRegime
  /** True when the entry is excluded — surfaces should hide haberes/asistencia/deductions. */
  isExcluded: boolean
  contractTypeLabel: string
  badge: ReceiptRegimeBadge
  /** Four-field employee box. Field 4 is contextual per regime (AFP/Salud, Tasa SII, Empleador legal, Jurisdicción). */
  employeeFields: [ReceiptEmployeeField, ReceiptEmployeeField, ReceiptEmployeeField, ReceiptEmployeeField]
  /** Currency-aware haberes rows. Filtered: rows with zero amount that don't apply to the regime are omitted. */
  haberesRows: ReceiptRow[]
  /** Pre-formatted bruto total. */
  grossTotal: string
  /** Attendance rows. Empty array when not applicable (honorarios/deel always; chile_dependent only when workingDaysInPeriod != null). */
  attendanceRows: ReceiptRow[]
  /** Deduction section: `Descuentos legales` (chile_dependent), `Retención honorarios` (honorarios), `null` for internacional/deel/excluded. */
  deductionSection: ReceiptDeductionSection | null
  /** Adjustments banner above the deduction section — bruto reducido factor warning. */
  adjustmentsBanner: ReceiptInfoBlock | null
  /** Optional contextual info block (Boleta SII / Pago Deel / Régimen internacional / Excluded reason). */
  infoBlock: ReceiptInfoBlock | null
  /** Manual override warning (renders below deduction section, above hero). */
  manualOverrideBlock: ReceiptInfoBlock | null
  /** Fixed deductions (descuentos pactados) — preserved from existing breakdown. */
  fixedDeductionsSection: ReceiptDeductionSection | null
  hero: ReceiptHero
}

// ──────────────────────────────────────────────────────────────────────
// Minimal entry shape — server-safe, decoupled from PayrollEntry directly
// so this module can be consumed by ProjectedPayrollView (different shape).
// ──────────────────────────────────────────────────────────────────────

export type ReceiptPresenterEntry = {
  payRegime: 'chile' | 'international'
  contractTypeSnapshot?: ContractType | null
  payrollVia?: 'internal' | 'deel' | null
  currency: 'CLP' | 'USD'

  // Identity (employee box fields)
  memberName: string
  memberEmail: string
  deelContractId?: string | null

  // Haberes
  baseSalary: number
  adjustedBaseSalary?: number | null
  remoteAllowance: number
  adjustedRemoteAllowance?: number | null
  fixedBonusLabel?: string | null
  fixedBonusAmount: number
  adjustedFixedBonusAmount?: number | null
  bonusOtdAmount: number
  bonusRpaAmount: number
  bonusOtherAmount?: number
  bonusOtherDescription?: string | null

  // Allowances Chile (only chile_dependent renders these when > 0)
  chileColacionAmount?: number | null
  chileMovilizacionAmount?: number | null
  chileGratificacionLegalAmount?: number | null

  // Period totals
  grossTotal: number
  netTotal: number

  // KPI display
  kpiOtdPercent?: number | null
  kpiRpaAvg?: number | null
  bonusOtdProrationFactor?: number | null
  bonusRpaProrationFactor?: number | null

  // Attendance (chile_dependent only)
  workingDaysInPeriod?: number | null
  daysPresent?: number | null
  daysAbsent?: number | null
  daysOnLeave?: number | null
  daysOnUnpaidLeave?: number | null

  // Chile dependent deductions
  chileAfpName?: string | null
  chileAfpRate?: number | null
  chileAfpAmount?: number | null
  chileAfpCotizacionAmount?: number | null
  chileAfpComisionAmount?: number | null
  chileHealthSystem?: string | null
  chileHealthAmount?: number | null
  chileHealthObligatoriaAmount?: number | null
  chileHealthVoluntariaAmount?: number | null
  chileUnemploymentRate?: number | null
  chileUnemploymentAmount?: number | null
  chileTaxAmount?: number | null
  chileApvAmount?: number | null
  chileTotalDeductions?: number | null

  // Honorarios SII
  siiRetentionRate?: number | null
  siiRetentionAmount?: number | null

  // Manual override
  manualOverride?: boolean
  manualOverrideNote?: string | null

  // Period date for SII retention rate year (defaults to current year if absent)
  periodDate?: string | null
}

// ──────────────────────────────────────────────────────────────────────
// Currency formatting (mirrors src/views/greenhouse/payroll/helpers.ts)
// ──────────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number | null | undefined, currency: 'CLP' | 'USD'): string => {
  return formatLocaleCurrency(amount, currency, currency === 'USD' ? { currencySymbol: 'US$' } : {}, currency === 'USD' ? 'en-US' : undefined)
}

const formatRate = (rate: number | null | undefined, decimals = 2): string => {
  if (rate == null) return '—'

  return `${(rate * 100).toFixed(decimals)}%`
}

const formatPercent = (value: number | null | undefined): string => {
  return formatLocalePercent(value, { input: 'percentage', minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

const formatFactor = (value: number | null | undefined): string => {
  if (value == null) return '—'

  return `${(value * 100).toFixed(0)}%`
}

const formatRpa = (value: number | null | undefined): string => {
  if (value == null) return '—'

  return value.toFixed(1)
}

// ──────────────────────────────────────────────────────────────────────
// Regime detection
// ──────────────────────────────────────────────────────────────────────

/**
 * Resolve the canonical receipt regime for an entry.
 *
 * Detector cascade (in order):
 *   1. `contractTypeSnapshot` — canonical, persisted by the calculation engine.
 *   2. `payrollVia === 'deel'` — fallback for legacy entries without snapshot but with Deel marker.
 *   3. `payRegime === 'chile' && siiRetentionAmount > 0` — fallback for legacy honorarios.
 *   4. `payRegime === 'international'` → `international_internal`.
 *   5. Default → `chile_dependent` (conservative: shows more deductions; safer than hiding).
 */
export const resolveReceiptRegime = (
  entry: Pick<
    ReceiptPresenterEntry,
    'contractTypeSnapshot' | 'payRegime' | 'payrollVia' | 'siiRetentionAmount'
  >
): ReceiptRegime => {
  const contractType = entry.contractTypeSnapshot ?? null

  if (contractType === 'honorarios') return 'honorarios'
  if (contractType === 'contractor' || contractType === 'eor') return 'international_deel'
  if (contractType === 'international_internal') return 'international_internal'
  if (contractType === 'indefinido' || contractType === 'plazo_fijo') return 'chile_dependent'

  // Legacy fallbacks
  if (entry.payrollVia === 'deel') return 'international_deel'

  if (entry.payRegime === 'chile' && (entry.siiRetentionAmount ?? 0) > 0) {
    return 'honorarios'
  }

  if (entry.payRegime === 'international') return 'international_internal'

  return 'chile_dependent'
}

/**
 * Group entries by canonical regime preserving display order.
 * Exported for TASK-782 reuse (PeriodReportDocument + Excel).
 */
export const groupEntriesByRegime = <T extends Pick<
  ReceiptPresenterEntry,
  'contractTypeSnapshot' | 'payRegime' | 'payrollVia' | 'siiRetentionAmount'
>>(
  entries: readonly T[]
): Record<ReceiptRegime, T[]> => {
  const groups: Record<ReceiptRegime, T[]> = {
    chile_dependent: [],
    honorarios: [],
    international_deel: [],
    international_internal: []
  }

  for (const entry of entries) {
    groups[resolveReceiptRegime(entry)].push(entry)
  }

  return groups
}

// ──────────────────────────────────────────────────────────────────────
// Regime-specific section builders
// ──────────────────────────────────────────────────────────────────────

const buildChileDependentEmployeeFields = (entry: ReceiptPresenterEntry): ReceiptPresentation['employeeFields'] => [
  { label: 'Nombre', value: entry.memberName },
  { label: 'Email', value: entry.memberEmail },
  {
    label: 'Tipo de contrato',
    value: contractLabel(entry),
    meta: `Régimen Chile · Moneda ${entry.currency}`
  },
  {
    label: 'AFP / Salud',
    value: [entry.chileAfpName, entry.chileHealthSystem].filter(Boolean).join(' · ') || '—'
  }
]

const buildHonorariosEmployeeFields = (entry: ReceiptPresenterEntry): ReceiptPresentation['employeeFields'] => {
  const year = extractYear(entry.periodDate)

  return [
    { label: 'Nombre', value: entry.memberName },
    { label: 'Email', value: entry.memberEmail },
    {
      label: 'Tipo de contrato',
      value: contractLabel(entry),
      meta: `Boleta de honorarios Chile · Moneda ${entry.currency}`
    },
    {
      label: `Tasa SII ${year}`,
      value: formatRate(entry.siiRetentionRate ?? getSiiRetentionRate(year))
    }
  ]
}

const buildDeelEmployeeFields = (entry: ReceiptPresenterEntry): ReceiptPresentation['employeeFields'] => {
  // Heuristic for jurisdiction display. Real persistence is deferred; we surface
  // jurisdiction as meta only when implemented downstream (TASK follow-up).
  return [
    { label: 'Nombre', value: entry.memberName },
    { label: 'Email', value: entry.memberEmail },
    {
      label: 'Tipo de contrato',
      value: contractLabel(entry),
      meta: `Régimen internacional · Moneda ${entry.currency}`
    },
    {
      label: 'Empleador legal',
      value: 'Deel Inc.',
      meta: 'Compliance jurisdicción del trabajador'
    }
  ]
}

const buildInternationalInternalEmployeeFields = (
  entry: ReceiptPresenterEntry
): ReceiptPresentation['employeeFields'] => [
  { label: 'Nombre', value: entry.memberName },
  { label: 'Email', value: entry.memberEmail },
  {
    label: 'Tipo de contrato',
    value: contractLabel(entry),
    meta: `Régimen internacional · Moneda ${entry.currency}`
  },
  {
    label: 'Jurisdicción',
    value: '—',
    meta: 'Pago directo según contrato'
  }
]

const contractLabel = (entry: ReceiptPresenterEntry): string => {
  const ct = entry.contractTypeSnapshot

  if (ct && CONTRACT_LABELS[ct]) return CONTRACT_LABELS[ct].label

  return entry.payRegime === 'international' ? 'Internacional' : 'Indefinido'
}

const extractYear = (periodDate: string | null | undefined): number => {
  if (!periodDate) return new Date().getFullYear()

  const year = Number(periodDate.slice(0, 4))

  return Number.isFinite(year) && year > 0 ? year : new Date().getFullYear()
}

// ── Haberes builders ────────────────────────────────────────────────

const buildBaseHaberesRows = (entry: ReceiptPresenterEntry, regime: ReceiptRegime): ReceiptRow[] => {
  const rows: ReceiptRow[] = []
  const c = entry.currency

  rows.push({ key: 'base', label: 'Sueldo base', amount: formatCurrency(entry.baseSalary, c) })

  const hasAttendanceAdjustment =
    entry.adjustedBaseSalary != null && entry.adjustedBaseSalary !== entry.baseSalary

  if (hasAttendanceAdjustment) {
    rows.push({
      key: 'base-adjusted',
      label: 'Sueldo base ajustado (por inasistencia)',
      amount: formatCurrency(entry.adjustedBaseSalary, c)
    })
  }

  // Honorarios never shows teletrabajo/colación/movilización (CONTRACT_COMPENSATION_POLICIES)
  if (regime !== 'honorarios') {
    if (entry.remoteAllowance > 0) {
      rows.push({
        key: 'remote',
        label: 'Asignación teletrabajo',
        amount: formatCurrency(entry.remoteAllowance, c)
      })

      if (
        entry.adjustedRemoteAllowance != null &&
        entry.adjustedRemoteAllowance !== entry.remoteAllowance
      ) {
        rows.push({
          key: 'remote-adjusted',
          label: 'Teletrabajo ajustado (por inasistencia)',
          amount: formatCurrency(entry.adjustedRemoteAllowance, c)
        })
      }
    }
  }

  // Gratificación legal — chile_dependent only when > 0
  if (regime === 'chile_dependent' && (entry.chileGratificacionLegalAmount ?? 0) > 0) {
    rows.push({
      key: 'gratification',
      label: 'Gratificación legal',
      amount: formatCurrency(entry.chileGratificacionLegalAmount, c)
    })
  }

  // Colación / Movilización — chile_dependent only when > 0 (deel/intl never have it)
  if (regime === 'chile_dependent') {
    if ((entry.chileColacionAmount ?? 0) > 0) {
      rows.push({
        key: 'colacion',
        label: 'Colación',
        amount: formatCurrency(entry.chileColacionAmount, c)
      })
    }

    if ((entry.chileMovilizacionAmount ?? 0) > 0) {
      rows.push({
        key: 'movilizacion',
        label: 'Movilización',
        amount: formatCurrency(entry.chileMovilizacionAmount, c)
      })
    }
  }

  // Bono fijo
  if (entry.fixedBonusAmount > 0) {
    rows.push({
      key: 'fixed-bonus',
      label: entry.fixedBonusLabel ? `Bono fijo (${entry.fixedBonusLabel})` : 'Bono fijo',
      amount: formatCurrency(entry.fixedBonusAmount, c)
    })

    if (
      entry.adjustedFixedBonusAmount != null &&
      entry.adjustedFixedBonusAmount !== entry.fixedBonusAmount
    ) {
      rows.push({
        key: 'fixed-bonus-adjusted',
        label: entry.fixedBonusLabel
          ? `Bono fijo ajustado (${entry.fixedBonusLabel})`
          : 'Bono fijo ajustado (por inasistencia)',
        amount: formatCurrency(entry.adjustedFixedBonusAmount, c)
      })
    }
  }

  // KPI bonuses — show only when > 0 OR when KPIs exist (chile_dependent / deel)
  // Honorarios with bonuses: show with formatted KPI even if 0 amount (already > 0 path).
  // Honorarios without bonuses: skip entirely (filas-fantasma fix).
  const showKpiRows = regime !== 'honorarios' || entry.bonusOtdAmount > 0 || entry.bonusRpaAmount > 0

  if (showKpiRows) {
    if (regime === 'honorarios') {
      // Only render rows that have actual amount > 0
      if (entry.bonusOtdAmount > 0) {
        rows.push({
          key: 'bono-otd',
          label: `Bono OTD (${formatPercent(entry.kpiOtdPercent)} → factor ${formatFactor(entry.bonusOtdProrationFactor)})`,
          amount: formatCurrency(entry.bonusOtdAmount, c)
        })
      }

      if (entry.bonusRpaAmount > 0) {
        rows.push({
          key: 'bono-rpa',
          label: `Bono RpA (${formatRpa(entry.kpiRpaAvg)} → factor ${formatFactor(entry.bonusRpaProrationFactor)})`,
          amount: formatCurrency(entry.bonusRpaAmount, c)
        })
      }
    } else {
      rows.push({
        key: 'bono-otd',
        label: `Bono OTD (${formatPercent(entry.kpiOtdPercent)} → factor ${formatFactor(entry.bonusOtdProrationFactor)})`,
        amount: formatCurrency(entry.bonusOtdAmount, c)
      })
      rows.push({
        key: 'bono-rpa',
        label: `Bono RpA (${formatRpa(entry.kpiRpaAvg)} → factor ${formatFactor(entry.bonusRpaProrationFactor)})`,
        amount: formatCurrency(entry.bonusRpaAmount, c)
      })
    }
  }

  if ((entry.bonusOtherAmount ?? 0) > 0) {
    rows.push({
      key: 'bono-other',
      label: entry.bonusOtherDescription
        ? `Bono adicional (${entry.bonusOtherDescription})`
        : 'Bono adicional',
      amount: formatCurrency(entry.bonusOtherAmount, c)
    })
  }

  return rows
}

const buildAttendanceRows = (entry: ReceiptPresenterEntry, regime: ReceiptRegime): ReceiptRow[] => {
  // Only chile_dependent surfaces attendance — honorarios and international skip days.
  if (regime !== 'chile_dependent' || entry.workingDaysInPeriod == null) return []

  return [
    {
      key: 'days-period',
      label: 'Días hábiles en período',
      amount: String(entry.workingDaysInPeriod)
    },
    {
      key: 'days-present',
      label: 'Días presentes',
      amount: entry.daysPresent != null ? String(entry.daysPresent) : '—'
    },
    {
      key: 'days-absent',
      label: 'Días ausentes',
      amount: String(entry.daysAbsent ?? 0)
    },
    {
      key: 'days-leave',
      label: 'Días licencia',
      amount: String(entry.daysOnLeave ?? 0)
    },
    {
      key: 'days-unpaid-leave',
      label: 'Días licencia no remunerada',
      amount: String(entry.daysOnUnpaidLeave ?? 0)
    }
  ]
}

// ── Deduction section builders ──────────────────────────────────────

const buildChileDependentDeductionSection = (
  entry: ReceiptPresenterEntry
): ReceiptDeductionSection => {
  const c = entry.currency
  const rows: ReceiptRow[] = []

  rows.push({
    key: 'afp-total',
    label: `AFP ${entry.chileAfpName ?? ''} (${formatRate(entry.chileAfpRate)})`.replace('  ', ' ').trim(),
    amount: formatCurrency(entry.chileAfpAmount, c)
  })

  const hasAfpSplit =
    (entry.chileAfpCotizacionAmount ?? 0) > 0 || (entry.chileAfpComisionAmount ?? 0) > 0

  if (hasAfpSplit) {
    rows.push({
      key: 'afp-cotizacion',
      label: '↳ Cotización',
      amount: formatCurrency(entry.chileAfpCotizacionAmount, c),
      variant: 'indent'
    })
    rows.push({
      key: 'afp-comision',
      label: '↳ Comisión',
      amount: formatCurrency(entry.chileAfpComisionAmount, c),
      variant: 'indent'
    })
  }

  // Salud split (obligatoria 7% + voluntaria) when both fields are populated
  const obligatoria = entry.chileHealthObligatoriaAmount
  const voluntaria = entry.chileHealthVoluntariaAmount
  const hasHealthSplit = obligatoria != null && voluntaria != null

  if (hasHealthSplit) {
    rows.push({
      key: 'salud-obligatoria',
      label: `Salud obligatoria 7% (${entry.chileHealthSystem ?? '—'})`,
      amount: formatCurrency(obligatoria, c)
    })

    if ((voluntaria ?? 0) > 0) {
      rows.push({
        key: 'salud-voluntaria',
        label: 'Salud voluntaria',
        amount: formatCurrency(voluntaria, c)
      })
    }
  } else {
    rows.push({
      key: 'salud',
      label: `Salud (${entry.chileHealthSystem ?? '—'})`,
      amount: formatCurrency(entry.chileHealthAmount, c)
    })
  }

  rows.push({
    key: 'cesantia',
    label: `Seguro cesantía (${entry.chileUnemploymentRate != null ? `${(entry.chileUnemploymentRate * 100).toFixed(1)}%` : '—'})`,
    amount: formatCurrency(entry.chileUnemploymentAmount, c)
  })

  rows.push({
    key: 'iusc',
    label: 'Impuesto único',
    amount: formatCurrency(entry.chileTaxAmount, c)
  })

  if ((entry.chileApvAmount ?? 0) > 0) {
    rows.push({
      key: 'apv',
      label: 'APV',
      amount: formatCurrency(entry.chileApvAmount, c)
    })
  }

  return {
    title: 'Descuentos legales',
    rows,
    totalLabel: 'Total descuentos',
    totalAmount: formatCurrency(entry.chileTotalDeductions, c)
  }
}

const buildHonorariosDeductionSection = (
  entry: ReceiptPresenterEntry
): ReceiptDeductionSection => {
  const c = entry.currency

  return {
    title: 'Retención honorarios',
    rows: [
      {
        key: 'sii-rate',
        label: 'Tasa SII',
        amount: formatRate(entry.siiRetentionRate)
      },
      {
        key: 'sii-retention',
        label: 'Retención honorarios',
        amount: formatCurrency(entry.siiRetentionAmount, c)
      }
    ],
    totalLabel: 'Total retención',
    totalAmount: formatCurrency(entry.siiRetentionAmount, c)
  }
}

// ── Info block builders ─────────────────────────────────────────────

const buildHonorariosInfoBlock = (entry: ReceiptPresenterEntry): ReceiptInfoBlock => {
  const year = extractYear(entry.periodDate)
  const rate = entry.siiRetentionRate ?? getSiiRetentionRate(year)

  return {
    variant: 'info',
    title: 'Boleta de honorarios Chile',
    body: `Art. 74 N°2 LIR · Tasa SII ${year}: ${formatRate(rate)}. Esta retención se entera al SII por la empresa pagadora.`
  }
}

const buildDeelInfoBlock = (entry: ReceiptPresenterEntry): ReceiptInfoBlock => ({
  variant: 'info',
  title: 'Pago administrado por Deel',
  body:
    'Greenhouse registra el monto bruto y los bonos KPI calculados (OTD/RpA). ' +
    'Deel emite el recibo legal del país del trabajador y aplica las retenciones, ' +
    'cotizaciones e impuestos correspondientes a esa jurisdicción.',
  meta: entry.deelContractId ? `Contrato Deel: ${entry.deelContractId}` : undefined
})

const buildInternationalInternalInfoBlock = (): ReceiptInfoBlock => ({
  variant: 'info',
  title: 'Régimen internacional',
  body:
    'Sin descuentos previsionales Chile. El pago se procesa según los términos del ' +
    'contrato internacional acordado con el trabajador.'
})

// ── Adjustments banner ──────────────────────────────────────────────

const buildAdjustmentsBanner = (
  entry: ReceiptPresenterEntry,
  breakdown: EntryAdjustmentBreakdown | undefined,
  regime: ReceiptRegime
): ReceiptInfoBlock | null => {
  if (!breakdown || breakdown.factorApplied === 1 || breakdown.excluded) return null

  const pct = Math.round(breakdown.factorApplied * 100)
  const isHonorarios = regime === 'honorarios'

  return {
    variant: 'warning',
    title: 'Bruto efectivo aplicado',
    body: isHonorarios
      ? `Se aplicó factor ${pct}% al bruto natural. La retención SII se recalcula sobre el bruto efectivo, no sobre el bruto natural.`
      : `Se aplicó factor ${pct}% al bruto natural. Las cotizaciones y el impuesto único se recalculan sobre el bruto efectivo.`
  }
}

// ── Manual override block ───────────────────────────────────────────

const buildManualOverrideBlock = (
  breakdown: EntryAdjustmentBreakdown | undefined
): ReceiptInfoBlock | null => {
  if (!breakdown?.manualOverride) return null

  return {
    variant: 'warning',
    title: `Override manual de neto — ${breakdown.manualOverride.reasonLabel}`,
    body: breakdown.manualOverride.reasonNote,
    meta: `Aplicado por ${breakdown.manualOverride.requestedBy}`
  }
}

// ── Excluded info block ─────────────────────────────────────────────

const buildExcludedInfoBlock = (breakdown: EntryAdjustmentBreakdown): ReceiptInfoBlock => {
  if (!breakdown.excluded) {
    // Defensive — caller must pass valid breakdown.
    return {
      variant: 'error',
      title: 'Excluido de esta nómina',
      body: 'No se calcularon haberes ni descuentos para este período.'
    }
  }

  return {
    variant: 'error',
    title: `Excluido de esta nómina — ${breakdown.excluded.reasonLabel}`,
    body: breakdown.excluded.reasonNote,
    meta: `Solicitado por ${breakdown.excluded.requestedBy}`
  }
}

// ── Fixed deductions section ────────────────────────────────────────

const buildFixedDeductionsSection = (
  entry: ReceiptPresenterEntry,
  breakdown: EntryAdjustmentBreakdown | undefined
): ReceiptDeductionSection | null => {
  if (!breakdown || breakdown.fixedDeductions.length === 0) return null

  const rows: ReceiptRow[] = breakdown.fixedDeductions.map((fd, index) => ({
    key: `fixed-deduction-${fd.adjustmentId ?? index}`,
    label: fd.reasonNote ? `${fd.reasonLabel} — ${fd.reasonNote}` : fd.reasonLabel,
    amount: `− ${formatCurrency(fd.amount, fd.currency as 'CLP' | 'USD')}`
  }))

  return {
    title: 'Descuentos pactados',
    rows,
    totalLabel: 'Total descuentos pactados',
    totalAmount: `− ${formatCurrency(breakdown.totalFixedDeductionAmount, entry.currency)}`
  }
}

// ── Hero builder ────────────────────────────────────────────────────

const buildHero = (
  entry: ReceiptPresenterEntry,
  regime: ReceiptRegime,
  breakdown: EntryAdjustmentBreakdown | undefined
): ReceiptHero => {
  // Excluded — degraded "Sin pago este período" $0 hero
  if (breakdown?.excluded) {
    return {
      variant: 'degraded',
      label: 'Sin pago este período',
      amount: formatCurrency(0, entry.currency)
    }
  }

  // Deel — "Monto bruto registrado" + footnote
  if (regime === 'international_deel') {
    return {
      variant: 'primary',
      label: 'Monto bruto registrado',
      amount: formatCurrency(entry.netTotal, entry.currency),
      footnote:
        'El líquido final lo determina Deel según las retenciones aplicables en el país del trabajador.'
    }
  }

  // Default — "Líquido a pagar"
  const hero: ReceiptHero = {
    variant: 'primary',
    label: 'Líquido a pagar',
    amount: formatCurrency(entry.netTotal, entry.currency)
  }

  if (entry.manualOverride) {
    hero.footnote = entry.manualOverrideNote
      ? `* Monto neto ajustado manualmente: ${entry.manualOverrideNote}`
      : '* Monto neto ajustado manualmente.'
  }

  return hero
}

// ──────────────────────────────────────────────────────────────────────
// Public composer
// ──────────────────────────────────────────────────────────────────────

/**
 * Build the canonical declarative presentation for a payroll receipt.
 *
 * Surfaces (preview MUI, PDF) consume this struct and apply their own
 * presentation tokens. The presenter is pure: same input → same output.
 */
export const buildReceiptPresentation = (
  entry: ReceiptPresenterEntry,
  breakdown?: EntryAdjustmentBreakdown
): ReceiptPresentation => {
  const regime = resolveReceiptRegime(entry)
  const isExcluded = Boolean(breakdown?.excluded)
  const badge = RECEIPT_REGIME_BADGES[regime]

  let employeeFields: ReceiptPresentation['employeeFields']

  switch (regime) {
    case 'chile_dependent':
      employeeFields = buildChileDependentEmployeeFields(entry)
      break
    case 'honorarios':
      employeeFields = buildHonorariosEmployeeFields(entry)
      break
    case 'international_deel':
      employeeFields = buildDeelEmployeeFields(entry)
      break
    case 'international_internal':
      employeeFields = buildInternationalInternalEmployeeFields(entry)
      break

    default: {
      // Compile-time exhaustiveness: a new ContractType that maps to a new
      // ReceiptRegime without a branch here breaks the build.
      const _exhaustive: never = regime

      void _exhaustive
      throw new Error(`Unhandled receipt regime in buildReceiptPresentation`)
    }
  }

  // Excluded short-circuit: minimal employee box + excluded info block + degraded hero.
  if (isExcluded && breakdown) {
    return {
      regime,
      isExcluded: true,
      contractTypeLabel: contractLabel(entry),
      badge,
      employeeFields,
      haberesRows: [],
      grossTotal: formatCurrency(0, entry.currency),
      attendanceRows: [],
      deductionSection: null,
      adjustmentsBanner: null,
      infoBlock: buildExcludedInfoBlock(breakdown),
      manualOverrideBlock: null,
      fixedDeductionsSection: null,
      hero: buildHero(entry, regime, breakdown)
    }
  }

  let deductionSection: ReceiptDeductionSection | null = null
  let infoBlock: ReceiptInfoBlock | null = null

  switch (regime) {
    case 'chile_dependent':
      deductionSection = buildChileDependentDeductionSection(entry)
      infoBlock = null
      break
    case 'honorarios':
      deductionSection = buildHonorariosDeductionSection(entry)
      infoBlock = buildHonorariosInfoBlock(entry)
      break
    case 'international_deel':
      deductionSection = null
      infoBlock = buildDeelInfoBlock(entry)
      break
    case 'international_internal':
      deductionSection = null
      infoBlock = buildInternationalInternalInfoBlock()
      break
  }

  return {
    regime,
    isExcluded: false,
    contractTypeLabel: contractLabel(entry),
    badge,
    employeeFields,
    haberesRows: buildBaseHaberesRows(entry, regime),
    grossTotal: formatCurrency(entry.grossTotal, entry.currency),
    attendanceRows: buildAttendanceRows(entry, regime),
    deductionSection,
    adjustmentsBanner: buildAdjustmentsBanner(entry, breakdown, regime),
    infoBlock,
    manualOverrideBlock: buildManualOverrideBlock(breakdown),
    fixedDeductionsSection: buildFixedDeductionsSection(entry, breakdown),
    hero: buildHero(entry, regime, breakdown)
  }
}
