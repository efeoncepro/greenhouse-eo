import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Cloud Run deploy Secret Manager IAM helper', () => {
  it('checks existing bindings before mutating Secret Manager IAM policy', () => {
    const helper = read('services/_shared/gcloud-secret-iam.sh')

    expect(helper).toContain('secret_accessor_binding_exists')
    expect(helper).toContain('gcloud secrets get-iam-policy')
    expect(helper).toContain('bindings.role=roles/secretmanager.secretAccessor')
  })

  it('retries transient concurrent IAM policy updates without swallowing permanent errors', () => {
    const helper = read('services/_shared/gcloud-secret-iam.sh')

    expect(helper).toContain('GREENHOUSE_SECRET_IAM_MAX_ATTEMPTS')
    expect(helper).toContain('concurrent policy changes|Status code: 409|ABORTED')
    expect(helper).toContain('return "${status}"')
  })

  it('is sourced by deploy scripts that mutate Secret Manager access', () => {
    const scripts = [
      'services/ops-worker/deploy.sh',
      'services/commercial-cost-worker/deploy.sh',
      'services/hubspot_greenhouse_integration/deploy.sh'
    ]

    for (const scriptPath of scripts) {
      const script = read(scriptPath)

      expect(script).toContain('source "${SCRIPT_DIR}/../_shared/gcloud-secret-iam.sh"')
      expect(script).not.toContain('gcloud secrets add-iam-policy-binding "${secret_name}"')
    }
  })
})
