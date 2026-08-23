/**
 * TASK-1747 — Vocabulario ISOMORFO de la recuperación de acceso a un assessment.
 *
 * Es la mitad de `contracts.ts` que el NAVEGADOR necesita y podía no tener: los canales, los
 * motivos, los desenlaces, las cuotas y la decisión pura de elegibilidad. `contracts.ts` importa
 * `node:crypto`, así que declara `server-only` y arrastra consigo este vocabulario — la UI que
 * mapea código→copy no puede importarlo sin romper el bundle del cliente.
 *
 * La alternativa era re-declarar los enums en el cliente, que es cómo un vocabulario compartido
 * se convierte en dos vocabularios que divergen en silencio: el día que el dominio agrega un
 * motivo, la pantalla lo muestra sin causa y nada rompe.
 *
 * Regla: acá NUNCA entra un import de Node ni de la base. Lo que necesite `crypto`, la DB o un
 * secreto vive en `contracts.ts`, que re-exporta esto para que el servidor siga leyendo un solo
 * lugar.
 */

// TASK-1754 Slice F — fuente única del vocabulario terminal. Es un import de tipos y constantes
// puras: no arrastra Node ni la base, así que respeta la regla del encabezado.
import { TERMINAL_APPLICATION_STAGES } from '@/types/hiring'

export const ASSESSMENT_ACCESS_RECOVERY_CHANNELS = ['email', 'secure_link'] as const
export type AssessmentAccessRecoveryChannel = (typeof ASSESSMENT_ACCESS_RECOVERY_CHANNELS)[number]

export const ASSESSMENT_ACCESS_RECOVERY_REASONS = [
  'candidate_reports_email_not_received',
  'candidate_reports_link_invalid',
  'alternate_channel_requested',
  'provider_delivery_failed',
  'token_expired_before_start',
] as const
export type AssessmentAccessRecoveryReason = (typeof ASSESSMENT_ACCESS_RECOVERY_REASONS)[number]

export const ASSESSMENT_ACCESS_RECOVERY_OUTCOMES = [
  'pending_dispatch',
  'dispatch_accepted',
  'dispatch_failed',
  'dispatch_unknown',
  'link_issued',
] as const
export type AssessmentAccessRecoveryOutcome = (typeof ASSESSMENT_ACCESS_RECOVERY_OUTCOMES)[number]

export const ASSESSMENT_ACCESS_RECOVERY_ELIGIBLE_STATUSES = [
  'assigned',
  'sent',
  'in_progress',
  'expired',
] as const

export const ASSESSMENT_ACCESS_RECOVERY_EMAIL_TTL_HOURS = 14 * 24
export const ASSESSMENT_ACCESS_RECOVERY_SECURE_LINK_TTL_HOURS = 24
export const ASSESSMENT_ACCESS_RECOVERY_STARTED_GRACE_MINUTES = 30
export const ASSESSMENT_ACCESS_RECOVERY_COOLDOWN_SECONDS = 60
export const ASSESSMENT_ACCESS_RECOVERY_MAX_PER_24_HOURS = 3

export const isAssessmentAccessRecoveryChannel = (
  value: unknown,
): value is AssessmentAccessRecoveryChannel =>
  ASSESSMENT_ACCESS_RECOVERY_CHANNELS.includes(value as AssessmentAccessRecoveryChannel)

export const isAssessmentAccessRecoveryReason = (
  value: unknown,
): value is AssessmentAccessRecoveryReason =>
  ASSESSMENT_ACCESS_RECOVERY_REASONS.includes(value as AssessmentAccessRecoveryReason)

/** Hash-only idempotency evidence. The caller's key is never persisted or logged. */
export interface AssessmentAccessRecoveryReceipt {
  recoveryId: string
  assessmentId: string
  applicationId: string
  openingId: string
  channel: AssessmentAccessRecoveryChannel
  reasonCode: AssessmentAccessRecoveryReason
  previousStatus: string
  resultingStatus: string
  tokenVersionId: string
  issuedAt: string
  expiresAt: string
  outcome: AssessmentAccessRecoveryOutcome
  deliveryId: string | null
}

export type AssessmentAccessRecoveryEligibilityCode =
  | 'assessment_recovery_method_not_supported'
  | 'assessment_recovery_consent_withdrawn'
  | 'assessment_recovery_application_closed'
  | 'assessment_recovery_invalid_state'
  | 'assessment_recovery_time_elapsed'
  | 'assessment_recovery_expired_after_start'
  | 'assessment_recovery_expiry_not_proven'
  | 'assessment_recovery_status_not_allowed'

export type AssessmentAccessRecoveryEligibility =
  | { allowed: true; resultingStatus: 'sent' | 'in_progress' }
  | { allowed: false; code: AssessmentAccessRecoveryEligibilityCode }


