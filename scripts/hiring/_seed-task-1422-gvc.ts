/**
 * TASK-1422 — Seed determinista para el GVC loop (NO commitear datos: correr con --cleanup al final).
 * Crea demanda + opening DRAFT (internal_only, nunca publicado) + proposal `proposed` en el ledger,
 * para capturar el paso review del drawer sin llamar al LLM. Idempotente por marker.
 */

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { createAiProposal } from '@/lib/hiring/assessment/ai/proposal-store'
import { createHiringOpening, createTalentDemand } from '@/lib/hiring/store'

const ACTOR = 'user-agent-e2e-001'
const MARKER = 'GVC-1422 SEO Specialist Senior'

const cleanup = async () => {
  const rows = await runGreenhousePostgresQuery<{ opening_id: string; demand_id: string }>(
    `SELECT opening_id, demand_id FROM greenhouse_hiring.hiring_opening WHERE internal_title = $1`,
    [MARKER],
  )

  for (const row of rows) {
    await runGreenhousePostgresQuery(
      `DELETE FROM greenhouse_hiring.hiring_assessment_ai_proposal WHERE target_ref = $1`,
      [row.opening_id],
    )
    await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1`, [row.opening_id])
    await runGreenhousePostgresQuery(`DELETE FROM greenhouse_hiring.talent_demand WHERE demand_id = $1`, [row.demand_id])
  }

  console.log(`[seed-1422] cleanup: ${rows.length} opening(s) removidos`)
}

const seed = async () => {
  const existing = await runGreenhousePostgresQuery<{ opening_id: string }>(
    `SELECT opening_id FROM greenhouse_hiring.hiring_opening WHERE internal_title = $1`,
    [MARKER],
  )

  if (existing.length > 0) {
    console.log(`[seed-1422] ya existe (${existing[0].opening_id}) — nada que hacer`)

    return
  }

  const demand = await createTalentDemand(
    {
      stakeholderType: 'internal',
      engagementType: 'on_going',
      fulfillmentMode: 'internal_hire',
      demandOrigin: 'manual_internal',
      requestedRole: 'SEO Specialist',
      requestedSkills: ['SEO técnico', 'GA4', 'Search Console', 'AEO'],
      language: 'español',
      timezone: 'America/Santiago',
    },
    ACTOR,
  )

  const opening = await createHiringOpening(
    { demandId: demand.demandId, internalTitle: MARKER, seniority: 'senior', budgetBand: 'INTERNO-NO-PUBLICABLE' },
    ACTOR,
  )

  await createAiProposal(
    {
      kind: 'opening_public_copy',
      targetRef: opening.openingId,
      proposed: {
        publicTitle: 'SEO Specialist Senior',
        publicSummary:
          'Buscamos a una persona senior en SEO para llevar el posicionamiento técnico y de contenido de cuentas activas. Vas a trabajar directo sobre datos de GA4 y Search Console, con impacto visible en tráfico orgánico y en cómo el contenido responde a motores de respuesta (AEO).',
        publicDescription:
          'Efeonce es una agencia de growth con sistema operativo propio. Trabajamos remoto y en español, con equipos distribuidos en LATAM.\n\nEn este rol vas a:\n- Auditar y optimizar la arquitectura técnica de sitios\n- Analizar métricas de tráfico orgánico en GA4 y Search Console\n- Definir lineamientos de contenido orientado a AEO\n- Coordinar con equipos de contenido y desarrollo\n- Dar seguimiento a resultados con datos concretos',
        publicRequirements:
          '- Experiencia comprobable en SEO técnico (auditorías, indexación, Core Web Vitals)\n- Manejo de GA4 y Search Console para análisis y toma de decisiones\n- Experiencia elaborando contenido con enfoque en AEO\n- Español como idioma de trabajo',
        publicNiceToHave: '- Experiencia con múltiples cuentas en paralelo\n- Screaming Frog, Ahrefs o Semrush',
        publicArea: 'Growth',
        publicSeniority: 'senior',
        publicSkillTags: ['SEO técnico', 'GA4', 'Search Console', 'AEO', 'Contenido SEO'],
        note: 'Basado en la demanda y las skills solicitadas.',
      },
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      promptVersion: 'hiring_vacancy_ai_public_copy.v1',
      inputDigest: `gvc-1422-${opening.openingId}`,
    },
    ACTOR,
  )

  console.log(`[seed-1422] listo: opening ${opening.publicId} (${opening.openingId}) con proposal proposed`)
}

const main = async () => {
  try {
    if (process.argv.includes('--cleanup')) await cleanup()
    else await seed()
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch((error) => {
  console.error('[seed-1422] FAIL', error)
  process.exit(1)
})
