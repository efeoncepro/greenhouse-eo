import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const SELLABLE_ROLE_CATEGORIES = ['creativo', 'pr', 'performance', 'consultoria', 'tech'] as const
export type SellableRoleCategory = (typeof SELLABLE_ROLE_CATEGORIES)[number]

export const SELLABLE_ROLE_PRICING_CURRENCIES = ['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN'] as const
export type SellableRolePricingCurrency = (typeof SELLABLE_ROLE_PRICING_CURRENCIES)[number]

export const EMPLOYMENT_TYPE_SEED = [
  {
    employmentTypeCode: 'indefinido_clp',
    labelEs: 'Contrato indefinido (CLP)',
    labelEn: 'Indefinite contract (CLP)',
    paymentCurrency: 'CLP',
    countryCode: 'CL',
    appliesPrevisional: true,
    previsionalPctDefault: 0.2,
    feeMonthlyUsdDefault: 0,
    feePctDefault: null,
    appliesBonuses: true,
    sourceOfTruth: 'greenhouse_payroll_chile_rates',
    notes: 'Seed canónico TASK-464a.'
  },
  {
    employmentTypeCode: 'plazo_fijo_clp',
    labelEs: 'Contrato a plazo fijo (CLP)',
    labelEn: 'Fixed-term contract (CLP)',
    paymentCurrency: 'CLP',
    countryCode: 'CL',
    appliesPrevisional: true,
    previsionalPctDefault: 0.2,
    feeMonthlyUsdDefault: 0,
    feePctDefault: null,
    appliesBonuses: true,
    sourceOfTruth: 'greenhouse_payroll_chile_rates',
    notes: 'Seed canónico TASK-464a.'
  },
  {
    employmentTypeCode: 'honorarios_clp',
    labelEs: 'Boleta honorarios (CLP)',
    labelEn: 'Honorarios invoice (CLP)',
    paymentCurrency: 'CLP',
    countryCode: 'CL',
    appliesPrevisional: false,
    previsionalPctDefault: null,
    feeMonthlyUsdDefault: 0,
    feePctDefault: null,
    appliesBonuses: false,
    sourceOfTruth: 'catalog_manual',
    notes: 'Disponible para uso manual posterior; no se infiere automáticamente en TASK-464a.'
  },
  {
    employmentTypeCode: 'contractor_deel_usd',
    labelEs: 'Contractor via Deel (USD)',
    labelEn: 'Contractor via Deel (USD)',
    paymentCurrency: 'USD',
    countryCode: 'INTL',
    appliesPrevisional: false,
    previsionalPctDefault: null,
    feeMonthlyUsdDefault: 49,
    feePctDefault: null,
    appliesBonuses: true,
    sourceOfTruth: 'catalog_manual',
    notes: 'Seed canónico TASK-464a.'
  },
  {
    employmentTypeCode: 'contractor_eor_usd',
    labelEs: 'Contractor via EOR (USD)',
    labelEn: 'Contractor via EOR (USD)',
    paymentCurrency: 'USD',
    countryCode: 'INTL',
    appliesPrevisional: false,
    previsionalPctDefault: null,
    feeMonthlyUsdDefault: 0,
    feePctDefault: 0.12,
    appliesBonuses: true,
    sourceOfTruth: 'catalog_manual',
    notes: 'Disponible para uso manual posterior; no se infiere automáticamente en TASK-464a.'
  },
  {
    employmentTypeCode: 'contractor_direct_usd',
    labelEs: 'Contractor wire directo (USD)',
    labelEn: 'Direct contractor wire (USD)',
    paymentCurrency: 'USD',
    countryCode: 'INTL',
    appliesPrevisional: false,
    previsionalPctDefault: null,
    feeMonthlyUsdDefault: 0,
    feePctDefault: null,
    appliesBonuses: true,
    sourceOfTruth: 'catalog_manual',
    notes: 'Disponible para uso manual posterior; no se infiere automáticamente en TASK-464a.'
  },
  {
    employmentTypeCode: 'part_time_clp',
    labelEs: 'Part-time CLP',
    labelEn: 'Part-time CLP',
    paymentCurrency: 'CLP',
    countryCode: 'CL',
    appliesPrevisional: true,
    previsionalPctDefault: 0.2,
    feeMonthlyUsdDefault: 0,
    feePctDefault: null,
    appliesBonuses: true,
    sourceOfTruth: 'greenhouse_payroll_chile_rates',
    notes: 'Disponible para uso manual posterior; no se infiere automáticamente en TASK-464a.'
  }
] as const

export type EmploymentTypeSeedRow = (typeof EMPLOYMENT_TYPE_SEED)[number]

export interface SellableRoleSeedPricingRow {
  currencyCode: SellableRolePricingCurrency
  marginPct: number
  hourlyPrice: number
  fteMonthlyPrice: number
}

