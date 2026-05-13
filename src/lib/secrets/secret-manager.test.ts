import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { accessSecretVersion } = vi.hoisted(() => ({
  accessSecretVersion: vi.fn()
}))

vi.mock('@google-cloud/secret-manager', () => ({
  SecretManagerServiceClient: class {
    accessSecretVersion = accessSecretVersion
  }
}))

vi.mock('@/lib/google-credentials', () => ({
  createGoogleAuth: vi.fn(() => ({ mocked: true })),
  getGoogleProjectId: vi.fn((env?: NodeJS.ProcessEnv) => env?.GCP_PROJECT || 'efeonce-group')
}))

describe('resolveSecret', () => {
  beforeEach(() => {
    vi.resetModules()
    accessSecretVersion.mockReset()
  })

  afterEach(async () => {
    vi.unstubAllEnvs()

    const { clearSecretManagerResolutionCache } = await import('@/lib/secrets/secret-manager')

    clearSecretManagerResolutionCache()
    globalThis.__greenhouseSecretManagerClient = undefined
  })

  it('uses Secret Manager when a secret ref resolves successfully', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'nubox-bearer-token')
    accessSecretVersion.mockResolvedValue([
      {
        payload: {
          data: Buffer.from('secret-from-manager')
        }
      }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })

    expect(resolution.source).toBe('secret_manager')
    expect(resolution.value).toBe('secret-from-manager')
    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/nubox-bearer-token/versions/latest'
    })
  })

  it('sanitizes quoted secret payloads returned by Secret Manager', async () => {
    // Uses an unknown-format secret name so Capa 1 format validators (TASK-742)
    // don't reject the short test payload. NEXTAUTH_SECRET-specific tests live
    // in format-validators.test.ts.
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('SOME_OPAQUE_SECRET_SECRET_REF', 'some-opaque-secret-name')
    accessSecretVersion.mockResolvedValue([
      {
        payload: {
          data: Buffer.from('"quoted-secret-value"')
        }
      }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'SOME_OPAQUE_SECRET'
    })

    expect(resolution.source).toBe('secret_manager')
    expect(resolution.value).toBe('quoted-secret-value')
  })

  it('falls back to env vars when Secret Manager lookup fails', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'nubox-bearer-token')
    vi.stubEnv('NUBOX_BEARER_TOKEN', 'env-fallback-token')
    accessSecretVersion.mockRejectedValue(new Error('permission denied'))

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })

    expect(resolution.source).toBe('env')
    expect(resolution.value).toBe('env-fallback-token')
  })

  it('sanitizes quoted env fallback values with trailing literal newline markers', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'greenhouse-nubox-bearer-token-staging')
    vi.stubEnv('NUBOX_BEARER_TOKEN', '"env-fallback-token\\n"')
    accessSecretVersion.mockRejectedValue(new Error('permission denied'))

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })

    expect(resolution.source).toBe('env')
    expect(resolution.value).toBe('env-fallback-token')
  })

  it('sanitizes literal newline escapes in secret refs before resolving Secret Manager', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF', 'webhook-notifications-secret\\n')
    accessSecretVersion.mockResolvedValue([
      {
        payload: {
          data: Buffer.from('secret-from-manager')
        }
      }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'WEBHOOK_NOTIFICATIONS_SECRET'
    })

    expect(resolution.source).toBe('secret_manager')
    expect(resolution.secretRef).toBe('projects/efeonce-group/secrets/webhook-notifications-secret/versions/latest')
    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/webhook-notifications-secret/versions/latest'
    })
  })

  // Anti-regression cases for the colon-shorthand normalization (canonical
  // fix from arch-architect 4-pillar review 2026-05-10).
  // Bug class: env var `<name>:latest` shorthand (Vercel display + gcloud
  // convention) was naively wrapped as `projects/.../secrets/<name>:latest/versions/latest`,
  // producing INVALID_ARGUMENT from Secret Manager. The canonical normalizer
  // now strips `:VERSION` suffix and routes it to `/versions/<version>`.
  it('normalizes colon-shorthand `<name>:latest` to canonical /versions/latest path', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'nubox-bearer-token:latest')
    accessSecretVersion.mockResolvedValue([
      { payload: { data: Buffer.from('secret-from-manager') } }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({ envVarName: 'NUBOX_BEARER_TOKEN' })

    expect(resolution.source).toBe('secret_manager')
    expect(resolution.secretRef).toBe('projects/efeonce-group/secrets/nubox-bearer-token/versions/latest')
    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/nubox-bearer-token/versions/latest'
    })
  })

  it('normalizes colon-shorthand `<name>:5` to canonical /versions/5 path', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'nubox-bearer-token:5')
    accessSecretVersion.mockResolvedValue([
      { payload: { data: Buffer.from('secret-from-manager-v5') } }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({ envVarName: 'NUBOX_BEARER_TOKEN' })

    expect(resolution.secretRef).toBe('projects/efeonce-group/secrets/nubox-bearer-token/versions/5')
    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/nubox-bearer-token/versions/5'
    })
  })

  it('passes full path `projects/.../versions/...` through unchanged', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'projects/efeonce-group/secrets/nubox-bearer-token/versions/3')
    accessSecretVersion.mockResolvedValue([
      { payload: { data: Buffer.from('secret-from-manager-v3') } }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({ envVarName: 'NUBOX_BEARER_TOKEN' })

    expect(resolution.secretRef).toBe('projects/efeonce-group/secrets/nubox-bearer-token/versions/3')
    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/nubox-bearer-token/versions/3'
    })
  })

  it('appends /versions/latest when full path lacks version suffix', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'projects/efeonce-group/secrets/nubox-bearer-token')
    accessSecretVersion.mockResolvedValue([
      { payload: { data: Buffer.from('secret-from-manager') } }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({ envVarName: 'NUBOX_BEARER_TOKEN' })

    expect(resolution.secretRef).toBe('projects/efeonce-group/secrets/nubox-bearer-token/versions/latest')
    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/nubox-bearer-token/versions/latest'
    })
  })

  it('reports unconfigured when neither Secret Manager nor env vars are available', async () => {
    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })

    expect(resolution.source).toBe('unconfigured')
    expect(resolution.value).toBeNull()
  })

  it('caches repeated reads for the same secret ref', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'nubox-bearer-token')
    accessSecretVersion.mockResolvedValue([
      {
        payload: {
          data: Buffer.from('secret-from-manager')
        }
      }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })
    await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })

    expect(accessSecretVersion).toHaveBeenCalledTimes(1)
  })

  // ─────────────────────────────────────────────────────────────────────
  // TASK-870 — Secret-ref normalizer V2 anti-regression suite.
  //
  // Bug class detectada live 2026-05-12 con
  // GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF persistida en Vercel
  // production con valor `"greenhouse-github-app-private-key\n"` (bytes
  // hex `... 6b 65 79 5c 6e 22`). El normalizer legacy NO strippa quotes
  // envolventes → resource name resultante con quotes embebidos → GCP
  // NOT_FOUND silencioso → fallback a PAT + Sentry burst recurrente.
  //
  // V2 normalizer canónico (single-source via stripEnvVarContamination)
  // + shape validation regex (SECRET_REF_SHAPE) cierra la clase.
  // ─────────────────────────────────────────────────────────────────────

  it('TASK-870 — accepts ref with surrounding quotes (auto-strip canonical recovery)', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', '"nubox-bearer-token"')
    accessSecretVersion.mockResolvedValue([
      { payload: { data: Buffer.from('secret-from-manager') } }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')
    const resolution = await resolveSecret({ envVarName: 'NUBOX_BEARER_TOKEN' })

    // Quote-stripping path: normalizer V2 strippa las quotes → canonical name.
    // GCP debería ser invocado con el path canónico.
    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/nubox-bearer-token/versions/latest'
    })
    expect(resolution.source).toBe('secret_manager')
    expect(resolution.value).toBe('secret-from-manager')
  })

  it('TASK-870 — rejects ref with quotes + literal `\\n` (exact production corruption)', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    // Bytes literales observados en `vercel env pull production`:
    //   key="greenhouse-github-app-private-key\n"
    // donde `\n` son 2 chars (backslash + n), no LF real.
    vi.stubEnv(
      'GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF',
      '"greenhouse-github-app-private-key\\n"'
    )
    accessSecretVersion.mockResolvedValue([
      { payload: { data: Buffer.from('-----BEGIN RSA PRIVATE KEY-----\nfoo\n-----END RSA PRIVATE KEY-----\n') } }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')
    const resolution = await resolveSecret({ envVarName: 'GREENHOUSE_GITHUB_APP_PRIVATE_KEY' })

    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/greenhouse-github-app-private-key/versions/latest'
    })
    expect(resolution.source).toBe('secret_manager')
  })

  it('TASK-870 — rejects ref with embedded space (shape regex enforcement)', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'nubox bearer token')

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')
    const resolution = await resolveSecret({ envVarName: 'NUBOX_BEARER_TOKEN' })

    // Shape regex rechaza → normalizer retorna null → GCP NO se invoca.
    expect(accessSecretVersion).not.toHaveBeenCalled()
    expect(resolution.source).toBe('unconfigured')
    expect(resolution.value).toBeNull()
  })

  it('TASK-870 — rejects ref with malformed projects/... path', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'projects/foo/wrong/path/structure')

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')
    const resolution = await resolveSecret({ envVarName: 'NUBOX_BEARER_TOKEN' })

    expect(accessSecretVersion).not.toHaveBeenCalled()
    expect(resolution.source).toBe('unconfigured')
  })

  it('TASK-870 — accepts real LF at end of ref (single-source contamination strip)', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'nubox-bearer-token\n')
    accessSecretVersion.mockResolvedValue([
      { payload: { data: Buffer.from('secret-from-manager') } }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')
    const resolution = await resolveSecret({ envVarName: 'NUBOX_BEARER_TOKEN' })

    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/nubox-bearer-token/versions/latest'
    })
    expect(resolution.value).toBe('secret-from-manager')
  })

  it('TASK-870 — accepts shorthand `<name>:latest` with quotes envolventes (combined contamination)', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', '"nubox-bearer-token:latest"')
    accessSecretVersion.mockResolvedValue([
      { payload: { data: Buffer.from('secret-from-manager') } }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')
    const resolution = await resolveSecret({ envVarName: 'NUBOX_BEARER_TOKEN' })

    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/nubox-bearer-token/versions/latest'
    })
    expect(resolution.value).toBe('secret-from-manager')
  })

  it('TASK-870 — isCanonicalSecretRefShape exposes predicate for external auditors', async () => {
    const { isCanonicalSecretRefShape } = await import('@/lib/secrets/secret-manager')

    // Canonical accepts
    expect(isCanonicalSecretRefShape('greenhouse-github-app-private-key')).toBe(true)
    expect(isCanonicalSecretRefShape('my-secret:42')).toBe(true)
    expect(isCanonicalSecretRefShape('my-secret:latest')).toBe(true)
    expect(isCanonicalSecretRefShape(
      'projects/efeonce-group/secrets/my-secret/versions/latest'
    )).toBe(true)

    // Contamination accepted post-strip
    expect(isCanonicalSecretRefShape('"my-secret"')).toBe(true)
    expect(isCanonicalSecretRefShape('"my-secret\\n"')).toBe(true)
    expect(isCanonicalSecretRefShape('  my-secret  ')).toBe(true)

    // Hard rejects (shape invalid post-strip)
    expect(isCanonicalSecretRefShape('my secret')).toBe(false)
    expect(isCanonicalSecretRefShape('my"quote"middle')).toBe(false)
    expect(isCanonicalSecretRefShape('projects/foo/wrong/path')).toBe(false)
    expect(isCanonicalSecretRefShape('')).toBe(false)
    expect(isCanonicalSecretRefShape(undefined)).toBe(false)
    expect(isCanonicalSecretRefShape('""')).toBe(false)
  })
})
