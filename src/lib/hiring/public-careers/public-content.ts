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
  PUBLIC_COMPENSATION_UNITS,
  PUBLIC_OPENING_CONTENT_VERSION,
  type PublicCompensationUnit,
  type PublicOpeningCompensationRange,
  type PublicOpeningContent
} from '@/types/hiring'
import { isValidCountryCode } from '@/lib/locale/countries'

import { HiringValidationError } from '../errors'

export { PUBLIC_COMPENSATION_UNITS, PUBLIC_OPENING_CONTENT_VERSION }
export type { PublicCompensationUnit, PublicOpeningCompensationRange, PublicOpeningContent }

const MAX_TEXT_LENGTH = 2000
const MAX_ITEM_LENGTH = 400
const MAX_LIST_ITEMS = 12

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

const parseTextList = (value: unknown, field: string): string[] => {
  if (value == null) return []
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

  if (items.length > MAX_LIST_ITEMS) {
    throw invalid(`El campo ${field} admite máximo ${MAX_LIST_ITEMS} ítems.`, { field })
  }

  return items
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
      content.remoteModel ||
      content.compensation ||
      content.outcomes.length ||
      content.workItems.length ||
      content.essentials.length ||
      content.learnables.length ||
      content.processSteps.length ||
      content.benefits.length
  )

/**
 * Write-path: valida y normaliza el bloque de contenido público que viaja por el command
 * canónico (`updateHiringOpening`). Lanza `HiringValidationError` (422) ante forma inválida.
 * Devuelve `null` cuando el input es null/objeto sin contenido (limpiar el bloque).
 */
export const parsePublicOpeningContent = (input: unknown): PublicOpeningContent | null => {
  if (input == null) return null

  if (!isRecord(input)) {
    throw invalid('publicContent debe ser un objeto JSON estructurado.', { field: 'publicContent' })
  }

  const version = Number(input.version ?? PUBLIC_OPENING_CONTENT_VERSION)

  if (version !== PUBLIC_OPENING_CONTENT_VERSION) {
    throw invalid(`publicContent.version debe ser ${PUBLIC_OPENING_CONTENT_VERSION}.`, {
      field: 'publicContent.version'
    })
  }

  const content: PublicOpeningContent = {
    version: PUBLIC_OPENING_CONTENT_VERSION,
    promise: parseOptionalText(input.promise, 'publicContent.promise'),
    intro: parseOptionalText(input.intro, 'publicContent.intro'),
    outcomes: parseTextList(input.outcomes, 'publicContent.outcomes'),
    workItems: parseTextList(input.workItems, 'publicContent.workItems'),
    essentials: parseTextList(input.essentials, 'publicContent.essentials'),
    learnables: parseTextList(input.learnables, 'publicContent.learnables'),
    evidenceAsk: parseOptionalText(input.evidenceAsk, 'publicContent.evidenceAsk'),
    remoteModel: parseOptionalText(input.remoteModel, 'publicContent.remoteModel'),
    processSteps: parseTextList(input.processSteps, 'publicContent.processSteps'),
    benefits: parseTextList(input.benefits, 'publicContent.benefits'),
    compensation: parseCompensation(input.compensation)
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
  if (Number(parsed.version) !== PUBLIC_OPENING_CONTENT_VERSION) return null

  try {
    return parsePublicOpeningContent(parsed)
  } catch {
    return null
  }
}

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
