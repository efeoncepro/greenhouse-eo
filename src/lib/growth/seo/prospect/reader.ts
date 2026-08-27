import 'server-only'

/**
 * TASK-1709 — Readers gobernados del diagnóstico de prospecto.
 *
 * El mismo par sirve a las tres lanes (app, ecosystem/MCP, Nexa). El sujeto no tiene
 * tenant: la autorización es del ACTOR (capability interna) y vive en el consumer;
 * un diagnóstico JAMÁS se sirve por el portal cliente ni se cruza con `seo_targets`.
 */

import { isSeoProspectDiagnosticEnabled } from '../flags'
import type { ProspectDiagnostic } from './contracts'
import { getProspectDiagnostic, listProspectDiagnostics as listFromStore } from './store'

export type ProspectReaderResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: 'disabled' | 'not_found' }

export const readProspectDiagnostic = async (input: {
  diagnosticId: string
  env?: NodeJS.ProcessEnv
}): Promise<ProspectReaderResult<ProspectDiagnostic>> => {
  if (!isSeoProspectDiagnosticEnabled(input.env ?? process.env)) {
    return { ok: false, errorCode: 'disabled' }
  }

  const diagnostic = await getProspectDiagnostic(input.diagnosticId)

  if (!diagnostic) {
    return { ok: false, errorCode: 'not_found' }
  }

  return { ok: true, data: diagnostic }
}

export const listProspectDiagnostics = async (
  input: { limit?: number; rootDomain?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<ProspectReaderResult<ProspectDiagnostic[]>> => {
  if (!isSeoProspectDiagnosticEnabled(input.env ?? process.env)) {
    return { ok: false, errorCode: 'disabled' }
  }

  return { ok: true, data: await listFromStore({ limit: input.limit, rootDomain: input.rootDomain }) }
}
