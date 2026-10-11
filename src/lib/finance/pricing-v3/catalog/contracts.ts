import { z } from 'zod'

import {
  pricingV3EngagementFactorSchemaV13,
  pricingV3MarketFactorSchemaV12,
  pricingV3PriceRoundingSchema,
  pricingV3RequestSchema,
  pricingV3RequestSchemaV11,
  pricingV3SnapshotSchema,
  sourceSchema
} from '../schemas'

const id = z.string().min(1).max(120)
const decimal = z.string().regex(/^(0|[1-9]\d{0,23})(\.\d{1,18})?$/)
const date = pricingV3RequestSchema.shape.quoteDate
const snapshot = pricingV3SnapshotSchema.shape

const envelope = {
  recordId: id,
  revision: z.number().int().min(1),
  retiredAt: date.optional(),
  source: sourceSchema,
  note: z.string().min(1).max(3000)
}

const record = <K extends string, T extends z.ZodTypeAny>(kind: K, value: T) =>
  z.object({ ...envelope, kind: z.literal(kind), value }).strict()

export const catalogRecordSchema = z.union([
  record(
    'profile',
    snapshot.profiles.element
      .omit({ cost: true })
      .extend({
        aliases: z.array(id),
        defaultKitId: id.nullable()
      })
      .strict()
  ),
  record(
    'cost',
    z
      .object({
        profileId: id,
        seniorityCode: id,
        localization: snapshot.profiles.element.shape.cost.unwrap().shape.localization.nullable(),
        currency: z.string().regex(/^[A-Z]{3}$/),
        components: z
          .array(
            z.object({ coverage: id, amount: decimal.nullable(), zeroReason: z.string().min(1).optional() }).strict()
          )
          .min(1)
      })
      .strict()
  ),
  record('resource', snapshot.resources.element.omit({ source: true }).extend({ amount: decimal.nullable() }).strict()),
  record(
    'kit',
    z
      .object({
        kitId: id,
        label: id,
        requirements: z
          .array(
            z
              .object({
                requirementId: id,
                coverage: id,
                required: z.boolean(),
                allowClientProvided: z.boolean().default(false),
                candidateResourceIds: z.array(id).min(1),
                quantityMode: z.enum(['one', 'headcount']),
                shareMode: z.enum(['full', 'fte', 'equal_consumers'])
              })
              .strict()
          )
          .max(100)
      })
      .strict()
  ),
  record('allocation', snapshot.allocationPolicies.element.omit({ source: true })),
  record('pricing', snapshot.pricingPolicies.element.omit({ source: true })),
  record('talent_factor', snapshot.talentFactors.element.omit({ source: true })),
  // Optional `floorBasis: 'base_market'` (contract 1.2.0): the price floor of this market is read on the base-market
  // price. A record without it parses to exactly what it always did.
  record('market_factor', pricingV3MarketFactorSchemaV12.omit({ source: true }).strict()),
  record('fx', snapshot.fx.element.omit({ source: true })),
  // Commercial rounding, per quoting currency. With `offerId` it governs that offer and prevails over the general rule.
  record(
    'price_rounding',
    z
      .object({
        currency: z.string().regex(/^[A-Z]{3}$/),
        multiple: pricingV3PriceRoundingSchema.shape.multiple,
        offerId: id.optional()
      })
      .strict()
  ),
  // Price ratio of a form of engagement (contract 1.3.0): one record per form, the single source of its premium or
  // discount for every pricing policy. Forms are data, so the catalog decides which exist. With `offerId` the record
  // governs that offer and prevails over the general one of the same form. The ratio is bounded like a market factor.
  record(
    'engagement_factor',
    pricingV3EngagementFactorSchemaV13.omit({ source: true }).extend({ offerId: id.optional() }).strict()
  )
])

