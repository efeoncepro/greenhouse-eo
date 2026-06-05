import 'server-only'

import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { buildSignatureFilenameForTaxId } from '@/lib/legal-signatures'

import type { WorkforceContractingStructuredContent } from '../types'
import type {
  ContractingDocumentKind,
  ContractingDocumentLanguage,
  ContractingPdfSection,
  ContractingPdfSnapshot,
  ContractingPdfTermRow
} from './contracting-document-types'

// Clause ordinals (es-CL legal convention + en-US mirror) up to 20 clauses.
const ORDINALS_ES = [
  'PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO', 'SEXTO', 'SÉPTIMO', 'OCTAVO', 'NOVENO', 'DÉCIMO',
  'UNDÉCIMO', 'DUODÉCIMO', 'DECIMOTERCERO', 'DECIMOCUARTO', 'DECIMOQUINTO', 'DECIMOSEXTO', 'DECIMOSÉPTIMO',
  'DECIMOCTAVO', 'DECIMONOVENO', 'VIGÉSIMO'
] as const

const ORDINALS_EN = [
  'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH',
  'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH',
  'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH'
] as const

// Section codes that are preamble/prose (NO clause ordinal): comparecencia, salutation, etc.
const PREAMBLE_CODE = /comparecenc|preamble|parties|encabez|salutation|saludo|acceptance|aceptaci/i

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const factString = (facts: Record<string, unknown>, key: string): string | null => {
  const v = facts[key]

  if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  if (typeof v === 'number') return String(v)
  
return null
}

/** Split a section body into paragraphs (double-newline, then single-newline fallback). */
const toParagraphs = (body: string): string[] => {
  const blocks = body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)

  if (blocks.length > 0) return blocks
  const single = body.split(/\n/).map(p => p.trim()).filter(Boolean)

  
return single.length > 0 ? single : [body.trim()]
}

const mapLocalized = (
  content: WorkforceContractingStructuredContent,
  lang: ContractingDocumentLanguage,
  kind: ContractingDocumentKind
): { title: string; sections: ContractingPdfSection[] } => {
  const localized = content.localizedDrafts[lang]
  const ordinals = lang === 'es-CL' ? ORDINALS_ES : ORDINALS_EN
  let clauseIndex = 0

  const sections: ContractingPdfSection[] = localized.sections.map(s => {
    const isPreamble = kind === 'offer_letter' || PREAMBLE_CODE.test(s.sectionCode) || s.heading.trim().length === 0
    const ordinal = isPreamble ? null : (ordinals[clauseIndex] ?? null)

    if (!isPreamble) clauseIndex += 1

    return {
      sectionCode: s.sectionCode,
      ordinal,
      heading: s.heading,
      paragraphs: toParagraphs(s.body)
    }
  })

  return { title: localized.title, sections }
}

const buildOfferTerms = (facts: Record<string, unknown>): ContractingPdfTermRow[] => {
  const rows: ContractingPdfTermRow[] = []

  const push = (code: string, labelEs: string, labelEn: string, value: string | null) => {
    if (value) rows.push({ code, labelEs, labelEn, value })
  }

  const gross = factString(facts, 'gross_amount')
  const currency = factString(facts, 'currency')
  const grossValue = gross ? `${gross}${currency ? ` ${currency}` : ''}` : null

  push('role', 'Cargo', 'Role', factString(facts, 'role_title'))
  push('gross', 'Remuneración bruta mensual', 'Monthly gross salary', grossValue)
  push('start', 'Fecha de inicio', 'Start date', factString(facts, 'target_start_date'))
  push('modality', 'Modalidad', 'Work arrangement', factString(facts, 'work_mode'))
  push('place', 'Lugar de trabajo', 'Workplace', factString(facts, 'work_location'))
  push('term', 'Tipo de contrato', 'Contract type', factString(facts, 'contract_term_type'))

  return rows
}

const formatPlaceDate = (renderedAt: Date, lang: ContractingDocumentLanguage): string => {
  const d = renderedAt.getDate()
  const m = renderedAt.getMonth()
  const y = renderedAt.getFullYear()

  
return lang === 'es-CL'
    ? `Santiago de Chile, ${d} de ${MONTHS_ES[m]} de ${y}`
    : `Santiago, Chile, ${MONTHS_EN[m]} ${d}, ${y}`
}

export interface BuildContractingPdfSnapshotInput {
  caseKind: ContractingDocumentKind
  jurisdictionPackCode: string
  authoritativeLanguage: ContractingDocumentLanguage
  structuredContent: WorkforceContractingStructuredContent
  capturedFacts: Record<string, unknown> | null
  /** Render moment (immutable in the snapshot). */
  renderedAt: Date
}

/**
 * TASK-1023 — compose the immutable PDF snapshot from the approved draft + live employer identity.
 * Worker + offer terms come from the draft's captured facts (structured, OQ2); the employer comes
 * from the operating entity (live); the legal-representative signature is keyed by the employer
 * taxId. Captured ONCE at first render and reused (OQ1) so an approved document never changes.
 */
export const buildContractingPdfSnapshot = async (
  input: BuildContractingPdfSnapshotInput
): Promise<ContractingPdfSnapshot> => {
  const facts = input.capturedFacts ?? {}
  const operatingEntity = await getOperatingEntityIdentity()

  const employerLegalName = operatingEntity?.legalName ?? factString(facts, 'operating_entity_legal_name') ?? 'Efeonce Group SpA'
  const employerTaxId = operatingEntity?.taxId ?? null

  return {
    caseKind: input.caseKind,
    jurisdictionPackCode: input.jurisdictionPackCode,
    authoritativeLanguage: input.authoritativeLanguage,
    employer: {
      legalName: employerLegalName,
      taxId: employerTaxId,
      legalAddress: operatingEntity?.legalAddress ?? null,
      // Representative name is not a captured fact today (foundation gap); the pre-stamped PNG is the
      // legally meaningful identification. Forward-compat: read the fact if it ever lands in the allowlist.
      representativeName: factString(facts, 'operating_entity_legal_representative'),
      legalRepresentativeSignaturePath: buildSignatureFilenameForTaxId(employerTaxId)
    },
    worker: {
      fullName: factString(facts, 'full_name') ?? '',
      taxId: factString(facts, 'national_id'),
      nationality: factString(facts, 'nationality'),
      address: factString(facts, 'address'),
      jobTitle: factString(facts, 'role_title')
    },
    terms: input.caseKind === 'offer_letter' ? buildOfferTerms(facts) : [],
    localized: {
      'es-CL': mapLocalized(input.structuredContent, 'es-CL', input.caseKind),
      'en-US': mapLocalized(input.structuredContent, 'en-US', input.caseKind)
    },
    placeDateEs: formatPlaceDate(input.renderedAt, 'es-CL'),
    placeDateEn: formatPlaceDate(input.renderedAt, 'en-US'),
    generatedAt: `${String(input.renderedAt.getDate()).padStart(2, '0')}/${String(input.renderedAt.getMonth() + 1).padStart(2, '0')}/${input.renderedAt.getFullYear()}`
  }
}
