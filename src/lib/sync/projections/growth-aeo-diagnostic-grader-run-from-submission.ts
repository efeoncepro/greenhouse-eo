import 'server-only'

/**
 * TASK-1321 — Reactive consumer: submission de `/aeo-2/` (`fdef-efeonce-aeo-diagnostic`) →
 * grader run + lead. Sibling de `growth_grader_run_from_submission` (que sirve al grader-form):
 * NO se ramifica esa proyección porque el path de `/aeo-2/` diverge — namespace de campos
 * distinto (remap), categoría resuelta con `brand-intelligence` (el form no la captura) y
 * cost-cap propio (el submit de `/aeo-2/` entra por `submitForm` genérico, sin pasar por el
 * abuse guard del intake del grader). Aislar en una proyección propia = cero regresión sobre el
 * grader-form; el run engine sigue siendo el SSOT (esto es sólo un segundo cliente).
 *
 * Trigger: `growth.forms.submission_accepted`. Scoped a `fdef-efeonce-aeo-diagnostic` (el
 * `formId` del evento/submission, NO el formKey público `b120566a-…`) + kill-switch
 * `GROWTH_AEO_FORM_GRADER_INTAKE_ENABLED` (default ON, apaga con `=false`).
 *
 * Flujo (idempotente por `submissionId`, re-lee de PG):
 *   1. lead ya materializado → no-op (no doble run/lead/costo);
 *   2. remap determinista de campos `/aeo-2/`→intake (adapter). Falta campo estructural → skip
 *      (degrada al lead comercial que el destino Forms ya creó; sin run);
 *   3. cost-cap (budget global + per-email/IP) ANTES del LLM caro → skip si excede;
 *   4. categoría vía brand-intelligence grounded (fetch sitio + LLM). unknown/baja confianza →
 *      skip (NUNCA informe basura, ISSUE-110/EPIC-021);
 *   5. encola el run (EMAIL NUNCA acá) + registra intake event (cost accounting unificado);
 *   6. materializa el lead linkeado al submission (email + consent viven en PG).
 *
 * PII: el EMAIL viaja al lead (con consent), NUNCA a `enqueueGraderDiagnostic`.
 */

import { enqueueGraderDiagnostic } from '@/lib/growth/ai-visibility/commands'
import { resolvePublicBrandCategory } from '@/lib/growth/ai-visibility/brand-intelligence/resolve-public-brand-category'
import { isAeoFormGraderIntakeEnabled } from '@/lib/growth/ai-visibility/flags'
import {
  ESTIMATED_PUBLIC_RUN_COST_USD,
  checkIntakeAbuse,
  hashIdentifier,
  recordIntakeEvent,
  resolveIntakeLimits,
} from '@/lib/growth/ai-visibility/public-intake/abuse-guard'
import {
  AEO_DIAGNOSTIC_FORM_ID,
  mapAeoDiagnosticToGraderIntake,
} from '@/lib/growth/ai-visibility/public-intake/aeo-form-grader-adapter'
import { findGraderLeadBySubmissionId, insertGraderLead } from '@/lib/growth/ai-visibility/public-intake/store'
import { FORM_SUBMISSION_ACCEPTED_EVENT } from '@/lib/growth/forms/contracts'
import { getSubmissionById } from '@/lib/growth/forms/store'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProjectionDefinition } from '../projection-registry'

