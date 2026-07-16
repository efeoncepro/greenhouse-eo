// TASK-1385 — Vacancy AI: contratos puros (JSON Schema + sanitizer). Sin IO.
// El sanitizer es la FRONTERA de enforcement: valida+clampa la salida cruda del LLM y descarta lo
// malformado (espeja assessment/ai/contracts.ts). Devuelve null si el borrador es inservible.

import type { OpeningPublicCopyProposal } from '@/types/hiring-assessment-ai'

const MAX_TITLE_LEN = 160
const MAX_SUMMARY_LEN = 800
const MAX_DESCRIPTION_LEN = 8000
const MAX_REQUIREMENTS_LEN = 4000
const MAX_NICE_TO_HAVE_LEN = 2000
const MAX_AREA_LEN = 120
const MAX_SENIORITY_LEN = 80
const MAX_PROCESS_NOTES_LEN = 1500
const MAX_NOTE_LEN = 500
const MAX_SKILL_TAGS = 12
const MAX_SKILL_TAG_LEN = 60

const clampStr = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Salida cruda esperada del LLM. Todos los campos se re-validan acá — el schema no basta. */
export interface OpeningPublicCopyRawOutput {
  publicTitle?: unknown
  publicSummary?: unknown
  publicDescription?: unknown
  publicRequirements?: unknown
  publicNiceToHave?: unknown
  publicArea?: unknown
  publicSkillTags?: unknown
  publicSeniority?: unknown
  publicProcessNotes?: unknown
  note?: unknown
}

/** JSON Schema forzado en el structured call (Anthropic inputSchema). */
export const OPENING_PUBLIC_COPY_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['publicTitle', 'publicSummary', 'publicDescription'],
  properties: {
    publicTitle: { type: 'string' },
    publicSummary: { type: 'string' },
    publicDescription: { type: 'string' },
    publicRequirements: { type: 'string' },
    publicNiceToHave: { type: 'string' },
    publicArea: { type: 'string' },
    publicSkillTags: { type: 'array', maxItems: MAX_SKILL_TAGS, items: { type: 'string' } },
    publicSeniority: { type: 'string' },
    publicProcessNotes: { type: 'string' },
    note: { type: 'string' },
  },
} as const

/**
 * Valida+clampa el borrador de copy público. Exige title+summary+description no vacíos (el mínimo
 * para que la propuesta sirva); el resto es opcional y se omite si viene vacío/malformado.
 */
export const sanitizeOpeningPublicCopy = (raw: unknown): OpeningPublicCopyProposal | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as OpeningPublicCopyRawOutput

  const publicTitle = clampStr(r.publicTitle, MAX_TITLE_LEN)
  const publicSummary = clampStr(r.publicSummary, MAX_SUMMARY_LEN)
  const publicDescription = clampStr(r.publicDescription, MAX_DESCRIPTION_LEN)

  if (!publicTitle || !publicSummary || !publicDescription) return null

  const skillTags = Array.isArray(r.publicSkillTags)
    ? r.publicSkillTags
        .slice(0, MAX_SKILL_TAGS)
        .map((t) => clampStr(t, MAX_SKILL_TAG_LEN))
        .filter((t) => t.length > 0)
    : undefined

  return {
    publicTitle,
    publicSummary,
    publicDescription,
    publicRequirements: clampStr(r.publicRequirements, MAX_REQUIREMENTS_LEN) || undefined,
    publicNiceToHave: clampStr(r.publicNiceToHave, MAX_NICE_TO_HAVE_LEN) || undefined,
    publicArea: clampStr(r.publicArea, MAX_AREA_LEN) || undefined,
    publicSkillTags: skillTags && skillTags.length > 0 ? skillTags : undefined,
    publicSeniority: clampStr(r.publicSeniority, MAX_SENIORITY_LEN) || undefined,
    publicProcessNotes: clampStr(r.publicProcessNotes, MAX_PROCESS_NOTES_LEN) || undefined,
    note: clampStr(r.note, MAX_NOTE_LEN) || undefined,
  }
}
