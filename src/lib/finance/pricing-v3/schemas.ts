import Decimal from 'decimal.js'
import { z } from 'zod'

const id = z.string().min(1).max(120)
const decimalPattern = /^(0|[1-9]\d{0,23})(\.\d{1,18})?$/
const decimal = z.string().regex(decimalPattern)

const positive = decimal.refine(
  value => decimalPattern.test(value) && new Decimal(value).gt(0),
  'Expected a positive decimal string'
)

const fraction = decimal.refine(
  value => decimalPattern.test(value) && new Decimal(value).lte(1),
  'Expected a fraction in [0,1]'
)

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => {
    const parsed = new Date(`${value}T00:00:00Z`)

    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
  }, 'Expected a valid ISO date')

const country = z.string().regex(/^[A-Z]{2}$/)
const currency = z.string().regex(/^[A-Z]{3}$/)
const missingCountry = country.nullable().optional()

export const sourceSchema = z
  .object({
    reference: id,
    effectiveFrom: date,
    effectiveUntil: date,
    status: z.enum(['confirmed', 'estimated', 'pending']),
    zeroReason: z.string().min(1).optional()
  })
  .strict()
  .refine(value => value.effectiveFrom <= value.effectiveUntil, 'Invalid validity interval')

const discountAdjustmentSchema = z
  .object({
    adjustmentId: id,
    kind: z.literal('discount'),
    rate: fraction,
    lineIds: z.array(id).min(1),
    reason: z.string().min(1)
  })
  .strict()

/** Contract 1.0.0. Frozen: artifacts signed by `pricing-v3-local/1.0.0` replay through it byte for byte. */
export const pricingV3RequestSchema = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    quoteDate: date,
    offerId: id,
    deliveryModel: z.literal('staffing'),
    engagementCode: id,
    offerMarketCountry: missingCountry,
    outputCurrency: currency,
    duration: z.object({ unit: z.literal('month'), periods: z.number().int().min(1).max(60) }).strict(),
    lines: z
      .array(
        z
          .object({
            lineId: id,
            profileId: id,
            seniorityCode: id,
            talentCountry: missingCountry,
            headcount: z.number().int().min(1).max(100),
            dedication: z.union([
              z
                .object({
                  unit: z.literal('fte'),
                  value: positive.refine(value => decimalPattern.test(value) && new Decimal(value).lte(1))
                })
                .strict(),
              z.object({ unit: z.literal('hours_per_month'), value: positive }).strict()
            ]),
            allocationMode: z.enum(['shared', 'dedicated']),
            allocationPolicyRef: id,
            assignments: z
              .array(
                z
                  .object({
                    resourceId: id,
                    allocationId: id,
                    scope: z.enum(['person', 'team', 'account']),
                    scopeRef: id,
                    quantity: z.string().regex(/^[1-9]\d{0,3}$/),
                    share: positive.refine(value => decimalPattern.test(value) && new Decimal(value).lte(1)),
                    cashTiming: z.enum(['start', 'monthly']),
                    periodIds: z.array(z.number().int().min(1).max(60)).min(1).optional()
                  })
                  .strict()
              )
              .max(100),
            notApplicable: z.array(z.object({ coverage: id, reason: z.string().min(1) }).strict()).max(50)
          })
          .strict()
      )
      .min(1)
      .max(100),
    adjustments: z.array(discountAdjustmentSchema).max(1),
    taxTreatment: z.union([
      z.object({ kind: z.literal('not_resolved') }).strict(),
      z.object({ kind: z.literal('not_applicable'), reason: z.string().min(1) }).strict(),
      z.object({ kind: z.literal('exclusive'), rate: fraction, policyRef: id, source: sourceSchema }).strict()
    ])
  })
  .strict()

const moneyRecord = z
  .object({
    amount: decimal,
    currency,
    source: sourceSchema
  })
  .strict()

