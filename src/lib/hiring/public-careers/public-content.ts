// TASK-1740 — Structured public vacancy content (candidate-facing, allowlist-safe).
//
// Este módulo define el ÚNICO contrato de contenido público estructurado de una vacante.
// Reemplaza (de forma incremental, con fallback legacy) al parser heurístico de texto libre
// de `view-model.ts` como fuente de secciones editoriales, y alimenta tanto el HTML visible
// como el JSON-LD `JobPosting` (TASK-1740 Slice 3) desde exactamente la misma evidencia.
//
// Reglas duras:
// - Todo campo es contenido candidate-facing aprobado por el Publication Desk. Nada aquí
//   puede transportar datos internos (budget/rate/risk/owner/cliente); la allowlist de
//   `buildPublicOpeningPayload` sigue siendo la única puerta al navegador.
// - El bloque es versionado (`version: 1`). Un payload persistido con versión desconocida
//   se trata como ausente en el read path (fallback legacy), nunca se reinterpreta.
// - La compensación estructurada es OPCIONAL y sólo se persiste cuando existe un rango
//   monetario aprobado; los beneficios NUNCA se convierten en compensación.

import {
  PUBLIC_OPENING_ADDITIONAL_SECTION_FORMATS,
  PUBLIC_OPENING_LEGACY_CONTENT_VERSION,
  PUBLIC_COMPENSATION_UNITS,
  PUBLIC_OPENING_CONTENT_VERSION,
  type PublicOpeningAdditionalSection,
  type PublicOpeningAdditionalSectionFormat,
  type PublicOpeningCollaboration,
  type PublicCompensationUnit,
  type PublicOpeningCompensationRange,
  type PublicOpeningContent,
  type PublicOpeningProcess,
  type PublicOpeningProcessStep
} from '@/types/hiring'
import { isValidCountryCode } from '@/lib/locale/countries'

import { HiringValidationError } from '../errors'

export {
  PUBLIC_COMPENSATION_UNITS,
  PUBLIC_OPENING_ADDITIONAL_SECTION_FORMATS,
  PUBLIC_OPENING_CONTENT_VERSION,
  PUBLIC_OPENING_LEGACY_CONTENT_VERSION
}
export type {
  PublicCompensationUnit,
  PublicOpeningAdditionalSection,
  PublicOpeningAdditionalSectionFormat,
  PublicOpeningCollaboration,
  PublicOpeningCompensationRange,
  PublicOpeningContent,
  PublicOpeningProcess,
  PublicOpeningProcessStep
}

const MAX_TEXT_LENGTH = 2000
const MAX_ITEM_LENGTH = 400
const MAX_LIST_ITEMS = 12
const MAX_ADDITIONAL_SECTIONS = 3
const MAX_ADDITIONAL_SECTION_ITEMS = 6

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const invalid = (message: string, details?: Record<string, unknown>): HiringValidationError =>
  new HiringValidationError(message, 'hiring_opening_public_content_invalid', 422, details)

const cleanText = (value: string): string => value.replace(/\s+/g, ' ').trim()

const parseOptionalText = (value: unknown, field: string): string | null => {
  if (value == null) return null
  if (typeof value !== 'string') throw invalid(`El campo ${field} debe ser texto.`, { field })
  const cleaned = cleanText(value)

  if (!cleaned) return null

  if (cleaned.length > MAX_TEXT_LENGTH) {
    throw invalid(`El campo ${field} supera el máximo de ${MAX_TEXT_LENGTH} caracteres.`, { field })
  }

  return cleaned
}

const parseRequiredText = (value: unknown, field: string): string => {
  const parsed = parseOptionalText(value, field)

  if (!parsed) throw invalid(`El campo ${field} es obligatorio en publicContent v2.`, { field })

  return parsed
}

