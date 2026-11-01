import { verifyAnchors } from './source-anchors.mjs'
import { evaluateVariant } from './scenarios.mjs'

export function evaluate() {
  const sourceAnchors = verifyAnchors()
  const variants = ['A-prime', 'B'].map(evaluateVariant)
  const pass = variants.every(v => v.pass)
  const a = variants.find(v => v.variant === 'A-prime')
  const b = variants.find(v => v.variant === 'B')

  const preferred = pass && a.legacy.designSourceChoices === 1 && a.legacy.seoSessionChoices === 1 &&
    b.legacy.designSourceChoices > 1 && b.legacy.seoSessionChoices > 1 ? 'A-prime' : 'undecided'

  return {
    schemaVersion: 1,
    task: 'TASK-2073',
    evidence: 'synthetic-only; local source anchors; no production adapters executed',
    sourceAnchors,
    variants,
    summary: { pass, checks: variants.reduce((sum, v) => sum + v.checks.length, 0), preferred },
    decision: {
      recommendation: preferred,
      reason: 'A-prime retains uniqueness of modeled legacy client-only selectors; B requires replacing all of them.',
      mandatoryForBoth: ['explicit authorized context', 'deterministic service/source routing', 'space-aware cache', 'history ownership'],
      mandatoryForAPrime: ['dedicated child provisioning command', 'commercial-owner normalization BEFORE financial candidates'],
      beforeAnySharedProvisioning: ['U01 context', 'U02 routing', 'U02F finance foundation', 'accepted ADR and persisted contract'],
      productionReady: false,
      limitations: ['No SQL transactions/concurrency', 'No live session/Notion/HubSpot/Finance', 'No real GA4/GSC/AEO query or report',
        'No migration/rollback or delivered stakeholder isolation proof', 'No exhaustive legacy consumer inventory certification']
    }
  }
}

// Import-safe so unit tests can inspect the runner without printing artifacts.
if (process.argv[1]?.endsWith('/evaluate.mjs')) {
  const result = evaluate()

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  if (!result.summary.pass || result.summary.preferred === 'undecided') process.exitCode = 1
}
