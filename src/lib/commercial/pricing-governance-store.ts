import type { Kysely, Selectable, Transaction } from 'kysely'
import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import type { DB } from '@/types/db'

import type {
  CommercialModelMultiplierSeedRow,
  CountryPricingFactorSeedRow,
  FteHoursGuideSeedRow,
  RoleTierMarginSeedRow,
  ServiceTierMarginSeedRow
} from './pricing-governance-seed'
import type {
  CommercialModelCode,
  CountryPricingFactorCode,
  PricingTierCode
} from './pricing-governance-types'
import {
  COMMERCIAL_MODEL_CODES,
  COUNTRY_PRICING_FACTOR_CODES,
  PRICING_TIER_CODES
} from './pricing-governance-types'

type DbLike = Kysely<DB> | Transaction<DB>
type RoleTierRow = Selectable<DB['greenhouse_commercial.role_tier_margins']>
type ServiceTierRow = Selectable<DB['greenhouse_commercial.service_tier_margins']>
type CommercialModelRow = Selectable<DB['greenhouse_commercial.commercial_model_multipliers']>
type CountryFactorRow = Selectable<DB['greenhouse_commercial.country_pricing_factors']>
type FteGuideRow = Selectable<DB['greenhouse_commercial.fte_hours_guide']>

const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { expiresAt: number; value: unknown }>()

export interface RoleTierMarginEntry {
  tier: PricingTierCode
  tierLabel: string
  marginMin: number
  marginOpt: number
  marginMax: number
  effectiveFrom: string
  notes: string | null
  updatedAt: string
}

export interface ServiceTierMarginEntry {
  tier: PricingTierCode
  tierLabel: string
  marginBase: number
  description: string | null
  effectiveFrom: string
  updatedAt: string
}

export interface CommercialModelMultiplierEntry {
  modelCode: CommercialModelCode
  modelLabel: string
  multiplierPct: number
  description: string | null
  effectiveFrom: string
  updatedAt: string
}

export interface CountryPricingFactorEntry {
  factorCode: CountryPricingFactorCode
  factorLabel: string
  factorMin: number
  factorOpt: number
  factorMax: number
  appliesWhen: string | null
  effectiveFrom: string
  updatedAt: string
}

export interface FteHoursGuideEntry {
  fteFraction: number
  fteLabel: string
  monthlyHours: number
  recommendedDescription: string | null
  effectiveFrom: string
  updatedAt: string
}

export type PricingGovernanceWriteAction = 'inserted' | 'updated' | 'unchanged'

const toNumber = (value: string | number | null | undefined): number | null => {
  if (value == null) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toStringDate = (value: Date | string | null | undefined) => {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

const toStringTimestamp = (value: Date | string | null | undefined) => {
  if (!value) return ''
  if (typeof value === 'string') return value

  return value.toISOString()
}

const effectiveDate = (value: string) => new Date(`${value}T12:00:00.000Z`)

const getDbOrTx = async (dbOrTx?: DbLike) => dbOrTx ?? getDb()

const numberChanged = (left: number | null | undefined, right: number | null | undefined, tolerance = 0.0001) => {
  const normalizedLeft = left ?? 0
  const normalizedRight = right ?? 0

  return Math.abs(normalizedLeft - normalizedRight) > tolerance
}

const getCached = <T>(key: string): T | undefined => {
  const cached = cache.get(key)

  if (!cached) return undefined

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key)

    return undefined
  }

  return cached.value as T
}

const setCached = (key: string, value: unknown) => {
  cache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value
  })
}

const deleteCacheKey = (key: string) => {
  cache.delete(key)
}

export const clearPricingGovernanceCache = () => {
  cache.clear()
}

const roleTierCacheKey = (tier: PricingTierCode, asOfDate: string) => `role-tier:${tier}:${asOfDate}`
const serviceTierCacheKey = (tier: PricingTierCode, asOfDate: string) => `service-tier:${tier}:${asOfDate}`
const commercialModelCacheKey = (modelCode: CommercialModelCode, asOfDate: string) => `commercial-model:${modelCode}:${asOfDate}`
const countryFactorCacheKey = (factorCode: CountryPricingFactorCode, asOfDate: string) => `country-factor:${factorCode}:${asOfDate}`
const fteGuideCacheKey = (fraction: number, asOfDate: string) => `fte-guide:${fraction}:${asOfDate}`

