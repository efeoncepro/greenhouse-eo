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
 *   - true  → workflow_call with environment=production
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
  '.github/workflows/ico-batch-deploy.yml',
  '.github/workflows/hubspot-greenhouse-integration-deploy.yml'
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
      expect(exprStr).toContain('workflow_call')
      expect(exprStr).toContain('workflow_dispatch')
      expect(exprStr).toContain('production')
      expect(exprStr).not.toContain('refs/heads/main')
    })

    it(`${path} concurrency group is keyed by github.ref (per-branch isolation)`, () => {
      const doc = loadWorkflow(path)
      const group = doc.concurrency?.group

      expect(group).toBeDefined()
      expect(String(group)).toContain('${{ github.ref }}')
    })
  }

  for (const path of WORKER_WORKFLOWS) {
    it(`${path} does not deploy production automatically on push:main`, () => {
      const doc = loadWorkflow(path)
      const onClause = doc.on as Record<string, unknown>

      const pushTrigger = onClause?.push as
        | { branches?: readonly string[]; paths?: readonly string[] }
        | undefined

      expect(pushTrigger, `${path} missing push trigger`).toBeDefined()
      expect(pushTrigger?.branches).toContain('develop')
      expect(pushTrigger?.branches).not.toContain('main')
      expect(pushTrigger?.paths?.length ?? 0).toBeGreaterThan(0)
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

describe('TASK-861 HubSpot release workflow contract', () => {
  it('hubspot workflow preserves dispatch + call inputs required for drift recovery', () => {
    const doc = loadWorkflow('.github/workflows/hubspot-greenhouse-integration-deploy.yml')
    const onClause = doc.on as Record<string, unknown>

    const workflowCall = onClause?.workflow_call as
      | { inputs?: Record<string, unknown>; secrets?: Record<string, unknown> }
      | undefined

    const workflowDispatch = onClause?.workflow_dispatch as
      | { inputs?: Record<string, unknown> }
      | undefined

    expect(workflowCall?.inputs?.environment).toBeDefined()
    expect(workflowCall?.inputs?.expected_sha).toBeDefined()
    expect(workflowCall?.inputs?.skip_tests).toBeDefined()
    expect(workflowCall?.secrets?.GCP_WORKLOAD_IDENTITY_PROVIDER).toBeDefined()

    expect(workflowDispatch?.inputs?.environment).toBeDefined()
    expect(workflowDispatch?.inputs?.expected_sha).toBeDefined()
    expect(workflowDispatch?.inputs?.skip_tests).toBeDefined()
  })

  it('production-release.yml invokes HubSpot with the release target SHA', () => {
    const doc = loadWorkflow('.github/workflows/production-release.yml') as {
      jobs?: Record<string, { uses?: string; with?: Record<string, unknown> }>
    }

    const hubspotJob = doc.jobs?.['deploy-hubspot-integration']

    expect(hubspotJob?.uses).toBe('./.github/workflows/hubspot-greenhouse-integration-deploy.yml')
    expect(hubspotJob?.with?.environment).toBe('production')
    expect(hubspotJob?.with?.expected_sha).toBe('${{ inputs.target_sha }}')
  })
})

const AZURE_WORKFLOWS = [
  '.github/workflows/azure-teams-deploy.yml',
  '.github/workflows/azure-teams-bot-deploy.yml'
] as const

describe('TASK-853 Azure workflow_call contracts + Bicep diff gating', () => {
  for (const path of AZURE_WORKFLOWS) {
    it(`${path} exposes workflow_call with environment + target_sha + force_infra_deploy inputs`, () => {
      const doc = loadWorkflow(path)
      const onClause = doc.on as Record<string, unknown>

      const workflowCall = onClause?.workflow_call as
        | { inputs?: Record<string, unknown>; secrets?: Record<string, unknown> }
        | undefined

      expect(workflowCall, `${path} missing workflow_call interface`).toBeDefined()

      const inputs = workflowCall?.inputs ?? {}

      expect(inputs.environment).toBeDefined()
      expect(inputs.target_sha).toBeDefined()
      expect(inputs.force_infra_deploy).toBeDefined()

      const secrets = workflowCall?.secrets ?? {}

      expect(secrets.AZURE_CLIENT_ID).toBeDefined()
      expect(secrets.AZURE_TENANT_ID).toBeDefined()
      expect(secrets.AZURE_SUBSCRIPTION_ID).toBeDefined()
    })

    it(`${path} preserves push trigger + path filter (back-compat)`, () => {
      const doc = loadWorkflow(path)
      const onClause = doc.on as Record<string, unknown>

      const pushTrigger = onClause?.push as
        | { branches?: readonly string[]; paths?: readonly string[] }
        | undefined

      expect(pushTrigger, `${path} missing push trigger`).toBeDefined()
      expect(pushTrigger?.branches).toContain('main')
      expect(pushTrigger?.paths?.length ?? 0).toBeGreaterThan(0)
    })

    it(`${path} workflow_dispatch accepts force_infra_deploy override`, () => {
      const doc = loadWorkflow(path)
      const onClause = doc.on as Record<string, unknown>

      const dispatchTrigger = onClause?.workflow_dispatch as
        | { inputs?: Record<string, unknown> }
        | undefined

      const inputs = dispatchTrigger?.inputs ?? {}

      expect(inputs.force_infra_deploy, `${path} workflow_dispatch missing force_infra_deploy input`).toBeDefined()
    })

    it(`${path} declares 5 canonical jobs (health-check, validate, diff-detection, deploy, skip-deploy-summary)`, () => {
      const doc = loadWorkflow(path) as { jobs?: Record<string, unknown> }
      const jobs = doc.jobs ?? {}
      const expectedJobs = ['health-check', 'validate', 'diff-detection', 'deploy', 'skip-deploy-summary']

      for (const jobName of expectedJobs) {
        expect(jobs[jobName], `${path} missing job '${jobName}'`).toBeDefined()
      }
    })
  }
})

describe('TASK-853 production-release.yml orchestrator wires Azure jobs', () => {
  it('production-release.yml has 2 deploy-azure-* jobs after deploy-hubspot-integration', () => {
    const doc = loadWorkflow('.github/workflows/production-release.yml') as {
      jobs?: Record<string, unknown>
    }

    const jobs = doc.jobs ?? {}

    expect(jobs['deploy-azure-teams-notifications']).toBeDefined()
    expect(jobs['deploy-azure-teams-bot']).toBeDefined()
  })

  it('post-release-health needs both Azure deploy jobs (waits for them before pinging)', () => {
    const doc = loadWorkflow('.github/workflows/production-release.yml') as {
      jobs?: Record<string, { needs?: readonly string[] }>
    }

    const needs = doc.jobs?.['post-release-health']?.needs ?? []

    expect(needs).toContain('deploy-azure-teams-notifications')
    expect(needs).toContain('deploy-azure-teams-bot')
  })

  it('Azure jobs use secrets: inherit (canonical pattern for environment-scoped secrets)', () => {
    const doc = loadWorkflow('.github/workflows/production-release.yml') as {
      jobs?: Record<string, { secrets?: string | Record<string, unknown> }>
    }

    expect(doc.jobs?.['deploy-azure-teams-notifications']?.secrets).toBe('inherit')
    expect(doc.jobs?.['deploy-azure-teams-bot']?.secrets).toBe('inherit')
  })
})
