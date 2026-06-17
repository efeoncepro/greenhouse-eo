import 'server-only'

import { redactErrorForResponse } from '@/lib/observability/redact'
import { resolveSisterPlatformBinding } from '@/lib/sister-platforms/bindings'

import type {
  ComposeKortexControlPlaneInput,
  KortexBindingSnapshot,
  KortexReaderResult
} from './types'

const nowIso = () => new Date().toISOString()

const elapsedMs = (startedAt: number) => Math.max(0, Math.round(performance.now() - startedAt))

export const readKortexBindingSnapshot = async ({
  portalId,
  tenant
}: Pick<ComposeKortexControlPlaneInput, 'portalId' | 'tenant'>): Promise<KortexReaderResult<KortexBindingSnapshot>> => {
  const startedAt = performance.now()

  if (!portalId) {
    return {
      status: 'skipped',
      data: null,
      health: {
        source: 'greenhouse_binding',
        status: 'skipped',
        checkedAt: nowIso(),
        latencyMs: elapsedMs(startedAt),
        note: 'Kortex portalId not available'
      }
    }
  }

  try {
    const binding = await resolveSisterPlatformBinding({
      sisterPlatformKey: 'kortex',
      externalScopeType: 'portal',
      externalScopeId: portalId,
      tenant
    })

    if (!binding) {
      return {
        status: 'degraded',
        data: {
          bindingFound: false,
          sisterPlatformKey: 'kortex',
          externalScopeType: 'portal',
          externalScopeId: portalId,
          bindingStatus: null,
          greenhouseScopeType: null,
          organizationId: null,
          organizationName: null,
          clientId: null,
          clientName: null,
          spaceId: null,
          spaceName: null,
          bindingId: null,
          publicId: null
        },
        health: {
          source: 'greenhouse_binding',
          status: 'degraded',
          checkedAt: nowIso(),
          latencyMs: elapsedMs(startedAt),
          note: 'No active sister_platform_bindings row found for Kortex portal'
        }
      }
    }

    return {
      status: 'ok',
      data: {
        bindingFound: true,
        sisterPlatformKey: 'kortex',
        externalScopeType: 'portal',
        externalScopeId: binding.externalScopeId,
        bindingStatus: binding.bindingStatus,
        greenhouseScopeType: binding.greenhouseScopeType,
        organizationId: binding.organizationId,
        organizationName: binding.organizationName,
        clientId: binding.clientId,
        clientName: binding.clientName,
        spaceId: binding.spaceId,
        spaceName: binding.spaceName,
        bindingId: binding.bindingId,
        publicId: binding.publicId
      },
      health: {
        source: 'greenhouse_binding',
        status: 'ok',
        checkedAt: nowIso(),
        latencyMs: elapsedMs(startedAt)
      }
    }
  } catch (error) {
    return {
      status: 'unavailable',
      data: null,
      health: {
        source: 'greenhouse_binding',
        status: 'unavailable',
        checkedAt: nowIso(),
        latencyMs: elapsedMs(startedAt),
        error: redactErrorForResponse(error)
      }
    }
  }
}
