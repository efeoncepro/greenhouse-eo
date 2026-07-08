import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { listQuestions } from '../store'
import { confirmAiProposal } from './confirm'
import { createAiProposal, getAiProposalById } from './proposal-store'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// Live regression guard for TASK-1361 Slice 1 (AI proposal ledger + governed confirm).
// question_draft path: propose → confirm crea una hiring_question (draft) ATÓMICAMENTE. Skip sin PG.
describe.skipIf(!hasPgConfig)('assessment AI proposal ledger + confirm — live PG (TASK-1361)', () => {
  const createdProposalIds: string[] = []
  const createdQuestionIds: string[] = []
  const marker = `__t1361_live_${Date.now()}`

  afterAll(async () => {
    if (!hasPgConfig) return

    // Limpieza: preguntas creadas por el confirm + propuestas del test.
    for (const qid of createdQuestionIds) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_question WHERE question_id = $1`, [qid])
    }

    for (const pid of createdProposalIds) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_assessment_ai_proposal WHERE proposal_id = $1`, [pid])
    }
  })

  it('propose question_draft → confirm crea una hiring_question (draft) y marca la propuesta confirmed', async () => {
    const proposal = await createAiProposal(
      {
        kind: 'question_draft',
        targetRef: 'seo@nociones',
        proposed: {
          competencyKey: 'seo',
          level: 'nociones',
          type: 'single_choice',
          prompt: `¿Qué es un title tag? (${marker})`,
          options: [{ id: 'a', label: 'Un encabezado H1' }, { id: 'b', label: 'El título en el <head> que ve el buscador' }],
          answerKey: { correct: 'b' },
        },
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        promptVersion: 'hiring_assessment_ai_question_gen.v1',
      },
      'user-agent-e2e-001',
    )

    createdProposalIds.push(proposal.proposalId)
    expect(proposal.status).toBe('proposed')

    const confirmed = await confirmAiProposal({ proposalId: proposal.proposalId, decision: 'confirm' }, 'user-agent-e2e-001')

    expect(confirmed.status).toBe('confirmed')
    expect(confirmed.confirmedRef).toBeTruthy()
    if (confirmed.confirmedRef) createdQuestionIds.push(confirmed.confirmedRef)

    // La pregunta nació 'draft' (gate SME) — el confirm NO la deja active.
    const drafts = await listQuestions({ competencyKey: 'seo', status: 'draft' })
    const created = drafts.find((q) => q.questionId === confirmed.confirmedRef)

    expect(created).toBeDefined()
    expect(created?.prompt).toContain(marker)
  })

  it('confirmar dos veces es idempotente (no crea una segunda pregunta)', async () => {
    const proposal = await createAiProposal(
      {
        kind: 'question_draft',
        targetRef: 'leadership@intermedio',
        proposed: {
          competencyKey: 'leadership',
          level: 'intermedio',
          type: 'situational',
          prompt: `Describe una situación de liderazgo bajo presión (${marker})`,
        },
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        promptVersion: 'hiring_assessment_ai_question_gen.v1',
      },
      'user-agent-e2e-001',
    )

    createdProposalIds.push(proposal.proposalId)

    const first = await confirmAiProposal({ proposalId: proposal.proposalId, decision: 'confirm' }, 'user-agent-e2e-001')

    if (first.confirmedRef) createdQuestionIds.push(first.confirmedRef)

    const second = await confirmAiProposal({ proposalId: proposal.proposalId, decision: 'confirm' }, 'user-agent-e2e-001')

    // Idempotente: misma ref, no una pregunta nueva.
    expect(second.confirmedRef).toBe(first.confirmedRef)

    const reread = await getAiProposalById(proposal.proposalId)

    expect(reread?.status).toBe('confirmed')
  })

  it('rechazar una propuesta ya confirmada es terminal-once (409)', async () => {
    const proposal = await createAiProposal(
      {
        kind: 'question_draft',
        targetRef: 'seo@nociones',
        proposed: { competencyKey: 'seo', level: 'nociones', type: 'open_text', prompt: `Explica canonical URL (${marker})` },
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        promptVersion: 'hiring_assessment_ai_question_gen.v1',
      },
      'user-agent-e2e-001',
    )

    createdProposalIds.push(proposal.proposalId)

    const confirmed = await confirmAiProposal({ proposalId: proposal.proposalId, decision: 'confirm' }, 'user-agent-e2e-001')

    if (confirmed.confirmedRef) createdQuestionIds.push(confirmed.confirmedRef)

    await expect(confirmAiProposal({ proposalId: proposal.proposalId, decision: 'reject' }, 'user-agent-e2e-001')).rejects.toMatchObject({
      code: 'assessment_ai_proposal_invalid_transition',
    })
  })
})
