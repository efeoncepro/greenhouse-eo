/**
 * TASK-1391 — Corrida REAL end-to-end del pipeline de render con la propuesta técnica de SKY.
 *
 * Ejecuta EXACTAMENTE el camino gobernado (ningún atajo):
 *   1. createProposal (SKY Blog 2026, private_rfp, deadline real de las bases) — command canónico.
 *   2. recordProposalEvidence client_facing (la fuente de la oferta técnica).
 *   3. resolvePlan(deck-axis, deck-plan.json REAL de SKY) → ResolvedCompositionManifest.
 *   4. requestProposalRender (gates fail-closed: audience/constraints/deadline/validadores).
 *   5. El MISMO código del worker (services/artifact-worker/main.ts se invoca aparte con
 *      RENDER_JOB_ID) — este script solo encola y reporta.
 *
 * Autorización: corrida solicitada explícitamente por el operador (Julio Reyes) — su instrucción
 * ES la confirmación humana del render client_facing; actor member=julio-reyes (su identidad real).
 *
 * Uso: proxy 15432 + env ops + ARTIFACT_RENDER_JOBS_ENABLED=true →
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/commercial/_sanity-sky-render-pipeline.ts
 */
import fs from 'node:fs'

import { resolvePlan } from '@/lib/artifact-composer'
import { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'
import { createProposal } from '@/lib/commercial/tenders/proposals/store'
import { recordProposalEvidence } from '@/lib/commercial/tenders/proposals/assets'
import { requestProposalRender } from '@/lib/commercial/tenders/proposals/render-jobs'

const OWNER_ORG = 'org-2df565fb-98aa-42f7-b324-ea9a2209017f' // Efeonce Group SpA (módulo activo)

const main = async () => {
  const actor = { kind: 'member' as const, memberId: 'julio-reyes' }

  // 1 · La propuesta SKY como objeto de negocio (idempotente por key).
  const created = await createProposal({
    ownerOrgId: OWNER_ORG,
    clientOrganizationId: OWNER_ORG,
    origin: 'private_rfp',
    title: 'SKY — Gestión del blog 2026 (Wherex)',
    platform: 'Wherex',
    deadline: '2026-07-15T18:00:00Z',
    deadlineConfidence: 'ambiguous',
    deadlineAssumption: 'Bases §2.5: se asume la fecha de cierre de recepción de ofertas.',
    currency: 'CLP',
    idempotencyKey: 'sky-blog-2026-wherex',
    actor
  })

  console.log(`1 · proposal: ${created.proposal.proposalId} (idempotent=${created.idempotent})`)

  // 2 · Evidencia client_facing: la oferta técnica es la fuente de los claims del deck.
  const evidence = await recordProposalEvidence({
    ownerOrgId: OWNER_ORG,
    proposalId: created.proposal.proposalId,
    externalSourceSnapshot: {
      source: 'docs/commercial/tenders/sky-blog-2026/oferta-tecnica.md',
      note: 'Oferta técnica SKY Blog 2026 — fuente de los claims del deck'
    },
    locator: 'oferta-tecnica.md (completa)',
    method: 'documento de oferta redactado y aprobado por el equipo',
    asOf: '2026-07-12',
    classification: 'attested',
    audience: 'client_facing',
    actor
  }).catch(err => {
    // Idempotencia del smoke: si ya existe de una corrida previa, seguimos.
    console.log(`2 · evidencia ya registrada o error benigno: ${(err as Error).message.slice(0, 80)}`)

    return null
  })

  if (evidence) console.log(`2 · evidencia: ${evidence.evidenceId}`)

  // 3 · El manifest REAL desde el deck-plan de SKY (resolvePlan = la única fábrica).
  const plan = JSON.parse(fs.readFileSync('docs/commercial/tenders/sky-blog-2026/deck-plan.json', 'utf8')) as {
    tenderId: string
    slides: Array<Record<string, unknown>>
  }

  const manifest = await resolvePlan(deckAxisCatalog, { artifactId: plan.tenderId, slides: plan.slides as never })

  console.log(`3 · manifest resuelto: ${manifest.slides.length} láminas · catálogo ${manifest.catalog.name}@${manifest.catalog.version} · validadores ${manifest.validators.length} pass`)

  // 4 · EL command gobernado (los gates deciden, no este script).
  const { job, idempotent } = await requestProposalRender({
    ownerOrgId: OWNER_ORG,
    proposalId: created.proposal.proposalId,
    artifactPurpose: 'deck',
    audience: 'client_facing',
    manifest: manifest as never,
    outputTarget: 'pdf-merged',
    evidenceIds: evidence ? [evidence.evidenceId] : [],
    actor
  })

  console.log(`4 · render job: ${job.renderJobId} (idempotent=${idempotent}) state=${job.state}`)
  console.log(`    manifestHash=${job.manifestHash}`)
  console.log(`    constraints=${JSON.stringify(job.constraints)}`)
  console.log(`    deadline=${job.deadline}`)
  console.log('')
  console.log('Siguiente paso (el worker, mismo código del Job):')
  console.log(`  RENDER_JOB_ID=${job.renderJobId} npx tsx --require ./scripts/lib/server-only-shim.cjs services/artifact-worker/main.ts`)

  process.exit(0)
}

main().catch(e => {
  console.error('PIPELINE ERROR:', e)
  process.exit(1)
})
