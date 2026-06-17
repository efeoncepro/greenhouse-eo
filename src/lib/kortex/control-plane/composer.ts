import 'server-only'

import { readKortexBindingSnapshot } from './binding-reader'
import { readKortexRepositorySnapshot } from './repository-reader'
import { readKortexRuntimeSnapshot } from './runtime-reader'

import {
  KORTEX_CONTROL_PLANE_CONTRACT_VERSION,
  type ComposeKortexControlPlaneInput,
  type KortexBindingSnapshot,
  type KortexControlPlaneConfidence,
  type KortexControlPlanePacket,
  type KortexReaderResult,
  type KortexRepositorySnapshot,
  type KortexRuntimeSnapshot
} from './types'

type ComposerDeps = {
  readRepositorySnapshot?: typeof readKortexRepositorySnapshot
  readRuntimeSnapshot?: typeof readKortexRuntimeSnapshot
  readBindingSnapshot?: typeof readKortexBindingSnapshot
  now?: () => Date
}

const observedCapabilities = [
  'kortex.repository.read',
  'kortex.openapi.read',
  'kortex.portal_runtime.read',
  'kortex.audit_latest.read',
  'kortex.binding.read'
]

const firstPresent = (...values: Array<string | null | undefined>) =>
  values.find(value => typeof value === 'string' && value.trim()) ?? null

const countHealthySources = (statuses: Array<string | undefined>) =>
  statuses.filter(status => status === 'ok').length

const resolveConfidence = ({
  repository,
  runtime,
  binding,
  portalScoped
}: {
  repository: KortexReaderResult<KortexRepositorySnapshot>
  runtime: KortexRuntimeSnapshot
  binding: KortexReaderResult<KortexBindingSnapshot>
  portalScoped: boolean
}): KortexControlPlaneConfidence => {
  const healthySources = countHealthySources([
    repository.status,
    ...runtime.sources.map(source => source.status),
    binding.status
  ])

  if (healthySources === 0) return 'none'

  if (portalScoped && binding.status !== 'ok') {
    return healthySources >= 2 ? 'low' : 'none'
  }

  if (
    repository.status === 'ok' &&
    runtime.openApi &&
    (!portalScoped || binding.status === 'ok')
  ) {
    const runtimeFailures = runtime.sources.some(source => source.status === 'unavailable')

    return runtimeFailures ? 'medium' : 'high'
  }

  return healthySources >= 2 ? 'medium' : 'low'
}

export const composeKortexControlPlanePacket = async (
  input: ComposeKortexControlPlaneInput = {},
  deps: ComposerDeps = {}
): Promise<KortexControlPlanePacket> => {
  const readRepositorySnapshot = deps.readRepositorySnapshot ?? readKortexRepositorySnapshot
  const readRuntimeSnapshot = deps.readRuntimeSnapshot ?? readKortexRuntimeSnapshot
  const readBindingSnapshot = deps.readBindingSnapshot ?? readKortexBindingSnapshot
  const now = deps.now ?? (() => new Date())

  const [repository, runtime] = await Promise.all([
    readRepositorySnapshot(),
    readRuntimeSnapshot({
      portalId: input.portalId ?? null,
      hubspotPortalId: input.hubspotPortalId ?? null
    })
  ])

  const resolvedPortalId = firstPresent(
    input.portalId,
    runtime.greenhouseContext?.portalId,
    runtime.portalRuntime?.portalId
  )

  const resolvedHubspotPortalId = firstPresent(
    input.hubspotPortalId,
    runtime.greenhouseContext?.hubspotPortalId,
    runtime.portalRuntime?.hubspotPortalId
  )

  const binding = await readBindingSnapshot({
    portalId: resolvedPortalId,
    tenant: input.tenant ?? null
  })

  const portalScoped = Boolean(input.portalId || input.hubspotPortalId || resolvedPortalId || resolvedHubspotPortalId)
  const warnings: string[] = []

  if (repository.status !== 'ok') {
    warnings.push('Kortex GitHub repository source unavailable or degraded.')
  }

  for (const source of runtime.sources) {
    if (source.status === 'unavailable') {
      warnings.push(`${source.source} unavailable.`)
    }
  }

  if (portalScoped && binding.status !== 'ok') {
    warnings.push('Kortex portal binding could not be verified in Greenhouse sister_platform_bindings.')
  }

  return {
    contractVersion: KORTEX_CONTROL_PLANE_CONTRACT_VERSION,
    generatedAt: now().toISOString(),
    confidence: resolveConfidence({ repository, runtime, binding, portalScoped }),
    scope: {
      requestedPortalId: input.portalId ?? null,
      requestedHubspotPortalId: input.hubspotPortalId ?? null,
      resolvedPortalId,
      resolvedHubspotPortalId
    },
    repository: repository.data,
    runtime,
    binding: binding.data,
    observedCapabilities,
    sources: [
      repository.health,
      ...runtime.sources,
      binding.health
    ],
    warnings
  }
}