export const pricingV3SnapshotSchema = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    snapshotId: id,
    version: id,
    mode: z.enum(['synthetic', 'historical', 'commercial_draft']),
    calculationCurrency: currency,
    countries: z.array(country).min(1),
    currencies: z.array(z.object({ code: currency, precision: z.number().int().min(0).max(4) }).strict()).min(1),
    profiles: z.array(
      z
        .object({
          profileId: id,
          label: z.string().min(1),
          seniorityCode: id,
          tierCode: id,
          cost: moneyRecord
            .extend({
              localization: z.union([
                z.object({ kind: z.literal('specific'), country }).strict(),
                z.object({ kind: z.literal('reference_adjusted'), referenceCountry: country }).strict()
              ]),
              unit: z.literal('month'),
              covers: z.array(id).min(1)
            })
            .strict()
            .nullable(),
          requiredCoverages: z.array(id).min(1)
        })
        .strict()
    ),
    allocationPolicies: z.array(
      z
        .object({
          policyId: id,
          mode: z.enum(['shared', 'dedicated']),
          hoursPerFteMonth: positive,
          minimumBilledFte: fraction,
          dedicatedBilledFte: positive.refine(value => decimalPattern.test(value) && new Decimal(value).lte(1)),
          source: sourceSchema
        })
        .strict()
    ),
    pricingPolicies: z.array(
      z
        .object({
          profileId: id,
          tierCode: id,
          offerId: id,
          engagementCode: id,
          method: z.enum(['markup', 'target_margin']),
          rate: decimal,
          basis: z.enum(['all_costs', 'human']),
          minimumMargin: fraction.refine(value => decimalPattern.test(value) && new Decimal(value).lt(1)),
          source: sourceSchema
        })
        .strict()
    ),
    talentFactors: z.array(
      z
        .object({
          country,
          referenceCountry: country,
          factor: positive,
          source: sourceSchema
        })
        .strict()
    ),
    marketFactors: z.array(z.object({ country, factor: positive, source: sourceSchema }).strict()),
    resources: z.array(
      moneyRecord
        .extend({
          resourceId: id,
          label: z.string().min(1),
          kind: z.enum(['tool', 'platform_fee', 'talent_assurance', 'operations', 'setup']),
          unit: z.enum(['month', 'year', 'once']),
          scope: z.enum(['person', 'team', 'account']),
          covers: z.array(id).min(1)
        })
        .strict()
    ),
    fx: z.array(
      z
        .object({
          from: currency,
          to: currency,
          rate: positive,
          source: sourceSchema
        })
        .strict()
    )
  })
  .strict()

export const pricingV3InputSchema = z
  .object({
    request: pricingV3RequestSchema,
    snapshot: pricingV3SnapshotSchema
  })
  .strict()

// Contract 1.1.0 extends 1.0.0; it never replaces it. A behaviour change is a new contract plus a new engine in the
// registry below, so a frozen artifact keeps replaying with the engine that signed it.
const agreedNetAdjustmentSchema = z
  .object({
    adjustmentId: id,
    kind: z.literal('agreed_net'),
    // Agreed net in the output currency for the rows of `billing` class of `lineIds`, per period.
    amount: decimal,
    billing: z.enum(['monthly', 'setup']),
    lineIds: z.array(id).min(1),
    reason: z.string().min(1)
  })
  .strict()

export const pricingV3AdjustmentSchemaV11 = z.discriminatedUnion('kind', [
  discountAdjustmentSchema,
  agreedNetAdjustmentSchema
])

export const PRICING_V3_MAX_ADJUSTMENTS_V11 = 10

/** Commercial rounding rule, in the output currency: every priced row is raised to the next `multiple`. */
export const pricingV3PriceRoundingSchema = z.object({ multiple: positive, source: sourceSchema }).strict()

export const pricingV3RequestSchemaV11 = pricingV3RequestSchema
  .extend({
    schemaVersion: z.literal('1.1.0'),
    adjustments: z.array(pricingV3AdjustmentSchemaV11).max(PRICING_V3_MAX_ADJUSTMENTS_V11)
  })
  .strict()

export const pricingV3SnapshotSchemaV11 = pricingV3SnapshotSchema
  .extend({ schemaVersion: z.literal('1.1.0'), priceRounding: pricingV3PriceRoundingSchema.optional() })
  .strict()

export const pricingV3InputSchemaV11 = z
  .object({
    request: pricingV3RequestSchemaV11,
    snapshot: pricingV3SnapshotSchemaV11
  })
  .strict()

// Contract 1.2.0 extends 1.1.0 with one declared property of a market factor: where its price floor is read.
// `base_market` says the factor is an approved price decision for that country, so the floor of each row is judged on
// the price it would have had at factor 1 and the market adjustment is not punished again. Absent, the floor is read on
// the final net, as in every earlier contract. It is declared data, never inferred from the value of the factor.
export const PRICING_V3_MARKET_FLOOR_BASIS = 'base_market'

export const pricingV3MarketFactorSchemaV12 = pricingV3SnapshotSchema.shape.marketFactors.element
  .extend({ floorBasis: z.literal(PRICING_V3_MARKET_FLOOR_BASIS).optional() })
  .strict()

export const pricingV3RequestSchemaV12 = pricingV3RequestSchemaV11
  .extend({ schemaVersion: z.literal('1.2.0') })
  .strict()

export const pricingV3SnapshotSchemaV12 = pricingV3SnapshotSchemaV11
  .extend({ schemaVersion: z.literal('1.2.0'), marketFactors: z.array(pricingV3MarketFactorSchemaV12) })
  .strict()

export const pricingV3InputSchemaV12 = z
  .object({
    request: pricingV3RequestSchemaV12,
    snapshot: pricingV3SnapshotSchemaV12
  })
  .strict()

