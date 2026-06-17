import { describe, expect, it } from 'vitest'

import {
  isAllowedKortexControlPlaneGetPath,
  summarizeGreenhouseContext,
  summarizeLatestAudit,
  summarizeOpenApi,
  summarizePortalRuntime
} from './runtime-reader'

describe('Kortex control-plane runtime reader', () => {
  it('allowlists only read-only Kortex endpoints', () => {
    expect(isAllowedKortexControlPlaneGetPath('/openapi.json')).toBe(true)
    expect(isAllowedKortexControlPlaneGetPath('/api/v1/audits/latest')).toBe(true)
    expect(isAllowedKortexControlPlaneGetPath('/api/v1/portals/51183921/adoption-kpis')).toBe(true)
    expect(isAllowedKortexControlPlaneGetPath('/portal-runtime/overview')).toBe(true)

    expect(isAllowedKortexControlPlaneGetPath('/api/v1/audits/run')).toBe(false)
    expect(isAllowedKortexControlPlaneGetPath('/api/v1/strategy/workspaces/ws-1/compile')).toBe(false)
    expect(isAllowedKortexControlPlaneGetPath('/api/v1/strategy/release-candidates/rc-1/execute')).toBe(false)
  })

  it('summarizes OpenAPI without leaking raw path payloads', () => {
    const summary = summarizeOpenApi({
      openapi: '3.1.0',
      info: { title: 'Kortex OAuth Service', version: '0.1.0' },
      paths: {
        '/openapi.json': { get: {} },
        '/api/v1/audits/latest': { get: {} },
        '/api/v1/audits/run': { post: {} }
      },
      components: {}
    })

    expect(summary).toMatchObject({
      available: true,
      title: 'Kortex OAuth Service',
      version: '0.1.0',
      pathCount: 3,
      readPathCount: 2,
      mutativePathCount: 1,
      securityDeclared: false
    })
  })

  it('summarizes Greenhouse context binding from Kortex bridge response', () => {
    const summary = summarizeGreenhouseContext({
      portal: {
        portal_id: '0c0af3a3-627e-4e05-96f3-557712a2e06a',
        hubspot_portal_id: 51183921,
        portal_status: 'active',
        client: {
          client_id: 'client-1',
          display_name: 'Efeonce'
        }
      },
      bridge: {
        binding: {
          publicId: 'EO-SPB-0001',
          bindingId: 'spb-1',
          externalScopeId: '0c0af3a3-627e-4e05-96f3-557712a2e06a',
          bindingStatus: 'active',
          greenhouseScopeType: 'internal'
        }
      }
    })

    expect(summary).toMatchObject({
      portalId: '0c0af3a3-627e-4e05-96f3-557712a2e06a',
      hubspotPortalId: '51183921',
      portalStatus: 'active',
      clientName: 'Efeonce',
      binding: {
        publicId: 'EO-SPB-0001',
        bindingStatus: 'active'
      }
    })
  })

  it('summarizes portal runtime and avoids returning raw live schema errors', () => {
    const summary = summarizePortalRuntime({
      environment: 'staging',
      selected_portal: {
        portal_id: 'portal-1',
        hubspot_portal_id: '51183921',
        portal_status: 'active',
        hubspot_installation: {
          install_status: 'active',
          granted_scope_count: 145
        },
        latest_deployment: {
          deployment_run_id: 'deployment-1',
          status: 'failed',
          deployment_scope: 'schema'
        },
        live_schema: {
          available: false,
          error: 'raw upstream token refresh details must not surface'
        }
      }
    })

    expect(summary).toMatchObject({
      environment: 'staging',
      portalId: 'portal-1',
      hubspotPortalId: '51183921',
      installationStatus: 'active',
      latestDeployment: {
        deploymentId: 'deployment-1',
        status: 'failed'
      },
      liveSchemaAvailable: false
    })
    expect(JSON.stringify(summary)).not.toContain('token refresh')
  })

  it('summarizes latest audit scorecard without returning raw findings', () => {
    const summary = summarizeLatestAudit({
      audit_run: {
        audit_run_id: 'audit-1',
        status: 'completed',
        completed_at: '2026-06-17T00:00:00Z'
      },
      findings: [{ id: 'finding-1', raw: 'large raw finding body' }],
      scorecard: {
        severity_counts: { high: 1, medium: '2' },
        overall_score: 88,
        overall_status: 'strong'
      }
    })

    expect(summary).toMatchObject({
      auditRunId: 'audit-1',
      status: 'completed',
      findingCount: 1,
      severityCounts: { high: 1, medium: 2 },
      overallScore: 88,
      overallStatus: 'strong'
    })
    expect(JSON.stringify(summary)).not.toContain('large raw finding body')
  })
})
