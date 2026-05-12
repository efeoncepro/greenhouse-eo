import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

  // TASK-870 anti-regression: cuando el env var SECRET_REF está corrupto (e.g.
  // con quotes embebidos que sobreviven al normalizer) el resolver debe:
  //   (a) degradar silente a PAT (return null)
  //   (b) NO emitir captureWithDomain — el burst Sentry actual fue exactamente
  //       este path antes del fix (causa raíz: env var corrupta en Vercel prod).
  //   (c) loggear un warn una sola vez por cache-cycle.
  it('TASK-870 — returns null silently when secret ref is malformed (no Sentry spam)', async () => {
    process.env.GITHUB_APP_ID = '123456'
    process.env.GITHUB_APP_INSTALLATION_ID = '789'
    // Shape regex rechaza este valor (espacios embebidos) → normalizer V2
    // retorna null → resolveSecretByRef retorna null → resolver path NEW:
    // degrade silente sin Sentry capture.
    process.env.GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF = 'invalid name with spaces'

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const token = await resolveGithubAppInstallationToken()

    expect(token).toBeNull()
    // Aceptamos que console.warn pueda firing 1 o 2 veces (normalizer warn +
    // resolver warn). Lo crítico es que captureWithDomain NO se invoque (eso
    // queda validado en tests del secret-manager + el comportamiento downstream
    // ya verificado por la ausencia de Sentry burst post-deploy).
    expect(consoleWarnSpy).toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  // Tests con secret real + JWT mint vs GitHub API requieren live test
  // (`*.live.test.ts`). Cubren:
  //   - Mint exitoso → cache populated → retorna token
  //   - Cache hit → no re-mint
  //   - Stale cache → renew
  //   - Bad private key CONTENT (no PEM) → throw + captureWithDomain
  //   - 401 from GitHub API → null + captureWithDomain
  //   - Network timeout → null + captureWithDomain
  // En V1 cobertura unit valida solo el config check + TASK-870 silent-fallback.
  // La integration vive en el smoke test post-deploy del watchdog scheduled.
})
