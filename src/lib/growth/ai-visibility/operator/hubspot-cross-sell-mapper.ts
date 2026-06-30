import 'server-only'

/**
 * TASK-1279 — Mapper puro del cross-sell operador → propiedades HubSpot (Contact + Company + Lead).
 *
 * Espeja `buildHubSpotLeadHandoffPayload` (TASK-1242) pero para el envío OPERADOR: el match de
 * Company es por el dominio de la ORG sujeto (no por el email del lead), y produce además el
 * payload del **Lead** (objeto `leads`, NUNCA un Deal). Pura y testeable: NO toca PG ni HubSpot.
 *
 * `aeo_check_result` (¿aparece la marca en respuestas de IA?) se deriva conservador del reporte y
 * se setea en la Company (junto al resto de props AEO). Null/no-releasable ⇒ 'No verificado'.
 */

import {
  AI_VISIBILITY_COMPANY_PROPERTIES,
  AI_VISIBILITY_CONTACT_PROPERTIES
} from '../hubspot/properties'
import type { HubSpotCompanyUpsert, HubSpotContactUpsert } from '../hubspot/property-mapper'

const MAX_COMPETITORS_DETECTED = 10

/** Valor canónico es-CL del check AEO (string libre en HubSpot; promover a single-select = follow-up). */
export type AeoCheckResultValue = 'Aparece' | 'No aparece' | 'Info desactualizada' | 'No verificado'

/** Subset del reporte (leak-safe) que el cross-sell necesita. */
export interface OperatorCrossSellReportFacts {
  overallScore: number | null
  scoreVersion: string
  /** Estado del gate: sólo 'ready'/'partial' son releasables. */
  gateStatus: string
  primaryGapKey: string | null
  recommendedMotion: string | null
  competitorsDetected: string[]
  lastRunAt: string | null
}

export interface OperatorCrossSellFacts {
  recipient: { email: string; firstName: string | null; lastName: string | null }
  organizationName: string
  /** Dominio corporativo de la ORG (de website_url). Null ⇒ Lead contact-only (sin Company). */
  organizationDomain: string | null
  leadType: 'expansion' | 'new_business'
  report: OperatorCrossSellReportFacts
  /** URL pública del reporte (si se publicó snapshot); null ⇒ se omite la prop. */
  reportUrl: string | null
}

export interface OperatorCrossSellLeadObject {
  /** `hs_lead_name` (propiedad nativa del objeto leads). */
  name: string
  properties: Record<string, string>
}

export interface OperatorCrossSellPayload {
  contact: HubSpotContactUpsert
  company: HubSpotCompanyUpsert | null
  lead: OperatorCrossSellLeadObject
}

const putIf = (target: Record<string, string>, key: string, value: string | null | undefined): void => {
  if (value !== null && value !== undefined && value !== '') {
    target[key] = value
  }
}

/**
 * Deriva el resultado del check AEO (conservador, V1):
 *  - reporte no releasable (insufficient_data / review_required) o score null ⇒ 'No verificado'.
 *  - score > 0 ⇒ 'Aparece' (la marca fue hallada lo suficiente para puntuar).
 *  - score == 0 ⇒ 'No aparece'.
 * 'Info desactualizada' es un juicio humano (no auto-derivable) → no se setea automáticamente.
 */
export const deriveAeoCheckResult = (report: OperatorCrossSellReportFacts): AeoCheckResultValue => {
  if (report.gateStatus !== 'ready' && report.gateStatus !== 'partial') return 'No verificado'
  if (report.overallScore === null) return 'No verificado'

  return report.overallScore > 0 ? 'Aparece' : 'No aparece'
}

export const buildOperatorCrossSellPayload = (facts: OperatorCrossSellFacts): OperatorCrossSellPayload => {
  const { report } = facts

  const contact: HubSpotContactUpsert = {
    email: facts.recipient.email.trim().toLowerCase(),
    firstName: facts.recipient.firstName?.trim() || null,
    lastName: facts.recipient.lastName?.trim() || null,
    properties: {}
  }

  const companyProperties: Record<string, string> = {}

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
      .join(', ') || null
  )
  putIf(companyProperties, AI_VISIBILITY_COMPANY_PROPERTIES.reportUrl, facts.reportUrl)
  putIf(companyProperties, AI_VISIBILITY_COMPANY_PROPERTIES.lastRunAt, report.lastRunAt)
  putIf(companyProperties, AI_VISIBILITY_COMPANY_PROPERTIES.aeoCheckResult, deriveAeoCheckResult(report))

  putIf(contact.properties, AI_VISIBILITY_CONTACT_PROPERTIES.lastSubmitAt, report.lastRunAt)

  const company: HubSpotCompanyUpsert | null = facts.organizationDomain
    ? { domain: facts.organizationDomain, name: facts.organizationName.trim(), properties: companyProperties }
    : null

  const lead: OperatorCrossSellLeadObject = {
    name: `Diagnóstico AEO — ${facts.organizationName.trim()}`,
    properties: {}
  }

  return { contact, company, lead }
}
