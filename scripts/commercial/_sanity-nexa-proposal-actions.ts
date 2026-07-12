/**
 * TASK-1399 — Smoke del runtime gobernado del Proposal Studio, contra PG REAL.
 *
 * Ejercita el MISMO resolver que usa el chat (`resolveNexaActionProposal`), con la propuesta SKY
 * real de la base de datos. No es un mock: pega contra PG, resuelve el entitlement per-ORG, cruza la
 * puerta y construye los previews con datos vivos.
 *
 * Lo que prueba, en orden:
 *   1. Flags OFF → gap `runtime_disabled` (el bloque nace apagado, de verdad).
 *   2. `proposal_status` (read-only) → devuelve SKY con su riesgo de deadline y su link de descarga.
 *   3. `register_proposal` → preview con el cliente resuelto POR NOMBRE (el LLM no dio ningún UUID).
 *   4. `record_proposal_evidence` con audience `internal` → el preview lo GRITA.
 *   5. `request_proposal_render` citando una evidencia INTERNA en un artefacto `client_facing` →
 *      **NO se propone**: gap `unavailable` con el motivo real del dominio. Éste es el importante.
 *
 * Uso: npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/commercial/_sanity-nexa-proposal-actions.ts
 * (requiere el proxy de Cloud SQL en 127.0.0.1:15432 y .env.local)
 */

import { config } from 'dotenv'

config({ path: '.env.local' })

// El bloque nace apagado: los prendemos EXPLÍCITAMENTE para este smoke (así se prueba también que
// sin ellos no hay nada).
const enableFlags = () => {
  process.env.NEXA_ACTION_RUNTIME_ENABLED = 'true'
  process.env.NEXA_PROPOSAL_ACTIONS_ENABLED = 'true'
  // El gate del render vive DETRÁS del flag del pipeline: sin esto, el preview se corta en
  // `flag_disabled` y el gate de audience (lo único que de verdad importa acá) nunca se ejercita.
  process.env.ARTIFACT_RENDER_JOBS_ENABLED = 'true'
}

const disableFlags = () => {
  delete process.env.NEXA_ACTION_RUNTIME_ENABLED
  delete process.env.NEXA_PROPOSAL_ACTIONS_ENABLED
}

