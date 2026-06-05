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

/** Legal framework line per jurisdiction pack (gives Claude the right doctrine to draft against). */
const packFrameworkLine = (packCode: string): string => {
  if (packCode.startsWith('CL_CHILE_DEPENDENT')) {
    return 'Marco legal: contrato individual de trabajo DEPENDIENTE regido por el Código del Trabajo chileno (indefinido o plazo fijo). Aplica la doctrina y dictámenes de la Dirección del Trabajo.'
  }

  if (packCode.startsWith('CL_FOREIGNER')) {
    return 'Marco legal: trabajador/a EXTRANJERO/A prestando servicios físicamente en Chile. Aplica el Código del Trabajo chileno + normativa de extranjería (permiso de trabajo/residencia). Requiere revisión legal humana.'
  }

  if (packCode.startsWith('INTERNATIONAL_INTERNAL')) {
    return 'Marco legal: persona FUERA de Chile pagada internamente por Efeonce como operational payer (NO employer-of-record ni empleador local). NO apliques cotizaciones ni retenciones laborales chilenas. Requiere revisión legal humana.'
  }

  return 'Marco legal: usa el marco aplicable al jurisdiction pack indicado; ante duda, decláralo y exige revisión legal.'
}

export interface DraftingPromptPackContext {
  code: string
  requiredClauses: readonly string[]
  prohibitedClauses: readonly string[]
  requiredPersonFacts: readonly string[]
  requiredCompensationFacts: readonly string[]
}

export const buildContractingSystemPrompt = (packCode?: string): string =>
  [
    'Eres un abogado laboralista senior y especialista en compensaciones de Efeonce, con expertise en:',
    '- Derecho del trabajo chileno (Código del Trabajo, doctrina y dictámenes de la Dirección del Trabajo).',
    '- Estructuras de compensación y nómina (regímenes laborales, remuneración fija y variable, asignaciones, beneficios).',
    '- Redacción de contratos laborales y cartas oferta exigibles, con terminología jurídica precisa.',
    '- Traducción legal bilingüe español (Chile) ↔ inglés (EE. UU.), fiel y estructuralmente alineada.',
    '',
    packCode ? packFrameworkLine(packCode) : '',
    '',
    'Redactas borradores estructurados claros, completos y jurídicamente sólidos para revisión humana.',
    'NO apruebas, NO firmas, NO decides legalidad ni emites opinión legal vinculante: eres asistente de redacción.',
    '',
    'Reglas duras:',
    '- Genera SIEMPRE ambas versiones: es-CL y en-US, alineadas 1:1 por sectionCode (misma estructura, mismo orden).',
    '- es-CL es la versión legal PREVALENTE para Chile; en-US debe ser traducción fiel, no una reinterpretación distinta.',
    '- Redacta cláusulas COMPLETAS y exigibles con la terminología correcta. Sé asertivo y preciso; evita lenguaje vago o condicional innecesario.',
    '- NUNCA inventes montos, fechas, identidades de personas/entidades ni hechos tributarios/payroll. Si falta un dato necesario, NO lo inventes: decláralo en missingFacts y deja un placeholder explícito (p. ej. «[POR DEFINIR]»).',
    '- No incluyas secretos, tokens ni datos no provistos en el input.',
    '- Marca prohibitedContentDetected=true si detectas contenido prohibido por el pack.',
    'Devuelve la salida exclusivamente vía la herramienta emit_workforce_contracting_draft.'
  ]
    .filter(line => line !== '')
    .join('\n')

export const buildContractingDraftingPrompt = (packet: ContractingInputPacket, pack?: DraftingPromptPackContext): string => {
  const lines = [
    `Tipo de documento: ${packet.documentKind}`,
    `Jurisdiction pack: ${packet.jurisdictionPackCode}`,
    `Idioma autoritativo: ${packet.authoritativeLanguage}`,
    `Idiomas requeridos: ${packet.requiredLanguages.join(', ')}`,
    `Tupla contractual: ${packet.contractTuple.contractType} / ${packet.contractTuple.payRegime} / ${packet.contractTuple.payrollVia}`,
    ''
  ]

  if (pack) {
    lines.push(
      'Cláusulas OBLIGATORIAS (cada una en AMBOS idiomas, una por sectionCode, en este orden):',
      pack.requiredClauses.length > 0 ? pack.requiredClauses.map(c => `- ${c}`).join('\n') : '- (el pack no fija cláusulas mínimas; usa la estructura estándar del tipo de documento)',
      '',
      `Cláusulas PROHIBIDAS (no deben aparecer): ${pack.prohibitedClauses.length > 0 ? pack.prohibitedClauses.join(', ') : 'ninguna'}`,
      `Hechos de persona requeridos: ${pack.requiredPersonFacts.join(', ') || '—'}`,
      `Hechos de compensación requeridos: ${pack.requiredCompensationFacts.join(', ') || '—'}`,
      ''
    )
  }

  lines.push(
    'Hechos permitidos (usa SOLO estos; cualquier otro dato necesario que falte va en missingFacts):',
    JSON.stringify(packet.facts, null, 2),
    '',
    'Redacta el borrador bilingüe estructurado, completo y exigible. Cada cláusula debe tener heading + body en es-CL y en-US.'
  )

  return lines.join('\n')
}
