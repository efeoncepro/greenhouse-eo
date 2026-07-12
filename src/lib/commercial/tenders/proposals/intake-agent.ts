import 'server-only'

/**
 * Proposal Intake Agent Contract — F0 (TASK-1392 Slice 5).
 *
 * El molde de toda fase agéntica del dominio: **el agente PROPONE; el humano CONFIRMA; el mismo
 * command canónico EJECUTA.** El LLM jamás muta estado, adjunta assets, cruza gates ni toca
 * SQL/storage — sus tools son los MISMOS readers del dominio y su salida es una propuesta TIPADA
 * que cita sus inputs.
 *
 *   1. `buildProposalAgentContext` — contexto read-only ALLOWLISTED: metadata de la org compradora,
 *      manifest de assets (filename/mime/size — nunca contenido en F0), propuestas existentes para
 *      dedupe. Nada más entra al prompt.
 *   2. `proposeProposalIntake` — structured output vía el cliente canónico `src/lib/ai` (nunca un
 *      SDK/framework paralelo). Valida FAIL-CLOSED contra el contexto: una org no listada, un asset
 *      no permitido o un origin/deadline malformado RECHAZAN la propuesta completa.
 *   3. `confirmProposalIntake` — el humano autorizado ejecuta `createProposal` +
 *      `attachProposalAsset` — exactamente los mismos primitives que API/CLI. La idempotencyKey
 *      deriva de la propuesta confirmada: re-confirmar no duplica.
 *
 * Eval: `__tests__/intake-agent-eval.test.ts` fija el fixture determinista del contrato (golden
 * inputs → validación) — el gate para tocar el prompt o el schema.
 */

import crypto from 'node:crypto'

import { generateStructuredAnthropic } from '@/lib/ai/anthropic'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getAssetById } from '@/lib/storage/greenhouse-assets'

import { ProposalInputError } from './errors'
import { attachProposalAsset } from './assets'
import { createProposal, listProposals } from './store'
import type { ProposalActor, ProposalDeadlineConfidence, ProposalOrigin, ProposalRecord } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// 1 · Contexto allowlisted
// ─────────────────────────────────────────────────────────────────────────────

export interface ProposalAgentContext {
  ownerOrgId: string
  /** Orgs candidatas a comprador — el agente SOLO puede proponer una de éstas. */
  candidateClientOrganizations: Array<{ organizationId: string; name: string }>
  /** Manifest de los assets del RFP ya subidos (metadata; el contenido es de F1). */
  assetManifest: Array<{ assetId: string; filename: string; mimeType: string; sizeBytes: number }>
  /** Propuestas existentes de la org (para dedupe — el agente cita si detecta una). */
  existingProposals: Array<{ proposalId: string; title: string; state: string }>
}

