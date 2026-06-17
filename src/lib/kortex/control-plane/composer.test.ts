import { describe, expect, it } from 'vitest'

import { composeKortexControlPlanePacket } from './composer'

import type {
  KortexBindingSnapshot,
  KortexReaderResult,
  KortexRepositorySnapshot,
  KortexRuntimeSnapshot
} from './types'

const fixedDate = new Date('2026-06-17T12:00:00.000Z')

const repositoryOk: KortexReaderResult<KortexRepositorySnapshot> = {
  status: 'ok',
  data: {
    owner: 'efeoncepro',
    repo: 'kortex',
    nameWithOwner: 'efeoncepro/kortex',
    url: 'https://github.com/efeoncepro/kortex',
    defaultBranch: 'main',
    isPrivate: true,
    pushedAt: '2026-05-28T20:19:56Z',
    updatedAt: '2026-05-28T20:20:01Z',
    latestCommit: {
      sha: 'abcdef1234567890',
      shortSha: 'abcdef1',
      url: 'https://github.com/efeoncepro/kortex/commit/abcdef1234567890',
      message: 'Update Kortex runtime',
      authoredAt: '2026-05-28T20:00:00Z'
    },
    openIssueCount: 2,
    openPullRequestCount: 1
  },
  health: {
    source: 'github',
    status: 'ok',
    checkedAt: fixedDate.toISOString()
  }
}

const runtimeOk: KortexRuntimeSnapshot = {
  baseUrl: 'https://kortex.example.test',
  openApi: {
    available: true,
    title: 'Kortex OAuth Service',
    version: '0.1.0',
    openapi: '3.1.0',
    pathCount: 9,
    readPathCount: 7,
    mutativePathCount: 2,
    securityDeclared: false,
    securitySchemeKeys: []
  },
  greenhouseContext: {
    portalId: 'portal-1',
    hubspotPortalId: '51183921',
    portalStatus: 'active',
    clientId: 'client-1',
    clientName: 'Efeonce',
    binding: {
      publicId: 'EO-SPB-0001',
      bindingId: 'spb-1',
      externalScopeId: 'portal-1',
      bindingStatus: 'active',
      greenhouseScopeType: 'internal'
    }
  },
  portalRuntime: null,
  latestAudit: null,
  deploymentSummary: null,
  adoptionKpis: null,
  sources: [
    {
      source: 'kortex_openapi',
      status: 'ok',
      checkedAt: fixedDate.toISOString()
    },
    {
      source: 'kortex_greenhouse_context',
      status: 'ok',
      checkedAt: fixedDate.toISOString()
    }
  ]
}

const bindingOk: KortexReaderResult<KortexBindingSnapshot> = {
  status: 'ok',
  data: {
    bindingFound: true,
    sisterPlatformKey: 'kortex',
    externalScopeType: 'portal',
    externalScopeId: 'portal-1',
    bindingStatus: 'active',
    greenhouseScopeType: 'internal',
    organizationId: null,
    organizationName: null,
    clientId: null,
    clientName: null,
    spaceId: null,
    spaceName: null,
    bindingId: 'spb-1',
    publicId: 'EO-SPB-0001'
  },
  health: {
    source: 'greenhouse_binding',
    status: 'ok',
    checkedAt: fixedDate.toISOString()
  }
}

describe('composeKortexControlPlanePacket', () => {
  it('derives Kortex portal binding from Greenhouse context and returns high confidence', async () => {
    const packet = await composeKortexControlPlanePacket(
      { hubspotPortalId: '51183921' },
      {
        now: () => fixedDate,
        readRepositorySnapshot: async () => repositoryOk,
        readRuntimeSnapshot: async () => runtimeOk,
        readBindingSnapshot: async input => {
          expect(input.portalId).toBe('portal-1')

          return bindingOk
        }
      }
    )

    expect(packet.confidence).toBe('high')
    expect(packet.scope).toMatchObject({
      requestedHubspotPortalId: '51183921',
      resolvedPortalId: 'portal-1',
      resolvedHubspotPortalId: '51183921'
    })
    expect(packet.binding?.publicId).toBe('EO-SPB-0001')
    expect(packet.observedCapabilities).toContain('kortex.portal_runtime.read')
  })

  it('degrades confidence when a portal-scoped packet cannot verify the binding', async () => {
    const packet = await composeKortexControlPlanePacket(
      { hubspotPortalId: '51183921' },
      {
        now: () => fixedDate,
        readRepositorySnapshot: async () => repositoryOk,
        readRuntimeSnapshot: async () => runtimeOk,
        readBindingSnapshot: async () => ({
          status: 'degraded',
          data: {
            bindingFound: false,
            sisterPlatformKey: 'kortex',
            externalScopeType: 'portal',
            externalScopeId: 'portal-1',
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
            checkedAt: fixedDate.toISOString()
          }
        })
      }
    )

    expect(packet.confidence).toBe('low')
    expect(packet.warnings).toContain('Kortex portal binding could not be verified in Greenhouse sister_platform_bindings.')
  })
})
