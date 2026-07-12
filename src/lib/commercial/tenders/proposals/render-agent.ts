import 'server-only'

/**
 * Proposal Render Agent Contract — TASK-1391 Slice 1c.
 *
 * Mismo molde que el intake agent (TASK-1392): **el agente PROPONE; el humano CONFIRMA; el mismo
 * command canónico EJECUTA.** El agente NUNCA encola, NUNCA invoca `jobs.run`, NUNCA ejecuta
 * Chromium ni publica artefactos — su salida es un `ProposalRenderAgentProposal` tipado que cita
 * sus inputs y DECLARA sus bloqueos (no los esconde: la validación los recomputa del contexto y
 * exige que la propuesta los liste).
 *
 *   1. `buildProposalRenderAgentContext` — proyección allowlisted del audience objetivo +
 *      constraints extraídas del requisito-set + jobs existentes + la ÚNICA estimación honesta:
 *      datos MEDIDOS de la última ejecución comparable (nunca una predicción inventada).
 *   2. `proposeProposalRender` — structured output vía el cliente canónico `src/lib/ai`;
 *      validación FAIL-CLOSED contra el contexto.
 *   3. `confirmProposalRender` — el humano ejecuta `requestProposalRender` (el MISMO command que
 *      API/CLI) con el manifest resuelto por `resolvePlan` — el agente jamás produce el manifest.
 *
 * Eval: `__tests__/render-agent-eval.test.ts` — el gate para tocar prompt/schema.
 */

import crypto from 'node:crypto'

import { generateStructuredAnthropic } from '@/lib/ai/anthropic'

import { ProposalInputError } from './errors'
import { buildProposalRenderProjection, type ProposalRenderProjection } from './render-projection'
import { extractRenderConstraints, type ProposalRenderConstraints } from './render-constraints'
import {
  listProposalRenderJobs,
  requestProposalRender,
  type ProposalRenderJobRecord,
  type RequestProposalRenderInput
} from './render-jobs'
import type { ProposalActor, ProposalAudience } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// 1 · Contexto allowlisted
// ─────────────────────────────────────────────────────────────────────────────

export interface ProposalRenderAgentContext {
  ownerOrgId: string
  proposalId: string
  audience: ProposalAudience
  proposal: {
    title: string
    state: string
    deadline: string | null
    deadlineConfidence: string
  }
  /** Evidencia PERMITIDA para el audience objetivo (lo interno ni aparece en client_facing). */
  allowedEvidence: ProposalRenderProjection['allowedEvidence']
  requirements: ProposalRenderProjection['requirements']
  /** Constraints YA extraídas del requisito-set — el agente las lee, no las decide. */
  constraints: ProposalRenderConstraints
  /** Jobs de render existentes de la propuesta (dedupe/estado). */
  existingJobs: Array<{
    renderJobId: string
    artifactPurpose: string
    audience: ProposalAudience
    state: string
    manifestHash: string
  }>
  /**
   * Estimación HONESTA: datos medidos de la última ejecución completada comparable (mismo
   * catálogo). `basis='no_data'` cuando no hay ninguna — el agente NO inventa números.
   */
  measuredEstimate:
    | { basis: 'no_data' }
    | { basis: 'last_comparable'; renderJobId: string; durationMs: number | null; pdfBytes: number | null }
}

export const buildProposalRenderAgentContext = async (input: {
  ownerOrgId: string
  proposalId: string
  audience: ProposalAudience
}): Promise<ProposalRenderAgentContext> => {
  const projection = await buildProposalRenderProjection(input)
  const constraints = extractRenderConstraints(projection.requirements)
  const jobs = await listProposalRenderJobs({ ownerOrgId: input.ownerOrgId, proposalId: input.proposalId })

  const lastCompleted = jobs.find(job => job.state === 'completed')

  const measuredEstimate: ProposalRenderAgentContext['measuredEstimate'] = lastCompleted
    ? {
        basis: 'last_comparable',
        renderJobId: lastCompleted.renderJobId,
        durationMs: extractMeasuredDurationMs(lastCompleted),
        pdfBytes: extractMeasuredPdfBytes(lastCompleted)
      }
    : { basis: 'no_data' }

  return {
    ownerOrgId: input.ownerOrgId,
    proposalId: input.proposalId,
    audience: input.audience,
    proposal: {
      title: projection.title,
      state: projection.state,
      deadline: projection.deadline,
      deadlineConfidence: projection.deadlineConfidence
    },
    allowedEvidence: projection.allowedEvidence,
    requirements: projection.requirements,
    constraints,
    existingJobs: jobs.map(job => ({
      renderJobId: job.renderJobId,
      artifactPurpose: job.artifactPurpose,
      audience: job.audience,
      state: job.state,
      manifestHash: job.manifestHash
    })),
    measuredEstimate
  }
}

