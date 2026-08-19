import 'server-only'

import { claimTokenSensitiveEmailIntent, sendEmail, wasEmailAlreadySent } from '@/lib/email/delivery'
import { getCountryName } from '@/lib/locale/countries'
import { captureWithDomain } from '@/lib/observability/capture'

import { getAssessmentById, reissueCandidateTestTokenForEmailWithClient } from '../assessment/instances'
import {
  hiringPublicBaseUrl,
  isHiringAssessmentPublicSessionLinksEnabled,
  isHiringLifecycleEmailsEnabled,
  resolveHiringInternalNotificationsEmail,
} from './config'
import { resolveHiringApplicationEmailContext, type HiringApplicationEmailContext } from './recipient'
import { resolveCandidateFacingStageLabel } from './stage-policy'

/**
 * TASK-1689 — Envíos del ciclo de vida de Hiring. Cada función es el cuerpo de un consumer
 * reactivo (ops-worker): re-lee PG por ID, resuelve recipient, pre-chequea dedupe con
 * `wasEmailAlreadySent(eventId, entity, email)` y envía por la plataforma canónica.
 * Devuelven un mensaje de resultado SIN PII (sólo IDs/estados) para el reactive log.
 *
 * Skip honesto: falta de flag, entidad inexistente, candidato sin email o estado
 * incompatible NUNCA botan el batch — retornan mensaje y, cuando es un dato roto, capturan
 * sanitizado. Un fallo transitorio del send SÍ lanza (retry del dispatcher).
 */

const FLAG_OFF_MSG = 'hiring_lifecycle_emails skip: flag OFF'

const eventIdOr = (payload: Record<string, unknown>, fallback: string): string =>
  typeof payload._eventId === 'string' && payload._eventId.length > 0 ? payload._eventId : fallback

const tokenDeliveryEventIdOr = (payload: Record<string, unknown>, fallback: string): string => {
  const candidate = eventIdOr(payload, fallback)

  return /^outbox-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : fallback
}

const captureHiring = (message: string, extra: Record<string, unknown>) =>
  captureWithDomain(new Error(message), 'hiring', { tags: { source: 'hiring_lifecycle_emails' }, extra })

const openingPublicUrl = (ctx: HiringApplicationEmailContext): string | undefined =>
  ctx.openingIsPublished ? `${hiringPublicBaseUrl()}/public/careers/${ctx.openingPublicId}` : undefined

// ── 1+2. Postulación creada → aviso interno + acuse al candidato ──

export const sendHiringApplicationCreatedEmails = async (
  applicationId: string,
  payload: Record<string, unknown>,
): Promise<string> => {
  if (!isHiringLifecycleEmailsEnabled()) return FLAG_OFF_MSG

  const ctx = await resolveHiringApplicationEmailContext(applicationId)

  if (!ctx) return `hiring_application_created_emails no-op: application ${applicationId} no existe`

  const eventId = eventIdOr(payload, `hiring-application-created:${applicationId}`)
  const results: string[] = []

  // Email 1 — aviso interno a People (con datos del postulante; buzón interno configurado).
  const internalEmail = resolveHiringInternalNotificationsEmail()

  if (await wasEmailAlreadySent(eventId, applicationId, internalEmail)) {
    results.push('internal dedupe')
  } else {
    const internal = await sendEmail({
      emailType: 'hiring_application_received_internal',
      domain: 'hr',
      recipients: [{ email: internalEmail }],
      context: {
        candidateName: ctx.candidateName ?? 'Sin nombre registrado',
        candidateEmail: ctx.candidateEmail ?? 'sin correo',
        // TASK-1688 — contacto completo para que People opere sin abrir el portal.
        candidatePhone: ctx.candidatePhoneE164,
        candidateResidenceCountry: ctx.candidateResidenceCountryCode
          ? getCountryName(ctx.candidateResidenceCountryCode) ?? ctx.candidateResidenceCountryCode
          : null,
        candidateMessage: ctx.candidateMessage,
        portfolioUrl: ctx.candidatePortfolioUrl,
        linkedinUrl: ctx.candidateLinkedinUrl,
        openingTitle: ctx.openingTitle,
        applicationPublicId: ctx.applicationPublicId,
        source: ctx.source,
        applicationUrl: `${hiringPublicBaseUrl()}/agency/hiring/applications/${applicationId}`,
      },
      sourceEventId: eventId,
      sourceEntity: applicationId,
    })

    results.push(`internal ${internal.status}`)
  }

  // Email 2 — acuse de recibo al candidato.
  if (!ctx.candidateEmail) {
    captureHiring('hiring application sin email de candidato resoluble', { applicationId })
    results.push('confirmation skip: sin email')
  } else if (await wasEmailAlreadySent(eventId, applicationId, ctx.candidateEmail)) {
    results.push('confirmation dedupe')
  } else {
    const confirmation = await sendEmail({
      emailType: 'hiring_application_confirmation',
      domain: 'hr',
      recipients: [
        { email: ctx.candidateEmail, ...(ctx.candidateName ? { name: ctx.candidateName } : {}) },
      ],
      context: {
        recipientName: ctx.candidateName ?? undefined,
        openingTitle: ctx.openingTitle,
        openingUrl: openingPublicUrl(ctx),
        locale: 'es',
      },
      sourceEventId: eventId,
      sourceEntity: applicationId,
    })

    results.push(`confirmation ${confirmation.status}`)
  }

  return `hiring_application_created_emails ${applicationId}: ${results.join(' · ')}`
}

