import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const deployScript = () =>
  readFileSync(resolve(process.cwd(), 'services/ops-worker/deploy.sh'), 'utf8')

describe('ops-worker deploy Nubox contract', () => {
  it('declares Nubox env vars because deploy.sh uses destructive --set-env-vars', () => {
    const script = deployScript()

    expect(script).toContain('NUBOX_API_BASE_URL=')
    expect(script).toContain('NUBOX_BEARER_TOKEN_SECRET_REF=')
    expect(script).toContain('NUBOX_X_API_KEY_SECRET_REF=')
    expect(script).toContain('ENV_VARS="${ENV_VARS},NUBOX_API_BASE_URL=${NUBOX_API_BASE_URL}"')
    expect(script).toContain('ENV_VARS="${ENV_VARS},NUBOX_BEARER_TOKEN_SECRET_REF=${NUBOX_BEARER_TOKEN_SECRET_REF}"')
    expect(script).toContain('ENV_VARS="${ENV_VARS},NUBOX_X_API_KEY_SECRET_REF=${NUBOX_X_API_KEY_SECRET_REF}"')
  })

  it('grants Secret Manager access to Nubox secret refs without mounting token values', () => {
    const script = deployScript()

    expect(script).toContain('ensure_secret_accessor_binding "${NUBOX_BEARER_TOKEN_SECRET_REF}"')
    expect(script).toContain('ensure_secret_accessor_binding "${NUBOX_X_API_KEY_SECRET_REF}"')
    expect(script).not.toContain('NUBOX_BEARER_TOKEN=$(normalize_secret_ref_for_cloud_run')
    expect(script).not.toContain('NUBOX_X_API_KEY=$(normalize_secret_ref_for_cloud_run')
  })
})

describe('ops-worker deploy finance FX drift remediation contract', () => {
  it('schedules bounded remediation after daily rematerialization and before ledger health', () => {
    const script = deployScript()
    const rematerializeIndex = script.indexOf('ops-finance-rematerialize-balances')
    const fxDriftIndex = script.indexOf('ops-finance-fx-drift-remediate')
    const ledgerHealthIndex = script.indexOf('ops-finance-ledger-health')

    expect(fxDriftIndex).toBeGreaterThan(rematerializeIndex)
    expect(fxDriftIndex).toBeLessThan(ledgerHealthIndex)
    expect(script).toContain('/finance/account-balances/fx-drift/remediate')
    expect(script).toContain('"policy":"known_bug_class_restatement"')
    expect(script).toContain('"maxRows":25')
    expect(script).toContain('"maxAccounts":10')
    expect(script).toContain('"maxAbsDriftClp":"5000000"')
  })
})
