import 'server-only'

/**
 * TASK-1251 — Reactive consumer: submission del motor (grader-form) → run del grader + lead.
 *
 * Trigger: `growth.forms.submission_accepted` (emitido in-tx por `persistAcceptedSubmission`).
 * Scoped al grader-form (`fdef-ai-visibility-grader`): los submissions de otros forms del
 * motor son no-op (`extractScope` retorna null). Modela el enqueue del diagnóstico como un
 * POST-SUBMIT REACTIVE CONSUMER (no un destination CRM): el `form_destination` queda limpio
 * para entregas reales (HubSpot/email); el diagnóstico es el propósito del form, no una entrega.
 *
 * Idempotente (contrato del playbook reactivo):
 *   1. re-lee el submission desde PG (NUNCA confía en el payload del outbox);
 *   2. si ya existe un lead para el submission → no-op (no doble run/lead/costo);
 *   3. encola el run (`idempotencyKey = submissionId` → `idempotentHit` no duplica);
 *   4. materializa el lead linkeado al submission (email + consent viven en PG).
 *
 * PII: el EMAIL viaja al lead (con consent), NUNCA a `enqueueGraderDiagnostic` (que sólo
 * recibe marca/categoría/mercado). Espeja el invariante del path a-medida (TASK-1240).
 */

import { FORM_SUBMISSION_ACCEPTED_EVENT } from '@/lib/growth/forms/contracts'
import { getSubmissionById } from '@/lib/growth/forms/store'
import { enqueueGraderDiagnostic } from '@/lib/growth/ai-visibility/commands'
import {
  GRADER_FORM_ID,
} from '@/lib/growth/ai-visibility/public-intake/forms-engine-binding'
import { findGraderLeadBySubmissionId, insertGraderLead } from '@/lib/growth/ai-visibility/public-intake/store'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProjectionDefinition } from '../projection-registry'

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

export const growthGraderRunFromSubmissionProjection: ProjectionDefinition = {
  name: 'growth_grader_run_from_submission',
  description:
    'TASK-1251 — growth.forms.submission_accepted (grader-form) → enqueue grader run + materialize lead linked to submission (idempotent, PII-safe)',
  domain: 'growth',
  triggerEvents: [FORM_SUBMISSION_ACCEPTED_EVENT],
  // Sólo el grader-form: otros forms del motor no son responsabilidad de esta proyección.
  extractScope: payload => {
    const formId = typeof payload.formId === 'string' ? payload.formId : ''
    const submissionId = typeof payload.submissionId === 'string' ? payload.submissionId.trim() : ''

    if (formId !== GRADER_FORM_ID || !submissionId) return null

    return { entityType: 'growth_form_submission', entityId: submissionId }
  },
  refresh: async scope => {
    const submissionId = scope.entityId

    const submission = await getSubmissionById(submissionId)

    if (!submission) {
      return `grader_run_from_submission no-op: submission ${submissionId} no existe (borrado tras el evento)`
    }

    if (submission.form_id !== GRADER_FORM_ID) {
      return `grader_run_from_submission no-op: submission ${submissionId} no es del grader-form`
    }

    // Idempotencia: lead ya materializado → no doble run/lead/costo.
    const existingLead = await findGraderLeadBySubmissionId(submissionId)

    if (existingLead) {
      return `grader_run_from_submission no-op: lead ${existingLead} ya materializado para ${submissionId}`
    }

    const fields = (submission.normalized_fields_json ?? {}) as Record<string, unknown>
    const brandName = asString(fields.brandName)
    const market = asString(fields.market)
    const locale = asString(fields.locale)
    const category = asString(fields.category)
    const email = asString(fields.email)

    if (!brandName || !market || !locale || !category || !email) {
      // Contrato roto: el submission del grader siempre trae estos campos. Signal + throw
      // (retry/dead-letter) en vez de materializar un lead/run corrupto.
      const err = new Error(
        `grader_run_from_submission: submission ${submissionId} sin campos requeridos (brand/market/locale/category/email)`,
      )

      captureWithDomain(err, 'growth', {
        tags: { source: 'growth_grader_run_from_submission', stage: 'field_validation' },
        extra: { submissionId },
      })

      throw err
    }

    const websiteUrl = asString(fields.websiteUrl)
    const competitorsDeclared = asStringArray(fields.competitorsDeclared)

    // Encolar el run (EMAIL NUNCA acá). Idempotente por submissionId.
    const enqueued = await enqueueGraderDiagnostic({
      brandName,
      websiteUrl,
      market,
      locale,
      category,
      competitorsDeclared,
      mode: 'light',
      runKind: 'public_diagnostic',
      idempotencyKey: submissionId,
    })

    // Materializar el lead linkeado al submission (email + consent viven en PG).
    await insertGraderLead({
      email,
      consent: true,
      brandName,
      websiteUrl,
      market,
      category,
      industry: asString(fields.industry),
      persona: asString(fields.persona),
      companySize: asString(fields.companySize),
      mainChallenge: asString(fields.mainChallenge),
      competitorsDeclared,
      runId: enqueued.run.runId,
      profileId: enqueued.run.profileId,
      ipHash: submission.ip_hash,
      submissionId,
    })

    return `grader_run_from_submission ok: submission ${submissionId} → run ${enqueued.run.publicId}${enqueued.idempotentHit ? ' (idempotent-hit)' : ''}`
  },
  maxRetries: 3,
}
