import { describe, expect, it } from 'vitest'

import {
  createGreenhouseGlobeClient,
  createGreenhouseGlobeTenancyReconcileCommand,
  readGreenhouseGlobeClientConfig
} from './client'

const asEnv = (value: Record<string, string>) => value as unknown as NodeJS.ProcessEnv

describe('Greenhouse Globe client bridge', () => {
  it('uses ambient ADC locally and calls the exact configured audience through the Globe SDK', async () => {
    let requestedAudience = ''
    let capturedRequest: Request | undefined

    const { client, config } = createGreenhouseGlobeClient(
      asEnv({
        GLOBE_API_BASE_URL: 'https://globe-api-abc.run.app',
        GLOBE_API_AUDIENCE: 'https://globe-api-abc.run.app',
        GLOBE_GCP_PROJECT: 'efeonce-globe'
      }),
      {
        googleAuth: {
          async getIdTokenClient(audience) {
            requestedAudience = audience

            return {
              idTokenProvider: {
                async fetchIdToken() {
                  return 'signed-google-id-token'
                }
              }
            }
          }
        },
        fetch: async (input, init) => {
          capturedRequest = new Request(input, init)

          return Response.json({
            schemaVersion: '1',
            service: 'efeonce-globe',
            apiVersion: 'v1',
            status: 'ok',
            checkedAt: '2026-07-19T00:00:00.000Z'
          })
        }
      }
    )

    await client.health({ correlationId: 'corr-globe-health-1' })

    expect(config.credentialSource).toBe('ambient_adc')
    expect(requestedAudience).toBe('https://globe-api-abc.run.app')
    expect(capturedRequest?.headers.get('authorization')).toBe('Bearer signed-google-id-token')
    expect(capturedRequest?.headers.get('x-serverless-authorization')).toBeNull()
    expect(capturedRequest?.headers.get('x-globe-correlation-id')).toBe('corr-globe-health-1')
    expect(capturedRequest?.headers.get('x-globe-actor-id')).toBeNull()
  })

  it('requires a dedicated Globe WIF provider and service account in Vercel', () => {
    expect(() =>
      readGreenhouseGlobeClientConfig(
        asEnv({
          VERCEL: '1',
          VERCEL_ENV: 'preview',
          VERCEL_URL: 'greenhouse-preview.vercel.app',
          GLOBE_API_BASE_URL: 'https://globe-api-abc.run.app'
        })
      )
    ).toThrowError(expect.objectContaining({ code: 'globe_wif_config_invalid' }))
  })

  it('configures dedicated service-account impersonation over ambient ADC in Cloud Run', () => {
    expect(
      readGreenhouseGlobeClientConfig(
        asEnv({
          GLOBE_API_BASE_URL: 'https://globe-api-abc.run.app',
          GLOBE_GCP_PROJECT: 'efeonce-globe',
          GLOBE_GCP_SERVICE_ACCOUNT_EMAIL: 'caller@efeonce-globe.iam.gserviceaccount.com'
        })
      )
    ).toEqual(
      expect.objectContaining({
        credentialSource: 'ambient_adc',
        serviceAccountEmail: 'caller@efeonce-globe.iam.gserviceaccount.com'
      })
    )
  })

  it('dispatches tenancy V2 through the canonical typed SDK command', async () => {
    let request: Request | undefined

    const reconcile = createGreenhouseGlobeTenancyReconcileCommand(
      asEnv({
        GLOBE_API_BASE_URL: 'https://globe-api-abc.run.app',
        GLOBE_API_AUDIENCE: 'https://globe-api-abc.run.app',
        GLOBE_GCP_PROJECT: 'efeonce-globe'
      }),
      {
        googleAuth: {
          async getIdTokenClient() {
            return {
              idTokenProvider: {
                async fetchIdToken() {
                  return 'signed-google-id-token'
                }
              }
            }
          }
        },
        fetch: async (input, init) => {
          request = new Request(input, init)

          return Response.json({
            schemaVersion: '1',
            apiVersion: 'v1',
            command: 'globe.tenancy.projection.reconcile',
            correlationId: 'corr-tenancy-v2',
            outcome: {}
          })
        }
      }
    )

    await reconcile({
      workspaceId: 'greenhouse-org:efeonce',
      idempotencyKey: 'gh-globe-tenancy-v2:abc123',
      correlationId: 'corr-tenancy-v2',
      snapshot: {
        schemaVersion: '2',
        brokerBindingId: 'greenhouse-org:efeonce',
        bindingState: 'active',
        workspaceRevision: 1,
        reconciliationId: '5b360976-8891-43d6-8726-9bf2bd259874',
        issuedAt: '2026-07-23T10:00:00.000Z',
        expiresAt: '2026-07-23T10:12:00.000Z',
        members: [
          {
            identityIssuer: 'greenhouse',
            identitySubject: 'greenhouse:user:user-efeonce-admin-julio-reyes',
            state: 'active',
            memberRevision: 1,
            desiredCapabilities: ['globe.studio.access'],
            expiresAt: '2026-07-23T10:12:00.000Z'
          }
        ]
      }
    })

    expect(request?.url).toBe('https://globe-api-abc.run.app/v1/commands')
    expect(request?.headers.get('idempotency-key')).toBe('gh-globe-tenancy-v2:abc123')
    expect(request?.headers.get('x-globe-workspace-id')).toBe('greenhouse-org:efeonce')
    expect(await request?.json()).toEqual(
      expect.objectContaining({
        command: 'globe.tenancy.projection.reconcile',
        workspaceSelection: 'greenhouse-org:efeonce',
        payload: expect.objectContaining({
          snapshot: expect.objectContaining({ schemaVersion: '2', workspaceRevision: 1 })
        })
      })
    )
  })

  it('refuses every production Vercel execution even when WIF is configured', () => {
    expect(() =>
      readGreenhouseGlobeClientConfig(
        asEnv({
          VERCEL: '1',
          VERCEL_ENV: 'production',
          VERCEL_URL: 'greenhouse.efeoncepro.com',
          GLOBE_API_BASE_URL: 'https://globe-api-abc.run.app',
          GLOBE_GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/123/locations/global/workloadIdentityPools/p/providers/v',
          GLOBE_GCP_SERVICE_ACCOUNT_EMAIL: 'caller@efeonce-globe.iam.gserviceaccount.com'
        })
      )
    ).toThrowError(expect.objectContaining({ code: 'globe_production_forbidden' }))
  })
})
