/**
 * TASK-850 — Release batch policy classifier.
 *
 * Pure functions: takes a list of changed file paths + commit body markers
 * and returns the policy decision. No I/O, no async — easy to test.
 *
 * Decision tree:
 *   - Zero files → ship (empty release; orchestrator should refuse anyway).
 *   - Only docs/tests/config → ship (low blast radius).
 *   - Sensitive domains present:
 *     - Multiple INDEPENDENT sensitive domains without `[release-coupled]`
 *       marker → split_batch (operator must split or document coupling).
 *     - Any IRREVERSIBLE domain → requires_break_glass (operator must
 *       hold `platform.release.preflight.override_batch_policy` capability).
 *     - Single sensitive domain (reversible) → ship with elevated scrutiny.
 *   - Non-sensitive ui changes → ship.
 */

import type { ReleaseBatchPolicyDecision, ReleaseBatchPolicyEvidence, ReleaseBatchPolicyDomain } from '../types'

import {
  classifyFileDomain,
  detectIrreversibilityFlags,
  detectSensitivePaths,
  INDEPENDENT_DOMAIN_PAIRS,
  IRREVERSIBLE_DOMAINS,
  RELEASE_COUPLED_MARKER_REGEX
} from './domains'

interface ClassifyInput {
  /** Files changed in `origin/main...target_sha` (forward-only). */
  readonly changedFiles: readonly string[]
  /** Concatenated commit body of all commits in the diff. Single string is fine. */
  readonly commitBodyText: string
}

const buildDomainCounts = (
  files: readonly string[]
): Readonly<Partial<Record<ReleaseBatchPolicyDomain, number>>> => {
  const counts: Partial<Record<ReleaseBatchPolicyDomain, number>> = {}

  for (const file of files) {
    const domain = classifyFileDomain(file)

    counts[domain] = (counts[domain] ?? 0) + 1
  }

  return counts
}

/**
 * Returns the set of independent-sensitive domains present in the diff
 * that are NOT covered by the release-coupled marker.
 */
const findUncoupledIndependentSensitiveDomains = (
  domains: Readonly<Partial<Record<ReleaseBatchPolicyDomain, number>>>,
  commitBodyText: string
): readonly (readonly [ReleaseBatchPolicyDomain, ReleaseBatchPolicyDomain])[] => {
  if (RELEASE_COUPLED_MARKER_REGEX.test(commitBodyText)) return []

  const uncoupled: (readonly [ReleaseBatchPolicyDomain, ReleaseBatchPolicyDomain])[] = []

  for (const [a, b] of INDEPENDENT_DOMAIN_PAIRS) {
    const aPresent = (domains[a] ?? 0) > 0
    const bPresent = (domains[b] ?? 0) > 0

    if (aPresent && bPresent) uncoupled.push([a, b])
  }

  return uncoupled
}

const hasIrreversibleDomain = (
  domains: Readonly<Partial<Record<ReleaseBatchPolicyDomain, number>>>
): boolean => {
  for (const domain of IRREVERSIBLE_DOMAINS) {
    if ((domains[domain] ?? 0) > 0) return true
  }

  return false
}

/**
 * Compute the final decision + reasons. Pure deterministic function.
 */
export const classifyReleaseBatch = (input: ClassifyInput): ReleaseBatchPolicyEvidence => {
  const domains = buildDomainCounts(input.changedFiles)
  const sensitivePathsMatched = detectSensitivePaths(input.changedFiles)
  const irreversibilityFlags = detectIrreversibilityFlags(domains)
  const filesChanged = input.changedFiles.length

  if (filesChanged === 0) {
    return {
      domains,
      sensitivePathsMatched: [],
      irreversibilityFlags: [],
      filesChanged: 0,
      decision: 'ship',
      reasons: ['Diff vacio respecto a origin/main']
    }
  }

  const reasons: string[] = []

  const uncoupledIndependent = findUncoupledIndependentSensitiveDomains(
    domains,
    input.commitBodyText
  )

  if (uncoupledIndependent.length > 0) {
    for (const [a, b] of uncoupledIndependent) {
      reasons.push(
        `Dominios independientes sensibles mezclados sin documentar acoplamiento: ${a} + ${b}. ` +
          `Agregar marker [release-coupled: <razon>] en commit body o split en batches separados.`
      )
    }

    return {
      domains,
      sensitivePathsMatched,
      irreversibilityFlags,
      filesChanged,
      decision: 'split_batch',
      reasons
    }
  }

  if (hasIrreversibleDomain(domains)) {
    reasons.push(
      `Dominios irreversibles tocados: ${irreversibilityFlags.join('; ')}. ` +
        `Operador debe poseer capability platform.release.preflight.override_batch_policy + ` +
        `reason >= 20 chars + audit row.`
    )

    return {
      domains,
      sensitivePathsMatched,
      irreversibilityFlags,
      filesChanged,
      decision: 'requires_break_glass',
      reasons
    }
  }

  if (sensitivePathsMatched.length > 0) {
    reasons.push(
      `${sensitivePathsMatched.length} archivo(s) sensibles tocados (no irreversibles). ` +
        `Revisar diff antes de promover.`
    )
  } else {
    reasons.push('Diff sin dominios sensibles ni irreversibles')
  }

  return {
    domains,
    sensitivePathsMatched,
    irreversibilityFlags,
    filesChanged,
    decision: 'ship',
    reasons
  }
}

/**
 * Map decision to preflight severity:
 *   - ship → ok
 *   - split_batch → error
 *   - requires_break_glass → error (override capability turns it into warning;
 *     the runner handles that re-mapping based on PreflightInput.overrideBatchPolicy)
 */
export const decisionToSeverity = (
  decision: ReleaseBatchPolicyDecision,
  overridden: boolean
): 'ok' | 'warning' | 'error' => {
  if (decision === 'ship') return 'ok'

  if (overridden) return 'warning'

  return 'error'
}