// ── 3. Evaluación asignada → aviso al candidato (sólo candidate_test) ──

export const sendHiringAssessmentAssignedEmail = async (
  assessmentId: string,
  payload: Record<string, unknown>,
): Promise<string> => {
  if (!isHiringLifecycleEmailsEnabled()) return FLAG_OFF_MSG

  // Filtro duro: el evento hiring.assessment.assigned también se emite para scorecards de
  // entrevistador — un scorecard JAMÁS genera email al candidato. Doble check: payload + PG.
  if (payload.method !== 'candidate_test') {
    return `hiring_assessment_assigned_email no-op: method ${String(payload.method)} no es candidate_test`
  }

  const assessment = await getAssessmentById(assessmentId)

  if (!assessment) return `hiring_assessment_assigned_email no-op: assessment ${assessmentId} no existe`

  if (assessment.method !== 'candidate_test') {
    return `hiring_assessment_assigned_email no-op: assessment ${assessmentId} no es candidate_test`
  }

  const ctx = await resolveHiringApplicationEmailContext(assessment.applicationId)

  if (!ctx?.candidateEmail) {
    captureHiring('assessment asignado sin email de candidato resoluble', { assessmentId })

    return `hiring_assessment_assigned_email skip: application ${assessment.applicationId} sin email`
  }

  const eventId = tokenDeliveryEventIdOr(payload, `hiring-assessment-assigned:${assessmentId}`)

  const intent = await claimTokenSensitiveEmailIntent({
    emailType: 'hiring_assessment_assigned',
    domain: 'hr',
    recipient: { email: ctx.candidateEmail, ...(ctx.candidateName ? { name: ctx.candidateName } : {}) },
    sourceEventId: eventId,
    sourceEntity: assessmentId,
    safeContext: { locale: 'es' },
    issueCredential: client => reissueCandidateTestTokenForEmailWithClient(client, assessmentId)
  })

  if (!intent.claimed) {
    return `hiring_assessment_assigned_email dedupe: ${assessmentId}`
  }

  const reissued = intent.value

  if (!reissued) {
    return `hiring_assessment_assigned_email skip: assessment ${assessmentId} ya no es rotable (in_progress/submitted/expired)`
  }

  const assessmentUrl = isHiringAssessmentPublicSessionLinksEnabled()
    ? `${hiringPublicBaseUrl()}/public/assessment/access#access=${encodeURIComponent(reissued.token)}`
    : `${hiringPublicBaseUrl()}/public/assessment/${reissued.token}`

  const result = await sendEmail({
    emailType: 'hiring_assessment_assigned',
    domain: 'hr',
    recipients: [{ email: ctx.candidateEmail, ...(ctx.candidateName ? { name: ctx.candidateName } : {}) }],
    context: {
      recipientName: ctx.candidateName ?? undefined,
      openingTitle: ctx.openingTitle,
      assessmentUrl,
      timeLimitMinutes: reissued.timeLimitMinutes,
      tokenTtlDays: reissued.tokenTtlDays,
      locale: 'es',
    },
    sourceEventId: eventId,
    sourceEntity: assessmentId,
    persistence: {
      mode: 'token_sensitive',
      safeContext: {
        locale: 'es',
        timeLimitMinutes: reissued.timeLimitMinutes,
        tokenTtlDays: reissued.tokenTtlDays,
      },
      deliveryIntentId: intent.deliveryId,
    },
  })

  return `hiring_assessment_assigned_email ${assessmentId}: ${result.status}`
}

// ── 4. Evaluación completada → aviso interno a People (sólo candidate_test) ──

export const sendHiringAssessmentSubmittedInternalEmail = async (
  assessmentId: string,
  payload: Record<string, unknown>,
): Promise<string> => {
  if (!isHiringLifecycleEmailsEnabled()) return FLAG_OFF_MSG

  const assessment = await getAssessmentById(assessmentId)

  if (!assessment) {
    return `hiring_assessment_submitted_internal_email no-op: assessment ${assessmentId} no existe`
  }

  if (assessment.method !== 'candidate_test') {
    return `hiring_assessment_submitted_internal_email no-op: assessment ${assessmentId} no es candidate_test`
  }

  // El worker puede consumir el evento después de que un evaluador ya haya puntuado el test.
  // Ambos estados conservan submitted_at; estados previos o expirados no prueban completitud.
  if (!['submitted', 'scored'].includes(assessment.status) || !assessment.submittedAt) {
    return `hiring_assessment_submitted_internal_email skip: assessment ${assessmentId} no está completado`
  }

  const ctx = await resolveHiringApplicationEmailContext(assessment.applicationId)

  if (!ctx) {
    captureHiring('assessment completado sin postulación resoluble', { assessmentId })

    return `hiring_assessment_submitted_internal_email skip: application ${assessment.applicationId} no existe`
  }

  const internalEmail = resolveHiringInternalNotificationsEmail()
  const eventId = eventIdOr(payload, `hiring-assessment-submitted:${assessmentId}`)

  if (await wasEmailAlreadySent(eventId, assessmentId, internalEmail)) {
    return `hiring_assessment_submitted_internal_email dedupe: ${assessmentId}`
  }

  const result = await sendEmail({
    emailType: 'hiring_assessment_submitted_internal',
    domain: 'hr',
    recipients: [{ email: internalEmail }],
    context: {
      candidateName: ctx.candidateName ?? 'Sin nombre registrado',
      openingTitle: ctx.openingTitle,
      applicationPublicId: ctx.applicationPublicId,
      submittedAt: assessment.submittedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
      applicationUrl: `${hiringPublicBaseUrl()}/agency/hiring/applications/${assessment.applicationId}`,
    },
    sourceEventId: eventId,
    sourceEntity: assessmentId,
  })

  return `hiring_assessment_submitted_internal_email ${assessmentId}: ${result.status}`
}