export interface SellableRoleSeedRow {
  rowNumber: number
  roleSku: string
  roleCode: string
  roleLabelEs: string
  category: SellableRoleCategory
  tier: '1' | '2' | '3' | '4'
  tierLabel: string
  canSellAsStaff: boolean
  canSellAsServiceComponent: boolean
  baseSalaryUsd: number
  bonusJitUsd: number
  bonusRpaUsd: number
  bonusArUsd: number
  bonusSobrecumplimientoUsd: number
  gastosPrevisionalesUsd: number
  feeDeelUsd: number

  // Overrides per-role (TASK-467 phase-2): si se especifican desde el admin UI,
  // sobre-escriben los defaults (feeEor=0, hoursPerFteMonth=180). El pricing
  // engine v2 ya los usa: `feeEorUsd` va al cost stack, `hoursPerFteMonth`
  // sirve como fallback del fte_hours_guide y como divisor de hourly cost.
  feeEorUsd?: number | null
  hoursPerFteMonth?: number | null

  totalMonthlyCostUsd: number
  hourlyCostUsd: number
  fteMonthlyCostUsd: number
  inferredEmploymentTypeCode: string | null
  reviewReasons: string[]
  driftWarnings: string[]
  pricingRows: SellableRoleSeedPricingRow[]
}

export interface SellableRolesSeedSummary {
  totalRows: number
  activeRows: number
  skippedEmpty: number
  skippedPlaceholder: number
  rejected: number
  needsReview: number
  driftDetected: number
}

export interface SellableRolesSeedParseResult {
  rows: SellableRoleSeedRow[]
  summary: SellableRolesSeedSummary
  rejectedRows: Array<{ rowNumber: number; sku: string | null; reason: string }>
}

const SELLABLE_ROLES_CSV_PATH = path.join(process.cwd(), 'data/pricing/seed/sellable-roles-pricing.csv')
const COST_TOLERANCE = 0.01

const splitLines = (csv: string): string[] =>
  csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim().length > 0)

const splitCsvLine = (line: string): string[] => {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)

  return fields.map(field => field.trim())
}

const parseCsvDocument = (csv: string): Array<Record<string, string>> => {
  const lines = splitLines(csv)
  const header = splitCsvLine(lines[0] ?? '')

  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}

    header.forEach((key, index) => {
      row[key] = values[index] ?? ''
    })

    return row
  })
}

