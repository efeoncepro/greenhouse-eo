import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { confirmAiProposal } from '../assessment/ai/confirm'
import { createAiProposal } from '../assessment/ai/proposal-store'
import { createHiringOpening, createTalentDemand, getHiringOpeningById } from '../store'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// Live regression guard TASK-1385: propose (ledger) → confirm aplica el copy público al opening
// vía updateHiringOpening ATÓMICAMENTE con la marca de la propuesta. El LLM nunca escribe el
// opening: acá la propuesta se siembra directo en el ledger (sin provider) y se verifica que
// SOLO el confirm humano muta los public_*. Skip sin PG.
describe.skipIf(!hasPgConfig)('vacancy AI propose→confirm — live PG (TASK-1385)', () => {
  const marker = `__t1385_live_${Date.now()}`
  const actor = 'user-agent-e2e-001'
  const createdProposalIds: string[] = []
  let demandId: string | null = null
  let openingId: string | null = null

  afterAll(async () => {
    if (!hasPgConfig) return

    for (const pid of createdProposalIds) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_assessment_ai_proposal WHERE proposal_id = $1`, [pid])
    }

    if (openingId) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, [openingId])
    }

    if (demandId) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, [demandId])
    }
  })

  it('propose opening_public_copy → confirm aplica los public_* vía updateHiringOpening', async () => {
    const demand = await createTalentDemand(
      {
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'manual_internal',
        requestedRole: `SEO Specialist ${marker}`,
        requestedSkills: ['SEO técnico', 'GA4'],
      },
      actor,
    )

    demandId = demand.demandId

    const opening = await createHiringOpening(
      { demandId: demand.demandId, internalTitle: `SEO Specialist ${marker}`, budgetBand: 'SECRET_BUDGET_BAND' },
      actor,
    )

    openingId = opening.openingId
    expect(opening.publicTitle).toBeNull()

    const proposal = await createAiProposal(
      {
        kind: 'opening_public_copy',
        targetRef: opening.openingId,
        proposed: {
          publicTitle: `SEO Specialist Senior ${marker}`,
          publicSummary: 'Liderarás el SEO técnico de cuentas reales.',
          publicDescription: '- Auditorías técnicas\n- Estrategia de contenido',
          publicSkillTags: ['SEO técnico', 'GA4'],
          note: 'draft de prueba live',
        },
        provider: 'anthropic',
        model: 'claude-sonnet-5',
        promptVersion: 'hiring_vacancy_ai_public_copy.v1',
        inputDigest: `digest-${marker}`,
      },
      actor,
    )

    createdProposalIds.push(proposal.proposalId)
    expect(proposal.status).toBe('proposed')
    expect(proposal.kind).toBe('opening_public_copy')

    // El propose NO mutó el opening (el LLM no tiene write path).
    const beforeConfirm = await getHiringOpeningById(opening.openingId)

    expect(beforeConfirm?.publicTitle).toBeNull()

    // Confirm humano con edición (override) → aplica vía updateHiringOpening.
    const confirmed = await confirmAiProposal(
      {
        proposalId: proposal.proposalId,
        decision: 'confirm',
        publicCopyOverride: { publicSummary: 'Resumen editado por el humano.' },
      },
      actor,
    )

    expect(confirmed.status).toBe('confirmed')
    expect(confirmed.confirmedRef).toBe(opening.openingId)

    const after = await getHiringOpeningById(opening.openingId)

    expect(after?.publicTitle).toBe(`SEO Specialist Senior ${marker}`)
    expect(after?.publicSummary).toBe('Resumen editado por el humano.')
    expect(after?.publicSkillTags).toEqual(['SEO técnico', 'GA4'])

    // `note` de la propuesta NUNCA se escribe al opening; la verdad interna quedó intacta.
    expect(after?.budgetBand).toBe('SECRET_BUDGET_BAND')

    // Doble confirm idempotente: no re-aplica ni cambia estado.
    const again = await confirmAiProposal({ proposalId: proposal.proposalId, decision: 'confirm' }, actor)

    expect(again.status).toBe('confirmed')

    // Decisión contraria sobre terminal → 409 (terminal-once, state machine de 1361).
    await expect(confirmAiProposal({ proposalId: proposal.proposalId, decision: 'reject' }, actor)).rejects.toMatchObject({
      code: 'assessment_ai_proposal_invalid_transition',
    })
  })
})