const mapRoleTierRow = (row: RoleTierRow): RoleTierMarginEntry => ({
  tier: row.tier as PricingTierCode,
  tierLabel: row.tier_label,
  marginMin: toNumber(row.margin_min) ?? 0,
  marginOpt: toNumber(row.margin_opt) ?? 0,
  marginMax: toNumber(row.margin_max) ?? 0,
  effectiveFrom: toStringDate(row.effective_from),
  notes: row.notes,
  updatedAt: toStringTimestamp(row.updated_at)
})

const mapServiceTierRow = (row: ServiceTierRow): ServiceTierMarginEntry => ({
  tier: row.tier as PricingTierCode,
  tierLabel: row.tier_label,
  marginBase: toNumber(row.margin_base) ?? 0,
  description: row.description,
  effectiveFrom: toStringDate(row.effective_from),
  updatedAt: toStringTimestamp(row.updated_at)
})

const mapCommercialModelRow = (row: CommercialModelRow): CommercialModelMultiplierEntry => ({
  modelCode: row.model_code as CommercialModelCode,
  modelLabel: row.model_label,
  multiplierPct: toNumber(row.multiplier_pct) ?? 0,
  description: row.description,
  effectiveFrom: toStringDate(row.effective_from),
  updatedAt: toStringTimestamp(row.updated_at)
})

const mapCountryFactorRow = (row: CountryFactorRow): CountryPricingFactorEntry => ({
  factorCode: row.factor_code as CountryPricingFactorCode,
  factorLabel: row.factor_label,
  factorMin: toNumber(row.factor_min) ?? 0,
  factorOpt: toNumber(row.factor_opt) ?? 0,
  factorMax: toNumber(row.factor_max) ?? 0,
  appliesWhen: row.applies_when,
  effectiveFrom: toStringDate(row.effective_from),
  updatedAt: toStringTimestamp(row.updated_at)
})

const mapFteGuideRow = (row: FteGuideRow): FteHoursGuideEntry => ({
  fteFraction: toNumber(row.fte_fraction) ?? 0,
  fteLabel: row.fte_label,
  monthlyHours: row.monthly_hours,
  recommendedDescription: row.recommended_description,
  effectiveFrom: toStringDate(row.effective_from),
  updatedAt: toStringTimestamp(row.updated_at)
})

const resolveAsOfDate = (asOfDate?: string | null) => asOfDate?.trim() || new Date().toISOString().slice(0, 10)

export const getRoleTierMargins = async (
  tier: PricingTierCode,
  asOfDate?: string | null
): Promise<RoleTierMarginEntry | null> => {
  const resolvedAsOfDate = resolveAsOfDate(asOfDate)
  const cacheKey = roleTierCacheKey(tier, resolvedAsOfDate)
  const cached = getCached<RoleTierMarginEntry | null>(cacheKey)

  if (cached !== undefined) return cached

  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_commercial.role_tier_margins')
    .selectAll()
    .where('tier', '=', tier)
    .where('effective_from', '<=', effectiveDate(resolvedAsOfDate))
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  const mapped = row ? mapRoleTierRow(row) : null

  setCached(cacheKey, mapped)

  return mapped
}

export const listRoleTierMargins = async (asOfDate?: string | null): Promise<RoleTierMarginEntry[]> => {
  const rows = await Promise.all(PRICING_TIER_CODES.map(tier => getRoleTierMargins(tier, asOfDate)))

  return rows.filter(Boolean) as RoleTierMarginEntry[]
}

export const getServiceTierMargins = async (
  tier: PricingTierCode,
  asOfDate?: string | null
): Promise<ServiceTierMarginEntry | null> => {
  const resolvedAsOfDate = resolveAsOfDate(asOfDate)
  const cacheKey = serviceTierCacheKey(tier, resolvedAsOfDate)
  const cached = getCached<ServiceTierMarginEntry | null>(cacheKey)

  if (cached !== undefined) return cached

  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_commercial.service_tier_margins')
    .selectAll()
    .where('tier', '=', tier)
    .where('effective_from', '<=', effectiveDate(resolvedAsOfDate))
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  const mapped = row ? mapServiceTierRow(row) : null

  setCached(cacheKey, mapped)

  return mapped
}

export const getCommercialModelMultiplier = async (
  modelCode: CommercialModelCode,
  asOfDate?: string | null
): Promise<CommercialModelMultiplierEntry | null> => {
  const resolvedAsOfDate = resolveAsOfDate(asOfDate)
  const cacheKey = commercialModelCacheKey(modelCode, resolvedAsOfDate)
  const cached = getCached<CommercialModelMultiplierEntry | null>(cacheKey)

  if (cached !== undefined) return cached

  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_commercial.commercial_model_multipliers')
    .selectAll()
    .where('model_code', '=', modelCode)
    .where('effective_from', '<=', effectiveDate(resolvedAsOfDate))
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  const mapped = row ? mapCommercialModelRow(row) : null

  setCached(cacheKey, mapped)

  return mapped
}

