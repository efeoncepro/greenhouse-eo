import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const require = createRequire(import.meta.url)

const stubServerOnlyForScripts = () => {
  const serverOnlyPath = require.resolve('server-only')

  require.cache[serverOnlyPath] = { exports: {} } as NodeJS.Module
}

class ExpectedRollback extends Error {}

const intentValues = ({
  workspaceId,
  proposalId,
  phase,
  authMode = 'agent',
  grantCredits,
  monthlyCapAfter
}: {
  workspaceId: string
  proposalId: string
  phase: 'proposed' | 'confirmed'
  authMode?: string
  grantCredits: number
  monthlyCapAfter?: number
}) => [
  workspaceId,
  proposalId,
  phase,
  'user-agent-policy-smoke',
  `platform.globe_credit_funding.${phase === 'proposed' ? 'propose' : 'confirm'}`,
  authMode,
  phase === 'confirmed' ? 'user-agent-policy-smoke' : null,
  'smoke-fingerprint',
  JSON.stringify({ grantCredits, ...(monthlyCapAfter === undefined ? {} : { monthlyCapAfter }) }),
  randomUUID(),
  `task-1616-smoke-${randomUUID()}`
]

const insertIntent = async (
  client: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
  input: Parameters<typeof intentValues>[0]
) =>
  client.query(
    `INSERT INTO greenhouse_core.globe_credit_funding_intents
       (globe_workspace_id, proposal_id, phase, actor_user_id, actor_entitlement, actor_auth_mode,
        proposed_by_user_id, plan_fingerprint, plan, correlation_id, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)`,
    intentValues(input)
  )

const expectPolicyOutcome = async ({
  workspaceId,
  grantCredits,
  monthlyCapAfter,
  expectedError,
  authMode
}: {
  workspaceId: string
  grantCredits: number
  monthlyCapAfter?: number
  expectedError?: string
  authMode?: string
}) => {
  const { withTransaction } = await import('@/lib/db')
  const proposalId = `task-1616-smoke-${randomUUID()}`

  try {
    await withTransaction(async client => {
      await insertIntent(client, {
        workspaceId,
        proposalId,
        phase: 'proposed',
        grantCredits,
        monthlyCapAfter,
        authMode
      })
      await insertIntent(client, {
        workspaceId,
        proposalId,
        phase: 'confirmed',
        grantCredits,
        monthlyCapAfter,
        authMode
      })
      throw new ExpectedRollback('rollback_success_path')
    })
  } catch (error) {
    if (expectedError) {
      if (!(error instanceof Error) || !error.message.includes(expectedError)) throw error

      return
    }

    if (error instanceof ExpectedRollback) return
    throw error
  }

  throw new Error(expectedError ? `expected_policy_error_missing:${expectedError}` : 'expected_rollback_missing')
}

async function main() {
  stubServerOnlyForScripts()
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  await expectPolicyOutcome({
    workspaceId: 'greenhouse-org:efeonce',
    grantCredits: 500,
    monthlyCapAfter: 1500
  })
  await expectPolicyOutcome({
    workspaceId: 'greenhouse-org:efeonce',
    grantCredits: 10,
    authMode: 'unknown',
    expectedError: 'globe_credit_funding_intent_actor_must_be_authenticated_user'
  })
  await expectPolicyOutcome({
    workspaceId: 'greenhouse-org:efeonce',
    grantCredits: 1001,
    expectedError: 'globe_credit_funding_agent_limit_exceeded'
  })
  await expectPolicyOutcome({
    workspaceId: 'greenhouse-org:without-agent-delegation',
    grantCredits: 10,
    expectedError: 'globe_credit_funding_agent_confirmation_forbidden'
  })

  process.stdout.write(
    `${JSON.stringify({ delegatedWorkspace: 'pass', overLimit: 'denied', undelegatedWorkspace: 'denied', unknownAuthMode: 'denied', persistedRows: 0 })}\n`
  )
}

main()
  .catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : 'globe_agent_funding_policy_smoke_failed'}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    const { closeGreenhousePostgres } = await import('@/lib/db')

    await closeGreenhousePostgres({ source: 'close' }).catch(() => undefined)
  })