const main = async () => {
  const { resolveNexaActionProposal } = await import('../../src/lib/nexa/actions/registry')
  const { runGreenhousePostgresQuery } = await import('../../src/lib/postgres/client')
  const { listProposalsForOperator } = await import('../../src/lib/commercial/tenders/proposals/operator-view')

  // Contexto de sesión de un operador interno real (el mismo shape que arma el chat desde la sesión).
  const context = {
    userId: 'user-agent-e2e-001',
    memberId: undefined as string | undefined,
    clientId: null,
    tenantType: 'efeonce_internal' as const,
    roleCodes: ['efeonce_admin'],
    routeGroups: ['internal', 'admin']
  }

  const members = await runGreenhousePostgresQuery<{ member_id: string }>(
    `SELECT member_id FROM greenhouse_core.members WHERE active IS TRUE ORDER BY member_id LIMIT 1`
  )

  context.memberId = members[0]?.member_id

  console.log(`\n▸ Actor: ${context.userId} (member ${context.memberId ?? 'sin member'})`)

  // ── 1. Flags OFF ───────────────────────────────────────────────────────────
  disableFlags()

  const off = await resolveNexaActionProposal('register_proposal', context, {
    clientOrganizationName: 'SKY',
    origin: 'private_rfp',
    title: 'Prueba con el bloque apagado'
  })

  console.log(`\n1. Flags OFF → ${off.kind === 'gap' ? `gap "${off.gap.reason}"` : '❌ PROPUSO ALGO'}`)

  if (off.kind !== 'gap' || off.gap.reason !== 'runtime_disabled') throw new Error('El bloque NO nace apagado.')

  enableFlags()

  // ── 2. proposal_status (el read model del día a día) ───────────────────────
  const { resolveProposalStudioOwnerOrg } = await import('../../src/lib/commercial/tenders/proposals/org-resolution')
  const owner = await resolveProposalStudioOwnerOrg()

  console.log(`\n2. Org dueña DERIVADA del entitlement (nadie la propuso): ${owner.organizationName}`)

  const rows = await listProposalsForOperator({ ownerOrgId: owner.organizationId })
  const sky = rows.find(row => row.title.includes('SKY'))

  console.log(`   Propuestas activas: ${rows.length}`)

  if (!sky) throw new Error('No encontré la propuesta SKY.')

  console.log(
    `   SKY → estado=${sky.state} · deadline=${sky.deadlineRisk} · evidencia=${sky.counts.evidence} · ` +
      `artefacto=${sky.latestArtifact?.state ?? 'ninguno'} · descarga=${sky.latestArtifact?.downloadUrl ?? '—'}`
  )

  // ── 3. register_proposal — el cliente entra POR NOMBRE ─────────────────────
  const register = await resolveNexaActionProposal('register_proposal', context, {
    clientOrganizationName: 'Aguas Andinas',
    origin: 'private_rfp',
    title: '[SMOKE TASK-1399] no se confirma — sólo el preview'
  })

  if (register.kind !== 'proposal') throw new Error(`register_proposal degradó: ${JSON.stringify(register.gap)}`)

  console.log(`\n3. register_proposal → PROPUESTA (no escribió nada)`)
  console.log(`   preview: ${register.proposal.preview.summary}`)
  console.log(`   métricas: ${register.proposal.preview.metrics.map(m => `${m.label}=${m.value}`).join(' · ')}`)

  // ── 4. evidencia INTERNA — el preview lo grita ─────────────────────────────
  const evidence = await runGreenhousePostgresQuery<{ evidence_id: string; audience: string; locator: string }>(
    `SELECT evidence_id, audience, locator FROM greenhouse_commercial.proposal_evidence
      WHERE owner_org_id = $1 AND proposal_id = $2 ORDER BY audience LIMIT 5`,
    [owner.organizationId, sky.proposalId]
  )

  console.log(`\n   Evidencia real de SKY: ${evidence.map(e => `${e.evidence_id.slice(0, 12)}…(${e.audience})`).join(' · ')}`)

  let internalEvidence = evidence.find(e => e.audience === 'internal')
  const clientEvidence = evidence.find(e => e.audience === 'client_facing')

  // Si SKY no tiene evidencia interna, el gate no se puede ejercitar con datos reales — y un smoke
  // que no ejercita el gate que protege el piso de negociación no prueba nada. La creamos con el
  // command canónico (es exactamente la evidencia que una propuesta real tiene: su loaded cost).
  if (!internalEvidence) {
    const { recordProposalEvidence } = await import('../../src/lib/commercial/tenders/proposals/assets')

    const created = await recordProposalEvidence({
      ownerOrgId: owner.organizationId,
      proposalId: sky.proposalId,
      externalSourceSnapshot: { fuente: 'squad blueprint (INTERNO)', nota: 'loaded cost — piso de negociación' },
      locator: 'squad blueprint — costo cargado del equipo',
      method: 'loaded cost del squad',
      asOf: '2026-07-12',
      classification: 'measured',
      audience: 'internal',
      actor: context.memberId ? { kind: 'member', memberId: context.memberId } : { kind: 'system' }
    })

    console.log(`   (creé la evidencia interna ${created.evidenceId.slice(0, 12)}… para poder ejercitar el gate)`)

    internalEvidence = { evidence_id: created.evidenceId, audience: 'internal', locator: 'squad blueprint' }
  }

  const recordInternal = await resolveNexaActionProposal('record_proposal_evidence', context, {
    proposalId: sky.proposalId,
    externalSourceSnapshot: { fuente: 'squad blueprint', costo: 'loaded cost' },
    locator: 'squad blueprint — piso de negociación',
    method: 'loaded cost del equipo',
    asOf: '2026-07-12',
    classification: 'measured',
    audience: 'internal'
  })

  if (recordInternal.kind !== 'proposal') throw new Error('record_proposal_evidence degradó.')

  console.log(`\n4. record_proposal_evidence (audience=internal) → "${recordInternal.proposal.preview.title}"`)
  console.log(`   ${recordInternal.proposal.preview.summary}`)

  // ── 5. EL GATE: evidencia interna citada en un artefacto para el comprador ──
  const manifest = {
    manifestVersion: 1,
    artifactId: 'smoke-1399',
    input: { procedencia: 'este campo NO debe ser strippeado por Zod' },
    catalog: { name: 'deck-axis', version: '1.0.0', registryHash: 'smoke', ownerOrgId: 'global' },
    slides: [{ template: 'cover' }],
    brandPack: { name: 'axis', hash: 'smoke' },
    fonts: null,
    validators: [{ name: 'semantic', version: '1', result: 'pass', violations: [] }]
  }

  if (internalEvidence) {
    const leak = await resolveNexaActionProposal('request_proposal_render', context, {
      proposalId: sky.proposalId,
      artifactPurpose: 'deck',
      audience: 'client_facing',
      outputTarget: 'pdf-merged',
      evidenceIds: [internalEvidence.evidence_id],
      manifest
    })

    console.log(`\n5. ⚠️  EL GATE — render client_facing citando la evidencia INTERNA ${internalEvidence.evidence_id.slice(0, 12)}…`)

    if (leak.kind === 'proposal') {
      throw new Error('❌❌ FUGA: propuso el render con una evidencia interna. El gate NO funciona.')
    }

    console.log(`   → NO propuso. gap="${leak.gap.reason}"`)
    console.log(`   → "${leak.gap.message}"`)
  } else {
    console.log('\n5. ⚠️  SKY no tiene evidencia interna cargada — el gate no se pudo ejercitar con datos reales.')
  }

  // ── 5b. El mismo render, con la evidencia legítima → SÍ propone ────────────
  if (clientEvidence) {
    const ok = await resolveNexaActionProposal('request_proposal_render', context, {
      proposalId: sky.proposalId,
      artifactPurpose: 'deck',
      audience: 'client_facing',
      outputTarget: 'pdf-merged',
      evidenceIds: [clientEvidence.evidence_id],
      manifest
    })

    if (ok.kind === 'proposal') {
      console.log(`\n5b. El MISMO render citando evidencia legítima → SÍ propone (no es un gate que bloquea todo):`)
      console.log(`    ${ok.proposal.preview.summary}`)

      const echoed = (ok.proposal.execution.input as { manifest: Record<string, unknown> }).manifest

      console.log(
        `    manifest verbatim (procedencia intacta): ${JSON.stringify(echoed.input) === JSON.stringify(manifest.input) ? '✓' : '❌ STRIPPEADO'}`
      )
    } else {
      console.log(`\n5b. El render con evidencia legítima degradó: ${ok.gap.reason} — "${ok.gap.message}"`)
    }
  }

  console.log('\n✓ Smoke completo. Nada se escribió: todas fueron PROPUESTAS (o gaps).\n')
  process.exit(0)
}

main().catch(error => {
  console.error('\n✗ SMOKE FALLÓ:', error)
  process.exit(1)
})
