import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const deployScript = () =>
  readFileSync(resolve(process.cwd(), 'services/ops-worker/deploy.sh'), 'utf8')

const deployWorkflow = () =>
  readFileSync(resolve(process.cwd(), '.github/workflows/ops-worker-deploy.yml'), 'utf8')

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

describe('ops-worker deploy identity smoke contract', () => {
  it('keeps the shared worker probe on the public production portal in every deploy mode', () => {
    const script = deployScript()

    expect(script).toContain('DEFAULT_GREENHOUSE_PORTAL_BASE_URL="https://greenhouse.efeoncepro.com"')
    expect(script).not.toContain('DEFAULT_GREENHOUSE_PORTAL_BASE_URL="https://dev-greenhouse.efeoncepro.com"')
    expect(script).toContain('staging is protected by Vercel SSO')
  })
})

describe('ops-worker assessment public-session link cutover contract', () => {
  it('persists the TASK-1746 flag default OFF in the runtime that sends assignment emails', () => {
    const script = deployScript()

    expect(script).toContain(
      'HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED="${HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED:-false}"'
    )
    expect(script).toContain(
      'ENV_VARS="${ENV_VARS},HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED=${HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED}"'
    )
  })

  it('schedules the canonical daily retention owner with readback runtime code', () => {
    const script = deployScript()
    const jobIndex = script.indexOf('"ops-hiring-assessment-public-access-retention"')

    expect(jobIndex).toBeGreaterThan(0)
    expect(script.slice(jobIndex, jobIndex + 300)).toContain('"17 4 * * *"')
    expect(script.slice(jobIndex, jobIndex + 300)).toContain('"/hiring/assessment/public-access-retention"')
  })

  it('treats Hiring notifications as worker inputs for push, latest-SHA and drift checks', () => {
    const workflow = deployWorkflow()

    expect(workflow.match(/src\/lib\/hiring\/notifications/g)).toHaveLength(3)
    expect(workflow.match(/src\/lib\/hiring\/assessment\/public-session/g)).toHaveLength(3)
  })
})

describe('ops-worker Talent Pool projection contract', () => {
  it('persists the projection kill switch and schedules the idempotent reconciler', () => {
    const script = deployScript()
    const jobIndex = script.indexOf('"ops-hiring-talent-pool-reconcile"')

    expect(script).toContain(
      'ENV_VARS="${ENV_VARS},HIRING_TALENT_POOL_PROJECTION_ENABLED=${HIRING_TALENT_POOL_PROJECTION_ENABLED}"'
    )
    expect(jobIndex).toBeGreaterThan(0)
    expect(script.slice(jobIndex, jobIndex + 260)).toContain('"*/5 * * * *"')
    expect(script.slice(jobIndex, jobIndex + 260)).toContain('"/hiring/talent-pool/reconcile"')
  })

  it('treats Talent Pool sources as worker runtime inputs for triggers, resolution and drift checks', () => {
    const workflow = deployWorkflow()

    expect(workflow.match(/src\/lib\/hiring\/talent-pool/g)).toHaveLength(3)
  })
})

describe('ops-worker deploy Notion status-transition contract', () => {
  it('requires the productive Notion token secret before deploy can continue', () => {
    const script = deployScript()

    expect(script).toContain('NOTION_TOKEN_SECRET_NAME="${NOTION_TOKEN_SECRET_NAME:-notion-integration-token-greenhouse-prd}"')
    expect(script).toContain('ERROR: Notion token secret')
    expect(script).toContain('ops-worker cannot process productive Notion status transitions without NOTION_TOKEN')
    expect(script).toContain('SECRETS="${SECRETS},NOTION_TOKEN=${NOTION_TOKEN_SECRET_NAME}:latest"')
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

describe('ops-worker deploy finance DTE emission retry contract', () => {
  it('schedules the governed DTE retry lane through Cloud Scheduler', () => {
    const script = deployScript()
    const ledgerHealthIndex = script.indexOf('ops-finance-ledger-health')
    const dteRetryIndex = script.indexOf('ops-finance-dte-emission-retry')

    expect(dteRetryIndex).toBeGreaterThan(ledgerHealthIndex)
    expect(script).toContain('/finance/dte-emission-retry')
    expect(script).toContain('"batchSize":5')
    expect(script).toContain('queued DTE emission retry, TASK-1194')
  })
})

describe('ops-worker deploy Globe tenancy reconciliation contract', () => {
  it('persists all non-secret Globe identity configuration across destructive deploys', () => {
    const script = deployScript()

    expect(script).toContain('GLOBE_API_BASE_URL=')
    expect(script).toContain('GLOBE_API_AUDIENCE=')
    expect(script).toContain('GLOBE_GCP_PROJECT=')
    expect(script).toContain('GLOBE_GCP_SERVICE_ACCOUNT_EMAIL=')
    expect(script).toContain('ENV_VARS="${ENV_VARS},GLOBE_API_BASE_URL=${GLOBE_API_BASE_URL}"')
    expect(script).toContain(
      'ENV_VARS="${ENV_VARS},GLOBE_GCP_SERVICE_ACCOUNT_EMAIL=${GLOBE_GCP_SERVICE_ACCOUNT_EMAIL}"'
    )
  })

  it('renews the full-workspace projection every five minutes', () => {
    const script = deployScript()
    const jobIndex = script.indexOf('"ops-globe-tenancy-reconcile"')

    expect(jobIndex).toBeGreaterThan(0)
    expect(script.slice(jobIndex, jobIndex + 220)).toContain('"*/5 * * * *"')
    expect(script.slice(jobIndex, jobIndex + 220)).toContain('"/globe/tenancy/reconcile"')
  })
})

describe('ops-worker deploy SEO site audit + backlinks contract (TASK-1304)', () => {
  // Los 3 jobs nacieron paused y se despausaron el 2026-08-06 (smoke E2E real +
  // verificación de handlers). El assert protege el estado DECLARADO vigente contra
  // drift accidental — re-pausar exige cambiar deploy.sh Y este test a la vez.
  it('declares the weekly audit enqueue job enabled', () => {
    const script = deployScript()
    const jobIndex = script.indexOf('"ops-seo-audit-enqueue"')

    expect(jobIndex).toBeGreaterThan(0)
    expect(script.slice(jobIndex, jobIndex + 220)).toContain('"0 6 * * 1"')
    expect(script.slice(jobIndex, jobIndex + 220)).toContain('"/seo/audit/enqueue-batch"')
    expect(script.slice(jobIndex, jobIndex + 220)).toContain('"false"')
  })

  it('declares the 30-minute collect poll enabled', () => {
    const script = deployScript()
    const jobIndex = script.indexOf('"ops-seo-audit-collect"')

    expect(jobIndex).toBeGreaterThan(0)
    expect(script.slice(jobIndex, jobIndex + 220)).toContain('"*/30 * * * *"')
    expect(script.slice(jobIndex, jobIndex + 220)).toContain('"/seo/audit/collect"')
    expect(script.slice(jobIndex, jobIndex + 220)).toContain('"false"')
  })

  it('declares the weekly backlink capture job enabled', () => {
    const script = deployScript()
    const jobIndex = script.indexOf('"ops-seo-backlink-capture"')

    expect(jobIndex).toBeGreaterThan(0)
    expect(script.slice(jobIndex, jobIndex + 220)).toContain('"0 7 * * 1"')
    expect(script.slice(jobIndex, jobIndex + 220)).toContain('"/seo/backlinks/capture-batch"')
    expect(script.slice(jobIndex, jobIndex + 220)).toContain('"false"')
  })
})
