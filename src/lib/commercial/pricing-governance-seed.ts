import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type {
  CommercialModelCode,
  CountryPricingFactorCode,
  PricingTierCode
} from './pricing-governance-types'
import {
  COMMERCIAL_MODEL_LABELS,
  COUNTRY_PRICING_FACTOR_LABELS,
  PRICING_TIER_CODES,
  PRICING_TIER_LABELS,
  SERVICE_TIER_LABELS
} from './pricing-governance-types'

export interface PricingGovernanceSeedFiles {
  roleTierMarginsCsv: string
  serviceTierMarginsCsv: string
  commercialModelMultipliersCsv: string
  countryPricingFactorsCsv: string
  fteHoursGuideCsv: string
}

export interface PricingGovernanceCatalogRole {
  roleLabelEs: string
  tier: PricingTierCode
}

export interface RoleTierMarginSeedRow {
  tier: PricingTierCode
  tierLabel: string
  marginMin: number
  marginOpt: number
  marginMax: number
  notes: string | null
}

export interface ServiceTierMarginSeedRow {
  tier: PricingTierCode
  tierLabel: string
  marginBase: number
  description: string | null
}

export interface CommercialModelMultiplierSeedRow {
  modelCode: CommercialModelCode
  modelLabel: string
  multiplierPct: number
  description: string | null
}

export interface CountryPricingFactorSeedRow {
  factorCode: CountryPricingFactorCode
  factorLabel: string
  factorMin: number
  factorOpt: number
  factorMax: number
  appliesWhen: string | null
}

export interface FteHoursGuideSeedRow {
  fteFraction: number
  fteLabel: string
  monthlyHours: number
  recommendedDescription: string | null
}

export interface PricingGovernanceRejectedRow {
  source: 'role_tier' | 'service_tier' | 'commercial_model' | 'country_factor' | 'fte_guide'
  rowNumber: number
  reason: string
  rawLabel: string | null
}

export interface PricingGovernanceNeedsReviewRow {
  source: 'role_tier' | 'country_factor'
  rowNumber: number
  reason: string
  rawLabel: string | null
}

export interface PricingGovernanceDriftRow {
  sourceRoleLabel: string | null
  canonicalRoleLabel: string | null
  sourceTier: PricingTierCode | null
  catalogTier: PricingTierCode | null
  status: 'tier_mismatch' | 'csv_only' | 'catalog_only'
  reason: string
}

export interface PricingGovernanceSeedSummary {
  roleTierRows: number
  serviceTierRows: number
  commercialModelRows: number
  countryFactorRows: number
  fteGuideRows: number
  skippedControlRows: number
  rejected: number
  needsReview: number
  driftDetected: number
}

export interface PricingGovernanceSeedParseResult {
  roleTierMargins: RoleTierMarginSeedRow[]
  serviceTierMargins: ServiceTierMarginSeedRow[]
  commercialModelMultipliers: CommercialModelMultiplierSeedRow[]
  countryPricingFactors: CountryPricingFactorSeedRow[]
  fteHoursGuide: FteHoursGuideSeedRow[]
  summary: PricingGovernanceSeedSummary
  rejectedRows: PricingGovernanceRejectedRow[]
  needsReviewRows: PricingGovernanceNeedsReviewRow[]
  driftRows: PricingGovernanceDriftRow[]
}

const PRICING_GOVERNANCE_SEED_DIR = path.join(process.cwd(), 'data/pricing/seed')

const ROLE_LABEL_ALIAS_GROUPS: Record<string, string[]> = {
  analista_ga4_gtm_looker: ['analista_de_implementacion_ga4_gtm_looker'],
  creative_designer_jr_mid: ['creative_designer'],
  desarrollador_full_stack_jr_mid: ['desarrollador_full_stack_junior', 'desarrollador_full_stack_mid'],
  paid_media_specialist: ['paid_media_manager'],
  periodista_pr_digital: ['periodista_pr_digital_on_off'],
  project_manager: ['project_manager_account_manager'],
  video_editor_motion_graphics: ['video_editor_motion_graphics_designer']
}

