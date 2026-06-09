import 'server-only'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { buildOrganizationWorkspaceSubjectFromTenant } from '@/lib/organization-workspace/build-projection-subject'
import {
  OrganizationWorkspaceCompactSignalsNotFoundError,
  readOrganizationWorkspaceCompactSignalsSafely
} from '@/lib/organization-workspace/compact-signals'
import type { EntrypointContext } from '@/lib/organization-workspace/projection-types'

const parsePositiveInt = (value: string | null, fallback: number | null = null) => {
  if (!value) return fallback

  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export const getAppOrganizationCompactSignalsPayload = async ({
  context,
  request,
  organizationId,
  entrypointContext = 'agency'
}: {
  context: AppPlatformRequestContext
  request: Request
  organizationId: string
  entrypointContext?: EntrypointContext
}) => {
  const url = new URL(request.url)

  try {
    return await readOrganizationWorkspaceCompactSignalsSafely({
      subject: buildOrganizationWorkspaceSubjectFromTenant(context.tenant),
      organizationId,
      entrypointContext,
      asOf: url.searchParams.get('asOf'),
      periodYear: parsePositiveInt(url.searchParams.get('year')),
      periodMonth: parsePositiveInt(url.searchParams.get('month')),
      limits: {
        account360: parsePositiveInt(url.searchParams.get('accountLimit'), 20) ?? 20,
        recentSignals: parsePositiveInt(url.searchParams.get('recentSignalsLimit'), 6) ?? 6,
        nextActions: parsePositiveInt(url.searchParams.get('nextActionsLimit'), 5) ?? 5
      }
    })
  } catch (error) {
    if (error instanceof OrganizationWorkspaceCompactSignalsNotFoundError) {
      throw new ApiPlatformError('Organization not found.', {
        statusCode: 404,
        errorCode: 'not_found'
      })
    }

    throw error
  }
}
