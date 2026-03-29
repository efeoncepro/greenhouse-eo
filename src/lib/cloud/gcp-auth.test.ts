import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCloudGcpAuthPosture } from '@/lib/cloud/gcp-auth'

describe('getCloudGcpAuthPosture', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports unconfigured when no auth path exists', () => {
    vi.stubEnv('GCP_WORKLOAD_IDENTITY_PROVIDER', '')
    vi.stubEnv('GCP_SERVICE_ACCOUNT_EMAIL', '')
    vi.stubEnv('VERCEL_OIDC_TOKEN', '')
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON', '')
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64', '')

    const posture = getCloudGcpAuthPosture()

    expect(posture.mode).toBe('unconfigured')
    expect(posture.selectedSource).toBe('ambient_adc')
  })

  it('reports service account key mode when only key fallback is present', () => {
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON', '{"client_email":"x"}')

    const posture = getCloudGcpAuthPosture()

    expect(posture.mode).toBe('service_account_key')
    expect(posture.selectedSource).toBe('service_account_key')
  })

  it('reports wif when provider and service account are configured', () => {
    vi.stubEnv('GCP_WORKLOAD_IDENTITY_PROVIDER', 'projects/123/locations/global/workloadIdentityPools/p/providers/p')
    vi.stubEnv('GCP_SERVICE_ACCOUNT_EMAIL', 'runtime@example.com')
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('VERCEL_ENV', 'staging')

    const posture = getCloudGcpAuthPosture()

    expect(posture.mode).toBe('wif')
    expect(posture.selectedSource).toBe('wif')
  })

  it('reports mixed when wif and service account key coexist', () => {
    vi.stubEnv('GCP_WORKLOAD_IDENTITY_PROVIDER', 'projects/123/locations/global/workloadIdentityPools/p/providers/p')
    vi.stubEnv('GCP_SERVICE_ACCOUNT_EMAIL', 'runtime@example.com')
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64', 'e30=')
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('VERCEL_ENV', 'staging')

    const posture = getCloudGcpAuthPosture()

    expect(posture.mode).toBe('mixed')
    expect(posture.selectedSource).toBe('wif')
    expect(posture.summary).toContain('preferido en runtime')
  })

  it('reports wif when provider is derived from split env vars', () => {
    vi.stubEnv('GCP_PROJECT_NUMBER', '1234567890')
    vi.stubEnv('GCP_WORKLOAD_IDENTITY_POOL_ID', 'vercel')
    vi.stubEnv('GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID', 'greenhouse')
    vi.stubEnv('GCP_SERVICE_ACCOUNT_EMAIL', 'runtime@example.com')

    expect(getCloudGcpAuthPosture().mode).toBe('wif')
  })
})
