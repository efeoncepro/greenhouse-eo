import 'server-only'

/**
 * TASK-1399 — El READ MODEL DEL DÍA A DÍA del Proposal Studio.
 *
 * Existía la proyección de render (`render-projection.ts`) y existían los readers atómicos
 * (`listProposals`, `listProposalRenderJobs`), pero NO existía la vista que un operador necesita
 * para trabajar: *"¿cómo van mis propuestas y dónde está el PDF?"*. Sin esto, ver el estado exigía
 * abrir el repo y correr SQL — el sistema estaba completo y sin ventana.
 *
 * ⚠️ Este reader NO reemplaza `buildProposalRenderProjection`: aquélla es el contrato ALLOWLISTED
 * que consume el renderer (filtra por audience, jamás expone storage). Ésta es la vista OPERATIVA
 * interna (quien la lee ya tiene `commercial.proposal.read` sobre la org). Aun así:
 *   · NUNCA expone contenido de evidencia ni del RFP — sólo conteos y metadata;
 *   · NUNCA expone URLs de bucket — sólo el path canónico `/api/assets/private/<id>`, que
 *     re-autoriza en cada descarga (`canTenantAccessAsset` → `canAccessProposalDocument`).
 *
 * Todo org-scoped: `owner_org_id` es NOT NULL en el aggregate y en TODOS sus hijos.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { buildPrivateAssetDownloadUrl } from '@/lib/storage/greenhouse-assets'

import type { ProposalAudience, ProposalOrigin } from './types'
import type { RenderJobFailureCode, RenderJobState } from './render-jobs'

/** El semáforo del deadline — la señal que decide qué mirar primero. */
export type ProposalDeadlineRisk = 'none' | 'ok' | 'at_risk' | 'expired'

export interface ProposalOperatorArtifact {
  renderJobId: string
  artifactPurpose: string
  audience: ProposalAudience
  state: RenderJobState
  failureCode: RenderJobFailureCode | null
  /** Path canónico de descarga (re-autoriza en cada acceso). `null` mientras no haya PDF. */
  downloadUrl: string | null
  previewCount: number
  createdAt: string
}

export interface ProposalOperatorRow {
  proposalId: string
  ownerOrgId: string
  title: string
  origin: ProposalOrigin
  state: string
  deadline: string | null
  deadlineConfidence: string
  /** Derivado del deadline: `expired` | `at_risk` (<72 h) | `ok` | `none` (sin deadline). */
  deadlineRisk: ProposalDeadlineRisk
  /** Conteos — NUNCA el contenido. */
  counts: {
    assets: number
    evidence: number
    requirements: number
  }
  /** El artefacto más reciente (el que el operador quiere bajar), o null si nunca se rindió. */
  latestArtifact: ProposalOperatorArtifact | null
  /** Cuántos render jobs están vivos (queued/dispatched/running) — "se está generando". */
  renderJobsInFlight: number
  /** Jobs que necesitan una persona (failed/dead_letter). */
  renderJobsNeedingAttention: number
  updatedAt: string
}

const AT_RISK_HOURS = 72

const resolveDeadlineRisk = (deadline: string | null): ProposalDeadlineRisk => {
  if (!deadline) return 'none'

  const ms = new Date(deadline).getTime() - Date.now()

  if (ms <= 0) return 'expired'

  return ms <= AT_RISK_HOURS * 3600 * 1000 ? 'at_risk' : 'ok'
}

/**
 * La bandeja del operador: propuestas activas primero, ordenadas por urgencia REAL
 * (deadline más próximo arriba; las sin deadline al final), con lo que hace falta para actuar.
 */
