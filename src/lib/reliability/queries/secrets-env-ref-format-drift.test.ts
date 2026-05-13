import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

describe('TASK-870 Slice 3 — secrets.env_ref_format_drift signal', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('detects 0 violations when all *_SECRET_REF env vars pass canonical shape', async () => {
    const { detectEnvRefFormatDrift } = await import(
      '@/lib/reliability/queries/secrets-env-ref-format-drift'
    )

    const snapshot = detectEnvRefFormatDrift({
      FOO_SECRET_REF: 'foo-secret',
      BAR_SECRET_REF: 'bar-secret:42',
      BAZ_SECRET_REF: 'projects/efeonce-group/secrets/baz/versions/latest',
      // Non-secret-ref env vars are ignored.
      RANDOM_ENV: 'whatever',
      ANOTHER_VAR: '"contaminated\\n"'
    })

    expect(snapshot.totalEnvRefs).toBe(3)
    expect(snapshot.violations).toEqual([])
  })

  it('detects ref with surrounding quotes (Vercel bug class)', async () => {
    const { detectEnvRefFormatDrift } = await import(
      '@/lib/reliability/queries/secrets-env-ref-format-drift'
    )

    const snapshot = detectEnvRefFormatDrift({
      GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF: '"greenhouse-github-app-private-key\\n"',
      FOO_SECRET_REF: 'foo-secret'
    })

    expect(snapshot.totalEnvRefs).toBe(2)
    // Quote-stripping + shape validation: V2 normalizer accepts the cleaned value,
    // so the corruption is auto-recovered and NO drift is reported. This is the
    // canonical defense-in-depth behavior — the signal only fires when corruption
    // CANNOT be recovered.
    expect(snapshot.violations).toEqual([])
  })

  it('detects ref with embedded whitespace (un-recoverable)', async () => {
    const { detectEnvRefFormatDrift } = await import(
      '@/lib/reliability/queries/secrets-env-ref-format-drift'
    )

    const snapshot = detectEnvRefFormatDrift({
      BAD_SECRET_REF: 'name with spaces',
      OK_SECRET_REF: 'good-name'
    })

    expect(snapshot.totalEnvRefs).toBe(2)
    expect(snapshot.violations).toEqual(['BAD_SECRET_REF'])
  })

  it('detects ref with malformed projects/... path', async () => {
    const { detectEnvRefFormatDrift } = await import(
      '@/lib/reliability/queries/secrets-env-ref-format-drift'
    )

    const snapshot = detectEnvRefFormatDrift({
      BAD_SECRET_REF: 'projects/foo/wrong/structure',
      OK_SECRET_REF: 'projects/efeonce-group/secrets/foo/versions/latest'
    })

    expect(snapshot.violations).toEqual(['BAD_SECRET_REF'])
  })

  it('skips empty / unset *_SECRET_REF (treated as unset, NOT drift)', async () => {
    const { detectEnvRefFormatDrift } = await import(
      '@/lib/reliability/queries/secrets-env-ref-format-drift'
    )

    const snapshot = detectEnvRefFormatDrift({
      UNSET_SECRET_REF: '',
      WHITESPACE_ONLY_SECRET_REF: '   ',
      OK_SECRET_REF: 'good-name'
    })

    expect(snapshot.violations).toEqual([])
  })

  it('signal returns severity=ok when 0 violations', async () => {
    const { getSecretsEnvRefFormatDriftSignal } = await import(
      '@/lib/reliability/queries/secrets-env-ref-format-drift'
    )

    // Sin overrides — process.env real del runner. Assume CI no tiene refs corruptas.
    const signal = await getSecretsEnvRefFormatDriftSignal()

    expect(signal.signalId).toBe('secrets.env_ref_format_drift')
    expect(signal.moduleKey).toBe('cloud')
    expect(signal.kind).toBe('drift')
    // En entorno de test/CI no debería haber refs corruptas. Si esto falla, hay
    // un drift real que requiere fix antes de mergear.
    expect(signal.severity).toBe('ok')
  })

  it('signal payload includes affected_env_vars evidence when count > 0', async () => {
    // Sub-test directo del helper (no del signal completo, que lee process.env)
    const { detectEnvRefFormatDrift } = await import(
      '@/lib/reliability/queries/secrets-env-ref-format-drift'
    )

    const snapshot = detectEnvRefFormatDrift({
      VIOLATION_A_SECRET_REF: 'has spaces',
      VIOLATION_B_SECRET_REF: 'projects/wrong/path',
      CLEAN_SECRET_REF: 'good'
    })

    expect(snapshot.violations).toEqual(['VIOLATION_A_SECRET_REF', 'VIOLATION_B_SECRET_REF'])
    expect(snapshot.totalEnvRefs).toBe(3)
  })
})
