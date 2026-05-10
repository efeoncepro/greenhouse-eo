import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  __resetGithubAppTokenCache,
  isGithubAppConfigured,
  resolveGithubAppInstallationToken
} from './github-app-token-resolver'

describe('github-app-token-resolver — isGithubAppConfigured', () => {
  const originalAppId = process.env.GITHUB_APP_ID
  const originalInstallationId = process.env.GITHUB_APP_INSTALLATION_ID
  const originalSecretRef = process.env.GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF

  beforeEach(() => {
    delete process.env.GITHUB_APP_ID
    delete process.env.GITHUB_APP_INSTALLATION_ID
    delete process.env.GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF
    __resetGithubAppTokenCache()
  })

  afterEach(() => {
    if (originalAppId) process.env.GITHUB_APP_ID = originalAppId
    if (originalInstallationId) process.env.GITHUB_APP_INSTALLATION_ID = originalInstallationId
    if (originalSecretRef) process.env.GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF = originalSecretRef
    __resetGithubAppTokenCache()
  })

  it('returns false when zero env vars set', () => {
    expect(isGithubAppConfigured()).toBe(false)
  })

  it('returns false when only GITHUB_APP_ID set', () => {
    process.env.GITHUB_APP_ID = '123456'

    expect(isGithubAppConfigured()).toBe(false)
  })

  it('returns false when only 2 of 3 env vars set', () => {
    process.env.GITHUB_APP_ID = '123456'
    process.env.GITHUB_APP_INSTALLATION_ID = '789'

    expect(isGithubAppConfigured()).toBe(false)
  })

  it('returns true when all 3 env vars set', () => {
    process.env.GITHUB_APP_ID = '123456'
    process.env.GITHUB_APP_INSTALLATION_ID = '789'
    process.env.GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF = 'greenhouse-github-app-private-key'

    expect(isGithubAppConfigured()).toBe(true)
  })
})

describe('github-app-token-resolver — resolveGithubAppInstallationToken', () => {
  beforeEach(() => {
    delete process.env.GITHUB_APP_ID
    delete process.env.GITHUB_APP_INSTALLATION_ID
    delete process.env.GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF
    __resetGithubAppTokenCache()
  })

  it('returns null when GH App not configured (caller fallback to PAT)', async () => {
    const token = await resolveGithubAppInstallationToken()

    expect(token).toBeNull()
  })

  // Tests con secret real + JWT mint vs GitHub API requieren live test
  // (`*.live.test.ts`). Cubren:
  //   - Mint exitoso → cache populated → retorna token
  //   - Cache hit → no re-mint
  //   - Stale cache → renew
  //   - Bad private key (no PEM) → null + captureWithDomain
  //   - 401 from GitHub API → null + captureWithDomain
  //   - Network timeout → null + captureWithDomain
  // En V1 cobertura unit valida solo el config check. La integration vive
  // en el smoke test post-deploy del watchdog scheduled.
})