export const getCountryPricingFactor = async (
  factorCode: CountryPricingFactorCode,
  asOfDate?: string | null
): Promise<CountryPricingFactorEntry | null> => {
  const resolvedAsOfDate = resolveAsOfDate(asOfDate)
  const cacheKey = countryFactorCacheKey(factorCode, resolvedAsOfDate)
  const cached = getCached<CountryPricingFactorEntry | null>(cacheKey)

  if (cached !== undefined) return cached

  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_commercial.country_pricing_factors')
    .selectAll()
    .where('factor_code', '=', factorCode)
    .where('effective_from', '<=', effectiveDate(resolvedAsOfDate))
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  const mapped = row ? mapCountryFactorRow(row) : null

  setCached(cacheKey, mapped)

  return mapped
}

export const convertFteToHours = async (
  fraction: number,
  asOfDate?: string | null
): Promise<FteHoursGuideEntry | null> => {
  const resolvedAsOfDate = resolveAsOfDate(asOfDate)
  const cacheKey = fteGuideCacheKey(fraction, resolvedAsOfDate)
  const cached = getCached<FteHoursGuideEntry | null>(cacheKey)

  if (cached !== undefined) return cached

  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_commercial.fte_hours_guide')
    .selectAll()
    .where('fte_fraction', '=', fraction.toFixed(2))
    .where('effective_from', '<=', effectiveDate(resolvedAsOfDate))
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  const mapped = row ? mapFteGuideRow(row) : null

  setCached(cacheKey, mapped)

  return mapped
}

export const listCommercialModelMultipliers = async (
  asOfDate?: string | null
): Promise<CommercialModelMultiplierEntry[]> => {
  const rows = await Promise.all(
    COMMERCIAL_MODEL_CODES.map(modelCode => getCommercialModelMultiplier(modelCode, asOfDate))
  )

  return rows.filter(Boolean) as CommercialModelMultiplierEntry[]
}

export const listCountryPricingFactors = async (
  asOfDate?: string | null
): Promise<CountryPricingFactorEntry[]> => {
  const rows = await Promise.all(
    COUNTRY_PRICING_FACTOR_CODES.map(code => getCountryPricingFactor(code, asOfDate))
  )

  return rows.filter(Boolean) as CountryPricingFactorEntry[]
}

const resolveWriteAction = (
  currentEffective: Record<string, unknown> | undefined,
  latest: Record<string, unknown> | undefined,
  changed: boolean
): PricingGovernanceWriteAction => {
  if (!changed) return 'unchanged'
  if (currentEffective) return 'updated'

  return latest ? 'inserted' : 'inserted'
}

