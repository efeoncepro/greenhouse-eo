import { z } from 'zod'

const id = z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9_.:-]+$/)
const key = z.string().trim().min(8).max(160).regex(/^[a-zA-Z0-9_.:-]+$/)

export const serviceEnablementRequestSchema = z.object({
  organizationId: id,
  targets: z.array(z.object({ serviceId: id.nullable(), moduleKey: id }).strict()).min(1).max(20),
  personIds: z.array(id).max(50)
}).strict().superRefine((input, ctx) => {
  if (new Set(input.targets.map(target => target.moduleKey)).size !== input.targets.length ||
    new Set(input.personIds).size !== input.personIds.length) {
    ctx.addIssue({ code: 'custom', message: 'Duplicate module or person references are not allowed' })
  }
})

export const serviceEnablementApplySchema = z.object({
  proposal: serviceEnablementRequestSchema,
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: key
}).strict()

export const serviceEnablementRollbackSchema = z.object({
  organizationId: id,
  operationId: id,
  idempotencyKey: key
}).strict()
