/**
 * TASK-1240 — Growth AI Visibility · Public intake contract (EPIC-020 B). PURO.
 *
 * Input público del lead magnet (§9.2). El `email` es PII (Ley 21.719/GDPR): vive
 * SOLO en el lead con consent, NUNCA viaja a los providers (la interpolación de
 * prompt usa marca/categoría/mercado). `consent` es requerido.
 */

export interface PublicGraderRunInput {
  brandName: string
  websiteUrl: string | null
  market: string
  locale: string
  category: string
  competitorsDeclared: string[]
  email: string
  consent: boolean
  // Firmographics opcionales (§9.2) — enriquecen el lead, no el prompt.
  industry: string | null
  persona: string | null
  companySize: string | null
  mainChallenge: string | null
}

/**
 * Resultado del intake. NO se lanza para bloqueos esperados (rate/cost/captcha):
 * el endpoint mapea `outcome` a un status sanitizado.
 */
export const PUBLIC_INTAKE_OUTCOMES = [
  'accepted',
  'invalid',
  'captcha_failed',
  'rate_limited',
  'cost_blocked',
  'disabled'
] as const
export type PublicIntakeOutcome = (typeof PUBLIC_INTAKE_OUTCOMES)[number]

export interface PublicIntakeResult {
  outcome: PublicIntakeOutcome
  /** `public_id` del run encolado (sólo `accepted`) para que la página haga poll. */
  runPublicId: string | null
  /** Mensaje es-CL sanitizado para el cliente. */
  reason: string
}
