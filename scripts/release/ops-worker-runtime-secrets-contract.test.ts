import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'

const REPO_ROOT = join(import.meta.dirname, '..', '..')

const loadWorkflow = (relativePath: string) =>
  parseYaml(readFileSync(join(REPO_ROOT, relativePath), 'utf8')) as {
    on?: Record<string, unknown>
    jobs?: Record<string, { secrets?: Record<string, unknown> }>
  }

describe('TASK-1888 ops-worker runtime secrets contract', () => {
  it('keeps the Lead matching rollout switches persistent and disabled until configured', () => {
    const workflow = readFileSync(join(REPO_ROOT, '.github/workflows/ops-worker-deploy.yml'), 'utf8')
    const deploy = readFileSync(join(REPO_ROOT, 'services/ops-worker/deploy.sh'), 'utf8')

    for (const flag of ['GROWTH_MEASUREMENT_META_ENABLED', 'GROWTH_MEASUREMENT_GOOGLE_UPD_ENABLED', 'GROWTH_MEASUREMENT_RETENTION_ENABLED']) {
      expect(workflow).toContain(`${flag}: \${{ vars.${flag} || 'false' }}`)
      expect(deploy).toContain(`${flag}=\"\${${flag}:-false}\"`)
    }

    for (const secret of ['payload-key', 'ingress-token', 'ga4-api-secret']) {
      expect(deploy).toContain(`projects/efeonce-group/secrets/greenhouse-measurement-${secret}/versions/1`)
    }
  })
  it('forwards required runtime secrets through the production release workflow_call', () => {
    const orchestrator = loadWorkflow('.github/workflows/production-release.yml')
    const worker = loadWorkflow('.github/workflows/ops-worker-deploy.yml')
    const opsWorkerJob = orchestrator.jobs?.['deploy-ops-worker']
    const onClause = worker.on as Record<string, unknown>
    const workflowCall = onClause.workflow_call as { secrets?: Record<string, unknown> } | undefined

    expect(opsWorkerJob?.secrets?.GCP_WORKLOAD_IDENTITY_PROVIDER).toBe(
      '${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}'
    )
    expect(opsWorkerJob?.secrets?.DATAFORSEO_API_LOGIN).toBe('${{ secrets.DATAFORSEO_API_LOGIN }}')
    expect(opsWorkerJob?.secrets?.GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID).toBe(
      '${{ secrets.GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID }}'
    )
    expect(workflowCall?.secrets?.DATAFORSEO_API_LOGIN).toEqual({ required: true })
    expect(workflowCall?.secrets?.GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID).toEqual({ required: true })
  })
})
