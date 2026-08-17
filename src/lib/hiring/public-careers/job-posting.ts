import 'server-only'

// TASK-1740 — Google `JobPosting` JSON-LD builder (server-only, puro y determinista).
//
// El schema nace de EXACTAMENTE la misma proyección allowlist que ve el candidato
// (`PublicOpeningPayload`): no existe un segundo texto SEO que pueda prometer hechos
// distintos. El builder es fail-closed: si la vacante no puede producir un JobPosting
// VÁLIDO según las reglas de Google, devuelve `null` y la página no emite schema.
//
// Reglas duras (spec TASK-1740 + Google JobPosting):
// - Remoto: `jobLocationType: TELECOMMUTE` SOLO con ≥1 país elegible normalizado
//   (`remoteEligibleCountries`). Regiones libres (`LATAM`, `Global`) NUNCA habilitan schema.
// - Híbrido/presencial: `jobLocation` estructurado requiere city+country públicos.
// - `baseSalary` SOLO desde `content.compensation` (rango aprobado estructurado);
//   `compensationBand` (texto libre) jamás se convierte en salario.
// - `directApply` NUNCA se emite: el flujo tiene un paso detail → formulario.
// - `validThrough` NUNCA se emite: no existe expiración real; el retiro es el 404 al
//   despublicar (señal documentada por Google), sin TTL inventado.
// - `employmentType` sólo por mapeo exacto y conservador; texto ambiguo se omite.

import { EFEONCE_BRAND_NAME, EFEONCE_URL_HTTPS } from '@/config/efeonce-brand'
import type { PublicOpeningPayload } from '@/types/hiring'

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const paragraphsToHtml = (value: string): string =>
  value
    .split(/\n{2,}|\r{2,}/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => `<p>${escapeHtml(part).replace(/\r?\n/g, '<br/>')}</p>`)
    .join('')

const listToHtml = (items: string[]): string =>
  items.length ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''

/**
 * Descripción HTML segura construida desde el MISMO contenido visible del payload.
 * Con bloque estructurado usa sus secciones; sin él, cae a la prosa legacy
 * (description/requirements/niceToHave). No agrega hechos ni etiquetas inventadas.
 */
const buildDescriptionHtml = (opening: PublicOpeningPayload): string => {
  const parts: string[] = []
  const content = opening.content

  if (content) {
    if (content.promise) parts.push(paragraphsToHtml(content.promise))
    if (content.intro) parts.push(paragraphsToHtml(content.intro))
    parts.push(listToHtml(content.outcomes))
    parts.push(listToHtml(content.workItems))
    parts.push(listToHtml(content.essentials))
    parts.push(listToHtml(content.learnables))
    if (content.evidenceAsk) parts.push(paragraphsToHtml(content.evidenceAsk))
    if (content.remoteModel) parts.push(paragraphsToHtml(content.remoteModel))
    parts.push(listToHtml(content.processSteps))
    parts.push(listToHtml(content.benefits))
  }

  if (!parts.some(Boolean)) {
    if (opening.summary) parts.push(paragraphsToHtml(opening.summary))
    if (opening.description) parts.push(paragraphsToHtml(opening.description))
    if (opening.requirements) parts.push(paragraphsToHtml(opening.requirements))
    if (opening.niceToHave) parts.push(paragraphsToHtml(opening.niceToHave))
  }

  return parts.filter(Boolean).join('')
}

/**
 * Mapeo conservador de `employmentMode` (texto público) → enum de Google.
 * Sólo matches exactos normalizados; lo ambiguo ("Contrato indefinido" no declara
 * jornada) se omite en vez de inventarse.
 */
