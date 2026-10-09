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
    adjustments: z
      .array(
        z
          .object({
            adjustmentId: id,
            kind: z.literal('discount'),
            rate: fraction,
            lineIds: z.array(id).min(1),
            reason: z.string().min(1)
          })
          .strict()
      )
      .max(1),
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

export type PricingV3Input = z.infer<typeof pricingV3InputSchema>
export type PricingV3Request = PricingV3Input['request']
export type PricingV3Snapshot = PricingV3Input['snapshot']
export type PricingV3Source = z.infer<typeof sourceSchema>
export const ENGINE_VERSION = 'pricing-v3-local/1.0.0'
