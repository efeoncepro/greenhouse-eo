import { describe, expect, it } from 'vitest'

import { createGreenhouseGlobeClient, readGreenhouseGlobeClientConfig } from './client'

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
    expect(capturedRequest?.headers.get('x-serverless-authorization')).toBe('Bearer signed-google-id-token')
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
