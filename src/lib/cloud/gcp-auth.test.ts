import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCloudGcpAuthPosture } from '@/lib/cloud/gcp-auth'

const asEnv = (value: Record<string, string>) => value as unknown as NodeJS.ProcessEnv

describe('getCloudGcpAuthPosture', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const cleanEnv = () => ({
    NODE_ENV: 'test',
    GCP_WORKLOAD_IDENTITY_PROVIDER: '',
    GCP_PROJECT_NUMBER: '',
    GCP_WORKLOAD_IDENTITY_POOL_ID: '',
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: '',
    GCP_SERVICE_ACCOUNT_EMAIL: '',
    VERCEL_OIDC_TOKEN: '',
    VERCEL: '',
    VERCEL_ENV: '',
    GOOGLE_APPLICATION_CREDENTIALS_JSON: '',
    GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64: ''
  })

  it('reports unconfigured when no auth path exists', () => {
    vi.stubEnv('GCP_WORKLOAD_IDENTITY_PROVIDER', '')
    vi.stubEnv('GCP_SERVICE_ACCOUNT_EMAIL', '')
    vi.stubEnv('VERCEL_OIDC_TOKEN', '')
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON', '')
    vi.stubEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64', '')

    const posture = getCloudGcpAuthPosture(asEnv(cleanEnv()))

    expect(posture.mode).toBe('unconfigured')
    expect(posture.selectedSource).toBe('ambient_adc')
  })

  it('reports service account key mode when only key fallback is present', () => {
    const posture = getCloudGcpAuthPosture(asEnv({
      ...cleanEnv(),
      GOOGLE_APPLICATION_CREDENTIALS_JSON: '{"client_email":"x"}'
    }))

    expect(posture.mode).toBe('service_account_key')
    expect(posture.selectedSource).toBe('service_account_key')
  })

  it('reports wif when provider and service account are configured', () => {
    const posture = getCloudGcpAuthPosture(asEnv({
      ...cleanEnv(),
      GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/123/locations/global/workloadIdentityPools/p/providers/p',
      GCP_SERVICE_ACCOUNT_EMAIL: 'runtime@example.com',
      VERCEL: '1',
      VERCEL_ENV: 'staging'
    }))

    expect(posture.mode).toBe('wif')
    expect(posture.selectedSource).toBe('wif')
  })

  it('reports mixed when wif and service account key coexist', () => {
    const posture = getCloudGcpAuthPosture(asEnv({
      ...cleanEnv(),
      GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/123/locations/global/workloadIdentityPools/p/providers/p',
      GCP_SERVICE_ACCOUNT_EMAIL: 'runtime@example.com',
      GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64: 'e30=',
      VERCEL: '1',
      VERCEL_ENV: 'staging'
    }))

    expect(posture.mode).toBe('mixed')
    expect(posture.selectedSource).toBe('wif')
    expect(posture.summary).toContain('preferido en runtime')
  })

  it('reports wif when provider is derived from split env vars', () => {
    expect(getCloudGcpAuthPosture(asEnv({
      ...cleanEnv(),
      GCP_PROJECT_NUMBER: '1234567890',
      GCP_WORKLOAD_IDENTITY_POOL_ID: 'vercel',
      GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: 'greenhouse',
      GCP_SERVICE_ACCOUNT_EMAIL: 'runtime@example.com'
    })).mode).toBe('wif')
  })
})
