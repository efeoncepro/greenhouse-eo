import 'server-only'

import {
  upsertCommercialModelMultiplier,
  upsertCountryPricingFactor,
  upsertRoleTierMargin,
  upsertServiceTierMargin
} from '@/lib/commercial/pricing-governance-store'
import type {
  CommercialModelMultiplierSeedRow,
  CountryPricingFactorSeedRow,
  RoleTierMarginSeedRow,
  ServiceTierMarginSeedRow
} from '@/lib/commercial/pricing-governance-seed'
import type {
  PricingCatalogAuditEntry,
  PricingCatalogEntityType
} from '@/lib/commercial/pricing-catalog-audit-store'
import type { CommercialModelCode, CountryPricingFactorCode, PricingTierCode } from '@/lib/commercial/pricing-governance-types'
import type { EmploymentTypeSeedRow } from '@/lib/commercial/sellable-roles-seed'
import { upsertEmploymentType } from '@/lib/commercial/sellable-roles-store'
import { getDb } from '@/lib/db'

export class PricingCatalogGovernanceRevertError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code = 'governance_revert_failed', statusCode = 400) {
    super(message)
    this.name = 'PricingCatalogGovernanceRevertError'
    this.code = code
    this.statusCode = statusCode
  }
}

export interface ApplyGovernanceRevertInput {
  entry: PricingCatalogAuditEntry
  changeset: Record<string, unknown>
  effectiveFrom?: string
  audit?: {
    actorUserId: string
    actorName: string
    reason: string
  }
}

export interface ApplyGovernanceRevertResult {
  updatedFields: string[]
  entityId: string
  effectiveFrom: string
  newAuditId: string | null
}

const GOVERNANCE_ENTITY_TYPES: readonly PricingCatalogEntityType[] = [
  'role_tier_margin',
  'service_tier_margin',
  'commercial_model_multiplier',
  'country_pricing_factor',
  'employment_type'
]

const todayIso = () => new Date().toISOString().slice(0, 10)

const pickString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const pickNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const pickBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false

  return null
}

const getRequiredString = (changeset: Record<string, unknown>, keys: string[], fieldName: string): string => {
  for (const key of keys) {
    const value = pickString(changeset[key])

    if (value) return value
  }

  throw new PricingCatalogGovernanceRevertError(
    `Missing required governance field "${fieldName}" in previous_values.`,
    'governance_revert_missing_field',
    409
  )
}

const getRequiredNumber = (changeset: Record<string, unknown>, keys: string[], fieldName: string): number => {
  for (const key of keys) {
    const value = pickNumber(changeset[key])

    if (value !== null) return value
  }

  throw new PricingCatalogGovernanceRevertError(
    `Missing required governance field "${fieldName}" in previous_values.`,
    'governance_revert_missing_field',
    409
  )
}

const getOptionalString = (changeset: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = pickString(changeset[key])

    if (value !== null) return value
  }

  return null
}

const getOptionalNumber = (changeset: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = pickNumber(changeset[key])

    if (value !== null) return value
  }

  return null
}

const getOptionalBoolean = (changeset: Record<string, unknown>, keys: string[]): boolean | null => {
  for (const key of keys) {
    const value = pickBoolean(changeset[key])

    if (value !== null) return value
  }

  return null
}

const assertSupportedEntityType = (entityType: PricingCatalogEntityType) => {
  if (!GOVERNANCE_ENTITY_TYPES.includes(entityType)) {
    throw new PricingCatalogGovernanceRevertError(
      `Entity type "${entityType}" is not supported by the governance revert writer.`,
      'governance_revert_not_supported',
      400
    )
  }
}

