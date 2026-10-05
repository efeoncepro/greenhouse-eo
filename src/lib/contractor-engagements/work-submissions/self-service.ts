import 'server-only'

import { createHash } from 'node:crypto'

import { GH_CONTRACTOR_SUBMISSIONS as COPY } from '@/lib/copy/contractor-submissions'
import { withGreenhousePostgresTransaction } from '@/lib/db'
import { ContractorEngagementValidationError } from '../errors'
import { attachContractorInvoiceAsset } from '../invoice-assets'
import { getContractorEngagementById } from '../store'
import { assertContractorServicePeriod } from './service-period'
import {
  createContractorWorkSubmission,
  mapContractorWorkSubmission,
  submitContractorWorkSubmission,
  updateContractorWorkSubmissionDraft
} from './store'
import type { ContractorWorkSubmissionType } from './types'

export interface SaveOwnContractorSubmissionInput {
  contractorEngagementId: string
  identityProfileId: string
  memberId: string
  actorUserId: string
  idempotencyKey: string
  /** Resume an owned draft or respond to the same disputed submission. */
  contractorWorkSubmissionId?: string | null
  submissionType: ContractorWorkSubmissionType
  title?: string | null
  servicePeriodStart?: string | null
  servicePeriodEnd?: string | null
  quantity?: number | null
  invoiceAssetId?: string | null
  evidenceAssetId?: string | null
  submit: boolean
}

function fail(message: string, code: string, status = 422): never {
  throw new ContractorEngagementValidationError(message, code, status)
}

