/**
 * TASK-850 — Preflight check #4: release_batch_policy.
 *
 * Computes the diff `origin/main..target_sha` (two-dot) via git
 * subprocess, classifies changed files by domain, and returns a decision:
 *   - ship: ok severity
 *   - split_batch: error severity
 *   - requires_break_glass: error severity unless override capability validated
 *
 * The git operations are local — the script must be run from a checkout
 * with `origin/main` available. CI runners satisfy this; the watchdog also
 * already runs in checkouts.
 */

import 'server-only'

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import { classifyReleaseBatch, decisionToSeverity } from '../batch-policy/classifier'
import { readLastReleasedRelease } from '../last-released-reader'
import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

const execFileAsync = promisify(execFile)
const GIT_TIMEOUT_MS = 8_000

/**
 * ISSUE-114 — Canonical diff base for release batch classification.
 *
 * MUST be **two-dot** (`base..target`), NEVER three-dot (`base...target`).
 *
 * Two-dot answers the only question the batch policy cares about: *"what will
 * production have that it does not have today?"* — a direct tree comparison
 * between what is deployed (`origin/main`) and what we are about to promote.
 *
 * Three-dot starts from the **merge-base**, and the release flow promotes by
 * **squash-merge**: every release creates on `main` a squash commit whose
 * parent is the previous `main`, never an ancestor of `develop`. The merge-base
 * therefore stays frozen *before* the last squash, and three-dot resurrects
 * files that are byte-identical to production as if they were changes of this
 * release. Those phantoms fabricate irreversible domains (typically
 * `cloud_release`) and push an otherwise normal release into
 * `requires_break_glass` — eroding the signal until break-glass means nothing.
 *
 * Two-dot is also strictly *safer*, not laxer: it additionally surfaces files
 * that exist on `main` but not on the target — i.e. a production hotfix this
 * promotion would silently revert. Three-dot hides those by construction.
 *
 * Both consumers (changed files AND commit bodies) resolve their **base** through
 * this single function, so the two can no longer be anchored to different refs —
 * the drift that produced ISSUE-114 in the first place.
 *
 * ⚠️ Sharing the range string does NOT make the two consumers equivalent, and it
 * would be a mistake to read it that way: `git diff A..B` compares **trees**,
 * while `git log A..B` walks **ancestry**. Under squash-merge they diverge by
 * construction — commits that already reached production through a previous
 * squash stay reachable from `develop` but never from `main`, so the commit-body
 * window still spans several already-deployed releases even when the file diff is
 * exact. That asymmetry is real and is NOT fixed here: it is tracked in
 * ISSUE-145, together with the fact that the resulting window makes the
 * `[release-coupled: …]` marker satisfiable by unrelated prose.
 */
export const buildReleaseDiffRange = (baseRef: string, targetSha: string): string =>
  `${baseRef}..${targetSha}`

const runGit = async (args: readonly string[]): Promise<string> => {
  const { stdout } = await execFileAsync('git', [...args], {
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: 10 * 1024 * 1024 // 10MB safe upper bound
  })

  return stdout
}

const collectChangedFiles = async (
  baseRef: string,
  targetSha: string
): Promise<readonly string[]> => {
  const stdout = await runGit(['diff', '--name-only', buildReleaseDiffRange(baseRef, targetSha)])

  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

const collectCommitBodies = async (
  baseRef: string,
  targetSha: string
): Promise<string> => {
  // Format: %B = full commit message (subject + body) per commit, NUL separated.
  // Same canonical base as the file diff — see buildReleaseDiffRange (ISSUE-114).
  const stdout = await runGit(['log', '--format=%B%x00', buildReleaseDiffRange(baseRef, targetSha)])

  return stdout
}

/**
 * TASK-1676 / ISSUE-145 — Resolve the LEFT side of the release diff.
 *
 * The question the batch policy exists to answer is *"what does this release add
 * on top of what production already has?"*. `origin/<branch>` only approximates
 * that answer pre-merge, and degrades into a tautology post-merge: the
 * orchestrator runs with `target_sha` **already merged into `main`**, so the range
 * is empty and the gate approves without having looked at anything. Three
 * consecutive releases reported `filesChanged=0, decision=ship`, one of them
 * carrying 1045 files and 14 migrations.
 *
 * The target_sha of the last `released` manifest answers the question in both
 * moments, and has a second effect that matters just as much: post-merge the range
 * finally CONTAINS the squash commit, so the `[release-coupled: …]` marker can be
 * read where the runbook has always claimed it is read.
 *
 * Falls back to the legacy base when the branch has no released manifest (today,
 * anything other than `main`) or when the reader fails. The fallback is not a hole:
 * the caller refuses to treat an empty diff as approval regardless of which base
 * produced it.
 */
const resolveDiffBase = async (
  targetBranch: string
): Promise<{
  readonly baseRef: string
  readonly source: 'last_released_manifest' | 'branch_head_fallback'
  readonly releaseId?: string
}> => {
  try {
    const lastReleased = await readLastReleasedRelease({ targetBranch })

    if (lastReleased) {
      return {
        baseRef: lastReleased.targetSha,
        source: 'last_released_manifest',
        releaseId: lastReleased.releaseId
      }
    }
  } catch (error) {
    // A reader failure must not silently become an approval. Degrade to the
    // legacy base and let the empty-diff rule below do the gating.
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'release_batch_policy_base' }
    })
  }

  return { baseRef: `origin/${targetBranch}`, source: 'branch_head_fallback' }
}