export const applyPricingCatalogGovernanceRevert = async (
  input: ApplyGovernanceRevertInput
): Promise<ApplyGovernanceRevertResult> => {
  assertSupportedEntityType(input.entry.entityType)

  const effectiveFrom = input.effectiveFrom?.trim() || todayIso()
  const db = await getDb()

  return db.transaction().execute(async trx => {
    const insertAudit = async (entityId: string, updates: unknown, effectiveDate: string): Promise<string | null> => {
      if (!input.audit) return null

      const auditRow = await trx
        .insertInto('greenhouse_commercial.pricing_catalog_audit_log')
        .values({
          entity_type: input.entry.entityType,
          entity_id: entityId,
          entity_sku: input.entry.entitySku,
          action: 'reverted',
          actor_user_id: input.audit.actorUserId,
          actor_name: input.audit.actorName,
          change_summary: JSON.stringify({
            reverts_audit_id: input.entry.auditId,
            reverts_original_action: input.entry.action,
            previous_values: input.entry.changeSummary.new_values ?? null,
            new_values: updates,
            fields_changed: Object.keys(input.changeset),
            reason: input.audit.reason
          }) as never,
          effective_from: effectiveDate
        })
        .returning('audit_id')
        .executeTakeFirst()

      return auditRow?.audit_id ?? null
    }

    if (input.entry.entityType === 'role_tier_margin') {
      const payload: RoleTierMarginSeedRow = {
        tier: getRequiredString(input.changeset, ['tier'], 'tier') as PricingTierCode,
        tierLabel: getRequiredString(input.changeset, ['tierLabel', 'tier_label'], 'tierLabel'),
        marginMin: getRequiredNumber(input.changeset, ['marginMin', 'margin_min'], 'marginMin'),
        marginOpt: getRequiredNumber(input.changeset, ['marginOpt', 'margin_opt'], 'marginOpt'),
        marginMax: getRequiredNumber(input.changeset, ['marginMax', 'margin_max'], 'marginMax'),
        notes: getOptionalString(input.changeset, ['notes'])
      }

      await upsertRoleTierMargin(payload, effectiveFrom, trx)
      const newAuditId = await insertAudit(`${payload.tier}:${effectiveFrom}`, payload, effectiveFrom)

      return {
        updatedFields: Object.keys(input.changeset),
        entityId: `${payload.tier}:${effectiveFrom}`,
        effectiveFrom,
        newAuditId
      }
    }

    if (input.entry.entityType === 'service_tier_margin') {
      const payload: ServiceTierMarginSeedRow = {
        tier: getRequiredString(input.changeset, ['tier'], 'tier') as PricingTierCode,
        tierLabel: getRequiredString(input.changeset, ['tierLabel', 'tier_label'], 'tierLabel'),
        marginBase: getRequiredNumber(input.changeset, ['marginBase', 'margin_base'], 'marginBase'),
        description: getOptionalString(input.changeset, ['description'])
      }

      await upsertServiceTierMargin(payload, effectiveFrom, trx)
      const newAuditId = await insertAudit(`${payload.tier}:${effectiveFrom}`, payload, effectiveFrom)

      return {
        updatedFields: Object.keys(input.changeset),
        entityId: `${payload.tier}:${effectiveFrom}`,
        effectiveFrom,
        newAuditId
      }
    }

    if (input.entry.entityType === 'commercial_model_multiplier') {
      const payload: CommercialModelMultiplierSeedRow = {
        modelCode: getRequiredString(input.changeset, ['modelCode', 'model_code'], 'modelCode') as CommercialModelCode,
        modelLabel: getRequiredString(input.changeset, ['modelLabel', 'model_label'], 'modelLabel'),
        multiplierPct: getRequiredNumber(input.changeset, ['multiplierPct', 'multiplier_pct'], 'multiplierPct'),
        description: getOptionalString(input.changeset, ['description'])
      }

      await upsertCommercialModelMultiplier(payload, effectiveFrom, trx)
      const newAuditId = await insertAudit(`${payload.modelCode}:${effectiveFrom}`, payload, effectiveFrom)

      return {
        updatedFields: Object.keys(input.changeset),
        entityId: `${payload.modelCode}:${effectiveFrom}`,
        effectiveFrom,
        newAuditId
      }
    }

    if (input.entry.entityType === 'country_pricing_factor') {
      const payload: CountryPricingFactorSeedRow = {
        factorCode: getRequiredString(input.changeset, ['factorCode', 'factor_code'], 'factorCode') as CountryPricingFactorCode,
        factorLabel: getRequiredString(input.changeset, ['factorLabel', 'factor_label'], 'factorLabel'),
        factorMin: getRequiredNumber(input.changeset, ['factorMin', 'factor_min'], 'factorMin'),
        factorOpt: getRequiredNumber(input.changeset, ['factorOpt', 'factor_opt'], 'factorOpt'),
        factorMax: getRequiredNumber(input.changeset, ['factorMax', 'factor_max'], 'factorMax'),
        appliesWhen: getOptionalString(input.changeset, ['appliesWhen', 'applies_when'])
      }

      await upsertCountryPricingFactor(payload, effectiveFrom, trx)
      const newAuditId = await insertAudit(`${payload.factorCode}:${effectiveFrom}`, payload, effectiveFrom)

      return {
        updatedFields: Object.keys(input.changeset),
        entityId: `${payload.factorCode}:${effectiveFrom}`,
        effectiveFrom,
        newAuditId
      }
    }

    if (input.entry.entityType === 'employment_type') {
      const payload = {
        employmentTypeCode: getRequiredString(
          input.changeset,
          ['employmentTypeCode', 'employment_type_code'],
          'employmentTypeCode'
        ),
        labelEs: getRequiredString(input.changeset, ['labelEs', 'label_es'], 'labelEs'),
        labelEn: getOptionalString(input.changeset, ['labelEn', 'label_en']),
        paymentCurrency: getRequiredString(
          input.changeset,
          ['paymentCurrency', 'payment_currency'],
          'paymentCurrency'
        ),
        countryCode: getRequiredString(input.changeset, ['countryCode', 'country_code'], 'countryCode'),
        appliesPrevisional:
          getOptionalBoolean(input.changeset, ['appliesPrevisional', 'applies_previsional']) ?? false,
        previsionalPctDefault: getOptionalNumber(
          input.changeset,
          ['previsionalPctDefault', 'previsional_pct_default']
        ),
        feeMonthlyUsdDefault:
          getOptionalNumber(input.changeset, ['feeMonthlyUsdDefault', 'fee_monthly_usd_default']) ?? 0,
        feePctDefault: getOptionalNumber(input.changeset, ['feePctDefault', 'fee_pct_default']),
        appliesBonuses: getOptionalBoolean(input.changeset, ['appliesBonuses', 'applies_bonuses']) ?? false,
        sourceOfTruth: getRequiredString(input.changeset, ['sourceOfTruth', 'source_of_truth'], 'sourceOfTruth'),
        notes: getOptionalString(input.changeset, ['notes'])
      } as unknown as EmploymentTypeSeedRow

      await upsertEmploymentType(payload, trx)
      const newAuditId = await insertAudit(payload.employmentTypeCode, payload, effectiveFrom)

      return {
        updatedFields: Object.keys(input.changeset),
        entityId: payload.employmentTypeCode,
        effectiveFrom,
        newAuditId
      }
    }

    throw new PricingCatalogGovernanceRevertError(
      `Entity type "${input.entry.entityType}" is not supported by the governance revert writer.`,
      'governance_revert_not_supported',
      400
    )
  })
}