const EMPLOYMENT_TYPE_BY_MODE: Record<string, string> = {
  'jornada completa': 'FULL_TIME',
  'full time': 'FULL_TIME',
  'full-time': 'FULL_TIME',
  'full_time': 'FULL_TIME',
  'jornada parcial': 'PART_TIME',
  'media jornada': 'PART_TIME',
  'part time': 'PART_TIME',
  'part-time': 'PART_TIME',
  'freelance': 'CONTRACTOR',
  'contractor': 'CONTRACTOR',
  'honorarios': 'CONTRACTOR',
  'práctica': 'INTERN',
  'practica': 'INTERN',
  'internship': 'INTERN',
}

const resolveEmploymentType = (employmentMode: string | null): string | null => {
  if (!employmentMode) return null

  return EMPLOYMENT_TYPE_BY_MODE[employmentMode.trim().toLowerCase()] ?? null
}

type LocationBlock =
  | { jobLocationType: 'TELECOMMUTE'; applicantLocationRequirements: Array<Record<string, unknown>> }
  | { jobLocation: Record<string, unknown> }

/**
 * Bloque de ubicación válido según el modo. `null` = el schema completo se omite
 * (un JobPosting sin ubicación admisible es inválido para Google).
 */
const resolveLocationBlock = (opening: PublicOpeningPayload): LocationBlock | null => {
  if (opening.workMode === 'remote') {
    if (!opening.remoteEligibleCountries.length) return null

    return {
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: opening.remoteEligibleCountries.map(code => ({
        '@type': 'Country',
        name: code,
      })),
    }
  }

  if (opening.workMode === 'hybrid' || opening.workMode === 'onsite') {
    if (!opening.city?.trim() || !opening.country?.trim()) return null

    return {
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: opening.city.trim(),
          addressCountry: opening.country.trim(),
        },
      },
    }
  }

  // Sin workMode estructurado (legacy) no hay ubicación admisible.
  return null
}

const buildBaseSalary = (opening: PublicOpeningPayload): Record<string, unknown> | null => {
  const compensation = opening.content?.compensation

  if (!compensation) return null

  return {
    '@type': 'MonetaryAmount',
    currency: compensation.currency,
    value: {
      '@type': 'QuantitativeValue',
      minValue: compensation.minValue,
      maxValue: compensation.maxValue,
      unitText: compensation.unitText,
    },
  }
}

/**
 * Construye el JSON-LD `JobPosting` de una vacante PUBLICADA, o `null` si la vacante
 * no puede producir schema válido (sin fecha de publicación, sin título/descripción,
 * remota sin países elegibles, presencial sin ciudad+país).
 */
export const buildJobPostingJsonLd = (
  opening: PublicOpeningPayload,
  baseUrl: string,
): Record<string, unknown> | null => {
  if (!opening.publishedAt || !opening.title.trim()) return null

  const description = buildDescriptionHtml(opening)

  if (!description) return null

  const location = resolveLocationBlock(opening)

  if (!location) return null

  const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/public/careers/${encodeURIComponent(opening.publicId)}`
  const employmentType = resolveEmploymentType(opening.employmentMode)
  const baseSalary = buildBaseSalary(opening)

  return {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: opening.title,
    description,
    datePosted: opening.publishedAt,
    hiringOrganization: {
      '@type': 'Organization',
      name: EFEONCE_BRAND_NAME,
      url: EFEONCE_URL_HTTPS,
      sameAs: EFEONCE_URL_HTTPS,
    },
    identifier: {
      '@type': 'PropertyValue',
      name: EFEONCE_BRAND_NAME,
      value: opening.publicId,
    },
    url: canonicalUrl,
    ...location,
    ...(employmentType ? { employmentType } : {}),
    ...(baseSalary ? { baseSalary } : {}),
  }
}

/**
 * Serialización XSS-safe para inyectar en `<script type="application/ld+json">`:
 * escapa `<` como secuencia unicode para que un cierre de tag dentro del contenido
 * no pueda romper el documento.
 */
export const serializeJsonLd = (jsonLd: Record<string, unknown>): string =>
  JSON.stringify(jsonLd).replace(/</g, '\\u003c')
