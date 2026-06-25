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
  // Nombre/apellido del lead (TASK-1257). PII como el email: viven en el lead/submission
  // con consent, NUNCA viajan a los providers. Nullable: el form los pide (required), pero el
  // command es tolerante (leads legacy/a-medida sin nombre siguen válidos; el handoff mapea vacío).
  firstName: string | null
  lastName: string | null
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
  /**
   * `public_id` del run encolado (sólo `accepted`). Id HUMANO-LEGIBLE (EO-GRUN-#####, secuencial)
   * para display/admin — NO es el handle de poll (es enumerable). El poll usa `pollToken`/`submissionId`.
   * Path a-medida (TASK-1240): el run se encola inline → este campo se setea.
   */
  runPublicId: string | null
  /**
   * TASK-1245 — handle de poll de ALTA ENTROPÍA del run (256 bits). Es el id con el que la página
   * hace poll a `GET /run/[handle]` (el `public_id` secuencial NUNCA autoriza). Path a-medida: se
   * setea al run encolado. Path convergente: null (el handle de poll es `submissionId`).
   */
  pollToken?: string | null
  /**
   * TASK-1251 — Path convergente (motor): el run lo encola un reactive consumer
   * (no inline), así que el handle de poll es el `submission_id` del motor. La
   * página/poll (TASK-1245) resuelve submission → run → reportToken. En el path
   * a-medida queda `null`.
   */
  submissionId?: string | null
  /** Mensaje es-CL sanitizado para el cliente. */
  reason: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validación PURA del input público (consent + email + campos requeridos). Único
 * source of truth de validación — la consumen el path a-medida (`createPublicGraderRun`)
 * y la fachada del motor (TASK-1251), para que ambos acepten/rechacen idéntico.
 */
export const isValidPublicGraderInput = (input: PublicGraderRunInput): boolean =>
  input.consent === true &&
  typeof input.email === 'string' &&
  EMAIL_RE.test(input.email.trim()) &&
  [input.brandName, input.market, input.locale, input.category].every(
    value => typeof value === 'string' && value.trim().length > 0
  )