export const listProposalsForOperator = async (input: {
  ownerOrgId: string
  /** `false` (default) esconde las terminales (won/lost/declined). */
  includeClosed?: boolean
  limit?: number
}): Promise<ProposalOperatorRow[]> => {
  const limit = Math.min(input.limit ?? 25, 100)

  const rows = await runGreenhousePostgresQuery<{
    proposal_id: string
    owner_org_id: string
    title: string
    origin: ProposalOrigin
    state: string
    deadline: string | null
    deadline_confidence: string
    assets_count: string
    evidence_count: string
    requirements_count: string
    jobs_in_flight: string
    jobs_needing_attention: string
    updated_at: string
    latest_job_id: string | null
    latest_job_purpose: string | null
    latest_job_audience: ProposalAudience | null
    latest_job_state: RenderJobState | null
    latest_job_failure: RenderJobFailureCode | null
    latest_job_pdf_asset: string | null
    latest_job_previews: number | null
    latest_job_created_at: string | null
  }>(
    `SELECT p.proposal_id,
            p.owner_org_id,
            p.title,
            p.origin,
            p.state,
            p.deadline::text AS deadline,
            p.deadline_confidence,
            p.updated_at::text AS updated_at,
            (SELECT count(*) FROM greenhouse_commercial.proposal_assets a
              WHERE a.owner_org_id = p.owner_org_id AND a.proposal_id = p.proposal_id)::text AS assets_count,
            (SELECT count(*) FROM greenhouse_commercial.proposal_evidence e
              WHERE e.owner_org_id = p.owner_org_id AND e.proposal_id = p.proposal_id)::text AS evidence_count,
            (SELECT count(*) FROM greenhouse_commercial.proposal_requirements r
              WHERE r.owner_org_id = p.owner_org_id AND r.proposal_id = p.proposal_id)::text AS requirements_count,
            (SELECT count(*) FROM greenhouse_commercial.proposal_render_jobs j
              WHERE j.owner_org_id = p.owner_org_id AND j.proposal_id = p.proposal_id
                AND j.state IN ('queued', 'dispatched', 'running'))::text AS jobs_in_flight,
            (SELECT count(*) FROM greenhouse_commercial.proposal_render_jobs j
              WHERE j.owner_org_id = p.owner_org_id AND j.proposal_id = p.proposal_id
                AND j.state IN ('failed', 'dead_letter'))::text AS jobs_needing_attention,
            latest.render_job_id AS latest_job_id,
            latest.artifact_purpose AS latest_job_purpose,
            latest.audience AS latest_job_audience,
            latest.state AS latest_job_state,
            latest.failure_code AS latest_job_failure,
            latest.output_pdf_asset_id AS latest_job_pdf_asset,
            latest.previews AS latest_job_previews,
            latest.created_at::text AS latest_job_created_at
       FROM greenhouse_commercial.proposals p
       LEFT JOIN LATERAL (
         SELECT j.render_job_id, j.artifact_purpose, j.audience, j.state, j.failure_code,
                j.output_pdf_asset_id, jsonb_array_length(j.output_preview_asset_ids) AS previews,
                j.created_at
           FROM greenhouse_commercial.proposal_render_jobs j
          WHERE j.owner_org_id = p.owner_org_id AND j.proposal_id = p.proposal_id
          ORDER BY j.created_at DESC
          LIMIT 1
       ) latest ON true
      WHERE p.owner_org_id = $1
        AND ($2::boolean OR p.state NOT IN ('won', 'lost', 'declined'))
      ORDER BY
        -- Urgencia real: deadline más próximo primero; las sin deadline, al final.
        COALESCE(p.deadline, 'infinity'::timestamptz) ASC,
        p.updated_at DESC
      LIMIT $3`,
    [input.ownerOrgId, input.includeClosed ?? false, limit]
  )

  return rows.map(row => ({
    proposalId: row.proposal_id,
    ownerOrgId: row.owner_org_id,
    title: row.title,
    origin: row.origin,
    state: row.state,
    deadline: row.deadline,
    deadlineConfidence: row.deadline_confidence,
    deadlineRisk: resolveDeadlineRisk(row.deadline),
    counts: {
      assets: Number(row.assets_count),
      evidence: Number(row.evidence_count),
      requirements: Number(row.requirements_count)
    },
    latestArtifact: row.latest_job_id
      ? {
          renderJobId: row.latest_job_id,
          artifactPurpose: row.latest_job_purpose!,
          audience: row.latest_job_audience!,
          state: row.latest_job_state!,
          failureCode: row.latest_job_failure,
          // El link sólo existe si el render COMPLETÓ y produjo el PDF.
          downloadUrl: row.latest_job_pdf_asset ? buildPrivateAssetDownloadUrl(row.latest_job_pdf_asset) : null,
          previewCount: Number(row.latest_job_previews ?? 0),
          createdAt: row.latest_job_created_at!
        }
      : null,
    renderJobsInFlight: Number(row.jobs_in_flight),
    renderJobsNeedingAttention: Number(row.jobs_needing_attention),
    updatedAt: row.updated_at
  }))
}

/** Una sola propuesta con la misma forma (para "¿cómo va la de SKY?"). */
export const getProposalForOperator = async (input: {
  ownerOrgId: string
  proposalId: string
}): Promise<ProposalOperatorRow | null> => {
  const rows = await listProposalsForOperator({ ownerOrgId: input.ownerOrgId, includeClosed: true, limit: 100 })

  return rows.find(row => row.proposalId === input.proposalId) ?? null
}
