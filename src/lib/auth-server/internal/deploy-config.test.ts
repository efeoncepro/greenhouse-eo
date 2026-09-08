/** Execute the actual CI change-gate, not textual assertions about YAML contents. No cloud calls. */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

describe('TASK-1844 served auth-server configuration drift', () => {
  it('redeploys a flag/cohort change even at the same SHA and preserves the existing gates', () => {
    const workflow = parse(readFileSync('.github/workflows/auth-server-deploy.yml', 'utf8'))
    const step = Object.values(workflow.jobs as Record<string, { steps: { id?: string; run?: string }[] }>).flatMap(job => job.steps).find(step => step.id === 'worker-drift')

    if (!step?.run) throw new Error('missing real workflow step')
    const dir = mkdtempSync(join(tmpdir(), 'task1844-drift-'))
    const state = join(dir, 'state.json')
    const output = join(dir, 'output')
    const script = join(dir, 'step.sh')

    try {
      writeFileSync(script, step.run)
      writeFileSync(join(dir,'gcloud'), '#!/bin/bash\nif [ "$2" = services ]; then echo fixture-revision; else cat "$FIXTURE_STATE"; fi\n', { mode: 0o700 })

      for (const [servedFlag, desiredFlag, servedCohort, desiredCohort, internal, expected] of [
        ['', 'false', '', '', 'true', false],
        ['false', 'true', '', 'profile-A', 'true', true],
        ['true', 'true', 'profile-A', 'profile-B', 'true', true],
        ['true', 'true', 'profile-A,profile-B', 'profile-A,profile-B', 'true', false],
        ['false', 'false', '', '', 'false', true]
      ] as const) {
        const values = { GIT_SHA: 'fixture-sha', AUTH_SERVER_INTERNAL_AUTH_ENABLED: internal,
          EXTERNAL_IDENTITY_CANARY_ENABLED: 'false', AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED: servedFlag,
          AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS: servedCohort }

        writeFileSync(state, JSON.stringify({ spec: { containers: [{ env: Object.entries(values).map(([name,value]) => ({name,value})) }] } }))
        writeFileSync(output, '')
        execFileSync('bash', [script], { env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FIXTURE_STATE: state,
          GITHUB_OUTPUT: output, EXPECTED_SHA: 'fixture-sha', GCP_PROJECT_ID: 'fixture', GCP_REGION: 'fixture',
          DESIRED_AUTH_SERVER_INTERNAL_AUTH_ENABLED: 'true', DESIRED_EXTERNAL_IDENTITY_CANARY_ENABLED: 'false',
          DESIRED_AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED: desiredFlag, DESIRED_AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS: desiredCohort }, stdio: 'pipe' })
        const result = Object.fromEntries(readFileSync(output,'utf8').trim().split('\n').map(line => line.split('=')))

        expect(result.deploy_needed).toBe(String(expected))
      }
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
