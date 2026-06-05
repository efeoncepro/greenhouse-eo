import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { newAiRunId } from '../commands/command-helpers'
import type { LanguageParityStatus, WorkforceContractingAiRunStatus } from '../types'

const runQuery = async <T extends Record<string, unknown>>(
  sql: string,
  params: unknown[],
  client?: PoolClient
): Promise<T[]> => {
  if (client) {
    const result = await client.query<T>(sql, params)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(sql, params)
}

export interface CreateContractingAiRunInput {
  caseId: string
  provider: string
  model: string
  promptVersion: string
  promptHash?: string | null
  inputSnapshotHash: string
}

/** Open an AI run ledger row (status 'pending') before calling the provider. */
export const createContractingAiRun = async (
  input: CreateContractingAiRunInput,
  client?: PoolClient
): Promise<string> => {
  const aiRunId = newAiRunId()

  await runQuery(
    `INSERT INTO greenhouse_hr.workforce_contracting_ai_runs (
       ai_run_id, case_id, provider, model, prompt_version, prompt_hash,
       input_snapshot_hash, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
    [
      aiRunId,
      input.caseId,
      input.provider,
      input.model,
      input.promptVersion,
      input.promptHash ?? null,
      input.inputSnapshotHash
    ],
    client
  )

  return aiRunId
}

export interface FinalizeContractingAiRunInput {
  status: Extract<WorkforceContractingAiRunStatus, 'succeeded' | 'failed'>
  outputHash?: string | null
  languageParityStatus?: LanguageParityStatus | null
  usageJson?: Record<string, unknown> | null
  errorSummary?: string | null
  draftId?: string | null
}

export const finalizeContractingAiRun = async (
  aiRunId: string,
  input: FinalizeContractingAiRunInput,
  client?: PoolClient
): Promise<void> => {
  await runQuery(
    `UPDATE greenhouse_hr.workforce_contracting_ai_runs
     SET status = $2,
         output_hash = $3,
         language_parity_status = $4,
         usage_json = $5::jsonb,
         error_summary = $6,
         draft_id = COALESCE($7, draft_id)
     WHERE ai_run_id = $1`,
    [
      aiRunId,
      input.status,
      input.outputHash ?? null,
      input.languageParityStatus ?? null,
      input.usageJson ? JSON.stringify(input.usageJson) : null,
      input.errorSummary ?? null,
      input.draftId ?? null
    ],
    client
  )
}
