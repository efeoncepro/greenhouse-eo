import type * as ChildProcess from 'node:child_process'

import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * ISSUE-114 — anti-regression suite for the batch-policy diff base.
 *
 * The pure classifier (`batch-policy/classifier.test.ts`) was already covered;
 * the defect lived in *how this check collected the file list*, and this file
 * did not exist. That gap is why a three-dot diff survived five weeks and four
 * consecutive releases shipped a `[release-coupled: ...]` marker describing a
 * coupling that did not exist.
 */

const childProcessMock = vi.hoisted(() => ({
  execFile: vi.fn()
}))

// git responses are injected per-test through these buffers so no test ever
// depends on the real repository state (merge-base, branch layout, or which
// release last squashed into main).
//
// The mock is deliberately **range-sensitive**: it answers a three-dot range with
// a different file list than a two-dot one, reproducing squash divergence. A
// range-blind mock would return the same buffer either way, and the scenario
// tests below would keep passing with the bug restored — a guardrail that only
// looks like one.
const releaseState = vi.hoisted(() => ({
  readLastReleasedRelease: vi.fn()
}))

const gitState = vi.hoisted(() => ({
  invocations: [] as string[][],
  twoDotDiff: '',
  threeDotDiff: '',
  logStdout: ''
}))

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof ChildProcess>('node:child_process')

  return {
    ...actual,
    execFile: childProcessMock.execFile.mockImplementation((_cmd, args, opts, callback) => {
      const cb = typeof opts === 'function' ? opts : callback
      const argv = args as string[]

      gitState.invocations.push(argv)

      const isThreeDot = argv.some(arg => arg.includes('...'))

      const stdout =
        argv[0] === 'diff'
          ? isThreeDot
            ? gitState.threeDotDiff
            : gitState.twoDotDiff
          : gitState.logStdout

      // promisify() without the util.promisify.custom symbol resolves with the
      // first callback value, so the object shape must match the destructuring
      // in the module under test (`const { stdout } = await execFileAsync(...)`).
      if (cb) cb(null, { stdout, stderr: '' })
    })
  }
})

import type { PreflightInput } from '../runner'

// TASK-1676 — el check resuelve su base contra `release_manifests`. Sin este mock
// los tests harían I/O real contra PG y sólo pasarían por el catch del fallback,
// que es justamente el camino que NO se quiere ejercitar por accidente.
vi.mock('../last-released-reader', () => ({
  readLastReleasedRelease: releaseState.readLastReleasedRelease
}))

import { buildReleaseDiffRange, checkReleaseBatchPolicy } from './release-batch-policy'

const buildInput = (overrides: Partial<PreflightInput> = {}): PreflightInput => ({
  targetSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  targetBranch: 'main',
  githubRepo: { owner: 'efeoncepro', repo: 'greenhouse-eo' },
  triggeredBy: 'test',
  overrideBatchPolicy: false,
  ...overrides
})

const runCheck = async () => checkReleaseBatchPolicy(buildInput())

const gitArgsFor = (subcommand: string): string[] =>
  gitState.invocations.find(args => args[0] === subcommand) ?? []

const PREV_RELEASE_SHA = 'e048ef3a47e98aac1048ec36dc3c300d1042f146'

beforeEach(() => {
  gitState.invocations = []
  gitState.twoDotDiff = ''
  gitState.threeDotDiff = ''
  gitState.logStdout = ''
  releaseState.readLastReleasedRelease.mockReset()
  releaseState.readLastReleasedRelease.mockResolvedValue({
    targetSha: PREV_RELEASE_SHA,
    releaseId: 'e048ef3a47e9-678ee642',
    startedAt: '2026-08-09T01:00:32.526Z'
  })
})

describe('buildReleaseDiffRange', () => {
  it('builds a two-dot range', () => {
    expect(buildReleaseDiffRange('origin/main', 'abc123')).toBe('origin/main..abc123')
  })

  it('is NEVER three-dot — three-dot starts at the merge-base, which the squash-merge release flow freezes before the last squash (ISSUE-114)', () => {
    const range = buildReleaseDiffRange('origin/main', 'abc123')

    expect(range).not.toContain('...')
  })
})