const toNumber = (value: string): number => {
  const trimmed = value.trim()

  if (!trimmed) return 0

  const normalized = trimmed.replace(/\s/g, '')
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

const normalizeCategory = (value: string): SellableRoleCategory | null => {
  const normalized = slugify(value)

  if (normalized === 'consultoria') return 'consultoria'
  if (normalized === 'creativo') return 'creativo'
  if (normalized === 'pr') return 'pr'
  if (normalized === 'performance') return 'performance'
  if (normalized === 'tech') return 'tech'

  return null
}

const parseTier = (value: string): { tier: '1' | '2' | '3' | '4'; tierLabel: string } | null => {
  const match = value.trim().match(/^Tier\s*([1-4])\s*:\s*(.+)$/i)

  if (!match) return null

  const [, tier, label] = match

  return {
    tier: tier as '1' | '2' | '3' | '4',
    tierLabel: label.trim()
  }
}

const nearlyEqual = (left: number, right: number, tolerance = COST_TOLERANCE) =>
  Math.abs(left - right) <= tolerance

const inferEmploymentType = (gastosPrevisionalesUsd: number, feeDeelUsd: number) => {
  if (feeDeelUsd > 0 && gastosPrevisionalesUsd === 0) {
    return { employmentTypeCode: 'contractor_deel_usd', reviewReasons: [] as string[] }
  }

  if (gastosPrevisionalesUsd > 0 && feeDeelUsd === 0) {
    return { employmentTypeCode: 'indefinido_clp', reviewReasons: [] as string[] }
  }

  const reviewReasons: string[] = []

  if (feeDeelUsd > 0 && gastosPrevisionalesUsd > 0) {
    reviewReasons.push('fee_deel_and_previsional_present')
  } else {
    reviewReasons.push('employment_type_requires_manual_review')
  }

  return {
    employmentTypeCode: null,
    reviewReasons
  }
}

const buildPricingRows = (row: Record<string, string>): SellableRoleSeedPricingRow[] => {
  const marginPct = toNumber(row['Margen en %'])

  return SELLABLE_ROLE_PRICING_CURRENCIES.map(currencyCode => {
    const hourlyPriceColumn = currencyCode === 'USD'
      ? 'Precio Hora Agencia (USD)'
      : `Precio Hora (${currencyCode})`

    const fteMonthlyPriceColumn = currencyCode === 'USD'
      ? 'Precio FTE (USD)'
      : `Precio FTE (${currencyCode})`

    return {
      currencyCode,
      marginPct,
      hourlyPrice: toNumber(row[hourlyPriceColumn]),
      fteMonthlyPrice: toNumber(row[fteMonthlyPriceColumn])
    }
  })
}

const isPlaceholderRow = (row: Record<string, string>) => !row['Rol']?.trim()

export const normalizeSellableRolesCsv = (csv: string): SellableRolesSeedParseResult => {
  const parsedRows = parseCsvDocument(csv)
  const rows: SellableRoleSeedRow[] = []
  const rejectedRows: Array<{ rowNumber: number; sku: string | null; reason: string }> = []

  const summary: SellableRolesSeedSummary = {
    totalRows: parsedRows.length,
    activeRows: 0,
    skippedEmpty: 0,
    skippedPlaceholder: 0,
    rejected: 0,
    needsReview: 0,
    driftDetected: 0
  }

  parsedRows.forEach((row, index) => {
    const rowNumber = index + 2
    const roleSku = row['SKU']?.trim() || null

    if (!roleSku && !row['Rol']?.trim()) {
      summary.skippedEmpty += 1
      
return
    }

    if (!roleSku) {
      summary.rejected += 1
      rejectedRows.push({ rowNumber, sku: null, reason: 'missing_sku' })
      
return
    }

    if (isPlaceholderRow(row)) {
      summary.skippedPlaceholder += 1
      
return
    }

    const category = normalizeCategory(row['Categoría'] ?? '')
    const tier = parseTier(row['Tier'] ?? '')
    const roleLabelEs = row['Rol']?.trim() || ''
    const staffOrService = row['Tipo (Staff/Servicio)']?.trim() || ''

    if (!roleLabelEs) {
      summary.rejected += 1
      rejectedRows.push({ rowNumber, sku: roleSku, reason: 'missing_role_label' })
      
return
    }

    if (!category) {
      summary.rejected += 1
      rejectedRows.push({ rowNumber, sku: roleSku, reason: 'invalid_category' })
      
return
    }

    if (!tier) {
      summary.rejected += 1
      rejectedRows.push({ rowNumber, sku: roleSku, reason: 'invalid_tier' })
      
return
    }

    if (!staffOrService) {
      summary.rejected += 1
      rejectedRows.push({ rowNumber, sku: roleSku, reason: 'missing_staff_service_type' })
      
return
    }

    const baseSalaryUsd = toNumber(row['Salario Base (USD)'])
    const bonusJitUsd = toNumber(row['Bonificación JiT'])
    const bonusRpaUsd = toNumber(row['Bonificación RpA'])
    const bonusArUsd = toNumber(row['Bonificación  AR'])
    const bonusSobrecumplimientoUsd = toNumber(row['Bonificación Sobrecumplimiento'])
    const gastosPrevisionalesUsd = toNumber(row['Gastos Previsionales'])
    const feeDeelUsd = toNumber(row['Fee Deel'])
    const totalMonthlyCostUsd = toNumber(row['Costo total'])
    const hourlyCostUsd = toNumber(row['Costo Interno (USD/h)'])
    const fteMonthlyCostUsd = toNumber(row['Costo Interno (FTE)'])

    const recomputedTotalCostUsd =
      baseSalaryUsd +
      bonusJitUsd +
      bonusRpaUsd +
      bonusArUsd +
      bonusSobrecumplimientoUsd +
      gastosPrevisionalesUsd +
      feeDeelUsd

    const recomputedHourlyCostUsd = recomputedTotalCostUsd / 180

    const driftWarnings: string[] = []

    if (!nearlyEqual(recomputedTotalCostUsd, totalMonthlyCostUsd)) {
      driftWarnings.push('total_monthly_cost_drift')
    }

    if (!nearlyEqual(recomputedHourlyCostUsd, hourlyCostUsd)) {
      driftWarnings.push('hourly_cost_drift')
    }

    if (!nearlyEqual(recomputedTotalCostUsd, fteMonthlyCostUsd)) {
      driftWarnings.push('fte_monthly_cost_drift')
    }

    const inferredEmploymentType = inferEmploymentType(gastosPrevisionalesUsd, feeDeelUsd)
    const pricingRows = buildPricingRows(row)

    rows.push({
      rowNumber,
      roleSku,
      roleCode: slugify(roleLabelEs),
      roleLabelEs,
      category,
      tier: tier.tier,
      tierLabel: tier.tierLabel,
      canSellAsStaff: staffOrService.toLowerCase().includes('staff'),
      canSellAsServiceComponent: true,
      baseSalaryUsd,
      bonusJitUsd,
      bonusRpaUsd,
      bonusArUsd,
      bonusSobrecumplimientoUsd,
      gastosPrevisionalesUsd,
      feeDeelUsd,
      totalMonthlyCostUsd,
      hourlyCostUsd,
      fteMonthlyCostUsd,
      inferredEmploymentTypeCode: inferredEmploymentType.employmentTypeCode,
      reviewReasons: inferredEmploymentType.reviewReasons,
      driftWarnings,
      pricingRows
    })

    summary.activeRows += 1

    if (inferredEmploymentType.reviewReasons.length > 0) {
      summary.needsReview += 1
    }

    if (driftWarnings.length > 0) {
      summary.driftDetected += 1
    }
  })

  return {
    rows,
    summary,
    rejectedRows
  }
}

export const loadSellableRolesSeedFile = async (csvPath = SELLABLE_ROLES_CSV_PATH) =>
  readFile(csvPath, 'utf8')
