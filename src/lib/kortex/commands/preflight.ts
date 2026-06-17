import 'server-only'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { query } from '@/lib/db'
import {
  composeKortexControlPlanePacket,
  type ComposeKortexControlPlaneInput
} from '@/lib/kortex/control-plane'

import { isKortexCommandPortalAllowed } from './flags'
import type { KortexCommandRequest, KortexCommandScope, KortexCommandSourceHealth } from './types'

const nowIso = () => new Date().toISOString()
const elapsedMs = (startedAt: number) => Math.max(0, Math.round(performance.now() - startedAt))

const toNullableString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)

  return null
}

export const resolveKortexCommandScope = async ({
  body,
  tenant
}: {
  body: KortexCommandRequest
  tenant: ComposeKortexControlPlaneInput['tenant']
}): Promise<{ scope: KortexCommandScope; source: KortexCommandSourceHealth; warnings: string[] }> => {
  const startedAt = performance.now()

  const packet = await composeKortexControlPlanePacket({
    portalId: toNullableString(body.portalId),
    hubspotPortalId: toNullableString(body.hubspotPortalId),
    tenant
  })

  const binding = packet.binding
  const resolvedPortalId = packet.scope.resolvedPortalId
  const resolvedHubspotPortalId = packet.scope.resolvedHubspotPortalId

  if (!binding?.bindingFound || !binding.bindingId) {
    throw new ApiPlatformError('Kortex portal binding is required before executing commands.', {
      statusCode: 409,
      errorCode: 'kortex_binding_missing'
    })
  }

  if (body.bindingId && body.bindingId !== binding.bindingId && body.bindingId !== binding.publicId) {
    throw new ApiPlatformError('Kortex binding does not match the requested command scope.', {
      statusCode: 409,
      errorCode: 'kortex_portal_mismatch'
    })
  }

  if (!isKortexCommandPortalAllowed({ portalId: resolvedPortalId, hubspotPortalId: resolvedHubspotPortalId })) {
    throw new ApiPlatformError('Kortex portal is not allowlisted for command execution.', {
      statusCode: 403,
      errorCode: 'kortex_portal_mismatch'
    })
  }

  return {
    scope: {
      requestedPortalId: toNullableString(body.portalId),
      requestedHubspotPortalId: toNullableString(body.hubspotPortalId),
      resolvedPortalId,
      resolvedHubspotPortalId,
      bindingId: binding.bindingId,
      bindingPublicId: binding.publicId,
      greenhouseScopeType: binding.greenhouseScopeType,
      organizationId: binding.organizationId,
      clientId: binding.clientId,
      spaceId: binding.spaceId
    },
    source: {
      source: 'greenhouse_preflight',
      status: 'ok',
      checkedAt: nowIso(),
      latencyMs: elapsedMs(startedAt)
    },
    warnings: packet.warnings
  }
}

export const verifyKortexDryRunPreview = async ({
  previewCommandExecutionId,
  releaseCandidateId
}: {
  previewCommandExecutionId: string | null | undefined
  releaseCandidateId: string
}) => {
  const previewId = previewCommandExecutionId?.trim()

  if (!previewId) {
    throw new ApiPlatformError('A dry-run preview command execution is required before live execute.', {
      statusCode: 409,
      errorCode: 'kortex_preview_required'
    })
  }

  const rows = await query<{ command_execution_id: string }>(
    `
      SELECT command_execution_id
      FROM greenhouse_core.api_platform_command_executions
      WHERE command_execution_id = $1
        AND route_key = 'kortex.command.kortex.strategy.release_candidate.dry_run'
        AND status = 'completed'
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND response_body->'data'->'summary'->>'releaseCandidateId' = $2
      LIMIT 1
    `,
    [previewId, releaseCandidateId]
  )

  if (!rows[0]) {
    throw new ApiPlatformError('Dry-run preview is missing, stale, or does not match the release candidate.', {
      statusCode: 409,
      errorCode: 'kortex_preview_required'
    })
  }
}