describe('checkReleaseBatchPolicy — diff base', () => {
  it('anchors the diff to the last RELEASED manifest, not to the branch head (ISSUE-145)', async () => {
    gitState.twoDotDiff = 'src/app/page.tsx\n'

    await runCheck()

    const diffArgs = gitArgsFor('diff')

    // Ésta es la corrección de raíz: `origin/main` post-merge ES el target, así que
    // el rango quedaba vacío y el gate aprobaba sin mirar nada.
    expect(diffArgs).toContain(`${PREV_RELEASE_SHA}..aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`)
    expect(diffArgs).not.toContain('origin/main..aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    expect(diffArgs.some(arg => arg.includes('...'))).toBe(false)
  })

  it('lee el marker SOLO del commit objetivo, no de la ventana de commits del rango', async () => {
    gitState.twoDotDiff = 'src/app/page.tsx\n'

    await runCheck()

    // El runbook siempre dijo que el marker va en el cuerpo del squash. Con la base
    // re-anclada el squash entra en el rango, pero entran también los ~509 commits
    // que lo preceden: 442 KB de prosa donde una cita accidental desactiva la
    // deteccion entera. `git show -s` sobre el target cierra ese vector.
    const showArgs = gitArgsFor('show')

    expect(showArgs).toEqual(['show', '-s', '--format=%B', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'])
    expect(gitArgsFor('log')).toEqual([])
  })

  it('declares the base it used in the evidence, so a surprising result is a diagnosis and not an investigation', async () => {
    gitState.twoDotDiff = 'src/app/page.tsx\n'

    const result = await runCheck()

    const evidence = result.evidence as {
      diffBase: string
      diffBaseSource: string
      diffBaseReleaseId?: string
    }

    expect(evidence.diffBase).toBe(PREV_RELEASE_SHA)
    expect(evidence.diffBaseSource).toBe('last_released_manifest')
    expect(evidence.diffBaseReleaseId).toBe('e048ef3a47e9-678ee642')
  })

  it('falls back to the branch head when the branch has no released manifest', async () => {
    // Hoy los 75 manifests son de `main`: un preflight exploratorio sobre otra rama
    // cae acá, y tiene que seguir sirviendo en vez de quedar mudo.
    releaseState.readLastReleasedRelease.mockResolvedValue(null)
    gitState.twoDotDiff = 'src/app/page.tsx\n'

    const result = await checkReleaseBatchPolicy(buildInput({ targetSha: 'bbbbbbbb', targetBranch: 'develop' }))
    const evidence = result.evidence as { diffBase: string; diffBaseSource: string }

    expect(gitArgsFor('diff')).toContain('origin/develop..bbbbbbbb')
    expect(evidence.diffBaseSource).toBe('branch_head_fallback')
    expect(evidence.diffBase).toBe('origin/develop')
  })

  it('un fallo del reader degrada a la base legacy, nunca a una aprobacion', async () => {
    // Si PG está caído, lo peligroso sería que el check aprobara igual. Degrada a la
    // base legacy y deja que la regla del diff vacío haga de gate.
    releaseState.readLastReleasedRelease.mockRejectedValue(new Error('PG unreachable'))
    gitState.twoDotDiff = 'migrations/20260809_x.sql\n'

    const result = await runCheck()
    const evidence = result.evidence as { diffBaseSource: string }

    expect(evidence.diffBaseSource).toBe('branch_head_fallback')
    expect(result.severity).not.toBe('ok')
  })

  it('sin release previo Y con diff vacio no aprueba: es el caso que la formulacion original dejaba abierto', async () => {
    releaseState.readLastReleasedRelease.mockResolvedValue(null)
    gitState.twoDotDiff = ''

    const result = await runCheck()

    expect(result.severity).toBe('unknown')
    expect(result.evidence).toBeNull()
  })
})

describe('checkReleaseBatchPolicy — squash-divergence scenario (ISSUE-114)', () => {
  // Reproduces the live 2026-08-08 release: a growth/SEO batch whose only
  // irreversible domain is its own migrations, plus preflight files that are
  // byte-identical to production because the previous release already shipped
  // them. Two-dot excludes those; three-dot would resurrect them.
  const REAL_TWO_DOT_DIFF = [
    'src/lib/growth/seo/keyword-sets.ts',
    'src/views/greenhouse/growth/SeoCockpitView.tsx',
    'migrations/20260808131441444_task-1310-seo-client-view-codes.sql',
    'src/types/db.d.ts'
  ]

  // Solo estos dos clasifican `cloud_release`; un tercer fantasma visto en vivo
  // (`pending-without-jobs.test.ts`) cae en `tests` por DOMAIN_PATTERNS.
  const PHANTOM_FILES_ALREADY_IN_PRODUCTION = [
    'src/lib/release/preflight/checks/pending-without-jobs.ts',
    'src/lib/release/preflight/ignored-pending-runs.ts'
  ]

  it('does not fabricate a cloud_release domain from files already deployed to production', async () => {
    // El buffer three-dot lleva los fantasmas, tal como una merge-base congelada
    // los resucitaria. Si el check regresa a three-dot, el mock sirve ESA lista
    // y la asercion de abajo falla: ese es el punto del guardrail.
    gitState.twoDotDiff = `${REAL_TWO_DOT_DIFF.join('\n')}\n`
    gitState.threeDotDiff = `${[...REAL_TWO_DOT_DIFF, ...PHANTOM_FILES_ALREADY_IN_PRODUCTION].join('\n')}\n`
    gitState.logStdout = 'feat(seo): TASK-1310 client view codes'

    const result = await runCheck()
    const evidence = result.evidence as { domains: Record<string, number>; decision: string }

    expect(evidence.domains.cloud_release ?? 0).toBe(0)
    expect(evidence.domains.db_migrations).toBe(2)
  })

  it('DOES flag cloud_release when those files are genuinely part of the batch — the fix must not blind the gate', async () => {
    // Genuinamente en el batch => presentes en AMBOS rangos.
    const withRelease = `${[...REAL_TWO_DOT_DIFF, ...PHANTOM_FILES_ALREADY_IN_PRODUCTION].join('\n')}\n`

    gitState.twoDotDiff = withRelease
    gitState.threeDotDiff = withRelease
    gitState.logStdout = 'fix(release): preflight'

    const result = await runCheck()
    const evidence = result.evidence as { domains: Record<string, number> }

    expect(evidence.domains.cloud_release).toBe(2)
  })

  it('un diff vacio NO aprueba: el caso post-merge del orquestador que ISSUE-145 documenta como estructuralmente vacuo', async () => {
    const result = await runCheck()

    // TASK-1676 — este test fijaba el defecto que ISSUE-145 documenta. Ahora fija
    // el invariante que lo cierra: un diff vacío NUNCA es aprobación, venga de donde
    // venga la base. `unknown` y no `error` porque no se sabe que el batch esté mal:
    // se sabe que no se pudo evaluar, y el operador tiene que poder distinguirlo.
    expect(result.evidence).toBeNull()
    expect(result.severity).toBe('unknown')
    expect(result.summary).toContain('Diff vacio')
  })
})
