/**
 * TASK-1242 — Growth AI Visibility · HubSpot custom properties (grupo "AEO").
 *
 * Internal name `snake_case` + label "Title Case Legible" (el label es cara visible del
 * CRM para ventas — NUNCA dejar el internal name crudo como label). Las custom van todas
 * al property group `aeo` ("AEO"). Email/nombre/apellido usan props NATIVAS de HubSpot
 * (`email`/`firstname`/`lastname`), NO custom — no entran a este grupo.
 *
 * Estas constantes son el contrato compartido entre el mapper, el cliente de upsert y el
 * script de provisión de properties (out-of-band, portal 48713323).
 */

export const AEO_PROPERTY_GROUP_NAME = 'aeo' as const
export const AEO_PROPERTY_GROUP_LABEL = 'AEO' as const

/** Custom properties de Company (objeto donde vive el grueso del valor comercial). */
export const AI_VISIBILITY_COMPANY_PROPERTIES = {
  score: 'ai_visibility_score',
  scoreVersion: 'ai_visibility_score_version',
  primaryGap: 'ai_visibility_primary_gap',
  recommendedMotion: 'ai_visibility_recommended_motion',
  competitorsDetected: 'ai_visibility_competitors_detected',
  reportUrl: 'ai_visibility_report_url',
  lastRunAt: 'ai_visibility_last_run_at',
} as const

/** Custom properties de Contact (actividad del lead). Email/nombre/apellido son nativas, no acá. */
export const AI_VISIBILITY_CONTACT_PROPERTIES = {
  lastSubmitAt: 'ai_visibility_last_submit_at',
} as const

/** Definición declarativa para la provisión out-of-band (internal name + label legible + tipo). */
export interface HubSpotPropertyDefinition {
  name: string
  label: string
  type: 'number' | 'string' | 'enumeration' | 'datetime'
  objectType: 'companies' | 'contacts'
  groupName: typeof AEO_PROPERTY_GROUP_NAME
}

export const AI_VISIBILITY_PROPERTY_DEFINITIONS: HubSpotPropertyDefinition[] = [
  { name: AI_VISIBILITY_COMPANY_PROPERTIES.score, label: 'AI Visibility Score', type: 'number', objectType: 'companies', groupName: AEO_PROPERTY_GROUP_NAME },
  { name: AI_VISIBILITY_COMPANY_PROPERTIES.scoreVersion, label: 'AI Visibility Score Version', type: 'string', objectType: 'companies', groupName: AEO_PROPERTY_GROUP_NAME },
  { name: AI_VISIBILITY_COMPANY_PROPERTIES.primaryGap, label: 'AI Visibility Primary Gap', type: 'string', objectType: 'companies', groupName: AEO_PROPERTY_GROUP_NAME },
  { name: AI_VISIBILITY_COMPANY_PROPERTIES.recommendedMotion, label: 'AI Visibility Recommended Motion', type: 'string', objectType: 'companies', groupName: AEO_PROPERTY_GROUP_NAME },
  { name: AI_VISIBILITY_COMPANY_PROPERTIES.competitorsDetected, label: 'AI Visibility Competitors Detected', type: 'string', objectType: 'companies', groupName: AEO_PROPERTY_GROUP_NAME },
  { name: AI_VISIBILITY_COMPANY_PROPERTIES.reportUrl, label: 'AI Visibility Report URL', type: 'string', objectType: 'companies', groupName: AEO_PROPERTY_GROUP_NAME },
  { name: AI_VISIBILITY_COMPANY_PROPERTIES.lastRunAt, label: 'AI Visibility Last Run At', type: 'datetime', objectType: 'companies', groupName: AEO_PROPERTY_GROUP_NAME },
  { name: AI_VISIBILITY_CONTACT_PROPERTIES.lastSubmitAt, label: 'AI Visibility Last Submit At', type: 'datetime', objectType: 'contacts', groupName: AEO_PROPERTY_GROUP_NAME },
]
