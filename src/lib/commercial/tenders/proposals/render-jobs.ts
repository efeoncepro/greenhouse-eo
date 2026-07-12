import 'server-only'

/**
 * TASK-1391 — Proposal Render Jobs: el command/reader gobernado del render de artefactos.
 *
 * EL ÚNICO camino para producir un artefacto productivo del composer. El flujo completo:
 *   requestProposalRender (valida TODO fail-closed y persiste el job inmutable)
 *     → dispatcher (ops-worker, prioridad deadline+aging) → jobs.run
 *     → artifact-worker (claim → verify manifest → composeArtifact → detectores → asset store)
 *     → markRenderJob{Running,Completed,Failed} (las transiciones viven acá, el worker las llama).
 *
 * Gates fail-closed AL ENCOLAR (no esperan al worker):
 *   1. AUDIENCE por referencia: un artefacto client_facing con UNA evidencia internal se
 *      rechaza completo (`assertEvidenceAllowedForAudience` sobre la proyección allowlisted).
 *   2. ACCESIBILIDAD: si el requisito-set la exige, se rechaza (`accessibility_unsupported`) —
 *      Chromium print-to-PDF no emite PDF/UA; mejor no ofertar que entregar inadmisible.
 *   3. DEADLINE vencido: no se encola (rendir para un proceso cerrado es quemar CPU).
 *   4. Manifest: shape v1 + hashes presentes; el hash canónico se computa acá (server), nunca
 *      se confía en un hash del caller.
 *
 * Idempotencia canónica: (ownerOrgId, proposalId, manifestHash, artifactPurpose) — UNIQUE en DB.
 * Re-solicitar devuelve el job existente; NUNCA un segundo asset final.
 */

import crypto from 'node:crypto'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import {
  ProposalInputError,
  ProposalNotFoundError,
  ProposalRenderRejectedError,
  ProposalRenderStateError
} from './errors'
import { assertEvidenceAllowedForAudience, buildProposalRenderProjection } from './render-projection'
import { extractRenderConstraints, type ProposalRenderConstraints } from './render-constraints'
import type { ProposalActor, ProposalAudience } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Flag (multi-runtime: Vercel enqueue · ops-worker dispatch · artifact-worker).
// SoT en Cloud Run = services/artifact-worker/deploy.sh. Ledger: FEATURE_FLAG_STATE_LEDGER.md
// ─────────────────────────────────────────────────────────────────────────────

export const isArtifactRenderJobsEnabled = (): boolean =>
  process.env.ARTIFACT_RENDER_JOBS_ENABLED === 'true'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type RenderJobState = 'queued' | 'dispatched' | 'running' | 'completed' | 'failed' | 'dead_letter'

export type RenderJobFailureCode =
  | 'audience_violation'
  | 'accessibility_unsupported'
  | 'semantic_rejected'
  | 'size_rejected'
  | 'geometry_rejected'
  | 'font_fallback_detected'
  | 'missing_asset'
  | 'blank_slide'
  | 'manifest_drift'
  | 'render_error'
  | 'timeout'
  | 'dispatch_error'

/** Códigos que NO se reintentan: el retry produciría exactamente el mismo rechazo. */
const NON_RETRYABLE_FAILURES: ReadonlySet<RenderJobFailureCode> = new Set([
  'audience_violation',
  'accessibility_unsupported',
  'semantic_rejected',
  'size_rejected',
  'geometry_rejected',
  'manifest_drift'
])

export interface RenderJobEvidenceRef {
  evidenceId: string
  audience: ProposalAudience
}

export interface ProposalRenderJobRecord {
  renderJobId: string
  ownerOrgId: string
  proposalId: string
  artifactPurpose: string
  audience: ProposalAudience
  catalogName: string
  outputTarget: string
  manifestHash: string
  evidenceRefs: RenderJobEvidenceRef[]
  constraints: ProposalRenderConstraints
  deadline: string | null
  state: RenderJobState
  failureCode: RenderJobFailureCode | null
  failureDetail: string | null
  attempts: number
  maxAttempts: number
  executionName: string | null
  outputPdfAssetId: string | null
  outputPreviewAssetIds: string[]
  createdAt: string
  updatedAt: string
}

