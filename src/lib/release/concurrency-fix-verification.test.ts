import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'

/**
 * TASK-848 / TASK-851 — Anti-regression test for the concurrency fix that
 * killed the incident 2026-04-26 → 2026-05-09.
 *
 * The fix (Opcion A): worker workflows have
 *   `cancel-in-progress: ${{ <production-only expression> }}`
 *
 * which evaluates to:
 *   - true  → workflow_dispatch with environment=production
 *   - true  → push:main (production by branch ref)
 *   - false → workflow_dispatch with environment=staging
 *   - false → push:develop
 *
 * If anyone reverts to `cancel-in-progress: false` for production deploys,
 * the deadlock returns. This test parses the actual YAML files and asserts
 * that the canonical expression is preserved.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..')

const WORKER_WORKFLOWS = [
  '.github/workflows/ops-worker-deploy.yml',
  '.github/workflows/commercial-cost-worker-deploy.yml',
  '.github/workflows/ico-batch-deploy.yml'
] as const

interface WorkflowDoc {
  concurrency?: { group?: string; ['cancel-in-progress']?: string | boolean }
  on?: Record<string, unknown>
}

const loadWorkflow = (relativePath: string): WorkflowDoc => {
  const raw = readFileSync(join(REPO_ROOT, relativePath), 'utf8')

  return parseYaml(raw) as WorkflowDoc
}

describe('TASK-848 concurrency fix Opcion A — anti-regression', () => {
  for (const path of WORKER_WORKFLOWS) {
    it(`${path} preserves production-only cancel-in-progress expression`, () => {
      const doc = loadWorkflow(path)
      const expr = doc.concurrency?.['cancel-in-progress']

      expect(expr, `${path} missing concurrency.cancel-in-progress`).toBeDefined()
      expect(typeof expr).toBe('string')

      const exprStr = String(expr)

      expect(exprStr).toContain('${{')
      expect(exprStr).toContain('}}')
      expect(exprStr).toContain('workflow_dispatch')
      expect(exprStr).toContain('production')
      expect(exprStr).toContain('refs/heads/main')
    })

    it(`${path} concurrency group is keyed by github.ref (per-branch isolation)`, () => {
      const doc = loadWorkflow(path)
      const group = doc.concurrency?.group

      expect(group).toBeDefined()
      expect(String(group)).toContain('${{ github.ref }}')
    })
  }

  it('production-release.yml orchestrator uses cancel-in-progress: false', () => {
    const doc = loadWorkflow('.github/workflows/production-release.yml')
    const cancel = doc.concurrency?.['cancel-in-progress']

    // Distinct SHAs deploy independently; group is keyed by target_sha.
    expect(cancel).toBe(false)
    expect(String(doc.concurrency?.group)).toContain('${{ inputs.target_sha }}')
  })
})

describe('TASK-851 workflow_call contracts', () => {
  for (const path of WORKER_WORKFLOWS) {
    it(`${path} exposes workflow_call with environment + expected_sha inputs`, () => {
      const doc = loadWorkflow(path)
      const onClause = doc.on as Record<string, unknown>

      const workflowCall = onClause?.workflow_call as
        | { inputs?: Record<string, unknown>; secrets?: Record<string, unknown> }
        | undefined

      expect(workflowCall, `${path} missing workflow_call interface`).toBeDefined()

      const inputs = workflowCall?.inputs ?? {}

      expect(inputs.environment).toBeDefined()
      expect(inputs.expected_sha).toBeDefined()

      const secrets = workflowCall?.secrets ?? {}

      expect(secrets.GCP_WORKLOAD_IDENTITY_PROVIDER).toBeDefined()
    })
  }
})