const splitLines = (csv: string): string[] =>
  csv
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.trim().length > 0)

const splitCsvLine = (line: string): string[] => {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
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

const parseCsvDocument = (
  csv: string,
  headerMatcher: (header: string[]) => boolean
): { rows: Array<Record<string, string>>; skippedRowsBeforeHeader: number } => {
  const lines = splitLines(csv)
  const headerIndex = lines.findIndex(line => headerMatcher(splitCsvLine(line)))

  if (headerIndex < 0) {
    throw new Error('Could not locate CSV header row.')
  }

  const header = splitCsvLine(lines[headerIndex] ?? '')

  const rows = lines.slice(headerIndex + 1).map(line => {
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}

    header.forEach((key, index) => {
      row[key] = values[index] ?? ''
    })

    return row
  })

  return {
    rows,
    skippedRowsBeforeHeader: headerIndex
  }
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

const normalizeNumeric = (value: string): number | null => {
  const trimmed = value.trim()

  if (!trimmed) return null

  const normalized = trimmed
    .replace(/\s+/g, '')
    .replace(/h\/mes/gi, '')
    .replace(/,/g, match => (trimmed.includes('.') ? match : '.'))

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

const parseTierCode = (value: string): PricingTierCode | null => {
  const match = value.trim().match(/([1-4])/)

  if (!match) return null

  const tier = match[1] as PricingTierCode

  return PRICING_TIER_CODES.includes(tier) ? tier : null
}

const resolveCommercialModelCode = (value: string): CommercialModelCode | null => {
  const normalized = slugify(value)

  switch (normalized) {
    case 'on_going':
    case 'ongoing':
      return 'on_going'
    case 'on_demand':
      return 'on_demand'
    case 'hibrido':
    case 'hybrid':
      return 'hybrid'
    case 'licencia_consultoria':
    case 'license_consulting':
      return 'license_consulting'
    default:
      return null
  }
}

const resolveCountryFactorCode = (value: string): CountryPricingFactorCode | null => {
  const normalized = slugify(value)

  switch (normalized) {
    case 'chile_corporate':
      return 'chile_corporate'
    case 'chile_pyme':
      return 'chile_pyme'
    case 'colombia_pyme_latam':
    case 'colombia_latam':
      return 'colombia_latam'
    case 'internacional_usd':
    case 'international_usd':
      return 'international_usd'
    case 'licitacion_publica':
      return 'licitacion_publica'
    case 'cliente_estrategico':
      return 'cliente_estrategico'
    default:
      return null
  }
}

const resolveRoleAliases = (roleLabel: string) => {
  const normalized = slugify(roleLabel)

  return ROLE_LABEL_ALIAS_GROUPS[normalized] ?? [normalized]
}

const parseRangeValue = (value: string): { min: number; opt: number; max: number } | null => {
  const trimmed = value.trim()

  if (!trimmed) return null

  const normalized = trimmed.replace(/[–—]/g, '-').replace(/\s+/g, '')

  if (!normalized.includes('-')) {
    const parsed = normalizeNumeric(normalized)

    return parsed == null ? null : { min: parsed, opt: parsed, max: parsed }
  }

  const [leftRaw, rightRaw] = normalized.split('-', 2)
  const left = normalizeNumeric(leftRaw)
  const right = normalizeNumeric(rightRaw)

  if (left == null || right == null || left > right) {
    return null
  }

  return {
    min: left,
    opt: Number(((left + right) / 2).toFixed(4)),
    max: right
  }
}

const parseRoleTierMargins = (
  csv: string,
  catalogRoles: PricingGovernanceCatalogRole[],
  rejectedRows: PricingGovernanceRejectedRow[],
  needsReviewRows: PricingGovernanceNeedsReviewRow[]
): { rows: RoleTierMarginSeedRow[]; driftRows: PricingGovernanceDriftRow[]; skippedControlRows: number } => {
  const { rows, skippedRowsBeforeHeader } = parseCsvDocument(csv, header => header[0] === 'Rol' && header[1] === 'Tier')
  const aggregated = new Map<PricingTierCode, RoleTierMarginSeedRow>()
  const driftRows: PricingGovernanceDriftRow[] = []
  const catalogTierByLabel = new Map<string, PricingTierCode>()
  const matchedCatalogRoles = new Set<string>()
  let skippedControlRows = skippedRowsBeforeHeader

  for (const role of catalogRoles) {
    catalogTierByLabel.set(slugify(role.roleLabelEs), role.tier)
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2 + skippedRowsBeforeHeader
    const roleLabel = row.Rol?.trim() ?? ''

    if (!roleLabel) {
      rejectedRows.push({
        source: 'role_tier',
        rowNumber,
        reason: 'missing_role_label',
        rawLabel: null
      })

      return
    }

    if (/^tier\s+[1-4]\s*:/i.test(roleLabel)) {
      skippedControlRows += 1

      return
    }

    const tier = parseTierCode(row.Tier ?? '')
    const marginMin = normalizeNumeric(row['Margen MIN'] ?? '')
    const marginOpt = normalizeNumeric(row['Margen OPT'] ?? '')
    const marginMax = normalizeNumeric(row['Margen MAX'] ?? '')

    if (!tier || marginMin == null || marginOpt == null || marginMax == null) {
      rejectedRows.push({
        source: 'role_tier',
        rowNumber,
        reason: 'invalid_tier_or_margin',
        rawLabel: roleLabel
      })

      return
    }

    const existingTier = aggregated.get(tier)

    if (!existingTier) {
      aggregated.set(tier, {
        tier,
        tierLabel: PRICING_TIER_LABELS[tier],
        marginMin,
        marginOpt,
        marginMax,
        notes: 'Seed canónico TASK-464b desde role-tier-margins.csv.'
      })
    } else if (
      existingTier.marginMin !== marginMin ||
      existingTier.marginOpt !== marginOpt ||
      existingTier.marginMax !== marginMax
    ) {
      needsReviewRows.push({
        source: 'role_tier',
        rowNumber,
        reason: `tier_${tier}_inconsistent_margin_source`,
        rawLabel: roleLabel
      })
    }

    const aliases = resolveRoleAliases(roleLabel)

    const matchedTiers = aliases
      .map(alias => ({ alias, tier: catalogTierByLabel.get(alias) ?? null }))
      .filter(entry => entry.tier !== null)

    if (matchedTiers.length === 0) {
      driftRows.push({
        sourceRoleLabel: roleLabel,
        canonicalRoleLabel: null,
        sourceTier: tier,
        catalogTier: null,
        status: 'csv_only',
        reason: 'role_present_in_governance_csv_but_missing_in_sellable_roles'
      })

      return
    }

    matchedTiers.forEach(entry => {
      matchedCatalogRoles.add(entry.alias)

      if (entry.tier !== tier) {
        driftRows.push({
          sourceRoleLabel: roleLabel,
          canonicalRoleLabel: catalogRoles.find(role => slugify(role.roleLabelEs) === entry.alias)?.roleLabelEs ?? null,
          sourceTier: tier,
          catalogTier: entry.tier,
          status: 'tier_mismatch',
          reason: 'catalog_tier_differs_from_governance_csv'
        })
      }
    })
  })

  for (const role of catalogRoles) {
    const normalized = slugify(role.roleLabelEs)

    if (!matchedCatalogRoles.has(normalized)) {
      driftRows.push({
        sourceRoleLabel: null,
        canonicalRoleLabel: role.roleLabelEs,
        sourceTier: null,
        catalogTier: role.tier,
        status: 'catalog_only',
        reason: 'role_present_in_sellable_roles_but_missing_in_governance_csv'
      })
    }
  }

  return {
    rows: PRICING_TIER_CODES.map(tier => aggregated.get(tier)).filter(Boolean) as RoleTierMarginSeedRow[],
    driftRows,
    skippedControlRows
  }
}

const parseServiceTierMargins = (
  csv: string,
  rejectedRows: PricingGovernanceRejectedRow[]
): ServiceTierMarginSeedRow[] => {
  const { rows } = parseCsvDocument(
    csv,
    header => header[0] === 'Tier' && header[1] === 'Margen Base (%)'
  )

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2
    const tier = parseTierCode(row.Tier ?? '')
    const marginBase = normalizeNumeric(row['Margen Base (%)'] ?? '')

    if (!tier || marginBase == null) {
      rejectedRows.push({
        source: 'service_tier',
        rowNumber,
        reason: 'invalid_tier_or_margin_base',
        rawLabel: row.Tier ?? null
      })

      return []
    }

    return [
      {
        tier,
        tierLabel: SERVICE_TIER_LABELS[tier],
        marginBase,
        description: row.Descripción?.trim() || null
      }
    ]
  })
}

