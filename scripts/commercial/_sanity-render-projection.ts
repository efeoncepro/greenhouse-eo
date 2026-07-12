/**
 * Sanity live TASK-1392 Slice 6 — ejercita el SQL de `buildProposalRenderProjection` contra PG
 * real (gate TASK-893: los mocks ejercitan el TS, no el SQL). Read-only: no siembra ni muta.
 *
 * Uso: proxy en 127.0.0.1:15432 + env ops →
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/commercial/_sanity-render-projection.ts
 */
import {
  assertEvidenceAllowedForAudience,
  buildProposalRenderProjection
} from '@/lib/commercial/tenders/proposals/render-projection'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const main = async () => {
  const probe = await runGreenhousePostgresQuery<{ proposal_id: string; owner_org_id: string }>(
    `SELECT proposal_id, owner_org_id FROM greenhouse_commercial.proposals ORDER BY created_at DESC LIMIT 1`
  )

  if (!probe[0]) {
    console.log('SKIP: no hay propuestas en este ambiente')
    process.exit(0)
  }

  const { proposal_id: proposalId, owner_org_id: ownerOrgId } = probe[0]

  const internal = await buildProposalRenderProjection({ ownerOrgId, proposalId, audience: 'internal' })
  const clientFacing = await buildProposalRenderProjection({ ownerOrgId, proposalId, audience: 'client_facing' })

  console.log(
    'INTERNAL:',
    JSON.stringify({
      title: internal.title,
      state: internal.state,
      deadline: internal.deadline,
      deadlineConfidence: internal.deadlineConfidence,
      assets: internal.assets.length,
      evidence: internal.allowedEvidence.map(e => ({
        id: e.evidenceId.slice(0, 8),
        aud: e.audience,
        hasSnap: e.hasExternalSnapshot
      })),
      requirements: internal.requirements.length
    })
  )
  console.log(
    'CLIENT_FACING:',
    JSON.stringify({
      assets: clientFacing.assets.map(a => a.audience),
      evidence: clientFacing.allowedEvidence.map(e => e.audience)
    })
  )

  const internalLeak =
    clientFacing.allowedEvidence.some(e => e.audience !== 'client_facing') ||
    clientFacing.assets.some(a => a.audience !== 'client_facing')

  console.log(
    internalLeak
      ? 'FAIL: la proyección client_facing contiene material interno'
      : 'OK: cero material interno en la proyección client_facing'
  )

  const internalEvidence = internal.allowedEvidence.find(e => e.audience === 'internal')

  if (internalEvidence) {
    try {
      assertEvidenceAllowedForAudience(clientFacing, [internalEvidence.evidenceId], 'client_facing')
      console.log('FAIL: el gate NO rechazó una evidencia interna real')
      process.exit(1)
    } catch {
      console.log('OK: gate fail-closed rechazó la evidencia interna real', internalEvidence.evidenceId.slice(0, 8))
    }
  } else {
    console.log('NOTE: la propuesta probe no tiene evidencia interna — el gate queda cubierto por unit test')
  }

  try {
    await buildProposalRenderProjection({ ownerOrgId: 'org-que-no-existe', proposalId, audience: 'internal' })
    console.log('FAIL: cross-org no lanzó')
    process.exit(1)
  } catch (e) {
    console.log('OK: cross-org NotFound —', (e as Error).name)
  }

  process.exit(0)
}

main().catch(e => {
  console.error('SANITY ERROR:', e)
  process.exit(1)
})
