// TASK-1019 Slice 3 — Deterministic AI input packet (pure, allowlist-based).
// Only document-necessary facts reach the prompt. Secrets, provider tokens, raw bank
// data and unrelated payroll history are dropped by construction (arch §11). NOT
// server-only (testable without DB); the adapter hashes the packet for ai_run audit.

import {
  REQUIRED_LANGUAGES,
  type ContractLanguage,
  type WorkforceContractingCaseKind
} from '../types'
import type { ContractTuple } from '../jurisdiction-packs/types'

/**
 * Canonical allowlist of fact codes that may be sent to Claude. These are the fields
 * a contract/offer legitimately needs. Anything NOT here (bank_account, *_token,
 * salary_history, ...) is dropped before the prompt is built.
 */
export const ALLOWED_FACT_CODES: ReadonlySet<string> = new Set([
  // person identity (document subject — needed for the parties clause)
  'full_name',
  'national_id',
  'nationality',
  'birth_date',
  'address',
  'country_of_residence',
  'work_authorization',
  'residence_permit',
  // role
  'role_title',
  'area',
  'seniority',
  'manager_name',
  // relationship + entity
  'operating_entity_legal_name',
  'target_start_date',
  // compensation (amounts ARE needed to draft)
  'gross_amount',
  'currency',
  'pay_period',
  'pay_method',
  'benefits',
  'variable_compensation',
  // modality
  'work_mode',
  'work_location',
  'remote_setup',
  // conditions
  'prior_conditions',
  'contract_term_type'
])

export interface ContractingInputPacket {
  documentKind: WorkforceContractingCaseKind
  jurisdictionPackCode: string
  authoritativeLanguage: ContractLanguage
  requiredLanguages: ContractLanguage[]
  contractTuple: ContractTuple
  facts: Record<string, unknown>
}

export interface BuildInputPacketInput {
  facts: Record<string, unknown>
  documentKind: WorkforceContractingCaseKind
  jurisdictionPackCode: string
  contractTuple: ContractTuple
  authoritativeLanguage?: ContractLanguage
}

export interface BuildInputPacketResult {
  packet: ContractingInputPacket
  providedFactCodes: string[]
  droppedFactCodes: string[]
}

/** Strict allowlist sanitisation: keep only ALLOWED_FACT_CODES with non-empty values. */
export const sanitizeFacts = (facts: Record<string, unknown>) => {
  const sanitized: Record<string, unknown> = {}
  const dropped: string[] = []

  for (const [key, value] of Object.entries(facts ?? {})) {
    const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0)

    if (ALLOWED_FACT_CODES.has(key) && !empty) {
      sanitized[key] = value
    } else if (!ALLOWED_FACT_CODES.has(key)) {
      dropped.push(key)
    }
  }

  return { sanitized, dropped }
}

export const buildContractingInputPacket = (input: BuildInputPacketInput): BuildInputPacketResult => {
  const { sanitized, dropped } = sanitizeFacts(input.facts)

  return {
    packet: {
      documentKind: input.documentKind,
      jurisdictionPackCode: input.jurisdictionPackCode,
      authoritativeLanguage: input.authoritativeLanguage ?? 'es-CL',
      requiredLanguages: [...REQUIRED_LANGUAGES],
      contractTuple: input.contractTuple,
      facts: sanitized
    },
    providedFactCodes: Object.keys(sanitized),
    droppedFactCodes: dropped
  }
}

export const buildContractingSystemPrompt = (): string =>
  [
    'Eres un asistente de redacción de documentos laborales para Efeonce.',
    'Redactas SOLO borradores estructurados; no apruebas, no firmas, no decides legalidad.',
    'Reglas duras:',
    '- Genera SIEMPRE ambas versiones: es-CL y en-US, alineadas por sectionCode.',
    '- NUNCA inventes montos, fechas, identidades de personas/entidades ni hechos tributarios/payroll. Si falta un dato, decláralo en missingFacts.',
    '- Para Chile, es-CL es la versión legal prevalente.',
    '- No incluyas secretos, tokens ni datos no provistos en el input.',
    '- Marca prohibitedContentDetected=true si detectas contenido prohibido por el pack.',
    'Devuelve la salida exclusivamente vía la herramienta emit_workforce_contracting_draft.'
  ].join('\n')

export const buildContractingDraftingPrompt = (packet: ContractingInputPacket): string =>
  [
    `Tipo de documento: ${packet.documentKind}`,
    `Jurisdiction pack: ${packet.jurisdictionPackCode}`,
    `Idioma autoritativo: ${packet.authoritativeLanguage}`,
    `Idiomas requeridos: ${packet.requiredLanguages.join(', ')}`,
    `Tupla contractual: ${packet.contractTuple.contractType} / ${packet.contractTuple.payRegime} / ${packet.contractTuple.payrollVia}`,
    '',
    'Hechos permitidos (usa SOLO estos; cualquier otro dato falta y va en missingFacts):',
    JSON.stringify(packet.facts, null, 2),
    '',
    'Redacta el borrador bilingüe estructurado siguiendo las cláusulas mínimas del jurisdiction pack.'
  ].join('\n')