/** Pure state decision; the command supplies values read under the assessment row lock. */
export const decideAssessmentAccessRecoveryEligibility = (input: {
  method: string
  status: string
  startedAt: Date | string | null
  tokenExpiresAt: Date | string | null
  effectiveDeadlineAt: Date | string | null
  applicationStage: string
  applicationDecision: string | null
  consentStatus: string
  reasonCode: AssessmentAccessRecoveryReason
  now?: Date
}): AssessmentAccessRecoveryEligibility => {
  if (input.method !== 'candidate_test') {
    return { allowed: false, code: 'assessment_recovery_method_not_supported' }
  }

  if (input.applicationDecision || TERMINAL_APPLICATION_STAGES.has(input.applicationStage)) {
    return { allowed: false, code: 'assessment_recovery_application_closed' }
  }

  if (input.consentStatus === 'withdrawn') {
    return { allowed: false, code: 'assessment_recovery_consent_withdrawn' }
  }

  if (input.status === 'assigned' || input.status === 'sent') {
    return input.startedAt
      ? { allowed: false, code: 'assessment_recovery_invalid_state' }
      : { allowed: true, resultingStatus: 'sent' }
  }

  if (input.status === 'in_progress') {
    if (!input.startedAt || !input.effectiveDeadlineAt) {
      return { allowed: false, code: 'assessment_recovery_invalid_state' }
    }

    return new Date(input.effectiveDeadlineAt).getTime() > (input.now ?? new Date()).getTime()
      ? { allowed: true, resultingStatus: 'in_progress' }
      : { allowed: false, code: 'assessment_recovery_time_elapsed' }
  }

  if (input.status === 'expired') {
    if (input.startedAt) {
      return { allowed: false, code: 'assessment_recovery_expired_after_start' }
    }

    const tokenExpiresAt = input.tokenExpiresAt ? new Date(input.tokenExpiresAt).getTime() : Number.NaN

    if (!Number.isFinite(tokenExpiresAt) || tokenExpiresAt > (input.now ?? new Date()).getTime()
      || input.reasonCode !== 'token_expired_before_start') {
      return { allowed: false, code: 'assessment_recovery_expiry_not_proven' }
    }

    return { allowed: true, resultingStatus: 'sent' }
  }

  return { allowed: false, code: 'assessment_recovery_status_not_allowed' }
}

export type AssessmentAccessRecoveryResult =
  | {
      receipt: AssessmentAccessRecoveryReceipt
      replayed: boolean
      linkRevealed: false
      accessUrl?: never
    }
  | {
      receipt: AssessmentAccessRecoveryReceipt & { channel: 'secure_link'; outcome: 'link_issued' }
      replayed: false
      linkRevealed: true
      /** Bearer URL. Response-only and never accepted by persistence/audit helpers. */
      accessUrl: string
    }

/**
 * Disponibilidad de recuperación para UN assessment, tal como la consume el operador.
 *
 * Vive acá y no junto al reader porque el NAVEGADOR la renderiza: el reader importa `node:pg` y es
 * `server-only`, así que dejar su DTO ahí obliga a cada consumidor de UI a re-declararlo.
 */
/**
 * Por qué ESTE canal no se puede usar ahora. Existe porque `available: boolean` colapsaba cinco
 * causas con remedios distintos —el test no es recuperable, no hay correo, el proveedor bloquea,
 * se agotó el presupuesto de 24 h, hay que esperar segundos— en un solo `false`, y la superficie
 * ya no podía recuperarlas: todas terminaban en el mismo mensaje.
 *
 * Es el noveno patrón canónico aplicado al DTO: la superficie no puede distinguir lo que el
 * contrato colapsó antes de llegar a ella.
 */
export type AssessmentAccessRecoveryChannelBlock =
  | 'assessment_not_eligible'
  | 'no_candidate_email'
  | 'provider_blocked'
  | 'quota_exhausted'
  | 'cooldown'

/**
 * TASK-1757 — ¿se le avisa al candidato que su acceso fue rotado?
 *
 * Emitir un enlace seguro **mata la credencial anterior del candidato** y se la entrega en mano al
 * operador. Si esa entrega falla —se distrae, copia mal, la persona no contesta— el candidato queda
 * sin acceso, sin saber por qué, y con el plazo corriendo: la recuperación NUNCA devuelve tiempo.
 * Peor aún, la elegibilidad permite recuperar en `in_progress`, así que alguien puede estar
 * respondiendo en otra pestaña y ser expulsado en silencio.
 *
 * El aviso NUNCA lleva el enlace: eso anularía la verificación de identidad que es la razón de ser
 * del canal. Sólo dice que el acceso anterior dejó de servir y cómo pedir ayuda.
 *
 * **Vive acá, y no en el consumer, a propósito.** La superficie del operador tiene que poder decir
 * ANTES de confirmar si el candidato va a ser avisado: si la decisión viviera sólo en el worker, el
 * operador manda el WhatsApp diciendo "te llegó un correo" cuando ningún correo salió. Misma regla
 * que el resto de este archivo: un vocabulario que se re-declara río abajo se convierte en dos que
 * divergen en silencio.
 */
