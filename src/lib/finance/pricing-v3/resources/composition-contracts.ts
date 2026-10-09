import Decimal from 'decimal.js'
import { z } from 'zod'

import { briefSchema } from '../catalog/contracts'
import { pricingV3RequestSchema, sourceSchema } from '../schemas'

const id = z.string().min(1).max(80)
const decimal = z.string().regex(/^(0|[1-9]\d{0,12})(\.\d{1,18})?$/)
const positive = decimal.refine(v => new Decimal(v).gt(0))
const share = positive.refine(v => new Decimal(v).lte(1))
const period = z.number().int().min(1).max(60)

export const compositionPolicySchema = z
  .object({
    schemaVersion: z.literal('pricing-v3-resource-policy/1'),
    version: id,
    mode: z.literal('review_only'),
    source: sourceSchema,
    commonToolIds: z.array(id).min(1).max(30),
    taskCodes: z.array(id).min(1).max(100),
    profileTasks: z.array(z.object({ profileId: id, tasks: z.array(id).max(30) }).strict()).max(100),
    tools: z
      .array(
        z
          .object({
            toolId: id,
            label: id,
            tasks: z.array(id).max(30),
            access: z.enum(['named', 'shared', 'credits']),
            ai: z.boolean(),
            providerId: id.optional(),
            prices: z
              .array(
                z
                  .object({
                    priceId: id,
                    basis: z.enum(['seat', 'package']),
                    minimumContractSeats: z.number().int().min(1).max(10000).optional(),
                    includedSeats: z.number().int().min(1).max(10000).optional(),
                    bundledToolIds: z.array(id).max(30).optional(),
                    catalogResourceId: id.optional(),
                    price: z
                      .object({
                        amount: decimal,
                        currency: z.string().regex(/^[A-Z]{3}$/),
                        unit: z.enum(['month', 'year']),
                        source: sourceSchema
                      })
                      .strict()
                      .optional(),
                    pendingReason: z.string().min(1).optional()
                  })
                  .strict()
                  .refine(
                    v =>
                      Number(Boolean(v.catalogResourceId)) +
                        Number(Boolean(v.price)) +
                        Number(Boolean(v.pendingReason)) ===
                      1
                  )
              )
              .max(20)
          })
          .strict()
      )
      .min(1)
      .max(100)
  })
  .strict()

export const compositionDemandSchema = z
  .object({
    schemaVersion: z.literal('pricing-v3-composition-demand/1'),
    commercialUnit: z.enum(['role_capacity', 'managed_service']),
    brief: briefSchema,
    work: z
      .array(
        z
          .object({
            lineId: id,
            assigneeIds: z.array(id).min(1).max(100),
            tasks: z.array(id).max(30),
            aiToolIds: z.array(id).max(30),
            aiSelectionReason: z.string().min(1).max(1000).optional(),
            creditDemand: z
              .array(z.object({ periodId: period, toolId: id, credits: z.number().int().min(1).max(1000000) }).strict())
              .max(120)
          })
          .strict()
      )
      .min(1)
      .max(100),
    serviceToolIds: z.array(id).max(30),
    allocations: z
      .array(
        z
          .object({
            periodId: period,
            toolId: id,
            priceId: id,
            quantity: positive,
            serviceShare: share,
            seatCapacity: z.number().int().min(1).max(10000).optional(),
            contractSeatCount: z.number().int().min(1).max(10000).optional(),
            driver: z.object({ unit: id, totalUnits: positive, allocatedUnits: positive }).strict(),
            reason: z.string().min(1).max(1000)
          })
          .strict()
      )
      .max(6000),
    creditBudgets: z
      .array(
        z
          .object({
            periodId: period,
            toolId: id,
            purchaseDate: pricingV3RequestSchema.shape.quoteDate,
            useBy: pricingV3RequestSchema.shape.quoteDate,
            subscriptionCreditsAllocated: z.number().int().min(0).max(1000000),
            subscriptionCreditsAvailable: z.number().int().min(0).max(1000000),
            activeSubscription: z.boolean(),
            allowRepeatedPacks: z.boolean().default(false)
          })
          .strict()
      )
      .max(120),
    fxRecordIds: z.array(id).max(30),
    clientProvidedTools: z
      .array(
        z
          .object({
            periodId: period,
            toolId: id,
            lineIds: z.array(id).min(1).max(100),
            reason: z.string().min(1).max(1000),
            evidence: sourceSchema
          })
          .strict()
      )
      .max(6000)
      .optional()
  })
  .strict()

export type CompositionDemand = z.infer<typeof compositionDemandSchema>
export type CompositionPolicy = z.infer<typeof compositionPolicySchema>
