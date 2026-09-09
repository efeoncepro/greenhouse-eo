import 'server-only'

import { randomUUID } from 'node:crypto'

import { z } from 'zod'

import { authorizeServiceEnablement } from '@/lib/client-portal/enablement/access'
import { applyServiceEnablement, rollbackServiceEnablement } from '@/lib/client-portal/enablement/commands'
import { previewServiceEnablement, readServiceEnablementReceipt } from '@/lib/client-portal/enablement/reader'
import { serviceEnablementRequestSchema, serviceEnablementApplySchema, serviceEnablementRollbackSchema } from '@/lib/client-portal/enablement/validation'
import { CLIENT_SERVICE_ENABLEMENT_COPY as copy } from '@/lib/copy/client-service-enablement'

import { NexaActionBlockedError } from './blocked-error'
import type { NexaActionContext, NexaActionDefinition } from './types'

const applyInput = z.union([serviceEnablementRequestSchema, serviceEnablementApplySchema])
const rollbackInput = serviceEnablementRollbackSchema.omit({ idempotencyKey: true }).extend({ idempotencyKey: z.string().optional() })
const isEnabled = () => process.env.CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED === 'true'
const isPermitted = (context: NexaActionContext) => context.authMode !== 'agent' && context.tenantType === 'efeonce_internal' && context.routeGroups.includes('admin')

export const applyClientServiceEnablementAction: NexaActionDefinition<z.infer<typeof applyInput>> = {
  actionKey: 'apply_client_service_enablement', intent: copy.applyTitle, sensitivity: 'high', domain: 'client_portal',
  requiredCapability: 'client_portal.module.enable', inputSchema: applyInput, isEnabled, isPermitted,
  authorize: async context => { await authorizeServiceEnablement(context.userId, 'apply') },
  async buildPreview(context, input) {
    await authorizeServiceEnablement(context.userId, 'apply')
    const request = 'proposal' in input ? input.proposal : input
    const preview = await previewServiceEnablement(request)

    if (!preview.canApply) throw new NexaActionBlockedError(copy.blocked)

    return { title: copy.applyTitle, summary: copy.applySummary,
      metrics: [
        { label: copy.organization, value: request.organizationId },
        { label: copy.modules, value: preview.changes.map(change => `${change.moduleKey}: ${change.action}`).join(', ') },
        { label: copy.people, value: request.personIds.join(', ') },
        { label: copy.checks, value: String(preview.readiness.length) }
      ],
      executionInput: { proposal: request, fingerprint: preview.fingerprint, idempotencyKey: `nexa-${randomUUID()}` }
    }
  },
  async execute(context, input) {
    const parsed = serviceEnablementApplySchema.safeParse(input)

    if (!parsed.success) throw new NexaActionBlockedError(copy.stale)

    const result = await applyServiceEnablement(parsed.data, context.userId)

    return { ok: true, summary: copy.applied, raw: { receipt: result.data, replayed: result.replayed } }
  },
  confirmation: { title: copy.applyTitle, body: copy.applyConfirm, confirmLabel: copy.applyTitle, cancelLabel: copy.cancel },
  expirationSeconds: 300
}

export const rollbackClientServiceEnablementAction: NexaActionDefinition<z.infer<typeof rollbackInput>> = {
  actionKey: 'rollback_client_service_enablement', intent: copy.rollbackTitle, sensitivity: 'high', domain: 'client_portal',
  requiredCapability: 'client_portal.module.pause', inputSchema: rollbackInput, isEnabled, isPermitted,
  authorize: async context => { await authorizeServiceEnablement(context.userId, 'rollback') },
  async buildPreview(context, input) {
    await authorizeServiceEnablement(context.userId, 'rollback')
    const receipt = await readServiceEnablementReceipt(input.organizationId, input.operationId)

    return { title: copy.rollbackTitle, summary: copy.rollbackSummary,
      metrics: [{ label: copy.organization, value: input.organizationId },
        { label: copy.assignments, value: receipt.created.map(item => item.assignmentId).join(', ') }],
      executionInput: { organizationId: input.organizationId, operationId: input.operationId, idempotencyKey: `nexa-${randomUUID()}` }
    }
  },
  async execute(context, input) {
    const result = await rollbackServiceEnablement(serviceEnablementRollbackSchema.parse(input), context.userId)

    return { ok: true, summary: copy.compensated, raw: { result: result.data, replayed: result.replayed } }
  },
  confirmation: { title: copy.rollbackTitle, body: copy.rollbackConfirm, confirmLabel: copy.rollbackTitle, cancelLabel: copy.cancel },
  expirationSeconds: 300
}