const extractMeasuredDurationMs = (job: ProposalRenderJobRecord): number | null => {
  const report = job as unknown as { outputReport?: { durationMs?: number } }

  return typeof report.outputReport?.durationMs === 'number' ? report.outputReport.durationMs : null
}

const extractMeasuredPdfBytes = (job: ProposalRenderJobRecord): number | null => {
  const report = job as unknown as { outputReport?: { pdfBytes?: number } }

  return typeof report.outputReport?.pdfBytes === 'number' ? report.outputReport.pdfBytes : null
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · La propuesta tipada + su validación fail-closed
// ─────────────────────────────────────────────────────────────────────────────

export type RenderBlockerCode = 'accessibility_required' | 'deadline_expired' | 'internal_evidence_for_client_facing'

export interface ProposalRenderAgentProposal {
  artifactPurpose: string
  audience: ProposalAudience
  outputTarget: string
  /** Evidencia que el artefacto citará — SOLO ids del allowlist del contexto. */
  evidenceIds: string[]
  /** Por qué este render, con inputs citados (trazabilidad, no prosa suelta). */
  citedInputs: string[]
  /**
   * Bloqueos DETECTADOS. El agente no puede esconderlos: la validación los recomputa del contexto
   * y una propuesta que omita un bloqueo real se rechaza completa.
   */
  blockers: RenderBlockerCode[]
  /** Si ya existe un job equivalente, se cita en vez de duplicar. */
  possibleDuplicateRenderJobId?: string
}

export interface ProposalRenderTrace {
  contextHash: string
  model: string
  proposedAt: string
}

const RENDER_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['artifactPurpose', 'audience', 'outputTarget', 'evidenceIds', 'citedInputs', 'blockers'],
  properties: {
    artifactPurpose: { type: 'string' },
    audience: { type: 'string', enum: ['internal', 'client_facing'] },
    outputTarget: { type: 'string', enum: ['pdf-merged', 'png-set'] },
    evidenceIds: { type: 'array', items: { type: 'string' } },
    citedInputs: { type: 'array', items: { type: 'string' }, minItems: 1 },
    blockers: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['accessibility_required', 'deadline_expired', 'internal_evidence_for_client_facing']
      }
    },
    possibleDuplicateRenderJobId: { type: 'string' }
  }
}

/** Bloqueos REALES derivados del contexto — la vara contra la que se valida la propuesta. */
export const computeRenderBlockers = (context: ProposalRenderAgentContext): RenderBlockerCode[] => {
  const blockers: RenderBlockerCode[] = []

  if (context.constraints.accessibilityRequired) blockers.push('accessibility_required')

  if (context.proposal.deadline && new Date(context.proposal.deadline).getTime() < Date.now()) {
    blockers.push('deadline_expired')
  }

  return blockers
}

/**
 * FAIL-CLOSED contra el contexto. Pura y determinista — el corazón del eval fixture.
 */
export const validateProposalRenderProposal = (
  proposal: ProposalRenderAgentProposal,
  context: ProposalRenderAgentContext
): void => {
  if (proposal.artifactPurpose.trim().length < 3) {
    throw new ProposalInputError('artifactPurpose propuesto debe tener al menos 3 caracteres.')
  }

  if (proposal.audience !== context.audience) {
    throw new ProposalInputError(
      `La propuesta cambia el audience del contexto (${context.audience} → ${proposal.audience}): el audience lo fija el humano, no el modelo.`
    )
  }

  const allowed = new Set(context.allowedEvidence.map(e => e.evidenceId))

  for (const evidenceId of proposal.evidenceIds) {
    if (!allowed.has(evidenceId)) {
      throw new ProposalInputError(`La propuesta cita evidencia fuera del allowlist: "${evidenceId}".`)
    }
  }

  if (proposal.audience === 'client_facing') {
    const internal = proposal.evidenceIds.filter(
      id => context.allowedEvidence.find(e => e.evidenceId === id)?.audience !== 'client_facing'
    )

    if (internal.length > 0) {
      throw new ProposalInputError(
        `Un artefacto client_facing no puede citar evidencia interna: ${internal.join(', ')}.`
      )
    }
  }

  if (proposal.citedInputs.length === 0) {
    throw new ProposalInputError('La propuesta debe citar sus inputs: sin fuentes no es confirmable.')
  }

  // El agente NO esconde bloqueos: todo bloqueo real del contexto debe estar declarado.
  const realBlockers = computeRenderBlockers(context)

  for (const blocker of realBlockers) {
    if (!proposal.blockers.includes(blocker)) {
      throw new ProposalInputError(
        `La propuesta omite un bloqueo real del contexto ("${blocker}"): una propuesta que esconde bloqueos se rechaza completa.`
      )
    }
  }

  if (proposal.possibleDuplicateRenderJobId) {
    const known = new Set(context.existingJobs.map(job => job.renderJobId))

    if (!known.has(proposal.possibleDuplicateRenderJobId)) {
      throw new ProposalInputError('El duplicado citado no existe en el contexto: el agente no inventa jobs.')
    }
  }
}