export const catalogSchema = z
  .object({
    schemaVersion: z.literal('pricing-v3-catalog/1'),
    catalogId: id,
    version: id,
    mode: z.enum(['synthetic', 'historical', 'commercial_draft']),
    calculationCurrency: z.string().regex(/^[A-Z]{3}$/),
    countries: snapshot.countries,
    currencies: snapshot.currencies,
    records: z.array(catalogRecordSchema).min(1).max(10000),
    evidence: z
      .array(
        z
          .object({ reference: id, path: z.string().min(1).max(500), sha256: z.string().regex(/^[a-f0-9]{64}$/) })
          .strict()
      )
      .max(100),
    audit: z
      .array(
        z
          .object({
            changeId: id,
            actor: id,
            reason: z.string().min(1),
            baseDigest: id,
            previewDigest: id,
            changes: z.array(z.unknown()).min(1)
          })
          .strict()
      )
      .max(200)
  })
  .strict()

const dedication = pricingV3RequestSchema.shape.lines.element.shape.dedication

export const briefSchema = z
  .object({
    schemaVersion: z.literal('pricing-v3-brief/1'),
    mode: z.enum(['simulation', 'commercial_draft']),
    quoteDate: date,
    offerId: id,
    engagementCode: id,
    // Form of the engagement (contract 1.3.0), by the id of an `engagement_factor` record. It is a datum apart from
    // `engagementCode`, which keeps selecting the pricing policy. Absent, the brief parses and resolves as it always did.
    engagementForm: id.optional(),
    accountId: id,
    offerMarketCountry: z.string().regex(/^[A-Z]{2}$/),
    outputCurrency: z.string().regex(/^[A-Z]{3}$/),
    periods: z.number().int().min(1).max(60),
    lines: z
      .array(
        z
          .object({
            lineId: id,
            profile: id,
            seniorityCode: id.optional(),
            talentCountry: z.string().regex(/^[A-Z]{2}$/),
            headcount: z.number().int().min(1).max(100),
            dedication,
            allocationMode: z.enum(['shared', 'dedicated']),
            allocationPolicyId: id,
            pricingPolicyId: id.optional(),
            kitId: id.optional(),
            costRecordId: id.optional(),
            allowUnlocalizedCost: z.boolean().default(false),
            teamId: id.optional(),
            activePeriods: z.array(z.number().int().min(1).max(60)).min(1).optional(),
            dedicationByPeriod: z
              .array(z.object({ periodId: z.number().int().min(1).max(60), dedication }).strict())
              .optional(),
            choices: z
              .array(
                z
                  .object({
                    requirementId: id,
                    resourceId: id.optional(),
                    providedByClientReason: z.string().min(1).optional()
                  })
                  .strict()
                  .refine(
                    v => Boolean(v.resourceId) !== Boolean(v.providedByClientReason),
                    'Select resource or justified client coverage'
                  )
              )
              .default([])
          })
          .strict()
      )
      .min(1)
      .max(100),
    // The 1.1.0 union is a superset: a brief with no adjustment or one discount parses to what it always did, and
    // resolution only declares contract 1.1.0 when the brief uses more than that.
    adjustments: pricingV3RequestSchemaV11.shape.adjustments.default([]),
    taxTreatment: pricingV3RequestSchema.shape.taxTreatment.default({ kind: 'not_resolved' })
  })
  .strict()

export const changeSetSchema = z
  .object({
    schemaVersion: z.literal('pricing-v3-catalog-change/1'),
    changeId: id,
    baseDigest: id,
    nextVersion: id,
    actor: id,
    reason: z.string().min(1).max(3000),
    dimensions: z
      .object({
        countriesAdd: z.array(snapshot.countries.element).max(100).default([]),
        currenciesAdd: z.array(snapshot.currencies.element).max(50).default([])
      })
      .strict()
      .optional(),
    changes: z
      .array(
        z
          .object({
            operation: z.enum(['add', 'replace', 'retire']),
            recordId: id,
            effectiveFrom: date,
            record: catalogRecordSchema.optional()
          })
          .strict()
      )
      .min(1)
      .max(500)
  })
  .strict()

export type Catalog = z.infer<typeof catalogSchema>
export type CatalogRecord = z.infer<typeof catalogRecordSchema>
export type Brief = z.infer<typeof briefSchema>
export type ChangeSet = z.infer<typeof changeSetSchema>
export type Diagnostic = { code: string; path: string; candidates?: string[]; detail?: string }
