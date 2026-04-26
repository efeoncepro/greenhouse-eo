import { describe, expect, it } from 'vitest'

import {
  getGoogleAuthOptions,
  getGoogleCredentialDiagnostics,
  getGoogleCredentialSource,
  getGoogleCredentials,
  getGoogleProjectId,
  hasPersistedLocalVercelOidcToken,
  shouldUseWorkloadIdentity
} from '@/lib/google-credentials'

const asEnv = (value: Record<string, string>) => value as unknown as NodeJS.ProcessEnv

describe('google credentials helpers', () => {
  it('parses service account credentials from raw env json', () => {
    const credentials = getGoogleCredentials({
      GOOGLE_APPLICATION_CREDENTIALS_JSON:
        '{"project_id":"efeonce-group","client_email":"runtime@example.com","private_key":"-----BEGIN PRIVATE KEY-----\\\\nabc\\\\n-----END PRIVATE KEY-----"}'
    } as unknown as NodeJS.ProcessEnv)

    expect(credentials?.project_id).toBe('efeonce-group')
    expect(credentials?.client_email).toBe('runtime@example.com')
    expect(credentials?.private_key).toBe('-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n')
  })

  it('reconstructs pem line breaks when the private key body was collapsed', () => {
    const credentials = getGoogleCredentials({
      GOOGLE_APPLICATION_CREDENTIALS_JSON:
        '{"project_id":"efeonce-group","client_email":"runtime@example.com","private_key":"-----BEGIN PRIVATE KEY-----abc-----END PRIVATE KEY-----"}'
    } as unknown as NodeJS.ProcessEnv)

    expect(credentials?.private_key).toBe('-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n')
  })

  it('parses service account credentials from base64 env json', () => {
    const payload = Buffer.from(
      '{"project_id":"efeonce-group","client_email":"runtime@example.com","private_key":"-----BEGIN PRIVATE KEY-----\\\\nabc\\\\n-----END PRIVATE KEY-----"}',
      'utf8'
    ).toString('base64')

    const credentials = getGoogleCredentials({
      GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64: payload
    } as unknown as NodeJS.ProcessEnv)

    expect(credentials?.project_id).toBe('efeonce-group')
    expect(credentials?.private_key).toBe('-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n')
  })

  it('ignores persisted local vercel oidc tokens outside real vercel runtime', () => {
    const env = asEnv({
      GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/123/locations/global/workloadIdentityPools/pool/providers/vercel',
      GCP_SERVICE_ACCOUNT_EMAIL: 'greenhouse-runtime@efeonce-group.iam.gserviceaccount.com',
      VERCEL_OIDC_TOKEN: 'oidc-token',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: '{"project_id":"efeonce-group","client_email":"runtime@example.com","private_key":"key"}',
      GCP_PROJECT: 'efeonce-group'
    })

    expect(shouldUseWorkloadIdentity(env)).toBe(false)
    expect(getGoogleCredentialSource(env)).toBe('service_account_key')

    const authOptions = getGoogleAuthOptions({ env, scopes: ['scope-a'] })

    expect(authOptions.projectId).toBe('efeonce-group')
    expect(authOptions.authClient).toBeUndefined()
    expect(authOptions.credentials).toBeDefined()
  })

  it('uses service account key mode when oidc token is missing', () => {
    const env = asEnv({
      GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/123/locations/global/workloadIdentityPools/pool/providers/vercel',
      GCP_SERVICE_ACCOUNT_EMAIL: 'greenhouse-runtime@efeonce-group.iam.gserviceaccount.com',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: '{"project_id":"efeonce-group","client_email":"runtime@example.com","private_key":"key"}'
    })

    expect(shouldUseWorkloadIdentity(env)).toBe(false)
    expect(getGoogleCredentialSource(env)).toBe('service_account_key')

    const authOptions = getGoogleAuthOptions({ env })

    expect(authOptions.credentials).toBeDefined()
    expect(authOptions.authClient).toBeUndefined()
  })

  it('prefers workload identity in vercel runtimes even when the oidc token is resolved lazily', () => {
    const env = asEnv({
      GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/123/locations/global/workloadIdentityPools/pool/providers/vercel',
      GCP_SERVICE_ACCOUNT_EMAIL: 'greenhouse-runtime@efeonce-group.iam.gserviceaccount.com',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: '{"project_id":"efeonce-group","client_email":"runtime@example.com","private_key":"key"}',
      GCP_PROJECT: 'efeonce-group',
      VERCEL: '1',
      VERCEL_ENV: 'preview',
      VERCEL_URL: 'greenhouse-preview.vercel.app'
    })

    expect(shouldUseWorkloadIdentity(env)).toBe(true)
    expect(getGoogleCredentialSource(env)).toBe('wif')

    const authOptions = getGoogleAuthOptions({ env })

    expect(authOptions.authClient).toBeDefined()
    expect(authOptions.credentials).toBeUndefined()
  })

  it('prefers workload identity in vercel runtimes before parsing legacy service account env', () => {
    const env = asEnv({
      GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/123/locations/global/workloadIdentityPools/pool/providers/vercel',
      GCP_SERVICE_ACCOUNT_EMAIL: 'greenhouse-runtime@efeonce-group.iam.gserviceaccount.com',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: '""',
      GCP_PROJECT: 'efeonce-group',
      VERCEL: '1',
      VERCEL_ENV: 'production',
      VERCEL_URL: 'greenhouse.vercel.app'
    })

    expect(getGoogleCredentialSource(env)).toBe('wif')
  })

  it('prefers workload identity in vercel runtimes even when legacy service account env is malformed', () => {
    const env = asEnv({
      GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/123/locations/global/workloadIdentityPools/pool/providers/vercel',
      GCP_SERVICE_ACCOUNT_EMAIL: 'greenhouse-runtime@efeonce-group.iam.gserviceaccount.com',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: 'not-json',
      GCP_PROJECT: 'efeonce-group',
      VERCEL: '1',
      VERCEL_ENV: 'production',
      VERCEL_URL: 'greenhouse.vercel.app'
    })

    expect(getGoogleCredentialSource(env)).toBe('wif')
  })

  it('allows an explicit service account key preference to override lazy vercel wif selection', () => {
    const env = asEnv({
      GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/123/locations/global/workloadIdentityPools/pool/providers/vercel',
      GCP_SERVICE_ACCOUNT_EMAIL: 'greenhouse-runtime@efeonce-group.iam.gserviceaccount.com',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: '{"project_id":"efeonce-group","client_email":"runtime@example.com","private_key":"key"}',
      GCP_PROJECT: 'efeonce-group',
      GCP_AUTH_PREFERENCE: 'service_account_key',
      VERCEL: '1',
      VERCEL_ENV: 'production'
    })

    expect(shouldUseWorkloadIdentity(env)).toBe(false)
    expect(getGoogleCredentialSource(env)).toBe('service_account_key')

    const authOptions = getGoogleAuthOptions({ env })

    expect(authOptions.credentials).toBeDefined()
    expect(authOptions.authClient).toBeUndefined()
  })

  it('allows an explicit wif preference when a token is injected into a non-runtime env object', () => {
    const env = asEnv({
      GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/123/locations/global/workloadIdentityPools/pool/providers/vercel',
      GCP_SERVICE_ACCOUNT_EMAIL: 'greenhouse-runtime@efeonce-group.iam.gserviceaccount.com',
      GCP_AUTH_PREFERENCE: 'wif',
      VERCEL_OIDC_TOKEN: 'oidc-token',
      GCP_PROJECT: 'efeonce-group'
    })

    expect(shouldUseWorkloadIdentity(env)).toBe(true)
    expect(getGoogleCredentialSource(env)).toBe('wif')

    const authOptions = getGoogleAuthOptions({ env })

    expect(authOptions.authClient).toBeDefined()
    expect(authOptions.credentials).toBeUndefined()
  })

  it('falls back to ambient adc when no explicit wif or key is available', () => {
    const authOptions = getGoogleAuthOptions({
      env: asEnv({
        GCP_PROJECT: 'efeonce-group'
      })
    })

    expect(getGoogleCredentialSource(asEnv({ GCP_PROJECT: 'efeonce-group' }))).toBe('ambient_adc')
    expect(authOptions.projectId).toBe('efeonce-group')
    expect(authOptions.credentials).toBeUndefined()
    expect(authOptions.authClient).toBeUndefined()
  })

  it('treats quoted empty service account env vars as absent', () => {
    const env = asEnv({
      GCP_PROJECT: 'efeonce-group',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: '""',
      GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64: '""'
    })

    expect(getGoogleCredentials(env)).toBeUndefined()
    expect(getGoogleCredentialSource(env)).toBe('ambient_adc')
    expect(getGoogleProjectId(env)).toBe('efeonce-group')
  })

  it('resolves project id from service account credentials when env vars are absent', () => {
    expect(
      getGoogleProjectId({
        GOOGLE_APPLICATION_CREDENTIALS_JSON:
          '{"project_id":"efeonce-group","client_email":"runtime@example.com","private_key":"key"}'
      } as unknown as NodeJS.ProcessEnv)
    ).toBe('efeonce-group')
  })

  it('throws when project id cannot be resolved from env or credentials', () => {
    expect(() => getGoogleProjectId({} as NodeJS.ProcessEnv)).toThrow(
      'Missing GCP_PROJECT or GOOGLE_CLOUD_PROJECT environment variable'
    )
  })

  it('normalizes workload identity provider values into an auth client', () => {
    const authOptions = getGoogleAuthOptions({
      env: asEnv({
        GCP_WORKLOAD_IDENTITY_PROVIDER: 'iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/vercel',
        GCP_SERVICE_ACCOUNT_EMAIL: 'greenhouse-runtime@efeonce-group.iam.gserviceaccount.com',
        GCP_AUTH_PREFERENCE: 'wif',
        VERCEL_OIDC_TOKEN: 'oidc-token',
        GCP_PROJECT: 'efeonce-group'
      })
    })

    expect(authOptions.authClient).toBeDefined()
  })

  it('flags persisted local vercel oidc tokens in diagnostics', () => {
    const originalToken = process.env.VERCEL_OIDC_TOKEN
    const originalVercel = process.env.VERCEL

    process.env.VERCEL_OIDC_TOKEN = 'persisted-token'
    delete process.env.VERCEL

    try {
      expect(hasPersistedLocalVercelOidcToken()).toBe(true)

      const diagnostics = getGoogleCredentialDiagnostics(
        asEnv({
          GCP_PROJECT: 'efeonce-group',
          VERCEL_OIDC_TOKEN: 'persisted-token'
        })
      )

      expect(diagnostics.hasPersistedLocalVercelOidcToken).toBe(false)
    } finally {
      if (originalToken === undefined) {
        delete process.env.VERCEL_OIDC_TOKEN
      } else {
        process.env.VERCEL_OIDC_TOKEN = originalToken
      }

      if (originalVercel === undefined) {
        delete process.env.VERCEL
      } else {
        process.env.VERCEL = originalVercel
      }
    }
  })
})