export type AssessmentAccessRotationNoticeSkip =
  /** El correo de recuperación ya dice que el anterior dejó de servir: un segundo mensaje es ruido. */
  | 'not_secure_link'
  /** Sin dirección registrada no hay a quién avisarle. */
  | 'no_candidate_email'
  /**
   * El proveedor bloqueó esa dirección. NO es preferencia: el command ya rechaza duro el canal de
   * correo con esta misma evidencia, así que avisar por ahí sería abrir un agujero en un control ya
   * vigente. Y sobre `complained` —la persona nos marcó como spam— insistir quema la reputación de
   * envío del dominio para todos los demás candidatos.
   */
  | 'provider_blocked'
  /**
   * El operador declaró que el envío falló. Es evidencia MÁS FRESCA que el estado del proveedor:
   * el webhook puede tardar, y un rebote de hace un minuto todavía no figura.
   */
  | 'operator_declared_delivery_failed'
  /** La credencial ya venció: el aviso llega a informar de algo que ya no se puede usar. */
  | 'credential_already_expired'

export type AssessmentAccessRotationNoticeDecision =
  | { notify: true }
  | { notify: false; skip: AssessmentAccessRotationNoticeSkip }

/**
 * Decisión pura. El orden de las guardas es el orden en que importan: primero lo que hace que el
 * aviso no corresponda, después lo que lo hace imposible, y al final lo que lo vuelve inútil.
 */
export const decideAssessmentAccessRotationNotice = (input: {
  channel: AssessmentAccessRecoveryChannel
  outcome: AssessmentAccessRecoveryOutcome
  reasonCode: AssessmentAccessRecoveryReason
  hasCandidateEmail: boolean
  providerBlockStatus: string | null
  expiresAt: Date | string | null
  now?: Date
}): AssessmentAccessRotationNoticeDecision => {
  // El canal de correo ya lleva el aviso Y la credencial en el mismo mensaje.
  if (input.channel !== 'secure_link' || input.outcome !== 'link_issued') {
    return { notify: false, skip: 'not_secure_link' }
  }

  if (input.reasonCode === 'provider_delivery_failed') {
    return { notify: false, skip: 'operator_declared_delivery_failed' }
  }

  if (!input.hasCandidateEmail) return { notify: false, skip: 'no_candidate_email' }
  if (input.providerBlockStatus) return { notify: false, skip: 'provider_blocked' }

  const expiresAt = input.expiresAt ? new Date(input.expiresAt).getTime() : Number.NaN

  // Sin vencimiento legible NO se asume vigente: un aviso sobre una credencial que no sabemos si
  // sirve es peor que el silencio, porque le promete al candidato algo que quizá ya murió.
  if (!Number.isFinite(expiresAt) || expiresAt <= (input.now ?? new Date()).getTime()) {
    return { notify: false, skip: 'credential_already_expired' }
  }

  return { notify: true }
}

/**
 * TASK-1757 — el mismo juicio, ANTES de emitir.
 *
 * Existe para que el operador sepa si el candidato va a ser avisado **antes** de apretar. Sin esto,
 * manda el WhatsApp diciendo "te llegó un correo" cuando ningún correo salió — y la persona se
 * queda esperando algo que no existe.
 *
 * Delega en la misma función que usa el envío: predecir con una copia del criterio es cómo la
 * pantalla y el worker terminan diciendo cosas distintas. La credencial todavía no existe, así que
 * su vigencia se asume futura: es el único input que el momento de la predicción no puede conocer,
 * y por construcción una credencial recién emitida está viva.
 */
export const predictAssessmentAccessRotationNotice = (input: {
  reasonCode: AssessmentAccessRecoveryReason
  hasCandidateEmail: boolean
  providerBlockStatus: string | null
}): AssessmentAccessRotationNoticeDecision =>
  decideAssessmentAccessRotationNotice({
    channel: 'secure_link',
    outcome: 'link_issued',
    reasonCode: input.reasonCode,
    hasCandidateEmail: input.hasCandidateEmail,
    providerBlockStatus: input.providerBlockStatus,
    expiresAt: new Date(Date.now() + 60_000),
  })

export interface AssessmentAccessRecoveryAvailability {
  assessmentId: string
  applicationId: string
  openingId: string
  status: string
  eligible: boolean
  eligibilityCode: string | null
  channels: {
    email: {
      available: boolean
      /** `null` sólo cuando `available` es `true`. Nombra la causa, no la esconde. */
      blockedBy: AssessmentAccessRecoveryChannelBlock | null
      providerStatus: string | null
      hasCandidateEmail: boolean
    }
    secureLink: { available: boolean; blockedBy: AssessmentAccessRecoveryChannelBlock | null }
  }
  rateLimit: {
    maxPer24Hours: number
    usedIn24Hours: number
    cooldownUntil: string | null
    /** Cooldown propio del enlace seguro: NUNCA se comparte con el del correo. */
    secureLinkCooldownUntil: string | null
    limited: boolean
  }
}