export const buildProposalAgentContext = async (input: {
  ownerOrgId: string
  clientOrganizationIds: string[]
  assetIds: string[]
}): Promise<ProposalAgentContext> => {
  if (input.clientOrganizationIds.length === 0) {
    throw new ProposalInputError('El contexto exige al menos una organización compradora candidata.')
  }

  const orgs = await runGreenhousePostgresQuery<{ organization_id: string; name: string }>(
    `SELECT organization_id, name FROM greenhouse_core.organizations WHERE organization_id = ANY($1)`,
    [input.clientOrganizationIds]
  )

  const assetManifest: ProposalAgentContext['assetManifest'] = []

  for (const assetId of input.assetIds) {
    const asset = await getAssetById(assetId)

    if (!asset) {
      throw new ProposalInputError(`El asset "${assetId}" no existe: el contexto del agente no inventa assets.`)
    }

    assetManifest.push({
      assetId,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes
    })
  }

  const { items } = await listProposals({ ownerOrgId: input.ownerOrgId, limit: 50 })

  return {
    ownerOrgId: input.ownerOrgId,
    candidateClientOrganizations: orgs.map(org => ({ organizationId: org.organization_id, name: org.name })),
    assetManifest,
    existingProposals: items.map(item => ({ proposalId: item.proposalId, title: item.title, state: item.state }))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · La propuesta tipada + su validación fail-closed
// ─────────────────────────────────────────────────────────────────────────────

export interface ProposalIntakeProposal {
  clientOrganizationId: string
  origin: ProposalOrigin
  publicOpportunityId?: string
  title: string
  platform?: string
  deadline?: string
  deadlineConfidence?: Exclude<ProposalDeadlineConfidence, 'none_declared'>
  deadlineAssumption?: string
  currency?: string
  /** Assets del manifest que el intake adjuntará como rfp_source. */
  rfpAssetIds: string[]
  /** Qué inputs del contexto sostienen cada decisión (trazabilidad, no prosa). */
  citedInputs: string[]
  /** Si el agente detecta una propuesta existente equivalente, la cita en vez de duplicar. */
  possibleDuplicateProposalId?: string
}

export interface ProposalIntakeTrace {
  contextHash: string
  model: string
  proposedAt: string
}

const INTAKE_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['clientOrganizationId', 'origin', 'title', 'rfpAssetIds', 'citedInputs'],
  properties: {
    clientOrganizationId: { type: 'string' },
    origin: { type: 'string', enum: ['public_tender', 'private_rfp', 'direct_sales'] },
    publicOpportunityId: { type: 'string' },
    title: { type: 'string' },
    platform: { type: 'string' },
    deadline: { type: 'string' },
    deadlineConfidence: { type: 'string', enum: ['confirmed', 'ambiguous'] },
    deadlineAssumption: { type: 'string' },
    currency: { type: 'string' },
    rfpAssetIds: { type: 'array', items: { type: 'string' } },
    citedInputs: { type: 'array', items: { type: 'string' }, minItems: 1 },
    possibleDuplicateProposalId: { type: 'string' }
  }
}

/**
 * FAIL-CLOSED contra el contexto: el modelo no puede referirse a nada que el contexto no le dio.
 * Pura y determinista — es el corazón del eval fixture.
 */
export const validateProposalIntakeProposal = (
  proposal: ProposalIntakeProposal,
  context: ProposalAgentContext
): void => {
  const candidateOrgIds = new Set(context.candidateClientOrganizations.map(org => org.organizationId))

  if (!candidateOrgIds.has(proposal.clientOrganizationId)) {
    throw new ProposalInputError(
      `La propuesta de intake refiere una organización fuera del contexto permitido: "${proposal.clientOrganizationId}".`
    )
  }

  const allowedAssets = new Set(context.assetManifest.map(asset => asset.assetId))

  for (const assetId of proposal.rfpAssetIds) {
    if (!allowedAssets.has(assetId)) {
      throw new ProposalInputError(`La propuesta de intake refiere un asset fuera del manifest: "${assetId}".`)
    }
  }

  if ((proposal.origin === 'public_tender') !== Boolean(proposal.publicOpportunityId)) {
    throw new ProposalInputError('origin=public_tender ⟺ publicOpportunityId (y ningún otro origin lo admite).')
  }

  if (proposal.deadline && !proposal.deadlineConfidence) {
    throw new ProposalInputError('Un deadline propuesto exige declarar su confianza (confirmed | ambiguous).')
  }

  if (proposal.deadlineAssumption && proposal.deadlineConfidence !== 'ambiguous') {
    throw new ProposalInputError('deadlineAssumption sólo existe cuando la fecha es ambigua.')
  }

  if (proposal.title.trim().length < 3) {
    throw new ProposalInputError('El título propuesto debe tener al menos 3 caracteres.')
  }

  if (proposal.citedInputs.length === 0) {
    throw new ProposalInputError('La propuesta debe citar sus inputs: una propuesta sin fuentes no es confirmable.')
  }

  if (proposal.possibleDuplicateProposalId) {
    const known = new Set(context.existingProposals.map(existing => existing.proposalId))

    if (!known.has(proposal.possibleDuplicateProposalId)) {
      throw new ProposalInputError('El duplicado citado no existe en el contexto: el agente no inventa propuestas.')
    }
  }
}

export const hashProposalAgentContext = (context: ProposalAgentContext): string =>
  crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex')

const INTAKE_MODEL = 'claude-sonnet-5'

const INTAKE_SYSTEM = `Eres el Proposal Intake Agent de Greenhouse (Efeonce). Tu única salida es una
propuesta ESTRUCTURADA de intake de una licitación/propuesta comercial, derivada EXCLUSIVAMENTE del
contexto permitido y del brief del operador. Reglas duras:
- SOLO puedes proponer una organización compradora del listado candidato y assets del manifest.
- NUNCA inventes deadline: si el brief no lo trae con claridad, omítelo; si trae fechas que chocan,
  usa deadlineConfidence=ambiguous y declara el supuesto en deadlineAssumption.
- origin: public_tender SOLO si hay una oportunidad pública identificada (exige publicOpportunityId);
  un RFP privado (Wherex, invitación directa) es private_rfp; una venta sin proceso es direct_sales.
- Si una propuesta existente parece ser el mismo proceso, decláralo en possibleDuplicateProposalId
  en vez de duplicar.
- citedInputs: por cada decisión relevante, cita el input del contexto/brief que la sostiene.
Tú PROPONES; un humano confirma. No des por hecho que tu propuesta se ejecuta.`

export const proposeProposalIntake = async (input: {
  context: ProposalAgentContext
  /** Brief del operador (texto libre permitido — es un INPUT citado, no una fuente de verdad). */
  operatorBrief: string
}): Promise<{ proposal: ProposalIntakeProposal; trace: ProposalIntakeTrace }> => {
  const result = await generateStructuredAnthropic<ProposalIntakeProposal>({
    model: INTAKE_MODEL,
    system: INTAKE_SYSTEM,
    prompt: JSON.stringify({ context: input.context, operatorBrief: input.operatorBrief }),
    toolName: 'propose_proposal_intake',
    toolDescription: 'Propuesta estructurada de intake de Proposal, derivada sólo del contexto permitido.',
    inputSchema: INTAKE_SCHEMA
  })

  const proposal = result.data

  // Fail-closed: si el modelo se salió del contexto, la propuesta completa se rechaza.
  validateProposalIntakeProposal(proposal, input.context)

  return {
    proposal,
    trace: {
      contextHash: hashProposalAgentContext(input.context),
      model: INTAKE_MODEL,
      proposedAt: new Date().toISOString()
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Confirmación humana → LOS MISMOS commands
// ─────────────────────────────────────────────────────────────────────────────

export const confirmProposalIntake = async (input: {
  ownerOrgId: string
  proposal: ProposalIntakeProposal
  context: ProposalAgentContext
  trace: ProposalIntakeTrace
  /** El humano que confirma — resuelto por la capa de autorización, jamás por el modelo. */
  actor: ProposalActor
  actorUserId: string
}): Promise<{ proposal: ProposalRecord; idempotent: boolean }> => {
  if (input.actor.kind !== 'member' || !input.actor.memberId) {
    throw new ProposalInputError('La confirmación del intake es HUMANA: exige un actor member.')
  }

  // Re-validar en la confirmación: la propuesta pudo viajar/editarse entre propose y confirm.
  validateProposalIntakeProposal(input.proposal, input.context)

  // Idempotencia derivada de la propuesta confirmada: re-confirmar el MISMO intake no duplica.
  const idempotencyKey = `intake-agent-${crypto
    .createHash('sha256')
    .update(JSON.stringify({ proposal: input.proposal, contextHash: input.trace.contextHash }))
    .digest('hex')
    .slice(0, 32)}`

  const created = await createProposal({
    ownerOrgId: input.ownerOrgId,
    clientOrganizationId: input.proposal.clientOrganizationId,
    origin: input.proposal.origin,
    publicOpportunityId: input.proposal.publicOpportunityId,
    title: input.proposal.title,
    platform: input.proposal.platform,
    deadline: input.proposal.deadline,
    deadlineConfidence: input.proposal.deadlineConfidence,
    deadlineAssumption: input.proposal.deadlineAssumption,
    currency: input.proposal.currency,
    idempotencyKey,
    actor: input.actor
  })

  for (const assetId of input.proposal.rfpAssetIds) {
    await attachProposalAsset({
      ownerOrgId: input.ownerOrgId,
      proposalId: created.proposal.proposalId,
      assetId,
      kind: 'rfp_source',
      actorUserId: input.actorUserId,
      actor: input.actor
    })
  }

  return created
}
