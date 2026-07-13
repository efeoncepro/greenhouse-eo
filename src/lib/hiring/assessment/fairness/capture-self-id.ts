import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { HiringNotFoundError, HiringValidationError } from '../../errors'
import { requireHiringFairnessPolicy } from './config'
import type {
  CaptureVoluntaryDemographicSelfIdInput,
  CaptureVoluntaryDemographicSelfIdResult,
  DemographicSelection,
} from './contracts'

interface ExistingSelfIdRow extends Record<string, unknown> {
  selfid_id: string
  category_key: string
  consent_policy_version: string
  withdrawn_at: Date | string | null
}

const runQuery = async <T extends Record<string, unknown>>(
  client: PoolClient,
  text: string,
  values: unknown[],
): Promise<T[]> => {
  const result = await client.query(text, values)

  return result.rows as T[]
}

const validateSelections = (
  selections: DemographicSelection[],
  allowedCategories: ReadonlyMap<string, ReadonlySet<string>>,
): DemographicSelection[] => {
  if (!Array.isArray(selections) || selections.length < 1 || selections.length > 8) {
    throw new HiringValidationError(
      'La autoidentificación debe incluir entre 1 y 8 dimensiones aprobadas.',
      'hiring_fairness_selection_invalid',
      400,
    )
  }

  const normalized = selections.map((selection) => ({
    dimensionKey: selection.dimensionKey?.trim() ?? '',
    categoryKey: selection.categoryKey?.trim() ?? '',
  }))

  const seenDimensions = new Set<string>()

  for (const selection of normalized) {
    const allowed = allowedCategories.get(selection.dimensionKey)

    if (!allowed?.has(selection.categoryKey) || seenDimensions.has(selection.dimensionKey)) {
      throw new HiringValidationError(
        'La autoidentificación contiene una categoría no aprobada.',
        'hiring_fairness_selection_not_allowed',
        400,
      )
    }

    seenDimensions.add(selection.dimensionKey)
  }

  return normalized
}

export const captureVoluntaryDemographicSelfId = async (
  input: CaptureVoluntaryDemographicSelfIdInput,
): Promise<CaptureVoluntaryDemographicSelfIdResult> => {
  const policy = requireHiringFairnessPolicy()
  const identityProfileId = input.identityProfileId?.trim() ?? ''
  const applicationId = input.applicationId?.trim() ?? ''

  if (
    !identityProfileId ||
    !applicationId ||
    input.consentGranted !== true ||
    input.consentPolicyVersion !== policy.policyVersion
  ) {
    throw new HiringValidationError(
      'Se requiere consentimiento explícito para la política vigente.',
      'hiring_fairness_consent_required',
      422,
    )
  }

  const selections = validateSelections(input.selections, policy.allowedCategories)
  const consentGrantedAt = new Date()
  const retentionExpiresAt = new Date(consentGrantedAt.getTime() + policy.retentionDays * 86_400_000)

  return withGreenhousePostgresTransaction(async (client) => {
    const subject = await runQuery<{ exists: boolean }>(
      client,
      `SELECT TRUE AS exists
       FROM greenhouse_hiring.hiring_application
       WHERE application_id = $1 AND identity_profile_id = $2
       LIMIT 1`,
      [applicationId, identityProfileId],
    )

    if (!subject[0]?.exists) {
      throw new HiringNotFoundError('La postulación candidata no existe.', 'hiring_fairness_subject_not_found')
    }

    let recorded = 0
    let unchanged = 0

    for (const selection of selections) {
      const existing = await runQuery<ExistingSelfIdRow>(
        client,
        `SELECT selfid_id, category_key, consent_policy_version, withdrawn_at
         FROM greenhouse_hiring.hiring_demographic_selfid
         WHERE application_id = $1 AND dimension_key = $2
         FOR UPDATE`,
        [applicationId, selection.dimensionKey],
      )

      const current = existing[0]

      if (
        current &&
        current.category_key === selection.categoryKey &&
        current.consent_policy_version === policy.policyVersion &&
        current.withdrawn_at == null
      ) {
        unchanged += 1
        continue
      }

      const rows = await runQuery<{ selfid_id: string }>(
        client,
        `INSERT INTO greenhouse_hiring.hiring_demographic_selfid
           (identity_profile_id, application_id, dimension_key, category_key, consent_policy_version,
            consent_granted_at, retention_expires_at, withdrawn_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
         ON CONFLICT (application_id, dimension_key) DO UPDATE SET
           category_key = EXCLUDED.category_key,
           consent_policy_version = EXCLUDED.consent_policy_version,
           consent_granted_at = EXCLUDED.consent_granted_at,
           retention_expires_at = EXCLUDED.retention_expires_at,
           withdrawn_at = NULL
         RETURNING selfid_id`,
        [
          identityProfileId,
          applicationId,
          selection.dimensionKey,
          selection.categoryKey,
          policy.policyVersion,
          consentGrantedAt,
          retentionExpiresAt,
        ],
      )

      const selfIdId = rows[0]?.selfid_id

      if (!selfIdId) {
        throw new HiringValidationError(
          'No se pudo registrar la autoidentificación.',
          'hiring_fairness_capture_failed',
          500,
        )
      }

      const action = current ? 'updated' : 'captured'

      await runQuery(
        client,
        `INSERT INTO greenhouse_hiring.hiring_demographic_selfid_audit
           (selfid_id, action, consent_policy_version, actor_kind, actor_user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [selfIdId, action, policy.policyVersion, input.actorKind, input.actorUserId ?? null],
      )

      recorded += 1
    }

    return {
      recorded,
      unchanged,
      consentPolicyVersion: policy.policyVersion,
      retentionExpiresAt: retentionExpiresAt.toISOString(),
    }
  })
}

export interface SelfIdSubject {
  applicationId: string
  identityProfileId: string
}

export const getSelfIdSubjectByAssessment = async (assessmentId: string): Promise<SelfIdSubject | null> => {
  const rows = await runGreenhousePostgresQuery<{ application_id: string; identity_profile_id: string }>(
    `SELECT app.application_id, app.identity_profile_id
     FROM greenhouse_hiring.hiring_assessment assessment
     JOIN greenhouse_hiring.hiring_application app ON app.application_id = assessment.application_id
     WHERE assessment.assessment_id = $1
     LIMIT 1`,
    [assessmentId],
  )

  const row = rows[0]

  return row ? { applicationId: row.application_id, identityProfileId: row.identity_profile_id } : null
}
