import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { persistValidityEvidence } from './evidence'
import { getAssessmentValidity } from './get-validity'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

/**
 * TASK-1364 — Live guard del join score↔outcome contra PG real (gate TASK-893: el SQL usa
 * CTEs + LATERAL + jsonb path + make_date/make_interval — los mocks no lo validan).
 * Con 0 hires-con-assessment hoy, el reporte DEBE degradar honesto (insufficient_sample),
 * nunca lanzar ni inventar correlación.
 */
describe.skipIf(!hasPgConfig)('assessment validity — live PG (TASK-1364)', () => {
  let evidenceId = ''

  afterAll(async () => {
    if (evidenceId) {
      // La tabla es append-only (trigger): retirar el registro sintético requiere
      // deshabilitar el guard SOLO para el cleanup del test.
      await runGreenhousePostgresQuery(`ALTER TABLE greenhouse_hr.assessment_validity_evidence DISABLE TRIGGER validity_evidence_no_delete_trigger`)

      try {
        await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hr.assessment_validity_evidence WHERE evidence_id = $1`, [evidenceId])
      } finally {
        await runGreenhousePostgresQuery(`ALTER TABLE greenhouse_hr.assessment_validity_evidence ENABLE TRIGGER validity_evidence_no_delete_trigger`)
      }
    }
  })

  it('el join corre contra PG real y degrada honesto sin datos', async () => {
    const report = await getAssessmentValidity({ windowMonths: 3 })

    expect(report.overall.verdict).toBe('insufficient_sample')
    expect(report.overall.correlation).toBeNull()
    expect(report.outcomeSource).toBe('none')
    expect(report.windowMonths).toBe(3)
    expect(JSON.stringify(report)).not.toMatch(/member_id|identity_profile/)
  })

  it('acepta scope por template y competencia (SQL parametrizado válido)', async () => {
    const report = await getAssessmentValidity({
      templateId: 'atpl-account-manager-l2',
      competencyKey: 'copywriting',
      windowMonths: 6,
    })

    expect(report.scope).toEqual({ templateId: 'atpl-account-manager-l2', competencyKey: 'copywriting' })
    expect(report.overall.verdict).toBe('insufficient_sample')
  })

  it('la evidencia se persiste append-only (UPDATE/DELETE bloqueados por trigger)', async () => {
    const report = await getAssessmentValidity({ windowMonths: 3 })
    const evidence = await persistValidityEvidence(report, 'user-live-test')

    evidenceId = evidence.evidenceId

    await expect(
      runGreenhousePostgresQuery(
        `UPDATE greenhouse_hr.assessment_validity_evidence SET sample_size = 999 WHERE evidence_id = $1`,
        [evidenceId],
      ),
    ).rejects.toThrow(/append-only/)
  })
})
