import 'server-only'

import { randomUUID } from 'node:crypto'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { SelectionFairnessReport } from './contracts'

export interface FairnessEvidenceRecord {
  evidenceId: string
  computedAt: string
}

export const persistFairnessEvidence = async (
  report: SelectionFairnessReport,
  actorUserId: string | null,
): Promise<FairnessEvidenceRecord> => {
  const evidenceId = `afev-${randomUUID()}`

  await withGreenhousePostgresTransaction(async (client) => {
    await client.query(
      `INSERT INTO greenhouse_hr.assessment_fairness_evidence
         (evidence_id, scope_json, window_months, sample_size, verdict, result_json, computed_by, computed_at)
       VALUES ($1, $2::jsonb, $3, $4, $5, $6::jsonb, $7, $8)`,
      [
        evidenceId,
        JSON.stringify(report.scope),
        report.window.months,
        report.sampleSize,
        report.verdict,
        JSON.stringify(report),
        actorUserId,
        report.computedAt,
      ],
    )

    if (report.verdict === 'adverse_impact') {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.assessmentFairnessEvidence,
          aggregateId: evidenceId,
          eventType: EVENT_TYPES.hiringAssessmentFairnessAdverseImpactDetected,
          payload: {
            schemaVersion: 1,
            signalId: report.signal?.signalId,
            evidenceId,
            stage: report.scope.stage,
            templateId: report.scope.templateId,
            windowMonths: report.window.months,
            computedAt: report.computedAt,
          },
        },
        client,
      )
    }
  })

  return { evidenceId, computedAt: report.computedAt }
}
