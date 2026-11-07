import 'server-only'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { query } from '@/lib/db'
import {
  isSpaceAccessVerb,
  listAuthorizedSpaces,
  resolveSpaceContext,
  type AuthorizedSpaceContext,
  type SpaceAccessVerb
} from '@/lib/tenant/space-authority'

/**
 * TASK-2096 — App lane over the operational-account (Space) authority.
 *
 *   GET /api/platform/app/spaces                                  → Spaces the user may act on
 *   GET /api/platform/app/spaces/{spaceId}/services               → Services of ONE authorized Space
 *   GET /api/platform/app/spaces/{spaceId}/services/{serviceId}   → one Service of that Space
 *
 * The principal is the authenticated App user; the Space comes from the path and only narrows.
 * Every request re-resolves authority (no claim, cookie or cached session Space is trusted), so a
 * revoked grant or a disabled person is denied on the very next call. Services are the first
 * resource read through the resolver because they carry `space_id` natively; Insights reports
 * need their own Space binding first (TASK-1960).
 */

const readNeed = (request: Request): SpaceAccessVerb => {
  const raw = new URL(request.url).searchParams.get('need')

  if (raw === null) return 'read'

  if (!isSpaceAccessVerb(raw)) {
    throw new ApiPlatformError('"need" must be "read" or "create".', { statusCode: 400, errorCode: 'bad_request' })
  }

  return raw
}

const requireSpaceContext = async (
  context: AppPlatformRequestContext,
  target: { spaceId: string; serviceId?: string | null; need: SpaceAccessVerb }
): Promise<AuthorizedSpaceContext> => {
  const resolution = await resolveSpaceContext({ userId: context.tenant.userId, ...target })

  if (resolution.status === 'authorized') return resolution.context

  if (resolution.status === 'selection_required') {
    throw new ApiPlatformError('Choose one operational account.', { statusCode: 409, errorCode: 'space_selection_required' })
  }

  // A foreign or unknown Space and a missing Service answer 404, so ids cannot be probed.
  const notFound = resolution.reason === 'space_not_allowed' || resolution.reason === 'organization_mismatch' ||
    resolution.reason === 'service_not_in_space'

  throw new ApiPlatformError(
    notFound ? 'Operational account not found.' : 'Operational account access denied.',
    { statusCode: notFound ? 404 : 403, errorCode: notFound ? 'not_found' : 'space_context_denied', details: { reason: resolution.reason } }
  )
}

export const listAppAuthorizedSpaces = async ({ context, request }: { context: AppPlatformRequestContext; request: Request }) => {
  const need = readNeed(request)
  const spaces = await listAuthorizedSpaces(context.tenant.userId, need)

  return {
    data: spaces.map(space => ({
      organizationId: space.organizationId,
      organizationName: space.organizationName,
      spaceId: space.spaceId,
      spacePublicId: space.spacePublicId,
      verbs: space.verbs,
      source: space.source
    })),
    meta: { count: spaces.length, need, selectionRequired: spaces.length > 1 }
  }
}

type ServiceRow = { service_id: string; name: string; status: string; space_id: string }

const toService = (row: ServiceRow) => ({ serviceId: row.service_id, name: row.name, status: row.status, spaceId: row.space_id })

export const listAppSpaceServices = async ({ context, request, spaceId }: { context: AppPlatformRequestContext; request: Request; spaceId: string }) => {
  const space = await requireSpaceContext(context, { spaceId, need: readNeed(request) })

  const rows = await query<ServiceRow>(
    `SELECT service_id, name, status, space_id
       FROM greenhouse_core.services
      WHERE space_id = $1 AND active = true
        AND (organization_id IS NULL OR organization_id = $2)
      ORDER BY service_id COLLATE "C"`,
    [space.spaceId, space.organizationId]
  )

  return { data: rows.map(toService), meta: { count: rows.length, spaceId: space.spaceId } }
}

export const getAppSpaceService = async ({ context, request, spaceId, serviceId }: {
  context: AppPlatformRequestContext; request: Request; spaceId: string; serviceId: string
}) => {
  const space = await requireSpaceContext(context, { spaceId, serviceId, need: readNeed(request) })

  const rows = await query<ServiceRow>(
    `SELECT service_id, name, status, space_id FROM greenhouse_core.services WHERE service_id = $1 AND space_id = $2`,
    [serviceId, space.spaceId]
  )

  if (rows.length !== 1) throw new ApiPlatformError('Operational account not found.', { statusCode: 404, errorCode: 'not_found' })

  return { data: toService(rows[0]) }
}
