import 'server-only'

/**
 * TASK-1242 — Growth AI Visibility · HubSpot lead handoff · property mapper (puro).
 *
 * Mapea (lead + reporte + report_url) → propiedades HubSpot. Función pura y testeable:
 * NO toca PG ni HubSpot. Reglas:
 *  - HubSpot guarda solo el TITULAR (score + gap + motion + report_url + fechas); el
 *    desglose de las 7 dimensiones vive detrás del report_url, no como props.
 *  - Score `null` ⇒ NO se escribe la prop (null ≠ 0; no metemos un 0 falso al CRM).
 *  - El score viaja con su `score_version` (no comparar versiones distintas).
 *  - Competidores = lista normalizada acotada (nunca dump crudo del provider).
 *  - Company solo si el email es corporativo (dedup por dominio); email personal ⇒ company null.
 */

import { classifyEmailDomain } from './email-domain'
import { AI_VISIBILITY_COMPANY_PROPERTIES, AI_VISIBILITY_CONTACT_PROPERTIES } from './properties'

const MAX_COMPETITORS_DETECTED = 10

/** Vista mínima del reporte que el handoff necesita (subset seguro de `GraderReport`). */
export interface LeadHandoffReportFacts {
  overallScore: number | null
  scoreVersion: string
  primaryGapKey: string | null
  recommendedMotion: string | null
  competitorsDetected: string[]
  /** ISO — corrida más reciente del grader (provenance.asOfDate). */
  lastRunAt: string | null
}

export interface LeadHandoffFacts {
  email: string
  firstName: string | null
  lastName: string | null
  brandName: string
  /** ISO — actividad del lead (consent_at / created_at). */
  lastSubmitAt: string | null
  report: LeadHandoffReportFacts
  /** URL pública estable del reporte (token no enumerable). Null si aún no hay snapshot. */
  reportUrl: string | null
}

export interface HubSpotContactUpsert {
  email: string
  firstName: string | null
  lastName: string | null
  /** Custom props del contacto (`ai_visibility_*`). */
  properties: Record<string, string>
}

export interface HubSpotCompanyUpsert {
  /** Dominio corporativo = clave de dedup/match. */
  domain: string
  name: string
  properties: Record<string, string>
}

export interface HubSpotLeadHandoffPayload {
  contact: HubSpotContactUpsert
  /** `null` cuando el email es personal/free (contact-only, sin company). */
  company: HubSpotCompanyUpsert | null
}

/** Agrega un par solo si el valor es no-vacío (evita pisar props con blanks). */
const putIf = (target: Record<string, string>, key: string, value: string | null | undefined): void => {
  if (value !== null && value !== undefined && value !== '') {
    target[key] = value
  }
}

export const buildHubSpotLeadHandoffPayload = (facts: LeadHandoffFacts): HubSpotLeadHandoffPayload => {
  const { report } = facts

  const contactProperties: Record<string, string> = {}

  putIf(contactProperties, AI_VISIBILITY_CONTACT_PROPERTIES.lastSubmitAt, facts.lastSubmitAt)

  const contact: HubSpotContactUpsert = {
    email: facts.email.trim().toLowerCase(),
    firstName: facts.firstName?.trim() || null,
    lastName: facts.lastName?.trim() || null,
    properties: contactProperties,
  }

  const companyProperties: Record<string, string> = {}

  // Score: solo si hay número real (null ⇒ omitido; no escribimos 0 falso).
  if (typeof report.overallScore === 'number') {
    putIf(companyProperties, AI_VISIBILITY_COMPANY_PROPERTIES.score, String(report.overallScore))
    putIf(companyProperties, AI_VISIBILITY_COMPANY_PROPERTIES.scoreVersion, report.scoreVersion)
  }

  putIf(companyProperties, AI_VISIBILITY_COMPANY_PROPERTIES.primaryGap, report.primaryGapKey)
  putIf(companyProperties, AI_VISIBILITY_COMPANY_PROPERTIES.recommendedMotion, report.recommendedMotion)
  putIf(
    companyProperties,
    AI_VISIBILITY_COMPANY_PROPERTIES.competitorsDetected,
    report.competitorsDetected
      .map(name => name.trim())
      .filter(Boolean)
      .slice(0, MAX_COMPETITORS_DETECTED)
      .join(', ') || null,
  )
  putIf(companyProperties, AI_VISIBILITY_COMPANY_PROPERTIES.reportUrl, facts.reportUrl)
  putIf(companyProperties, AI_VISIBILITY_COMPANY_PROPERTIES.lastRunAt, report.lastRunAt)

  const domainClass = classifyEmailDomain(facts.email)

  const company: HubSpotCompanyUpsert | null =
    domainClass.isCorporate && domainClass.domain
      ? { domain: domainClass.domain, name: facts.brandName.trim(), properties: companyProperties }
      : null

  return { contact, company }
}