const parseTextList = (
  value: unknown,
  field: string,
  { min = 0, max = MAX_LIST_ITEMS }: { min?: number; max?: number } = {}
): string[] => {
  if (value == null) {
    if (min > 0) throw invalid(`El campo ${field} debe contener entre ${min} y ${max} ítems.`, { field, min, max })

    return []
  }

  if (!Array.isArray(value)) throw invalid(`El campo ${field} debe ser una lista de textos.`, { field })

  const items = value
    .map((item, index) => {
      if (typeof item !== 'string') {
        throw invalid(`El campo ${field}[${index}] debe ser texto.`, { field })
      }

      const cleaned = cleanText(item)

      if (cleaned.length > MAX_ITEM_LENGTH) {
        throw invalid(`El campo ${field}[${index}] supera el máximo de ${MAX_ITEM_LENGTH} caracteres.`, { field })
      }

      return cleaned
    })
    .filter(Boolean)

  if (items.length < min || items.length > max) {
    throw invalid(`El campo ${field} debe contener entre ${min} y ${max} ítems.`, { field, min, max })
  }

  return items
}

const parseCollaboration = (value: unknown): PublicOpeningCollaboration => {
  if (!isRecord(value)) {
    throw invalid('publicContent.collaboration debe ser un objeto.', { field: 'publicContent.collaboration' })
  }

  return {
    team: parseRequiredText(value.team, 'publicContent.collaboration.team'),
    reportsTo: parseRequiredText(value.reportsTo, 'publicContent.collaboration.reportsTo'),
    language: parseRequiredText(value.language, 'publicContent.collaboration.language'),
    timezoneOverlap: parseRequiredText(value.timezoneOverlap, 'publicContent.collaboration.timezoneOverlap'),
    workingRhythm: parseRequiredText(value.workingRhythm, 'publicContent.collaboration.workingRhythm')
  }
}

const parseProcess = (value: unknown): PublicOpeningProcess => {
  if (!isRecord(value)) {
    throw invalid('publicContent.process debe ser un objeto.', { field: 'publicContent.process' })
  }

  if (!Array.isArray(value.steps)) {
    throw invalid('publicContent.process.steps debe ser una lista.', { field: 'publicContent.process.steps' })
  }

  if (value.steps.length < 3 || value.steps.length > 5) {
    throw invalid('publicContent.process.steps debe contener entre 3 y 5 etapas.', {
      field: 'publicContent.process.steps',
      min: 3,
      max: 5
    })
  }

  const steps = value.steps.map((step, index): PublicOpeningProcessStep => {
    if (!isRecord(step)) {
      throw invalid(`publicContent.process.steps[${index}] debe ser un objeto.`, {
        field: `publicContent.process.steps[${index}]`
      })
    }

    return {
      title: parseRequiredText(step.title, `publicContent.process.steps[${index}].title`),
      body: parseRequiredText(step.body, `publicContent.process.steps[${index}].body`)
    }
  })

  return {
    steps,
    expectedTiming: parseRequiredText(value.expectedTiming, 'publicContent.process.expectedTiming'),
    responseCommitment: parseRequiredText(value.responseCommitment, 'publicContent.process.responseCommitment'),
    accommodationPath: parseRequiredText(value.accommodationPath, 'publicContent.process.accommodationPath')
  }
}

const parseAdditionalSections = (value: unknown): PublicOpeningAdditionalSection[] => {
  if (value == null) return []

  if (!Array.isArray(value)) {
    throw invalid('publicContent.additionalSections debe ser una lista.', {
      field: 'publicContent.additionalSections'
    })
  }

  if (value.length > MAX_ADDITIONAL_SECTIONS) {
    throw invalid(`publicContent.additionalSections admite máximo ${MAX_ADDITIONAL_SECTIONS} bloques.`, {
      field: 'publicContent.additionalSections',
      max: MAX_ADDITIONAL_SECTIONS
    })
  }

  return value.map((section, index): PublicOpeningAdditionalSection => {
    if (!isRecord(section)) {
      throw invalid(`publicContent.additionalSections[${index}] debe ser un objeto.`, {
        field: `publicContent.additionalSections[${index}]`
      })
    }

    const format = typeof section.format === 'string' ? section.format.trim() : ''

    if (!PUBLIC_OPENING_ADDITIONAL_SECTION_FORMATS.includes(format as PublicOpeningAdditionalSectionFormat)) {
      throw invalid(`publicContent.additionalSections[${index}].format debe ser narrative|bullets|milestones.`, {
        field: `publicContent.additionalSections[${index}].format`
      })
    }

    const intro = parseOptionalText(section.intro, `publicContent.additionalSections[${index}].intro`)

    const items = parseTextList(section.items, `publicContent.additionalSections[${index}].items`, {
      max: MAX_ADDITIONAL_SECTION_ITEMS
    })

    if (!intro && !items.length) {
      throw invalid(`publicContent.additionalSections[${index}] necesita intro o items.`, {
        field: `publicContent.additionalSections[${index}]`
      })
    }

    return {
      title: parseRequiredText(section.title, `publicContent.additionalSections[${index}].title`),
      format: format as PublicOpeningAdditionalSectionFormat,
      intro,
      items
    }
  })
}

