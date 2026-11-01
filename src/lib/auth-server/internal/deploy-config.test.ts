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
    const service = join(dir, 'service.json')
    const sha = 'a'.repeat(40)
    const output = join(dir, 'output')
    const script = join(dir, 'step.sh')

    try {
      writeFileSync(script, step.run)
      writeFileSync(service, JSON.stringify({ status: { traffic: [{ revisionName: 'fixture-revision', percent: 100 }] } }))
      writeFileSync(join(dir,'gcloud'), '#!/bin/bash\nif [ "$2" = services ]; then cat "$FIXTURE_SERVICE"; else cat "$FIXTURE_STATE"; fi\n', { mode: 0o700 })

      for (const [servedFlag, desiredFlag, servedCohort, desiredCohort, internal, expected] of [
        ['', 'false', '', '', 'true', false],
        ['false', 'true', '', 'profile-A', 'true', true],
        ['true', 'true', 'profile-A', 'profile-B', 'true', true],
        ['true', 'true', 'profile-A,profile-B', 'profile-A,profile-B', 'true', false],
        ['false', 'false', '', '', 'false', true]
      ] as const) {
        const values = { GIT_SHA: sha, AUTH_SERVER_INTERNAL_AUTH_ENABLED: internal,
          SENTRY_ENVIRONMENT: 'production', RESEND_API_KEY_SECRET_REF: 'greenhouse-resend-api-key-production:1',
          EXTERNAL_IDENTITY_CANARY_ENABLED: 'false', AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED: servedFlag,
          AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS: servedCohort }

        writeFileSync(state, JSON.stringify({ spec: { containers: [{ env: [
          ...Object.entries(values).map(([name,value]) => ({name,value})),
          { name: 'RESEND_API_KEY', valueFrom: { secretKeyRef: { name: 'greenhouse-resend-api-key-production', key: '1' } } }
        ] }] } }))
        writeFileSync(output, '')
        execFileSync('bash', [script], { env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FIXTURE_STATE: state, FIXTURE_SERVICE: service,
          GITHUB_OUTPUT: output, EXPECTED_SHA: sha, GCP_PROJECT_ID: 'fixture', GCP_REGION: 'fixture',
          ENV: 'production', RESEND_API_KEY_SECRET_REF: 'greenhouse-resend-api-key-production:1',
          AUTH_SERVER_FIRST_PARTY_ENABLED: 'false', AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED: 'false',
          AUTH_SERVER_INVITATION_EMAIL_OTP_CLIENT_ID: '', AUTH_SERVER_INVITATION_EMAIL_OTP_ROOMS_ORIGIN: '',
          DESIRED_AUTH_SERVER_INTERNAL_AUTH_ENABLED: 'true', DESIRED_EXTERNAL_IDENTITY_CANARY_ENABLED: 'false',
          DESIRED_AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED: desiredFlag, DESIRED_AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS: desiredCohort }, stdio: 'pipe' })
        const result = Object.fromEntries(readFileSync(output,'utf8').trim().split('\n').map(line => line.split('=')))

        expect(result.deploy_needed).toBe(String(expected))
        expect(result.config_matches).toBe(String(!expected))
        expect(result.current_revision).toBe('fixture-revision')
      }
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