// ── 5. Avance de etapa → aviso al candidato (sólo etapas candidate-facing) ──

export const sendHiringStageAdvancedEmail = async (
  applicationId: string,
  payload: Record<string, unknown>,
): Promise<string> => {
  if (!isHiringLifecycleEmailsEnabled()) return FLAG_OFF_MSG

  const stage = typeof payload.stage === 'string' ? payload.stage : ''
  const stageLabel = resolveCandidateFacingStageLabel(stage, 'es')

  if (!stageLabel) return `hiring_stage_changed_email no-op: etapa ${stage || '(vacía)'} no es candidate-facing`

  const ctx = await resolveHiringApplicationEmailContext(applicationId)

  if (!ctx) return `hiring_stage_changed_email no-op: application ${applicationId} no existe`

  if (!ctx.candidateEmail) {
    captureHiring('avance de etapa sin email de candidato resoluble', { applicationId })

    return `hiring_stage_changed_email skip: application ${applicationId} sin email`
  }

  const eventId = eventIdOr(payload, `hiring-stage-changed:${applicationId}:${stage}`)

  if (await wasEmailAlreadySent(eventId, applicationId, ctx.candidateEmail)) {
    return `hiring_stage_changed_email dedupe: ${applicationId}`
  }

  const result = await sendEmail({
    emailType: 'hiring_stage_advanced',
    domain: 'hr',
    recipients: [{ email: ctx.candidateEmail, ...(ctx.candidateName ? { name: ctx.candidateName } : {}) }],
    context: {
      recipientName: ctx.candidateName ?? undefined,
      openingTitle: ctx.openingTitle,
      stageLabel,
      locale: 'es',
    },
    sourceEventId: eventId,
    sourceEntity: applicationId,
  })

  return `hiring_stage_changed_email ${applicationId} → ${stage}: ${result.status}`
}

// ── 6+7. Decisión → seleccionado / no seleccionado ──

export const sendHiringDecisionEmail = async (
  applicationId: string,
  payload: Record<string, unknown>,
): Promise<string> => {
  if (!isHiringLifecycleEmailsEnabled()) return FLAG_OFF_MSG

  const decision = typeof payload.decision === 'string' ? payload.decision : ''

  if (decision !== 'selected' && decision !== 'rejected') {
    return `hiring_application_decided_email no-op: decision ${decision || '(vacía)'} no notifica`
  }

  const ctx = await resolveHiringApplicationEmailContext(applicationId)

  if (!ctx) return `hiring_application_decided_email no-op: application ${applicationId} no existe`

  // Anti-stale: si la decisión vigente en PG ya no es la del evento (fue superseded por una
  // re-decisión), este email quedó obsoleto — el evento de la decisión nueva trae el suyo.
  if (ctx.decision !== decision) {
    return `hiring_application_decided_email skip: decision del evento (${decision}) superseded por ${ctx.decision ?? 'null'}`
  }

  if (!ctx.candidateEmail) {
    captureHiring('decisión sin email de candidato resoluble', { applicationId })

    return `hiring_application_decided_email skip: application ${applicationId} sin email`
  }

  const decisionId = typeof payload.decisionId === 'string' ? payload.decisionId : ''
  const eventId = eventIdOr(payload, `hiring-decided:${decisionId || applicationId}`)

  if (await wasEmailAlreadySent(eventId, applicationId, ctx.candidateEmail)) {
    return `hiring_application_decided_email dedupe: ${applicationId}`
  }

  const result = await sendEmail({
    emailType: decision === 'selected' ? 'hiring_decision_selected' : 'hiring_decision_rejected',
    domain: 'hr',
    recipients: [{ email: ctx.candidateEmail, ...(ctx.candidateName ? { name: ctx.candidateName } : {}) }],
    context: {
      recipientName: ctx.candidateName ?? undefined,
      openingTitle: ctx.openingTitle,
      locale: 'es',
    },
    sourceEventId: eventId,
    sourceEntity: applicationId,
  })

  return `hiring_application_decided_email ${applicationId} (${decision}): ${result.status}`
}