const parseCompensation = (value: unknown): PublicOpeningCompensationRange | null => {
  if (value == null) return null

  if (!isRecord(value)) {
    throw invalid('compensation debe ser un objeto con currency/minValue/maxValue/unitText.', { field: 'compensation' })
  }

  const currency = typeof value.currency === 'string' ? value.currency.trim().toUpperCase() : ''

  if (!/^[A-Z]{3}$/.test(currency) || !Intl.supportedValuesOf('currency').includes(currency)) {
    throw invalid('compensation.currency debe ser un código ISO 4217 de 3 letras.', { field: 'compensation.currency' })
  }

  const minValue = value.minValue
  const maxValue = value.maxValue

  if (
    typeof minValue !== 'number' ||
    typeof maxValue !== 'number' ||
    !Number.isFinite(minValue) ||
    !Number.isFinite(maxValue) ||
    minValue <= 0 ||
    maxValue <= 0
  ) {
    throw invalid('compensation.minValue/maxValue deben ser montos positivos.', { field: 'compensation' })
  }

  if (minValue > maxValue) {
    throw invalid('compensation.minValue no puede superar maxValue.', { field: 'compensation' })
  }

  const unitText = typeof value.unitText === 'string' ? value.unitText.trim().toUpperCase() : ''

  if (!PUBLIC_COMPENSATION_UNITS.includes(unitText as PublicCompensationUnit)) {
    throw invalid('compensation.unitText debe ser HOUR|DAY|WEEK|MONTH|YEAR.', {
      field: 'compensation.unitText',
      allowed: PUBLIC_COMPENSATION_UNITS
    })
  }

  return { currency, minValue, maxValue, unitText: unitText as PublicCompensationUnit }
}

const hasAnyContent = (content: PublicOpeningContent): boolean =>
  Boolean(
    content.promise ||
      content.intro ||
      content.evidenceAsk ||
      content.workModel ||
      content.collaboration ||
      content.process ||
      content.compensation ||
      content.outcomes.length ||
      content.workItems.length ||
      content.essentials.length ||
      content.preferred.length ||
      content.learnables.length ||
      content.benefits.length ||
      content.additionalSections.length
  )

/**
 * Write-path: valida y normaliza el bloque de contenido público que viaja por el command
 * canónico (`updateHiringOpening`). Lanza `HiringValidationError` (422) ante forma inválida.
 * `null` limpia el bloque. Cualquier objeto nuevo debe declarar v2 completo; v1 es read-only.
 */
export const parsePublicOpeningContent = (input: unknown): PublicOpeningContent | null => {
  if (input == null) return null

  if (!isRecord(input)) {
    throw invalid('publicContent debe ser un objeto JSON estructurado.', { field: 'publicContent' })
  }

  const version = Number(input.version)

  if (version !== PUBLIC_OPENING_CONTENT_VERSION) {
    throw invalid(`Los writes de publicContent deben usar version ${PUBLIC_OPENING_CONTENT_VERSION}.`, {
      field: 'publicContent.version',
      allowed: [PUBLIC_OPENING_CONTENT_VERSION]
    })
  }

  const content: PublicOpeningContent = {
    version: PUBLIC_OPENING_CONTENT_VERSION,
    promise: parseRequiredText(input.promise, 'publicContent.promise'),
    intro: parseRequiredText(input.intro, 'publicContent.intro'),
    outcomes: parseTextList(input.outcomes, 'publicContent.outcomes', { min: 3, max: 5 }),
    workItems: parseTextList(input.workItems, 'publicContent.workItems', { min: 4, max: 8 }),
    essentials: parseTextList(input.essentials, 'publicContent.essentials', { min: 4, max: 8 }),
    preferred: parseTextList(input.preferred, 'publicContent.preferred', { max: 4 }),
    learnables: parseTextList(input.learnables, 'publicContent.learnables', { max: 4 }),
    evidenceAsk: parseRequiredText(input.evidenceAsk, 'publicContent.evidenceAsk'),
    workModel: parseRequiredText(input.workModel, 'publicContent.workModel'),
    collaboration: parseCollaboration(input.collaboration),
    process: parseProcess(input.process),
    benefits: parseTextList(input.benefits, 'publicContent.benefits', { max: 6 }),
    compensation: parseCompensation(input.compensation),
    additionalSections: parseAdditionalSections(input.additionalSections)
  }

  return content
}