export const checkReleaseBatchPolicy = async (
  input: PreflightInput
): Promise<PreflightCheckResult> => {
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  const base = await resolveDiffBase(input.targetBranch)
  const baseRef = base.baseRef

  try {
    const [changedFiles, commitBodyText] = await Promise.all([
      collectChangedFiles(baseRef, input.targetSha),
      collectCommitBodies(baseRef, input.targetSha)
    ])

    const baseLabel =
      base.source === 'last_released_manifest'
        ? `${baseRef} (release ${base.releaseId})`
        : `${baseRef} (fallback: la rama no tiene releases registrados)`

    // ── TASK-1676 / ISSUE-145 — un diff vacío NUNCA es aprobación ──
    //
    // El invariante correcto es sobre el RESULTADO, no sobre la base: da igual de
    // dónde salga el ancla, si el rango no contiene nada el check no miró nada, y
    // reportar `ship` ahí es entregar una seguridad que no existe. Es exactamente
    // el defecto que ISSUE-145 documenta, y ponerlo acá lo cierra también para el
    // caso que la formulación original dejaba abierto: base nueva presente pero
    // target idéntico al release anterior.
    //
    // `unknown` en vez de `error` a propósito: no se sabe que el batch esté mal, se
    // sabe que no se pudo evaluar. La diferencia importa porque el operador tiene
    // que poder distinguir "el gate me está frenando" de "el gate no pudo mirar".
    if (changedFiles.length === 0) {
      return {
        checkId: 'release_batch_policy',
        severity: 'unknown',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `Diff vacio contra ${baseLabel} — el batch no pudo evaluarse`,
        error: null,
        evidence: null,
        recommendation:
          base.source === 'last_released_manifest'
            ? 'El target coincide con el ultimo release desplegado: no hay nada que promover. Verificar que el target_sha sea el correcto.'
            : 'Sin release previo registrado para esta rama, la base cae a la HEAD de la rama y post-merge queda vacia. Verificar `release_manifests` y que `git fetch origin` este al dia.'
      }
    }

    const classified = classifyReleaseBatch({ changedFiles, commitBodyText })

    const evidence = {
      ...classified,
      diffBase: baseRef,
      diffBaseSource: base.source,
      ...(base.releaseId ? { diffBaseReleaseId: base.releaseId } : {})
    }

    const severity = decisionToSeverity(evidence.decision, input.overrideBatchPolicy)

    let recommendation = ''

    if (severity === 'error') {
      recommendation = 'Resolver razones del classifier antes de promover release.'
    } else if (severity === 'warning') {
      recommendation =
        'Override aceptado — verificar audit row + reason >= 20 chars en orchestrator manifest.'
    }

    const summary =
      evidence.decision === 'ship'
        ? `${evidence.filesChanged} archivo(s) clasificados vs ${baseLabel}; decision=ship`
        : `${evidence.filesChanged} archivo(s) clasificados vs ${baseLabel}; decision=${evidence.decision} (${evidence.reasons[0] ?? 'sin razones'})`

    return {
      checkId: 'release_batch_policy',
      severity,
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary,
      error: null,
      evidence,
      recommendation
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'release_batch_policy' }
    })

    return {
      checkId: 'release_batch_policy',
      severity: 'unknown',
      status: 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: `No se pudo computar diff git contra ${baseRef}`,
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation:
        base.source === 'last_released_manifest'
          ? `Correr \`git fetch origin\` — el SHA del ultimo release (${baseRef}) tiene que existir en el checkout. Si persiste, verificar que el checkout traiga historia completa (fetch-depth: 0).`
          : 'Correr `git fetch origin` antes de re-ejecutar preflight. Si persiste, verificar checkout local.'
    }
  }
}
