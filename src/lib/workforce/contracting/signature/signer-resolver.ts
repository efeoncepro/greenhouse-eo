import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { SignatureRequestSignerInput } from '@/lib/signatures/types'

import { WorkforceContractingValidationError } from '../types'

// TASK-1024 — Resolve the ZapSign signer for a contracting case.
//
// V1: the ONLY electronic signer is the WORKER. The employer legal representative's signature is
// PRE-STAMPED into the rendered PDF (TASK-863 / TASK-1023, `@/lib/legal-signatures`) — the company
// signs first, the worker e-signs. This matches Chilean practice for employment contracts (e-signature
// is valid; ≠ finiquito which requires notarial ratification). So the employer does NOT sign via ZapSign.

const runQuery = async <T extends Record<string, unknown>>(
  sql: string,
  params: unknown[],
  client?: PoolClient
): Promise<T[]> => {
  if (client) return (await client.query<T>(sql, params)).rows

  return runGreenhousePostgresQuery<T>(sql, params)
}

/**
 * Resolve the worker signer (name + email) from the subject identity profile. Fail-closed: a worker
 * without a `canonical_email` cannot e-sign — the operator must complete the profile first.
 */
export const resolveContractingWorkerSigner = async (
  subjectIdentityProfileId: string,
  client?: PoolClient
): Promise<SignatureRequestSignerInput> => {
  const rows = await runQuery<{ full_name: string | null; canonical_email: string | null }>(
    `SELECT full_name, canonical_email
     FROM greenhouse_core.identity_profiles
     WHERE profile_id = $1`,
    [subjectIdentityProfileId],
    client
  )

  const profile = rows[0]

  if (!profile) {
    throw new WorkforceContractingValidationError(
      'worker_profile_not_found',
      'No encontramos la identidad del colaborador para enviar a firma.',
      404
    )
  }

  const name = profile.full_name?.trim()
  const email = profile.canonical_email?.trim()

  if (!name) {
    throw new WorkforceContractingValidationError(
      'worker_name_missing',
      'El colaborador no tiene nombre registrado. Completa su ficha antes de enviar a firma.',
      422
    )
  }

  if (!email) {
    throw new WorkforceContractingValidationError(
      'worker_email_missing',
      'El colaborador no tiene email para firma electrónica. Registra su correo antes de enviar a firma.',
      422
    )
  }

  return {
    name,
    email,
    role: 'worker',
    orderGroup: 1
  }
}