const JOB_COLUMNS = `render_job_id, owner_org_id, proposal_id, artifact_purpose, audience,
  catalog_name, output_target, manifest_hash, evidence_refs, constraints,
  deadline::text AS deadline, state, failure_code, failure_detail, attempts, max_attempts,
  execution_name, output_pdf_asset_id, output_preview_asset_ids,
  created_at::text AS created_at, updated_at::text AS updated_at`

const mapJobRow = (row: Record<string, unknown>): ProposalRenderJobRecord => ({
  renderJobId: row.render_job_id as string,
  ownerOrgId: row.owner_org_id as string,
  proposalId: row.proposal_id as string,
  artifactPurpose: row.artifact_purpose as string,
  audience: row.audience as ProposalAudience,
  catalogName: row.catalog_name as string,
  outputTarget: row.output_target as string,
  manifestHash: row.manifest_hash as string,
  evidenceRefs: (row.evidence_refs ?? []) as RenderJobEvidenceRef[],
  constraints: row.constraints as ProposalRenderConstraints,
  deadline: (row.deadline as string | null) ?? null,
  state: row.state as RenderJobState,
  failureCode: (row.failure_code as RenderJobFailureCode | null) ?? null,
  failureDetail: (row.failure_detail as string | null) ?? null,
  attempts: Number(row.attempts),
  maxAttempts: Number(row.max_attempts),
  executionName: (row.execution_name as string | null) ?? null,
  outputPdfAssetId: (row.output_pdf_asset_id as string | null) ?? null,
  outputPreviewAssetIds: (row.output_preview_asset_ids ?? []) as string[],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string
})

/** Hash canónico del manifest: JSON.stringify determinista del objeto VERBATIM. */
export const hashResolvedManifest = (manifest: unknown): string =>
  crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex')

// ─────────────────────────────────────────────────────────────────────────────
// requestProposalRender — EL command (la confirmación humana del agente ejecuta esto mismo)
// ─────────────────────────────────────────────────────────────────────────────

export interface RequestProposalRenderInput {
  ownerOrgId: string
  proposalId: string
  /** Propósito semántico (parte de la clave de idempotencia): 'deck' | 'preview' | … */
  artifactPurpose: string
  audience: ProposalAudience
  /** ResolvedCompositionManifest producido por resolvePlan (verbatim). */
  manifest: {
    manifestVersion: number
    artifactId: string
    catalog: { name: string; version: string; registryHash: string; ownerOrgId: string }
    slides: Array<Record<string, unknown>>
    brandPack: { name: string; hash: string } | null
    fonts: Array<{ family: string; variant: string; checksum: string }> | null
    validators: Array<{ name: string; version: string; result: string; violations: string[] }>
    [key: string]: unknown
  }
  outputTarget: string
  /** Ids de evidencia que el artefacto CITA (el gate resuelve su audience real). */
  evidenceIds?: readonly string[]
  actor: ProposalActor
}