export const hashProposalRenderAgentContext = (context: ProposalRenderAgentContext): string =>
  crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex')

const RENDER_MODEL = 'claude-sonnet-5'

const RENDER_SYSTEM = `Eres el Proposal Render Agent de Greenhouse (Efeonce). Tu única salida es una
propuesta ESTRUCTURADA de render de un artefacto (deck PDF / set PNG) para una Proposal, derivada
EXCLUSIVAMENTE del contexto permitido y del brief del operador. Reglas duras:
- SOLO puedes citar evidencia del allowlist del contexto. Para un artefacto client_facing, SOLO
  evidencia client_facing (una sola referencia interna filtraría la estructura de costos).
- NUNCA cambies el audience del contexto: lo fija el humano.
- DECLARA todo bloqueo que el contexto revele (accessibility_required si el requisito-set exige
  PDF/UA/508/EAA — este renderer NO puede cumplirlo; deadline_expired si la fecha ya pasó). Una
  propuesta que esconde un bloqueo se rechaza completa.
- Si un job existente (mismo propósito/audience) ya cubre el render, decláralo en
  possibleDuplicateRenderJobId en vez de duplicar.
- La estimación de duración/tamaño SOLO puede citar measuredEstimate del contexto; si es
  no_data, no des números.
- citedInputs: por cada decisión, el input del contexto/brief que la sostiene.
Tú PROPONES; un humano confirma. Jamás encolas, ejecutas Chromium ni publicas artefactos.`

export const proposeProposalRender = async (input: {
  context: ProposalRenderAgentContext
  operatorBrief: string
}): Promise<{ proposal: ProposalRenderAgentProposal; trace: ProposalRenderTrace }> => {
  const result = await generateStructuredAnthropic<ProposalRenderAgentProposal>({
    model: RENDER_MODEL,
    system: RENDER_SYSTEM,
    prompt: JSON.stringify({ context: input.context, operatorBrief: input.operatorBrief }),
    toolName: 'propose_proposal_render',
    toolDescription: 'Propuesta estructurada de render de artefacto, derivada sólo del contexto permitido.',
    inputSchema: RENDER_SCHEMA
  })

  const proposal = result.data

  validateProposalRenderProposal(proposal, input.context)

  return {
    proposal,
    trace: {
      contextHash: hashProposalRenderAgentContext(input.context),
      model: RENDER_MODEL,
      proposedAt: new Date().toISOString()
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Confirmación humana → EL MISMO command (requestProposalRender)
// ─────────────────────────────────────────────────────────────────────────────

export const confirmProposalRender = async (input: {
  ownerOrgId: string
  proposalId: string
  proposal: ProposalRenderAgentProposal
  context: ProposalRenderAgentContext
  trace: ProposalRenderTrace
  /**
   * El manifest resuelto por `resolvePlan` (composer, determinista) — el agente JAMÁS lo produce.
   * El humano lo aporta desde el tooling de autoría (CLI hoy).
   */
  manifest: RequestProposalRenderInput['manifest']
  outputTarget: string
  actor: ProposalActor
}) => {
  if (input.actor.kind !== 'member' || !input.actor.memberId) {
    throw new ProposalInputError('La confirmación del render es HUMANA: exige un actor member.')
  }

  // Re-validar: la propuesta pudo viajar/editarse entre propose y confirm.
  validateProposalRenderProposal(input.proposal, input.context)

  if (input.proposal.blockers.length > 0) {
    throw new ProposalInputError(
      `La propuesta declara bloqueos sin resolver (${input.proposal.blockers.join(', ')}): no se confirma un render bloqueado.`
    )
  }

  // El MISMO command canónico que API/CLI — con sus propios gates fail-closed.
  return requestProposalRender({
    ownerOrgId: input.ownerOrgId,
    proposalId: input.proposalId,
    artifactPurpose: input.proposal.artifactPurpose,
    audience: input.proposal.audience,
    manifest: input.manifest,
    outputTarget: input.outputTarget,
    evidenceIds: input.proposal.evidenceIds,
    actor: input.actor
  })
}
