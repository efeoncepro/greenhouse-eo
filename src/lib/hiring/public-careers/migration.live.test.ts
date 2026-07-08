import { describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolvePublishedOpeningIdByPublicId } from '@/lib/hiring/publication'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// TASK-1367 Slice 1 — valida los artefactos de la migración (columnas additive + tabla intake_events)
// y que el reader resuelve SQL válido contra PG real (gate ISSUE-071). Skip sin PG.
describe.skipIf(!hasPgConfig)('careers apply intake — migración Slice 1 (TASK-1367)', () => {
  it('candidate_facet tiene las columnas de links additive (portfolio_url, linkedin_url)', async () => {
    const rows = await runGreenhousePostgresQuery<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'greenhouse_hiring' AND table_name = 'candidate_facet'
         AND column_name IN ('portfolio_url', 'linkedin_url')`,
      [],
    )

    expect(rows.map((r) => r.column_name).sort()).toEqual(['linkedin_url', 'portfolio_url'])
  })

  it('hiring_application_intake_events existe y acepta un insert (hashes, sin PII)', async () => {
    const inserted = await runGreenhousePostgresQuery<{ event_id: string }>(
      `INSERT INTO greenhouse_hiring.hiring_application_intake_events (email_hash, ip_hash, opening_public_id, outcome)
       VALUES ($1, $2, $3, 'accepted') RETURNING event_id`,
      ['__t1367_test_hash__', '__t1367_test_ip__', 'EO-JOB-TEST'],
    )

    expect(inserted[0]?.event_id).toMatch(/^haie-/)
    await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_application_intake_events WHERE event_id = $1`, [inserted[0].event_id])
  })

  it('resolvePublishedOpeningIdByPublicId compila y devuelve null para un public_id inexistente', async () => {
    const openingId = await resolvePublishedOpeningIdByPublicId('__inexistente_t1367__')

    expect(openingId).toBeNull()
  })
})