export const growthAeoDiagnosticGraderRunProjection: ProjectionDefinition = {
  name: 'growth_aeo_diagnostic_grader_run_from_submission',
  description:
    'TASK-1321 — growth.forms.submission_accepted (/aeo-2/ efeonce-aeo-diagnostic) → remap + brand-intelligence category + cost-cap → enqueue grader run + materialize lead (idempotent, PII-safe)',
  domain: 'growth',
  triggerEvents: [FORM_SUBMISSION_ACCEPTED_EVENT],
  // Sólo el form de /aeo-2/, y sólo con el kill-switch ON. Otros forms del motor = no-op.
  extractScope: payload => {
    const formId = typeof payload.formId === 'string' ? payload.formId : ''
    const submissionId = typeof payload.submissionId === 'string' ? payload.submissionId.trim() : ''

    if (formId !== AEO_DIAGNOSTIC_FORM_ID || !submissionId) return null
    if (!isAeoFormGraderIntakeEnabled()) return null

    return { entityType: 'growth_form_submission', entityId: submissionId }
  },
  refresh: async scope => {
    const submissionId = scope.entityId

    const submission = await getSubmissionById(submissionId)

    if (!submission) {
      return `aeo_grader_run no-op: submission ${submissionId} no existe (borrado tras el evento)`
    }

    if (submission.form_id !== AEO_DIAGNOSTIC_FORM_ID) {
      return `aeo_grader_run no-op: submission ${submissionId} no es del form /aeo-2/`
    }

    // 1. Idempotencia: lead ya materializado → no doble run/lead/costo.
    const existingLead = await findGraderLeadBySubmissionId(submissionId)

    if (existingLead) {
      return `aeo_grader_run no-op: lead ${existingLead} ya materializado para ${submissionId}`
    }

    // 2. Remap determinista de los campos de /aeo-2/ → intake del grader.
    const fields = (submission.normalized_fields_json ?? {}) as Record<string, unknown>
    const mapped = mapAeoDiagnosticToGraderIntake(fields)

    if (!mapped.ok) {
      // Falta un campo estructural (brandName/website/email). Degradar al lead comercial (ya
      // creado por el destino Forms); sin run. No es error — es la versión vieja del form o un
      // submit incompleto.
      return `aeo_grader_run skip: submission ${submissionId} sin campo requerido (${mapped.reason}) → lead comercial, sin run`
    }

    const intake = mapped.intake
    const emailHash = hashIdentifier(intake.email)

    if (!emailHash) {
      // intake.email es no-vacío (garantizado por el adapter); un emailHash null sería anómalo.
      return `aeo_grader_run skip: submission ${submissionId} sin emailHash derivable → sin run`
    }

    // 3. Cost-cap ANTES del brand-intelligence read (el LLM caro). El submit de /aeo-2/ no pasó
    //    por el abuse guard del grader; lo aplicamos acá + registramos el evento (cost accounting
    //    unificado en grader_intake_events).
    const decision = await checkIntakeAbuse({
      ipHash: submission.ip_hash,
      emailHash,
      estimatedCostUsd: ESTIMATED_PUBLIC_RUN_COST_USD,
      limits: resolveIntakeLimits(),
    })

    if (!decision.allowed && decision.outcome) {
      await recordIntakeEvent({
        ipHash: submission.ip_hash,
        emailHash,
        runId: null,
        estimatedCostUsd: null,
        outcome: decision.outcome,
      }).catch(() => {})

      return `aeo_grader_run skip: submission ${submissionId} bloqueado por cost-cap (${decision.outcome}) → sin run`
    }

    // 4. Categoría vía brand-intelligence grounded (el form no la captura). unknown/baja
    //    confianza → skip (NUNCA informe basura). Puede reintentar (rare re-cost) si un paso
    //    posterior falla; acotado por maxRetries + cost-cap.
    let category: Awaited<ReturnType<typeof resolvePublicBrandCategory>>

    try {
      category = await resolvePublicBrandCategory({
        brandName: intake.brandName,
        websiteUrl: intake.websiteUrl,
        telemetry: { submissionId },
      })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'growth_aeo_diagnostic_grader_run', stage: 'brand_intelligence' },
        extra: { submissionId },
      })

      throw error
    }

    if (!category) {
      return `aeo_grader_run skip: submission ${submissionId} categoría no resuelta (brand-intelligence) → lead comercial, sin run`
    }

    // 5. Encolar el run (EMAIL NUNCA acá). Idempotente por submissionId. Categoría resuelta pasa
    //    el gate del run (categoryNodeId real + confianza ≥ threshold).
    const enqueued = await enqueueGraderDiagnostic({
      brandName: intake.brandName,
      websiteUrl: intake.websiteUrl,
      market: intake.market,
      locale: intake.locale,
      category: category.label.es,
      categoryNodeId: category.nodeId,
      categoryLabel: category.label.es,
      categoryConfidence: category.confidence,
      businessModel: category.businessModel,
      competitorsDeclared: intake.competitorsDeclared,
      mode: 'light',
      runKind: 'public_diagnostic',
      idempotencyKey: submissionId,
    })

    await recordIntakeEvent({
      ipHash: submission.ip_hash,
      emailHash,
      runId: enqueued.run.runId,
      estimatedCostUsd: ESTIMATED_PUBLIC_RUN_COST_USD,
      outcome: 'accepted',
    }).catch(() => {})

    // 6. Materializar el lead linkeado al submission (email + nombre + consent viven en PG).
    await insertGraderLead({
      email: intake.email,
      consent: true,
      firstName: intake.firstName,
      lastName: intake.lastName,
      brandName: intake.brandName,
      websiteUrl: intake.websiteUrl,
      market: intake.market,
      category: category.label.es,
      industry: null,
      persona: null,
      companySize: intake.companySize,
      mainChallenge: null,
      competitorsDeclared: intake.competitorsDeclared,
      runId: enqueued.run.runId,
      profileId: enqueued.run.profileId,
      ipHash: submission.ip_hash,
      submissionId,
    })

    return `aeo_grader_run ok: submission ${submissionId} → run ${enqueued.run.publicId}${enqueued.idempotentHit ? ' (idempotent-hit)' : ''}`
  },
  maxRetries: 3,
}