// Contract 1.3.0 extends 1.2.0 with the FORM of the engagement (on-going, on-demand, ...) as its own datum. The request
// declares the form and the snapshot carries its price ratio, exactly as the request declares the offer market and
// the snapshot carries its market factor. `engagementCode` is untouched: it keeps selecting the pricing policy (a
// billing cadence), while the form is a commercial condition that multiplies the price of every row. Forms are data:
// the kernel knows no list of them, only the ratio of the one the request names.
//
// Both keys are optional, like every capability a contract added: a 1.2.0 input relabelled 1.3.0 is a valid 1.3.0
// input and prices the same. A request that declares a form must find its ratio in the snapshot; one that declares
// none is priced at ratio 1. The keys exist only in 1.3.0: an earlier contract that carries them is rejected.
export const pricingV3EngagementFactorSchemaV13 = z
  .object({ form: id, priceRatio: positive, source: sourceSchema })
  .strict()

export const pricingV3RequestSchemaV13 = pricingV3RequestSchemaV12
  .extend({ schemaVersion: z.literal('1.3.0'), engagementForm: id.optional() })
  .strict()

export const pricingV3SnapshotSchemaV13 = pricingV3SnapshotSchemaV12
  .extend({
    schemaVersion: z.literal('1.3.0'),
    engagementFactors: z.array(pricingV3EngagementFactorSchemaV13).optional()
  })
  .strict()

export const pricingV3InputSchemaV13 = z
  .object({
    request: pricingV3RequestSchemaV13,
    snapshot: pricingV3SnapshotSchemaV13
  })
  .strict()

/** `PricingV3Input`, `PricingV3Request` and `PricingV3Snapshot` are contract 1.0.0, as every existing consumer types them. */
export type PricingV3Input = z.infer<typeof pricingV3InputSchema>
export type PricingV3Request = PricingV3Input['request']
export type PricingV3Snapshot = PricingV3Input['snapshot']
export type PricingV3InputV11 = z.infer<typeof pricingV3InputSchemaV11>
export type PricingV3RequestV11 = PricingV3InputV11['request']
export type PricingV3SnapshotV11 = PricingV3InputV11['snapshot']
export type PricingV3AdjustmentV11 = PricingV3RequestV11['adjustments'][number]
export type PricingV3PriceRounding = z.infer<typeof pricingV3PriceRoundingSchema>
export type PricingV3InputV12 = z.infer<typeof pricingV3InputSchemaV12>
export type PricingV3RequestV12 = PricingV3InputV12['request']
export type PricingV3SnapshotV12 = PricingV3InputV12['snapshot']
export type PricingV3MarketFactorV12 = z.infer<typeof pricingV3MarketFactorSchemaV12>
export type PricingV3InputV13 = z.infer<typeof pricingV3InputSchemaV13>
export type PricingV3RequestV13 = PricingV3InputV13['request']
export type PricingV3SnapshotV13 = PricingV3InputV13['snapshot']
export type PricingV3EngagementFactorV13 = z.infer<typeof pricingV3EngagementFactorSchemaV13>
export type PricingV3AnyInput = PricingV3Input | PricingV3InputV11 | PricingV3InputV12 | PricingV3InputV13
export type PricingV3Source = z.infer<typeof sourceSchema>

/**
 * Closed registry: input contract version -> engine that signs its result. Request and snapshot declare the same
 * version; the engine never infers or upgrades it. Replay accepts exactly the engines listed here.
 */
export const PRICING_V3_ENGINES = {
  '1.0.0': 'pricing-v3-local/1.0.0',
  '1.1.0': 'pricing-v3-local/1.1.0',
  '1.2.0': 'pricing-v3-local/1.2.0',
  '1.3.0': 'pricing-v3-local/1.3.0'
} as const

export type PricingV3ContractVersion = keyof typeof PRICING_V3_ENGINES
export type PricingV3EngineVersion = (typeof PRICING_V3_ENGINES)[PricingV3ContractVersion]

export const isPricingV3EngineVersion = (value: unknown): value is PricingV3EngineVersion =>
  Object.values(PRICING_V3_ENGINES).some(engine => engine === value)

/**
 * Parse with the schema of the version the request declares. Anything that does not declare a later registered
 * contract (1.0.0, an unknown version, no version, not an object) is judged by contract 1.0.0, so its diagnostics
 * stay what they always were. A union of the schemas would bury them under `invalid_union`.
 */
export function parsePricingV3Input(raw: unknown) {
  const declared = (raw as { request?: { schemaVersion?: unknown } } | null | undefined)?.request?.schemaVersion

  if (declared === '1.3.0') return { contract: '1.3.0' as const, parsed: pricingV3InputSchemaV13.safeParse(raw) }
  if (declared === '1.2.0') return { contract: '1.2.0' as const, parsed: pricingV3InputSchemaV12.safeParse(raw) }

  return declared === '1.1.0'
    ? { contract: '1.1.0' as const, parsed: pricingV3InputSchemaV11.safeParse(raw) }
    : { contract: '1.0.0' as const, parsed: pricingV3InputSchema.safeParse(raw) }
}
