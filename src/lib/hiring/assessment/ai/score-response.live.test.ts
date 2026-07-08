import { describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// TASK-1361 Slice 3 — valida que el JOIN de 3 tablas del reader de scoring es SQL válido contra PG
// real (gate ISSUE-071: SQL embebido solo revienta en runtime, no en tsc). Skip sin PG.
describe.skipIf(!hasPgConfig)('proposeScoreForResponse reader SQL — live PG (TASK-1361)', () => {
  it('el JOIN response→question→competency compila y ejecuta (0 filas con id inexistente)', async () => {
    const rows = await runGreenhousePostgresQuery(
      `SELECT r.answer_json, q.prompt AS question_prompt, q.rubric_json, q.type AS question_type,
              c.key AS competency_key, c.name AS competency_name, q.level
         FROM greenhouse_hiring.hiring_assessment_response r
         JOIN greenhouse_hiring.hiring_question q ON q.question_id = r.question_id
         JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = r.competency_id
        WHERE r.response_id = $1`,
      ['__inexistente_t1361__'],
    )

    expect(Array.isArray(rows)).toBe(true)
    expect(rows.length).toBe(0)
  })
})
