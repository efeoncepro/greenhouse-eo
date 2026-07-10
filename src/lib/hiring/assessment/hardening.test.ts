import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: vi.fn(),
  runGreenhousePostgresQuery: vi.fn(),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn(),
}))

/**
 * TASK-1383 — Guards estáticos del hardening (complementan los live tests contra PG):
 * anti-leak del payload candidato + contratos que los docstrings prometen.
 */

const { buildPublicQuestion } = await import('./store')

describe('buildPublicQuestion (anti-leak del answer_key — TASK-1383)', () => {
  const fullQuestion = {
    questionId: 'qst-1',
    competencyId: 'cmp-1',
    level: 'intermedio',
    type: 'single_choice',
    prompt: '¿Cuál es la mejor práctica X?',
    options: [{ id: 'a', label: 'Opción A' }],
    answerKey: { correct: 'a' },
    rubric: { criteria: 'nunca debe viajar' },
    status: 'active',
    createdBy: 'user-1',
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
  }

  it('NUNCA incluye answerKey ni rubric en el payload candidato', () => {
    const publicQuestion = buildPublicQuestion(fullQuestion as never) as unknown as Record<string, unknown>

    expect(publicQuestion).not.toHaveProperty('answerKey')
    expect(publicQuestion).not.toHaveProperty('rubric')
    expect(publicQuestion).not.toHaveProperty('answer_key_json')
    expect(publicQuestion).not.toHaveProperty('rubric_json')
    expect(JSON.stringify(publicQuestion)).not.toContain('nunca debe viajar')
    expect(JSON.stringify(publicQuestion)).not.toContain('"correct"')
  })

  it('SÍ conserva lo que el candidato necesita (prompt, opciones, tipo)', () => {
    const publicQuestion = buildPublicQuestion(fullQuestion as never) as unknown as Record<string, unknown>

    expect(publicQuestion).toMatchObject({ questionId: 'qst-1', type: 'single_choice' })
    expect(publicQuestion).toHaveProperty('prompt')
    expect(publicQuestion).toHaveProperty('options')
  })
})

describe('contratos del hardening (los docstrings ya no mienten)', () => {
  it('saveResponse hace upsert real (ON CONFLICT respaldado por UNIQUE parcial)', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(`${process.cwd()}/src/lib/hiring/assessment/instances.ts`, 'utf8')

    expect(source).toMatch(/saveResponse[\s\S]*?ON CONFLICT[\s\S]*?DO UPDATE/)
    expect(source).not.toMatch(/void viewerUserId/)
  })

  it('submitAssessment exige in_progress (nunca submit desde assigned/sent)', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(`${process.cwd()}/src/lib/hiring/assessment/scoring.ts`, 'utf8')

    expect(source).toMatch(/row\.status !== 'in_progress'/)
  })

  it('transitionQuestionStatus persiste el actor del SME gate', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(`${process.cwd()}/src/lib/hiring/assessment/store.ts`, 'utf8')

    expect(source).toMatch(/status_changed_by/)
    expect(source).not.toMatch(/void actorUserId/)
  })
})