export const requestProposalRender = async (
  input: RequestProposalRenderInput
): Promise<{ job: ProposalRenderJobRecord; idempotent: boolean }> => {
  if (!isArtifactRenderJobsEnabled()) {
    throw new ProposalRenderRejectedError(
      'flag_disabled',
      'El pipeline de render está apagado (ARTIFACT_RENDER_JOBS_ENABLED). El CLI local sigue disponible.'
    )
  }

  const { manifest } = input

  // Gate 4 — shape del manifest (fail-closed sobre lo mínimo que hace reproducible un render).
  if (manifest.manifestVersion !== 1) {
    throw new ProposalInputError('El manifest debe ser manifestVersion 1 (producido por resolvePlan).')
  }

  if (!manifest.catalog?.registryHash || !Array.isArray(manifest.slides) || manifest.slides.length === 0) {
    throw new ProposalInputError('El manifest no trae catálogo sellado o láminas: no es un ResolvedCompositionManifest válido.')
  }

  const failedValidator = manifest.validators?.find(v => v.result !== 'pass')

  if (failedValidator) {
    throw new ProposalRenderRejectedError(
      'semantic_rejected',
      `El manifest trae el validador "${failedValidator.name}" en ${failedValidator.result}: un reporte fallido no se encola.`
    )
  }

  if (input.artifactPurpose.trim().length < 3) {
    throw new ProposalInputError('artifactPurpose es obligatorio (≥3 caracteres).')
  }

  // Un artefacto client_facing solo lo pide un member (lo exige también la DB).
  if (input.audience === 'client_facing' && input.actor.kind !== 'member') {
    throw new ProposalRenderRejectedError(
      'audience_violation',
      'Un artefacto client_facing solo puede solicitarlo una persona (actor member): el render hacia el comprador es una decisión humana.'
    )
  }

  // Proyección allowlisted del audience objetivo: valida org+proposal y trae evidencia/requisitos.
  const projection = await buildProposalRenderProjection({
    ownerOrgId: input.ownerOrgId,
    proposalId: input.proposalId,
    audience: input.audience
  })

  // Gate 1 — audience POR REFERENCIA (una sola evidencia internal rechaza el artefacto completo).
  const evidenceIds = [...(input.evidenceIds ?? [])]

  assertEvidenceAllowedForAudience(projection, evidenceIds, input.audience)

  const evidenceRefs: RenderJobEvidenceRef[] = evidenceIds.map(id => ({
    evidenceId: id,
    audience: projection.allowedEvidence.find(e => e.evidenceId === id)!.audience
  }))

  // Gate 2 — constraints del requisito-set, FIJADAS en el job.
  const constraints = extractRenderConstraints(projection.requirements)

  if (constraints.accessibilityRequired) {
    throw new ProposalRenderRejectedError(
      'accessibility_unsupported',
      'El requisito-set exige accesibilidad (PDF/UA · 508 · EAA) y este renderer emite PDF sin taguear: se rechaza para no producir un artefacto inadmisible.'
    )
  }

  // Gate 3 — deadline vencido no se encola.
  if (projection.deadline && new Date(projection.deadline).getTime() < Date.now()) {
    throw new ProposalRenderRejectedError(
      'deadline_expired',
      'El deadline de la propuesta ya venció: no se encola un render para un proceso cerrado.'
    )
  }

  const manifestHash = hashResolvedManifest(manifest)

  return withGreenhousePostgresTransaction(async client => {
    const proposal = await client.query(
      `SELECT 1 FROM greenhouse_commercial.proposals WHERE owner_org_id = $1 AND proposal_id = $2 FOR UPDATE`,
      [input.ownerOrgId, input.proposalId]
    )

    if (!proposal.rows[0]) {
      throw new ProposalNotFoundError(input.proposalId)
    }

    // Idempotencia: la clave canónica devuelve el job existente sin escribir nada.
    const existing = await client.query<Record<string, unknown>>(
      `SELECT ${JOB_COLUMNS} FROM greenhouse_commercial.proposal_render_jobs
        WHERE owner_org_id = $1 AND proposal_id = $2 AND manifest_hash = $3 AND artifact_purpose = $4`,
      [input.ownerOrgId, input.proposalId, manifestHash, input.artifactPurpose]
    )

    if (existing.rows[0]) {
      return { job: mapJobRow(existing.rows[0]), idempotent: true }
    }

    const inserted = await client.query<Record<string, unknown>>(
      `INSERT INTO greenhouse_commercial.proposal_render_jobs
         (owner_org_id, proposal_id, artifact_purpose, audience, catalog_name, output_target,
          manifest, manifest_hash, evidence_refs, constraints, deadline,
          requested_by_kind, requested_by_member_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING ${JOB_COLUMNS}`,
      [
        input.ownerOrgId,
        input.proposalId,
        input.artifactPurpose.trim(),
        input.audience,
        manifest.catalog.name,
        input.outputTarget,
        JSON.stringify(manifest),
        manifestHash,
        JSON.stringify(evidenceRefs),
        JSON.stringify(constraints),
        projection.deadline,
        input.actor.kind,
        input.actor.memberId ?? null
      ]
    )

    const job = mapJobRow(inserted.rows[0]!)

    await client.query(
      `INSERT INTO greenhouse_commercial.proposal_render_job_events
         (render_job_id, owner_org_id, from_state, to_state, detail, actor_kind, actor_member_id)
       VALUES ($1, $2, NULL, 'queued', $3, $4, $5)`,
      [
        job.renderJobId,
        input.ownerOrgId,
        JSON.stringify({ manifestHash, artifactPurpose: job.artifactPurpose, audience: job.audience }),
        input.actor.kind,
        input.actor.memberId ?? null
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.proposal,
        aggregateId: input.proposalId,
        eventType: EVENT_TYPES.proposalRenderRequested,
        payload: {
          version: 1,
          renderJobId: job.renderJobId,
          proposalId: input.proposalId,
          ownerOrgId: input.ownerOrgId,
          artifactPurpose: job.artifactPurpose,
          audience: job.audience,
          catalogName: job.catalogName,
          manifestHash,
          deadline: job.deadline,
          actorKind: input.actor.kind
        }
      },
      client
    )

    return { job, idempotent: false }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// retryProposalRenderJob — reintento humano/operativo del MISMO snapshot
// ─────────────────────────────────────────────────────────────────────────────

export const retryProposalRenderJob = async (input: {
  ownerOrgId: string
  renderJobId: string
  actor: ProposalActor
}): Promise<{ job: ProposalRenderJobRecord }> => {
  return withGreenhousePostgresTransaction(async client => {
    const rows = await client.query<Record<string, unknown>>(
      `SELECT ${JOB_COLUMNS} FROM greenhouse_commercial.proposal_render_jobs
        WHERE owner_org_id = $1 AND render_job_id = $2 FOR UPDATE`,
      [input.ownerOrgId, input.renderJobId]
    )

    if (!rows.rows[0]) {
      throw new ProposalNotFoundError(input.renderJobId)
    }

    const job = mapJobRow(rows.rows[0])

    if (job.state !== 'failed' && job.state !== 'dead_letter') {
      throw new ProposalRenderStateError(`Solo un job failed/dead_letter se reintenta (estado actual: ${job.state}).`)
    }

    if (job.failureCode && NON_RETRYABLE_FAILURES.has(job.failureCode)) {
      throw new ProposalRenderStateError(
        `El fallo "${job.failureCode}" no es reintentable: el mismo manifest produciría el mismo rechazo. Corrige el plan/evidencia y solicita un render nuevo.`
      )
    }

    const updated = await client.query<Record<string, unknown>>(
      `UPDATE greenhouse_commercial.proposal_render_jobs
          SET state = 'queued', failure_code = NULL, failure_detail = NULL,
              dispatched_at = NULL, started_at = NULL, finished_at = NULL, execution_name = NULL
        WHERE render_job_id = $1
        RETURNING ${JOB_COLUMNS}`,
      [job.renderJobId]
    )

    await client.query(
      `INSERT INTO greenhouse_commercial.proposal_render_job_events
         (render_job_id, owner_org_id, from_state, to_state, detail, actor_kind, actor_member_id)
       VALUES ($1, $2, $3, 'queued', $4, $5, $6)`,
      [
        job.renderJobId,
        input.ownerOrgId,
        job.state,
        JSON.stringify({ retry: true, attempts: job.attempts }),
        input.actor.kind,
        input.actor.memberId ?? null
      ]
    )

    return { job: mapJobRow(updated.rows[0]!) }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Transiciones del worker/dispatcher (el worker las LLAMA; la lógica vive acá)
// ─────────────────────────────────────────────────────────────────────────────

const transitionJob = async (input: {
  renderJobId: string
  expectFromStates: RenderJobState[]
  toState: RenderJobState
  set: string
  params: unknown[]
  actorKind: 'worker' | 'dispatcher'
  detail: Record<string, unknown>
}): Promise<ProposalRenderJobRecord> => {
  return withGreenhousePostgresTransaction(async client => {
    const rows = await client.query<Record<string, unknown>>(
      `SELECT ${JOB_COLUMNS} FROM greenhouse_commercial.proposal_render_jobs
        WHERE render_job_id = $1 FOR UPDATE`,
      [input.renderJobId]
    )

    if (!rows.rows[0]) throw new ProposalNotFoundError(input.renderJobId)

    const job = mapJobRow(rows.rows[0])

    if (!input.expectFromStates.includes(job.state)) {
      throw new ProposalRenderStateError(
        `Transición inválida: ${job.state} → ${input.toState} (esperaba ${input.expectFromStates.join('|')}).`
      )
    }

    const updated = await client.query<Record<string, unknown>>(
      `UPDATE greenhouse_commercial.proposal_render_jobs
          SET state = $2, ${input.set}
        WHERE render_job_id = $1
        RETURNING ${JOB_COLUMNS}`,
      [input.renderJobId, input.toState, ...input.params]
    )

    await client.query(
      `INSERT INTO greenhouse_commercial.proposal_render_job_events
         (render_job_id, owner_org_id, from_state, to_state, detail, actor_kind)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [input.renderJobId, job.ownerOrgId, job.state, input.toState, JSON.stringify(input.detail), input.actorKind]
    )

    const mapped = mapJobRow(updated.rows[0]!)

    if (input.toState === 'completed' || input.toState === 'failed' || input.toState === 'dead_letter') {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.proposal,
          aggregateId: job.proposalId,
          eventType:
            input.toState === 'completed' ? EVENT_TYPES.proposalRenderCompleted : EVENT_TYPES.proposalRenderFailed,
          payload: {
            version: 1,
            renderJobId: job.renderJobId,
            proposalId: job.proposalId,
            ownerOrgId: job.ownerOrgId,
            state: input.toState,
            failureCode: (input.detail.failureCode as string | undefined) ?? null,
            attempts: mapped.attempts,
            artifactPurpose: job.artifactPurpose,
            audience: job.audience
          }
        },
        client
      )
    }

    return mapped
  })
}

export const markRenderJobDispatched = (renderJobId: string, executionName: string) =>
  transitionJob({
    renderJobId,
    expectFromStates: ['queued'],
    toState: 'dispatched',
    set: `dispatched_at = now(), execution_name = $3, attempts = attempts + 1`,
    params: [executionName],
    actorKind: 'dispatcher',
    detail: { executionName }
  })

export const markRenderJobRunning = (renderJobId: string) =>
  transitionJob({
    renderJobId,
    // 'queued' incluido: una ejecución manual (smoke/CLI) puede correr sin dispatcher.
    expectFromStates: ['queued', 'dispatched'],
    toState: 'running',
    set: `started_at = now(), attempts = CASE WHEN dispatched_at IS NULL THEN attempts + 1 ELSE attempts END`,
    params: [],
    actorKind: 'worker',
    detail: {}
  })

export const markRenderJobCompleted = (input: {
  renderJobId: string
  outputPdfAssetId: string | null
  outputPreviewAssetIds: string[]
  outputReport: Record<string, unknown>
}) =>
  transitionJob({
    renderJobId: input.renderJobId,
    expectFromStates: ['running'],
    toState: 'completed',
    set: `finished_at = now(), output_pdf_asset_id = $3, output_preview_asset_ids = $4, output_report = $5`,
    params: [input.outputPdfAssetId, JSON.stringify(input.outputPreviewAssetIds), JSON.stringify(input.outputReport)],
    actorKind: 'worker',
    detail: { outputPdfAssetId: input.outputPdfAssetId, previews: input.outputPreviewAssetIds.length }
  })

export const markRenderJobFailed = async (input: {
  renderJobId: string
  failureCode: RenderJobFailureCode
  failureDetail: string
}): Promise<ProposalRenderJobRecord> => {
  // dead_letter cuando se agotaron los intentos O el fallo no es reintentable.
  const current = await runGreenhousePostgresQuery<{ attempts: number; max_attempts: number }>(
    `SELECT attempts, max_attempts FROM greenhouse_commercial.proposal_render_jobs WHERE render_job_id = $1`,
    [input.renderJobId]
  )

  const exhausted = current[0] ? Number(current[0].attempts) >= Number(current[0].max_attempts) : false
  const terminal = exhausted || NON_RETRYABLE_FAILURES.has(input.failureCode)

  return transitionJob({
    renderJobId: input.renderJobId,
    expectFromStates: ['queued', 'dispatched', 'running'],
    toState: terminal ? 'dead_letter' : 'failed',
    set: `finished_at = now(), failure_code = $3, failure_detail = $4`,
    params: [input.failureCode, input.failureDetail.slice(0, 2000)],
    actorKind: 'worker',
    detail: { failureCode: input.failureCode, terminal }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Readers (org-scoped SIEMPRE)
// ─────────────────────────────────────────────────────────────────────────────

export const getProposalRenderJob = async (input: {
  ownerOrgId: string
  renderJobId: string
}): Promise<ProposalRenderJobRecord | null> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT ${JOB_COLUMNS} FROM greenhouse_commercial.proposal_render_jobs
      WHERE owner_org_id = $1 AND render_job_id = $2`,
    [input.ownerOrgId, input.renderJobId]
  )

  return rows[0] ? mapJobRow(rows[0]) : null
}

/** El manifest completo NO viaja en el record de lista; el worker lo pide explícito. */
export const getRenderJobManifest = async (renderJobId: string): Promise<Record<string, unknown> | null> => {
  const rows = await runGreenhousePostgresQuery<{ manifest: Record<string, unknown> }>(
    `SELECT manifest FROM greenhouse_commercial.proposal_render_jobs WHERE render_job_id = $1`,
    [renderJobId]
  )

  return rows[0]?.manifest ?? null
}

export const listProposalRenderJobs = async (input: {
  ownerOrgId: string
  proposalId?: string
  state?: RenderJobState
  limit?: number
}): Promise<ProposalRenderJobRecord[]> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT ${JOB_COLUMNS} FROM greenhouse_commercial.proposal_render_jobs
      WHERE owner_org_id = $1
        AND ($2::text IS NULL OR proposal_id = $2)
        AND ($3::text IS NULL OR state = $3)
      ORDER BY created_at DESC
      LIMIT $4`,
    [input.ownerOrgId, input.proposalId ?? null, input.state ?? null, Math.min(input.limit ?? 50, 200)]
  )

  return rows.map(mapJobRow)
}

// ─────────────────────────────────────────────────────────────────────────────
// Selección del dispatcher — prioridad por deadline + AGING (Slice 2b la consume)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve el próximo job a despachar. Reglas (Slice 0 · decisión 6):
 *   - deadline vencido NO compite (se excluye; el dispatcher lo loguea y lo marca fallido).
 *   - prioridad = deadline más próximo primero; los sin-deadline compiten por AGING:
 *     tras `agingMinutes` en cola, un job sin deadline alcanza prioridad de despacho
 *     (prioridad sin aging es hambruna con otro nombre).
 *   - empate → FIFO por created_at.
 */
export const selectNextRenderJobForDispatch = async (input?: {
  agingMinutes?: number
}): Promise<ProposalRenderJobRecord | null> => {
  const agingMinutes = input?.agingMinutes ?? 30

  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT ${JOB_COLUMNS} FROM greenhouse_commercial.proposal_render_jobs
      WHERE state = 'queued'
        AND (deadline IS NULL OR deadline > now())
      ORDER BY
        -- deadline real primero; un job sin deadline "envejece" hasta competir
        LEAST(
          COALESCE(deadline, 'infinity'::timestamptz),
          created_at + make_interval(mins => $1)
        ) ASC,
        created_at ASC
      LIMIT 1`,
    [agingMinutes]
  )

  return rows[0] ? mapJobRow(rows[0]) : null
}

/** Jobs en cola con deadline ya vencido: no compiten; el dispatcher los cierra con detalle. */
export const listExpiredQueuedRenderJobs = async (): Promise<ProposalRenderJobRecord[]> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT ${JOB_COLUMNS} FROM greenhouse_commercial.proposal_render_jobs
      WHERE state = 'queued' AND deadline IS NOT NULL AND deadline <= now()`,
    []
  )

  return rows.map(mapJobRow)
}