/** Own-lane command: money is never an input. Draft/support/submit commit together. */
export const saveOwnContractorSubmission = async (input: SaveOwnContractorSubmissionInput) => {
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(input.idempotencyKey)) {
    fail('Actualiza la página y vuelve a preparar tu envío.', 'submission_attempt_required')
  }

  const id =
    input.contractorWorkSubmissionId ??
    `cws-${createHash('sha256')
      .update(JSON.stringify([input.contractorEngagementId, input.actorUserId, input.idempotencyKey]))
      .digest('hex')}`

  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify([
        input.submissionType,
        input.title ?? null,
        input.servicePeriodStart ?? null,
        input.servicePeriodEnd ?? null,
        input.quantity ?? null,
        input.invoiceAssetId ?? null,
        input.evidenceAssetId ?? null
      ])
    )
    .digest('hex')

  return withGreenhousePostgresTransaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [id])
    // Serialize agreement edits without blocking the FK key-share taken when
    // another command attaches support while holding the submission lock.
    await client.query(
      'SELECT contractor_engagement_id FROM greenhouse_hr.contractor_engagements WHERE contractor_engagement_id = $1 FOR NO KEY UPDATE',
      [input.contractorEngagementId]
    )
    const engagement = await getContractorEngagementById(input.contractorEngagementId, client)

    if (!engagement || engagement.profileId !== input.identityProfileId)
      fail('La contratación no pertenece a tu cuenta.', 'engagement_not_owned', 404)
    if (engagement.status !== 'active')
      fail('Esta contratación no admite nuevos envíos.', 'engagement_not_submittable', 409)

    const rows = await client.query(
      `SELECT * FROM greenhouse_hr.contractor_work_submissions WHERE contractor_work_submission_id = $1 FOR UPDATE`,
      [id]
    )

    let current = rows.rows[0] ? mapContractorWorkSubmission(rows.rows[0]) : null

    if (current && current.contractorEngagementId !== engagement.contractorEngagementId)
      fail('El envío no pertenece a tu contratación.', 'submission_not_owned', 404)
    if (!current && input.contractorWorkSubmissionId) fail('No encontramos el envío.', 'submission_not_owned', 404)

    if (current && !['draft', 'disputed'].includes(current.status)) {
      if (current.metadata.selfServiceFingerprint !== fingerprint)
        fail(
          'Este envío ya fue presentado. Prepara otro envío para un período nuevo.',
          'submission_attempt_conflict',
          409
        )

      return { submission: current, created: false }
    }

    const isCorrection = current?.status === 'disputed'

    if (current?.status === 'draft' && current.createdByUserId !== input.actorUserId) {
      fail(
        'Este borrador fue preparado por HR. Pídele al revisor que continúe su registro.',
        'draft_not_self_service',
        409
      )
    }

    if (!isCorrection) {
      if (!input.servicePeriodStart) fail('Selecciona la fecha de inicio del servicio.', 'service_period_required')
      assertContractorServicePeriod(input.servicePeriodStart, input.servicePeriodEnd)
      if (engagement.rateAmount === null || !Number.isFinite(engagement.rateAmount) || engagement.rateAmount <= 0)
        fail('Pídele a HR que configure tu tarifa acordada.', 'agreed_rate_required')
      const unitRate = engagement.rateType === 'hourly' || engagement.rateType === 'daily'

      if (
        unitRate !== (input.submissionType === 'timesheet') ||
        !['timesheet', 'deliverable', 'milestone'].includes(input.submissionType)
      )
        fail('El tipo de envío debe corresponder a tu tarifa acordada.', 'submission_rate_type_mismatch')
      if (unitRate && (!Number.isFinite(input.quantity) || (input.quantity ?? 0) <= 0))
        fail('Declara una cantidad válida de trabajo.', 'submission_quantity_required')
      if (unitRate && Number(input.quantity!.toFixed(4)) !== input.quantity)
        fail(COPY.quantityPrecision, 'submission_quantity_precision')
      const gross = unitRate ? Math.round(input.quantity! * engagement.rateAmount * 100) / 100 : engagement.rateAmount

      if (!Number.isFinite(gross) || gross <= 0)
        fail('La cantidad de trabajo no es válida.', 'submission_quantity_invalid')

      const fields = {
        title: input.title ?? null,
        servicePeriodStart: input.servicePeriodStart,
        servicePeriodEnd: input.servicePeriodEnd ?? null,
        quantity: unitRate ? input.quantity : null,
        unit: unitRate
          ? engagement.rateType === 'hourly'
            ? ('hours' as const)
            : ('days' as const)
          : ('fixed' as const),
        grossAmount: gross,
        currency: engagement.currency,
        actorUserId: input.actorUserId
      }

      if (current) {
        if (current.submissionType !== input.submissionType)
          fail('El tipo de un borrador existente no se puede cambiar.', 'draft_type_conflict', 409)
        current = await updateContractorWorkSubmissionDraft(
          {
            ...fields,
            contractorWorkSubmissionId: id,
            rateAmountSnapshot: engagement.rateAmount,
            metadataPatch: {
              selfServiceFingerprint: fingerprint,
              selfServicePeriodChanged:
                current.metadata.selfServicePeriodChanged === true ||
                current.servicePeriodStart !== fields.servicePeriodStart ||
                current.servicePeriodEnd !== fields.servicePeriodEnd
            }
          },
          client
        )
      } else {
        current = await createContractorWorkSubmission(
          {
            ...fields,
            contractorWorkSubmissionId: id,
            contractorEngagementId: engagement.contractorEngagementId,
            submissionType: input.submissionType,
            metadata: { selfServiceFingerprint: fingerprint }
          },
          client
        )
      }
    } else {
      // Respond to the existing observation; preserve its original money and dates.
      await client.query(
        `UPDATE greenhouse_hr.contractor_work_submissions SET metadata_json = metadata_json || $2::jsonb WHERE contractor_work_submission_id = $1`,
        [id, JSON.stringify({ selfServiceFingerprint: fingerprint, contractorResponseNote: input.title ?? null })]
      )
    }

    for (const [assetId, assetRole] of [
      [input.invoiceAssetId, 'invoice_pdf'],
      [input.evidenceAssetId, 'work_evidence']
    ] as const) {
      if (assetId)
        await attachContractorInvoiceAsset(
          {
            contractorEngagementId: engagement.contractorEngagementId,
            contractorWorkSubmissionId: id,
            assetId,
            assetRole,
            artifactKind: assetRole === 'invoice_pdf' ? 'human_readable' : 'evidence',
            source: 'contractor_upload',
            ownerMemberId: input.memberId,
            countryCode: engagement.countryCode,
            actorUserId: input.actorUserId
          },
          client
        )
    }

    if (input.submit) {
      const support = await client.query<{ asset_role: string }>(
        `SELECT a.asset_role FROM greenhouse_hr.contractor_invoice_assets a
         JOIN greenhouse_core.assets f ON f.asset_id = a.asset_id AND f.status = 'attached'
         JOIN greenhouse_hr.contractor_work_submissions s ON s.contractor_work_submission_id = a.contractor_work_submission_id
         WHERE a.contractor_work_submission_id = $1 AND a.contractor_engagement_id = $2
           AND (COALESCE(s.metadata_json->>'selfServicePeriodChanged', 'false') <> 'true' OR (a.metadata_json ? 'servicePeriodStart' AND a.metadata_json ? 'servicePeriodEnd'))
           AND (NOT (a.metadata_json ? 'servicePeriodStart') OR a.metadata_json->>'servicePeriodStart' IS NOT DISTINCT FROM s.service_period_start::text)
           AND (NOT (a.metadata_json ? 'servicePeriodEnd') OR a.metadata_json->>'servicePeriodEnd' IS NOT DISTINCT FROM s.service_period_end::text)`,
        [id, engagement.contractorEngagementId]
      )

      const roles = new Set(support.rows.map(a => a.asset_role))

      if (engagement.requiresInvoice && !roles.has('invoice_pdf') && !roles.has('tax_xml'))
        fail('Adjunta la boleta o invoice de este período antes de enviar.', 'submission_invoice_required')
      if (engagement.requiresWorkApproval && !roles.has('work_evidence'))
        fail('Adjunta evidencia de este período antes de enviar.', 'submission_evidence_required')
      current = await submitContractorWorkSubmission(
        { contractorWorkSubmissionId: id, actorUserId: input.actorUserId },
        client
      )
    }

    return { submission: current!, created: !rows.rows[0] }
  })
}