export const upsertRoleTierMargin = async (
  input: RoleTierMarginSeedRow,
  effectiveFrom: string,
  dbOrTx?: DbLike
): Promise<{ action: PricingGovernanceWriteAction; entry: RoleTierMarginEntry }> => {
  const db = await getDbOrTx(dbOrTx)
  const effective = effectiveDate(effectiveFrom)

  const currentEffective = await db
    .selectFrom('greenhouse_commercial.role_tier_margins')
    .selectAll()
    .where('tier', '=', input.tier)
    .where('effective_from', '=', effective)
    .executeTakeFirst()

  const latest = await db
    .selectFrom('greenhouse_commercial.role_tier_margins')
    .selectAll()
    .where('tier', '=', input.tier)
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  const baseline = currentEffective ?? latest

  const changed = !baseline ||
    baseline.tier_label !== input.tierLabel ||
    numberChanged(toNumber(baseline.margin_min), input.marginMin) ||
    numberChanged(toNumber(baseline.margin_opt), input.marginOpt) ||
    numberChanged(toNumber(baseline.margin_max), input.marginMax) ||
    (baseline.notes ?? null) !== (input.notes ?? null)

  if (!changed) {
    return {
      action: 'unchanged',
      entry: mapRoleTierRow(baseline)
    }
  }

  const row = await db
    .insertInto('greenhouse_commercial.role_tier_margins')
    .values({
      tier: input.tier,
      tier_label: input.tierLabel,
      margin_min: input.marginMin,
      margin_opt: input.marginOpt,
      margin_max: input.marginMax,
      effective_from: effectiveFrom,
      notes: input.notes,
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .onConflict(oc => oc.columns(['tier', 'effective_from']).doUpdateSet({
      tier_label: input.tierLabel,
      margin_min: input.marginMin,
      margin_opt: input.marginOpt,
      margin_max: input.marginMax,
      notes: input.notes,
      updated_at: sql`CURRENT_TIMESTAMP`
    }))
    .returningAll()
    .executeTakeFirstOrThrow()

  deleteCacheKey(roleTierCacheKey(input.tier, effectiveFrom))

  return {
    action: resolveWriteAction(currentEffective, latest, changed),
    entry: mapRoleTierRow(row)
  }
}

export const upsertServiceTierMargin = async (
  input: ServiceTierMarginSeedRow,
  effectiveFrom: string,
  dbOrTx?: DbLike
): Promise<{ action: PricingGovernanceWriteAction; entry: ServiceTierMarginEntry }> => {
  const db = await getDbOrTx(dbOrTx)
  const effective = effectiveDate(effectiveFrom)

  const currentEffective = await db
    .selectFrom('greenhouse_commercial.service_tier_margins')
    .selectAll()
    .where('tier', '=', input.tier)
    .where('effective_from', '=', effective)
    .executeTakeFirst()

  const latest = await db
    .selectFrom('greenhouse_commercial.service_tier_margins')
    .selectAll()
    .where('tier', '=', input.tier)
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  const baseline = currentEffective ?? latest

  const changed = !baseline ||
    baseline.tier_label !== input.tierLabel ||
    numberChanged(toNumber(baseline.margin_base), input.marginBase) ||
    (baseline.description ?? null) !== (input.description ?? null)

  if (!changed) {
    return {
      action: 'unchanged',
      entry: mapServiceTierRow(baseline)
    }
  }

  const row = await db
    .insertInto('greenhouse_commercial.service_tier_margins')
    .values({
      tier: input.tier,
      tier_label: input.tierLabel,
      margin_base: input.marginBase,
      description: input.description,
      effective_from: effectiveFrom,
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .onConflict(oc => oc.columns(['tier', 'effective_from']).doUpdateSet({
      tier_label: input.tierLabel,
      margin_base: input.marginBase,
      description: input.description,
      updated_at: sql`CURRENT_TIMESTAMP`
    }))
    .returningAll()
    .executeTakeFirstOrThrow()

  deleteCacheKey(serviceTierCacheKey(input.tier, effectiveFrom))

  return {
    action: resolveWriteAction(currentEffective, latest, changed),
    entry: mapServiceTierRow(row)
  }
}

export const upsertCommercialModelMultiplier = async (
  input: CommercialModelMultiplierSeedRow,
  effectiveFrom: string,
  dbOrTx?: DbLike
): Promise<{ action: PricingGovernanceWriteAction; entry: CommercialModelMultiplierEntry }> => {
  const db = await getDbOrTx(dbOrTx)
  const effective = effectiveDate(effectiveFrom)

  const currentEffective = await db
    .selectFrom('greenhouse_commercial.commercial_model_multipliers')
    .selectAll()
    .where('model_code', '=', input.modelCode)
    .where('effective_from', '=', effective)
    .executeTakeFirst()

  const latest = await db
    .selectFrom('greenhouse_commercial.commercial_model_multipliers')
    .selectAll()
    .where('model_code', '=', input.modelCode)
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  const baseline = currentEffective ?? latest

  const changed = !baseline ||
    baseline.model_label !== input.modelLabel ||
    numberChanged(toNumber(baseline.multiplier_pct), input.multiplierPct) ||
    (baseline.description ?? null) !== (input.description ?? null)

  if (!changed) {
    return {
      action: 'unchanged',
      entry: mapCommercialModelRow(baseline)
    }
  }

  const row = await db
    .insertInto('greenhouse_commercial.commercial_model_multipliers')
    .values({
      model_code: input.modelCode,
      model_label: input.modelLabel,
      multiplier_pct: input.multiplierPct,
      description: input.description,
      effective_from: effectiveFrom,
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .onConflict(oc => oc.columns(['model_code', 'effective_from']).doUpdateSet({
      model_label: input.modelLabel,
      multiplier_pct: input.multiplierPct,
      description: input.description,
      updated_at: sql`CURRENT_TIMESTAMP`
    }))
    .returningAll()
    .executeTakeFirstOrThrow()

  deleteCacheKey(commercialModelCacheKey(input.modelCode, effectiveFrom))

  return {
    action: resolveWriteAction(currentEffective, latest, changed),
    entry: mapCommercialModelRow(row)
  }
}

export const upsertCountryPricingFactor = async (
  input: CountryPricingFactorSeedRow,
  effectiveFrom: string,
  dbOrTx?: DbLike
): Promise<{ action: PricingGovernanceWriteAction; entry: CountryPricingFactorEntry }> => {
  const db = await getDbOrTx(dbOrTx)
  const effective = effectiveDate(effectiveFrom)

  const currentEffective = await db
    .selectFrom('greenhouse_commercial.country_pricing_factors')
    .selectAll()
    .where('factor_code', '=', input.factorCode)
    .where('effective_from', '=', effective)
    .executeTakeFirst()

  const latest = await db
    .selectFrom('greenhouse_commercial.country_pricing_factors')
    .selectAll()
    .where('factor_code', '=', input.factorCode)
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  const baseline = currentEffective ?? latest

  const changed = !baseline ||
    baseline.factor_label !== input.factorLabel ||
    numberChanged(toNumber(baseline.factor_min), input.factorMin) ||
    numberChanged(toNumber(baseline.factor_opt), input.factorOpt) ||
    numberChanged(toNumber(baseline.factor_max), input.factorMax) ||
    (baseline.applies_when ?? null) !== (input.appliesWhen ?? null)

  if (!changed) {
    return {
      action: 'unchanged',
      entry: mapCountryFactorRow(baseline)
    }
  }

  const row = await db
    .insertInto('greenhouse_commercial.country_pricing_factors')
    .values({
      factor_code: input.factorCode,
      factor_label: input.factorLabel,
      factor_min: input.factorMin,
      factor_opt: input.factorOpt,
      factor_max: input.factorMax,
      applies_when: input.appliesWhen,
      effective_from: effectiveFrom,
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .onConflict(oc => oc.columns(['factor_code', 'effective_from']).doUpdateSet({
      factor_label: input.factorLabel,
      factor_min: input.factorMin,
      factor_opt: input.factorOpt,
      factor_max: input.factorMax,
      applies_when: input.appliesWhen,
      updated_at: sql`CURRENT_TIMESTAMP`
    }))
    .returningAll()
    .executeTakeFirstOrThrow()

  deleteCacheKey(countryFactorCacheKey(input.factorCode, effectiveFrom))

  return {
    action: resolveWriteAction(currentEffective, latest, changed),
    entry: mapCountryFactorRow(row)
  }
}

export const upsertFteHoursGuide = async (
  input: FteHoursGuideSeedRow,
  effectiveFrom: string,
  dbOrTx?: DbLike
): Promise<{ action: PricingGovernanceWriteAction; entry: FteHoursGuideEntry }> => {
  const db = await getDbOrTx(dbOrTx)
  const fteValue = input.fteFraction.toFixed(2)
  const effective = effectiveDate(effectiveFrom)

  const currentEffective = await db
    .selectFrom('greenhouse_commercial.fte_hours_guide')
    .selectAll()
    .where('fte_fraction', '=', fteValue)
    .where('effective_from', '=', effective)
    .executeTakeFirst()

  const latest = await db
    .selectFrom('greenhouse_commercial.fte_hours_guide')
    .selectAll()
    .where('fte_fraction', '=', fteValue)
    .orderBy('effective_from', 'desc')
    .executeTakeFirst()

  const baseline = currentEffective ?? latest

  const changed = !baseline ||
    baseline.fte_label !== input.fteLabel ||
    baseline.monthly_hours !== input.monthlyHours ||
    (baseline.recommended_description ?? null) !== (input.recommendedDescription ?? null)

  if (!changed) {
    return {
      action: 'unchanged',
      entry: mapFteGuideRow(baseline)
    }
  }

  const row = await db
    .insertInto('greenhouse_commercial.fte_hours_guide')
    .values({
      fte_fraction: fteValue,
      fte_label: input.fteLabel,
      monthly_hours: input.monthlyHours,
      recommended_description: input.recommendedDescription,
      effective_from: effectiveFrom,
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .onConflict(oc => oc.columns(['fte_fraction', 'effective_from']).doUpdateSet({
      fte_label: input.fteLabel,
      monthly_hours: input.monthlyHours,
      recommended_description: input.recommendedDescription,
      updated_at: sql`CURRENT_TIMESTAMP`
    }))
    .returningAll()
    .executeTakeFirstOrThrow()

  deleteCacheKey(fteGuideCacheKey(input.fteFraction, effectiveFrom))

  return {
    action: resolveWriteAction(currentEffective, latest, changed),
    entry: mapFteGuideRow(row)
  }
}
