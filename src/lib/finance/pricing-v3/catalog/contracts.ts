import { z } from 'zod'

import {
  PRICING_V3_MAX_ADJUSTMENTS_V11,
  PRICING_V3_MAX_THIRD_PARTY_COSTS,
  PRICING_V3_THIRD_PARTY_BILLING,
  pricingV3AdjustmentSchemaV14,
  pricingV3ContingencyReserveSchemaV14,
  pricingV3EngagementFactorSchemaV13,
  pricingV3MarketFactorSchemaV12,
  pricingV3PriceRoundingSchema,
  pricingV3RequestSchema,
  pricingV3SnapshotSchema,
  pricingV3ThirdPartyCostSchemaV14,
  pricingV3ThirdPartyPolicySchemaV14,
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

/** What a quote is sold as. A demand declares one and, from the `offer` record on, the catalog says which. */
export const COMMERCIAL_UNITS = ['role_capacity', 'managed_service'] as const

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
  // governs that offer and prevails over the general one of the same form. Like a market factor, the ratio is any
  // positive decimal: there is no cap, so a mistyped value is accepted.
  record(
    'engagement_factor',
    pricingV3EngagementFactorSchemaV13.omit({ source: true }).extend({ offerId: id.optional() }).strict()
  ),
  // Price rule of one category of third-party cost (contract 1.4.0): what Efeonce buys for a job and re-invoices is
  // priced by its category and by nothing a quote writes. Categories are data, so the catalog decides which exist.
  // `markup` with rate 0, floor 0 and rounding `none` is a cost re-invoiced at cost. With `offerId` the record
  // governs that offer and prevails over the general one of the same category. `minimumMargin` is the floor of the
  // row and cannot ask for more than the method gives: validation refuses a rule that would flag itself.
  record(
    'third_party_policy',
    pricingV3ThirdPartyPolicySchemaV14
      .omit({ source: true })
      .extend({ label: z.string().min(1).max(120), offerId: id.optional() })
      .strict()
  ),
  // Contingency reserve (contract 1.4.0): a rate over the person cost (`human`) or over every own cost (`own_costs`)
  // of each team row, added as cost. It is selected by what the record names: an offer, a form of engagement, both,
  // or neither (general). The rate is checked by catalog validation, so a rate out of range is named as such.
  record(
    'contingency_reserve',
    pricingV3ContingencyReserveSchemaV14
      .omit({ source: true })
      .extend({
        label: z.string().min(1).max(120),
        rate: decimal,
        offerId: id.optional(),
        engagementForm: id.optional()
      })
      .strict()
  ),
  // What an offer is sold as: one record per offer, the single source of its commercial unit. `managed_service` is
  // sold as one fee and never as its team; `role_capacity` is sold line by line. It is a fact of the offer and not
  // of each pricing policy, which is one record per profile and tier and would let an offer contradict itself. No
  // kernel input carries it: the composition holds a demand to it and the scaffold of a demand reads it. A catalog
  // without the record states nothing about the offer, and every quote resolves as it always did.
  record(
    'offer',
    z
      .object({
        offerId: id,
        label: z.string().min(1).max(120),
        commercialUnit: z.enum(COMMERCIAL_UNITS)
      })
      .strict()
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

// A third-party cost as the brief declares it: what the kernel receives (see `pricingV3ThirdPartyCostSchemaV14`)
// plus the supplier, which is internal and never leaves the brief. The evidence takes the place of `source`.
const thirdPartyCost = pricingV3ThirdPartyCostSchemaV14
  .omit({ source: true })
  .extend({ supplier: z.string().min(1).max(200) })

/** Billing classes of the kernel rows an agreed total is distributed over, by the suffix of the adjustment each gets. */
export const AGREED_TOTAL_BILLING_CLASSES = ['monthly', 'setup', PRICING_V3_THIRD_PARTY_BILLING] as const

// The agreed price of the whole quote: the net of the rows of `lineIds` over the whole term, every period and every
// billing class together, in the output currency. `lineIds` names lines and, to bring them into the price,
// re-invoiced third-party costs by `costId`. The kernel never receives it: resolution turns it into the kernel's own
// agreed nets, one per period and billing class (`agreed-total.ts`), each named `<adjustmentId>:<billing class>`.
// The id is bounded so that name always fits the id of the kernel (120 characters).
const agreedTotalAdjustment = z
  .object({
    adjustmentId: z.string().min(1).max(100),
    kind: z.literal('agreed_total'),
    amount: decimal,
    lineIds: z.array(id).min(1),
    reason: z.string().min(1)
  })
  .strict()

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
            // Where the dedication of the line comes from and whether it is confirmed or an estimate: the source
            // shape of every other evidence. `compose workload` writes it from the sources of the volumes it
            // dimensioned; a dedication agreed with the client is declared here by hand. It never reaches the kernel:
            // the readings of the frozen quote count the cost the dedication governs by it. A line without it has a
            // dedication nobody evidenced, which is read as such and never as confirmed. No default, for the reason
            // `thirdPartyCosts` has none.
            dedicationEvidence: sourceSchema.optional(),
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
    // resolution only declares contract 1.1.0 when the brief uses more than that. Contract 1.4.0 widens it once more:
    // an agreed net of billing `third_party` names third-party costs by `costId`. `agreed_total` is of the brief
    // alone: the kernel is handed the agreed nets it resolves to, never the declaration.
    adjustments: z
      .array(z.discriminatedUnion('kind', [...pricingV3AdjustmentSchemaV14.options, agreedTotalAdjustment]))
      .max(PRICING_V3_MAX_ADJUSTMENTS_V11)
      .default([]),
    taxTreatment: pricingV3RequestSchema.shape.taxTreatment.default({ kind: 'not_resolved' }),
    // Third-party costs of the engagement (contract 1.4.0). The quote declares the amount and its evidence; the price
    // rule comes from the `third_party_policy` of `category` and is never written here. `reinvoiced`: Efeonce buys
    // and invoices it, so it becomes a commercial row of its own. `client_direct`: the client pays the supplier; it
    // is frozen here as a note and reaches no calculation and no total. `periodIds` is required: the full
    // `amount x quantity` is charged in each listed period, so a one-off is never multiplied by the term.
    // No default: the parsed brief is inside every frozen result, and a defaulted key would move every old digest.
    thirdPartyCosts: z
      .array(
        z.discriminatedUnion('settlement', [
          thirdPartyCost.extend({ settlement: z.literal('reinvoiced'), evidence: sourceSchema }).strict(),
          thirdPartyCost.extend({ settlement: z.literal('client_direct'), evidence: sourceSchema.optional() }).strict()
        ])
      )
      .max(PRICING_V3_MAX_THIRD_PARTY_COSTS)
      .optional(),
    // The contingency reserve of a quote is selected from the catalog and leaves it only through this declaration,
    // with its reason. A union on `kind` so another declaration can be added later without touching this one.
    contingency: z
      .discriminatedUnion('kind', [
        z.object({ kind: z.literal('waived'), reason: z.string().min(1).max(1000) }).strict()
      ])
      .optional()
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
