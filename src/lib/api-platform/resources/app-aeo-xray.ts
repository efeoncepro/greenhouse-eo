import 'server-only'

import { z } from 'zod'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { resolveXrayAuthority, type XrayAccessNeed } from '@/lib/aeo-xray/authz'
import * as commands from '@/lib/aeo-xray/commands'
import { XrayError } from '@/lib/aeo-xray/types'

const uuid = z.string().uuid()

const createBody = z
  .object({
    title: z.string().trim().min(1).max(200),
    prospectReference: z.string().trim().min(1).max(200),
    intent: z.unknown()
  })
  .strict()

const draftBody = z.object({ expectedRevision: z.number().int().positive(), intent: z.unknown() }).strict()

const issueBody = z
  .object({ expectedRevision: z.number().int().positive(), idempotencyKey: z.string().min(8).max(200) })
  .strict()

const shareBody = z
  .object({
    expiresInDays: z.number().int().min(1).max(90).optional(),
    label: z.string().trim().min(1).max(120).optional()
  })
  .strict()

type Operation = 'list' | 'get' | 'create' | 'update' | 'issue' | 'withdraw' | 'shares' | 'share' | 'revoke'

const access: Record<Operation, XrayAccessNeed> = {
  list: 'read',
  get: 'read',
  create: 'create',
  update: 'update',
  issue: 'issue',
  withdraw: 'withdraw',
  shares: 'share_read',
  share: 'share_create',
  revoke: 'share_revoke'
}

/** Thin App adapter. Canonical commands own state, revisions, immutable editions and auditing. */
export async function runXrayOperation(input: {
  context: AppPlatformRequestContext
  operation: Operation
  id?: string
  body?: unknown
}): Promise<{ data: unknown; status: number }> {
  try {
    const authority = await resolveXrayAuthority(input.context, access[input.operation])
    const id = input.id === undefined ? undefined : uuid.parse(input.id)
    let data: unknown

    switch (input.operation) {
      case 'list':
        data = await commands.listXrayCases(authority)
        break
      case 'get':
        data = await commands.readXrayCase(authority, uuid.parse(id))
        break

      case 'create': {
        const body = createBody.parse(input.body)

        data = await commands.createXrayCase(authority, { ...body, intent: body.intent })
        break
      }

      case 'update': {
        const body = draftBody.parse(input.body)

        data = await commands.updateXrayDraft(authority, uuid.parse(id), { ...body, intent: body.intent })
        break
      }

      case 'issue':
        data = await commands.issueXrayEdition(authority, uuid.parse(id), issueBody.parse(input.body))
        break
      case 'withdraw':
        z.object({}).strict().parse(input.body)
        data = await commands.withdrawXrayEdition(authority, uuid.parse(id))
        break
      case 'shares':
        data = await commands.listXrayShares(authority, uuid.parse(id))
        break
      case 'share':
        data = await commands.createXrayShare(authority, uuid.parse(id), shareBody.parse(input.body))
        break
      case 'revoke':
        z.object({}).strict().parse(input.body)
        data = await commands.revokeXrayShare(authority, uuid.parse(id))
        break
    }

    return { data, status: input.operation === 'create' || input.operation === 'share' ? 201 : 200 }
  } catch (error) {
    if (error instanceof ApiPlatformError) throw error
    if (error instanceof z.ZodError)
      throw new ApiPlatformError('Invalid X-Ray request.', { statusCode: 400, errorCode: 'bad_request' })

    if (error instanceof XrayError) {
      const status = error.status

      throw new ApiPlatformError('X-Ray request could not be completed.', {
        statusCode: status,
        errorCode:
          status === 404
            ? 'not_found'
            : status === 403
              ? 'forbidden'
              : status === 409
                ? 'idempotency_conflict'
                : status === 429
                  ? 'rate_limited'
                  : status === 503
                    ? 'service_unavailable'
                    : 'bad_request',
        details: { code: error.code }
      })
    }

    // DB/validator failures can contain authored material; do not emit the raw exception.
    throw new ApiPlatformError('X-Ray is temporarily unavailable.', {
      statusCode: 503,
      errorCode: 'service_unavailable'
    })
  }
}