const parseCommercialModelMultipliers = (
  csv: string,
  rejectedRows: PricingGovernanceRejectedRow[]
): CommercialModelMultiplierSeedRow[] => {
  const { rows } = parseCsvDocument(
    csv,
    header => header[0] === 'Modelo Comercial' && header[1] === 'Multiplicador (%)'
  )

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2
    const modelCode = resolveCommercialModelCode(row['Modelo Comercial'] ?? '')
    const multiplierPct = normalizeNumeric(row['Multiplicador (%)'] ?? '')

    if (!modelCode || multiplierPct == null) {
      rejectedRows.push({
        source: 'commercial_model',
        rowNumber,
        reason: 'invalid_model_or_multiplier',
        rawLabel: row['Modelo Comercial'] ?? null
      })

      return []
    }

    return [
      {
        modelCode,
        modelLabel: COMMERCIAL_MODEL_LABELS[modelCode],
        multiplierPct,
        description: row.Descripción?.trim() || null
      }
    ]
  })
}

const parseCountryPricingFactors = (
  csv: string,
  rejectedRows: PricingGovernanceRejectedRow[],
  needsReviewRows: PricingGovernanceNeedsReviewRow[]
): { rows: CountryPricingFactorSeedRow[]; skippedControlRows: number } => {
  const { rows, skippedRowsBeforeHeader } = parseCsvDocument(
    csv,
    header => header[0] === 'Tipo de Cliente' && header[1] === 'Factor'
  )

  const parsedRows = rows.flatMap((row, index) => {
    const rowNumber = index + 2 + skippedRowsBeforeHeader
    const factorCode = resolveCountryFactorCode(row['Tipo de Cliente'] ?? '')
    const range = parseRangeValue(row.Factor ?? '')

    if (!factorCode) {
      rejectedRows.push({
        source: 'country_factor',
        rowNumber,
        reason: 'unknown_country_factor_label',
        rawLabel: row['Tipo de Cliente'] ?? null
      })

      return []
    }

    if (!range) {
      needsReviewRows.push({
        source: 'country_factor',
        rowNumber,
        reason: 'unparseable_country_factor_range',
        rawLabel: row['Tipo de Cliente'] ?? null
      })

      return []
    }

    return [
      {
        factorCode,
        factorLabel: COUNTRY_PRICING_FACTOR_LABELS[factorCode],
        factorMin: range.min,
        factorOpt: range.opt,
        factorMax: range.max,
        appliesWhen: row['Cuándo Usar']?.trim() || null
      }
    ]
  })

  return {
    rows: parsedRows,
    skippedControlRows: skippedRowsBeforeHeader
  }
}