const normalizeLegacyV1 = (input: Record<string, unknown>): PublicOpeningContent | null => {
  const processSteps = parseTextList(input.processSteps, 'publicContent.processSteps')

  const content: PublicOpeningContent = {
    version: PUBLIC_OPENING_LEGACY_CONTENT_VERSION,
    promise: parseOptionalText(input.promise, 'publicContent.promise'),
    intro: parseOptionalText(input.intro, 'publicContent.intro'),
    outcomes: parseTextList(input.outcomes, 'publicContent.outcomes'),
    workItems: parseTextList(input.workItems, 'publicContent.workItems'),
    essentials: parseTextList(input.essentials, 'publicContent.essentials'),
    preferred: [],
    learnables: parseTextList(input.learnables, 'publicContent.learnables'),
    evidenceAsk: parseOptionalText(input.evidenceAsk, 'publicContent.evidenceAsk'),
    workModel:
      parseOptionalText(input.remoteModel, 'publicContent.remoteModel') ??
      parseOptionalText(input.workModel, 'publicContent.workModel'),
    collaboration: null,
    process: processSteps.length
      ? {
          steps: processSteps.map(title => ({ title, body: null })),
          expectedTiming: null,
          responseCommitment: null,
          accommodationPath: null
        }
      : null,
    benefits: parseTextList(input.benefits, 'publicContent.benefits'),
    compensation: parseCompensation(input.compensation),
    additionalSections: []
  }

  return hasAnyContent(content) ? content : null
}

/**
 * Read-path: normaliza el JSONB persistido hacia el contrato v1. Es LENIENTE por diseño:
 * un bloque corrupto o de versión desconocida degrada a `null` (fallback legacy de prosa)
 * en vez de romper la página pública. El caller decide si observa la degradación.
 */
export const normalizePublicOpeningContent = (value: unknown): PublicOpeningContent | null => {
  if (value == null) return null

  const parsed = typeof value === 'string' ? safeJsonParse(value) : value

  if (!isRecord(parsed)) return null

  try {
    if (Number(parsed.version) === PUBLIC_OPENING_CONTENT_VERSION) return parsePublicOpeningContent(parsed)
    if (Number(parsed.version) === PUBLIC_OPENING_LEGACY_CONTENT_VERSION) return normalizeLegacyV1(parsed)

    return null
  } catch {
    return null
  }
}

export const isCanonicalPublicOpeningContent = (
  content: PublicOpeningContent | null | undefined
): content is PublicOpeningContent & { version: typeof PUBLIC_OPENING_CONTENT_VERSION } =>
  content?.version === PUBLIC_OPENING_CONTENT_VERSION

const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/**
 * Write-path: valida la lista de países elegibles para una vacante remota.
 * Normaliza a mayúsculas, deduplica y exige ISO 3166-1 alpha-2 reales
 * (`isValidCountryCode`). `null` limpia la elegibilidad (lista vacía).
 * Nunca convierte texto regional libre (`LATAM`, `Global`) en países.
 */
export const parseRemoteEligibleCountries = (input: unknown): string[] => {
  if (input == null) return []

  if (!Array.isArray(input)) {
    throw invalid('publicRemoteEligibleCountries debe ser una lista de códigos ISO alpha-2.', {
      field: 'publicRemoteEligibleCountries'
    })
  }

  const normalized = input.map((item, index) => {
    const code = typeof item === 'string' ? item.trim().toUpperCase() : ''

    if (code.length !== 2 || !isValidCountryCode(code)) {
      throw invalid(`publicRemoteEligibleCountries[${index}] no es un código ISO 3166-1 alpha-2 válido.`, {
        field: 'publicRemoteEligibleCountries'
      })
    }

    return code
  })

  return Array.from(new Set(normalized))
}
