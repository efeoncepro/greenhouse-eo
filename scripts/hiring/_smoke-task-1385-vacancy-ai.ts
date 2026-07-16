/**
 * TASK-1385 — Smoke live con provider REAL (Anthropic) del propose→confirm de vacancy AI.
 *
 * Corre local contra PG (proxy) + Secret Manager (ADC). Crea demanda+opening de prueba con
 * sentinel de verdad interna, propone el copy con el LLM real, verifica no-filtración, confirma
 * con override humano y limpia todo. NUNCA publica el opening (el publish es acción humana).
 *
 * Uso:
 *   HIRING_VACANCY_AI_ENABLED=true pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/hiring/_smoke-task-1385-vacancy-ai.ts
 */

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { confirmAiProposal } from '@/lib/hiring/assessment/ai/confirm'
import { proposeOpeningPublicCopy } from '@/lib/hiring/vacancy-ai/propose'
import { createHiringOpening, createTalentDemand, getHiringOpeningById, updateHiringOpening } from '@/lib/hiring/store'

const ACTOR = 'user-agent-e2e-001'
const SENTINEL_BUDGET = 'SECRET_BUDGET_4500000_CLP'
const marker = `smoke-1385-${Date.now()}`

const main = async () => {
  let demandId: string | null = null
  let openingId: string | null = null
  let proposalId: string | null = null

  try {
    const demand = await createTalentDemand(
      {
        stakeholderType: 'internal',
        engagementType: 'on_going',
        fulfillmentMode: 'internal_hire',
        demandOrigin: 'manual_internal',
        requestedRole: 'SEO Specialist',
        requestedSkills: ['SEO técnico', 'GA4', 'Search Console', 'contenido orientado a AEO'],
        language: 'español',
        timezone: 'America/Santiago',
        budgetBand: SENTINEL_BUDGET,
        notes: 'SECRET_NOTAS_INTERNAS: cliente confidencial, presupuesto ajustado.',
      },
      ACTOR,
    )

    demandId = demand.demandId

    const opening = await createHiringOpening(
      {
        demandId: demand.demandId,
        internalTitle: `SEO Specialist Senior (${marker})`,
        seniority: 'senior',
        budgetBand: SENTINEL_BUDGET,
        riskNotes: 'SECRET_RIESGO: reemplazo sensible.',
      },
      ACTOR,
    )

    openingId = opening.openingId

    // Hechos del operador (la IA no los inventa): modalidad + región.
    await updateHiringOpening(opening.openingId, { publicWorkMode: 'remote', publicHiringRegion: 'LATAM' }, ACTOR)

    console.log(`[smoke] opening ${opening.publicId} listo; proponiendo copy con provider real…`)

    const result = await proposeOpeningPublicCopy({ openingId: opening.openingId }, ACTOR)

    console.log(`[smoke] propose status=${result.status} provider=${result.provider} model=${result.model}`)

    if (result.status !== 'ok' || !result.proposal) {
      throw new Error(`propose no llegó a ok (status=${result.status}) — revisar configuración del provider`)
    }

    proposalId = result.proposal.proposalId

    const copyJson = JSON.stringify(result.proposal.proposed, null, 2)

    console.log('[smoke] copy propuesto:\n' + copyJson)

    if (copyJson.includes('SECRET_') || copyJson.includes('4500000')) {
      throw new Error('FILTRACIÓN: el copy propuesto contiene verdad interna')
    }

    const beforeConfirm = await getHiringOpeningById(opening.openingId)

    if (beforeConfirm?.publicTitle) {
      throw new Error('El propose NO debe mutar el opening')
    }

    const confirmed = await confirmAiProposal(
      { proposalId, decision: 'confirm', publicCopyOverride: { publicProcessNotes: 'Proceso editado por el humano en el smoke.' } },
      ACTOR,
    )

    console.log(`[smoke] confirm status=${confirmed.status} confirmedRef=${confirmed.confirmedRef}`)

    const after = await getHiringOpeningById(opening.openingId)

    console.log('[smoke] opening tras confirm:', {
      publicTitle: after?.publicTitle,
      publicArea: after?.publicArea,
      skillTags: after?.publicSkillTags,
      summaryLen: after?.publicSummary?.length,
      descriptionLen: after?.publicDescription?.length,
      processNotes: after?.publicProcessNotes,
      workMode: after?.publicWorkMode,
      budgetBandIntacto: after?.budgetBand === SENTINEL_BUDGET,
    })

    const gateReady = Boolean(
      after?.publicTitle && after?.publicSummary && after?.publicDescription && after?.publicWorkMode,
    )

    console.log(`[smoke] publish-gate copy mínimo presente: ${gateReady} (publish NO se ejecuta — acción humana)`)
    console.log('[smoke] PASS')
  } finally {
    // Cleanup total: el smoke no deja rastro (nunca publicado, nunca visible).
    if (proposalId) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_assessment_ai_proposal WHERE proposal_id = $1`, [proposalId])
    }

    if (openingId) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, [openingId])
    }

    if (demandId) {
      await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, [demandId])
    }

    await closeGreenhousePostgres()
  }
}

main().catch((error) => {
  console.error('[smoke] FAIL', error)
  process.exit(1)
})
