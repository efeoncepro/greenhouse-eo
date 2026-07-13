import 'server-only'

/**
 * TASK-1372 — Reactive consumer: Growth Forms application submission → Hiring ATS application.
 *
 * Trigger: `growth.forms.submission_accepted`. This is deliberately NOT a
 * `form_destination`: the application form itself is the source of truth, and
 * the ATS materialization is an internal projection over an accepted submission.
 *
 * Privacy contract:
 * - re-read submission/form/version from PG; never trust browser/outbox payload fields;
 * - browser never sends destination mapping, asset ids in telemetry, or private URLs;
 * - CV bytes are scanned during public submit while Vercel still has the File; the worker
 *   receives only the already-scanned private asset descriptor;
 * - quarantined CVs do not fail the application, but remain discoverable by candidateFacetId.
 */

import { FORM_SUBMISSION_ACCEPTED_EVENT } from '@/lib/growth/forms/contracts'
import { getFormDefinitionById, getFormVersionById, getSubmissionById } from '@/lib/growth/forms/store'
import { submitPublicHiringApplication } from '@/lib/hiring/public-careers/submit-application'
import { parsePublicHiringApplication } from '@/lib/hiring/public-careers/schema'
import type { ScannedPublicCareersCvAssetReference } from '@/lib/hiring/public-careers/cv-upload'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProjectionDefinition } from '../projection-registry'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : []

const extractCvAsset = (fields: Record<string, unknown>): ScannedPublicCareersCvAssetReference | null => {
  for (const value of Object.values(fields)) {
    if (!isRecord(value)) continue
    if (value.kind !== 'uploaded_file') continue
    if (value.storageContext !== 'hiring_application_cv_draft') continue
    if (value.status !== 'clean' && value.status !== 'quarantined') continue
    if (typeof value.assetId !== 'string' || !value.assetId) continue
    if (typeof value.scanId !== 'string' || !value.scanId) continue

    return {
      assetId: value.assetId,
      status: value.status,
      scanId: value.scanId,
      ...(typeof value.scanner === 'string' ? { scanner: value.scanner } : {}),
      advisoryFindingCodes: asStringArray(value.advisoryFindingCodes)
    }
  }

  return null
}

export const growthHiringApplicationFromSubmissionProjection: ProjectionDefinition = {
  name: 'growth_hiring_application_from_submission',
  description:
    'TASK-1372 — growth.forms.submission_accepted (application forms) → submitPublicHiringApplication with already-scanned private CV asset (idempotent, no destination adapter)',
  domain: 'growth',
  triggerEvents: [FORM_SUBMISSION_ACCEPTED_EVENT],
  extractScope: payload => {
    const submissionId = typeof payload.submissionId === 'string' ? payload.submissionId.trim() : ''

    if (!submissionId) return null

    return { entityType: 'growth_form_submission', entityId: submissionId }
  },
  refresh: async scope => {
    const submissionId = scope.entityId
    const submission = await getSubmissionById(submissionId)

    if (!submission) {
      return `growth_hiring_application no-op: submission ${submissionId} no existe`
    }

    const definition = await getFormDefinitionById(submission.form_id)

    if (!definition || definition.form_kind !== 'application') {
      return `growth_hiring_application no-op: submission ${submissionId} no es application form`
    }

    const fields = isRecord(submission.normalized_fields_json) ? submission.normalized_fields_json : {}
    const version = await getFormVersionById(submission.form_version_id)

    const parsed = parsePublicHiringApplication({
      ...fields,
      consent: true,
      consentPolicyVersion: version?.consent_policy_version ?? null
    })

    if (!parsed) {
      const error = new Error(`growth_hiring_application: submission ${submissionId} no cumple contrato ATS`)

      captureWithDomain(error, 'growth', {
        tags: { source: 'growth_hiring_application_from_submission', stage: 'field_validation' },
        extra: { submissionId, formId: submission.form_id, formVersionId: submission.form_version_id }
      })

      throw error
    }

    const cvAsset = extractCvAsset(fields)
    const result = await submitPublicHiringApplication(parsed, { cvAsset })

    if (result.outcome === 'not_open') {
      return `growth_hiring_application skip: submission ${submissionId} opening no publicado/abierto`
    }

    return `growth_hiring_application ok: submission ${submissionId} → application ${result.applicationId ?? 'dedupe'}`
  },
  maxRetries: 3
}