const parseFteHoursGuide = (
  csv: string,
  rejectedRows: PricingGovernanceRejectedRow[]
): FteHoursGuideSeedRow[] => {
  const { rows } = parseCsvDocument(
    csv,
    header => header[0] === '% Dedicación' && header[1] === 'Equivalente en FTE'
  )

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2
    const fteFraction = normalizeNumeric(row['% Dedicación'] ?? '')
    const monthlyHours = normalizeNumeric(row['Horas mensuales'] ?? '')

    if (fteFraction == null || monthlyHours == null) {
      rejectedRows.push({
        source: 'fte_guide',
        rowNumber,
        reason: 'invalid_fte_fraction_or_monthly_hours',
        rawLabel: row['Equivalente en FTE'] ?? null
      })

      return []
    }

    return [
      {
        fteFraction,
        fteLabel: row['Equivalente en FTE']?.trim() || `${fteFraction} FTE`,
        monthlyHours: Math.round(monthlyHours),
        recommendedDescription: row['Descripción recomendada']?.trim() || null
      }
    ]
  })
}

export const normalizePricingGovernanceSeedData = (
  files: PricingGovernanceSeedFiles,
  input: { catalogRoles?: PricingGovernanceCatalogRole[] } = {}
): PricingGovernanceSeedParseResult => {
  const rejectedRows: PricingGovernanceRejectedRow[] = []
  const needsReviewRows: PricingGovernanceNeedsReviewRow[] = []

  const roleTier = parseRoleTierMargins(
    files.roleTierMarginsCsv,
    input.catalogRoles ?? [],
    rejectedRows,
    needsReviewRows
  )

  const serviceTierMargins = parseServiceTierMargins(files.serviceTierMarginsCsv, rejectedRows)
  const commercialModelMultipliers = parseCommercialModelMultipliers(files.commercialModelMultipliersCsv, rejectedRows)

  const countryPricingFactors = parseCountryPricingFactors(
    files.countryPricingFactorsCsv,
    rejectedRows,
    needsReviewRows
  )

  const fteHoursGuide = parseFteHoursGuide(files.fteHoursGuideCsv, rejectedRows)

  return {
    roleTierMargins: roleTier.rows,
    serviceTierMargins,
    commercialModelMultipliers,
    countryPricingFactors: countryPricingFactors.rows,
    fteHoursGuide,
    summary: {
      roleTierRows: roleTier.rows.length,
      serviceTierRows: serviceTierMargins.length,
      commercialModelRows: commercialModelMultipliers.length,
      countryFactorRows: countryPricingFactors.rows.length,
      fteGuideRows: fteHoursGuide.length,
      skippedControlRows: roleTier.skippedControlRows + countryPricingFactors.skippedControlRows,
      rejected: rejectedRows.length,
      needsReview: needsReviewRows.length,
      driftDetected: roleTier.driftRows.length
    },
    rejectedRows,
    needsReviewRows,
    driftRows: roleTier.driftRows
  }
}

export const loadPricingGovernanceSeedFiles = async (): Promise<PricingGovernanceSeedFiles> => {
  const [
    roleTierMarginsCsv,
    serviceTierMarginsCsv,
    commercialModelMultipliersCsv,
    countryPricingFactorsCsv,
    fteHoursGuideCsv
  ] = await Promise.all([
    readFile(path.join(PRICING_GOVERNANCE_SEED_DIR, 'role-tier-margins.csv'), 'utf8'),
    readFile(path.join(PRICING_GOVERNANCE_SEED_DIR, 'service-tier-margins.csv'), 'utf8'),
    readFile(path.join(PRICING_GOVERNANCE_SEED_DIR, 'commercial-model-multipliers.csv'), 'utf8'),
    readFile(path.join(PRICING_GOVERNANCE_SEED_DIR, 'country-pricing-factors.csv'), 'utf8'),
    readFile(path.join(PRICING_GOVERNANCE_SEED_DIR, 'fte-hours-guide.csv'), 'utf8')
  ])

  return {
    roleTierMarginsCsv,
    serviceTierMarginsCsv,
    commercialModelMultipliersCsv,
    countryPricingFactorsCsv,
    fteHoursGuideCsv
  }
}
