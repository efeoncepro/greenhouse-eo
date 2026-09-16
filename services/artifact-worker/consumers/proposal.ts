/**
 * TASK-1846 Slice 1 — adapter de Proposal sobre el contrato de consumer.
 *
 * Preserva el comportamiento EXACTO de TASK-1391: delega en los mismos commands del dominio y no
 * cambia su máquina de estados, su clave de idempotencia ni sus outputs. Lo único que cambia es
 * QUIÉN lo invoca (el registry en vez de `main.ts` hardcodeado).
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'
import { attachProposalAsset } from '@/lib/commercial/tenders/proposals/assets'
import {
  claimNextRenderJobForExecution,
  getProposalRenderJob,
  getRenderJobManifest,
  isArtifactRenderJobsEnabled,
  markRenderJobCompleted,
  markRenderJobFailed,
  markRenderJobRunning,
  type ProposalRenderJobRecord,
  type RenderJobFailureCode
} from '@/lib/commercial/tenders/proposals/render-jobs'
import { hashResolvedManifest } from '@/lib/artifact-composer/manifest-hash'
import { storeSystemGeneratedPrivateAsset } from '@/lib/storage/greenhouse-assets'

import type { RenderConsumer, RenderJobView, RenderedArtifact } from '../consumer-contract'

// uploaded_by_user_id es FK nullable a users: un Job no tiene usuario (precedente: quote-pdf-asset).
const WORKER_ACTOR_USER = null

const CATALOGS = new Map([[deckAxisCatalog.name, deckAxisCatalog]])

/**
 * El adapter retiene el record completo del job reclamado. Es seguro porque una ejecución del
 * Cloud Run Job procesa EXACTAMENTE un artefacto (`tasks=1`, `parallelism=1`): no hay dos jobs
 * vivos en el mismo proceso.
 */
export const createProposalConsumer = (): RenderConsumer => {
  let claimed: ProposalRenderJobRecord | null = null

  const toView = (job: ProposalRenderJobRecord): RenderJobView => {
    claimed = job

    return {
      jobId: job.renderJobId,
      ownerOrgId: job.ownerOrgId,
      catalogName: job.catalogName,
      manifestHash: job.manifestHash,
      artifactId: job.proposalId,
      outputTarget: job.outputTarget,
      constraints: (job.constraints as unknown as Record<string, unknown> | null) ?? null
    }
  }

  const requireClaimed = (): ProposalRenderJobRecord => {
    if (!claimed) throw new Error('Consumer proposal: no hay job reclamado en este proceso.')

    return claimed
  }

  return {
    key: 'proposal',
    observabilityDomain: 'commercial',

    isEnabled: () => isArtifactRenderJobsEnabled(),

    claimNext: async () => {
      const job = await claimNextRenderJobForExecution()

      return job ? toView(job) : null
    },

    claimById: async jobId => {
      const running = await markRenderJobRunning(jobId)
      const job = await getProposalRenderJob({ ownerOrgId: running.ownerOrgId, renderJobId: jobId })

      return job ? toView(job) : null
    },

    getManifest: jobId => getRenderJobManifest(jobId),

    getCatalog: name => CATALOGS.get(name) ?? null,

    // Sin cambios respecto de TASK-1391: el manifest RESUELTO debe ser byte a byte el encolado.
    verifyEmittedManifest: (view, emitted) => {
      const emittedHash = hashResolvedManifest(emitted)

      if (emittedHash === view.manifestHash) return null

      return `El manifest re-resuelto (${emittedHash.slice(0, 12)}…) difiere del encolado (${view.manifestHash.slice(0, 12)}…): el catálogo cambió desde el enqueue.`
    },

    storeOutputs: async (view, rendered: RenderedArtifact) => {
      const job = requireClaimed()
      let primaryAssetId: string | null = null

      if (rendered.pdfPath) {
        const stored = await storeSystemGeneratedPrivateAsset({
          ownerAggregateType: 'proposal_deliverable',
          ownerAggregateId: job.proposalId,
          fileName: path.basename(rendered.pdfPath),
          mimeType: 'application/pdf',
          bytes: await fs.readFile(rendered.pdfPath),
          actorUserId: WORKER_ACTOR_USER,
          metadata: {
            renderJobId: job.renderJobId,
            manifestHash: job.manifestHash,
            artifactPurpose: job.artifactPurpose,
            audience: job.audience
          }
        })

        primaryAssetId = stored.assetId

        await attachProposalAsset({
          ownerOrgId: job.ownerOrgId,
          proposalId: job.proposalId,
          assetId: stored.assetId,
          kind: 'deck',
          audience: job.audience,
          actorUserId: 'system:artifact-worker',
          actor: { kind: 'system' }
        })
      }

      const previewAssetIds: string[] = []

      for (const slidePath of rendered.slidePaths) {
        const preview = await storeSystemGeneratedPrivateAsset({
          ownerAggregateType: 'proposal_deliverable',
          ownerAggregateId: job.proposalId,
          fileName: path.basename(slidePath),
          mimeType: 'image/png',
          bytes: await fs.readFile(slidePath),
          actorUserId: WORKER_ACTOR_USER,
          metadata: { renderJobId: job.renderJobId, kind: 'preview' }
        })

        previewAssetIds.push(preview.assetId)
      }

      return { primaryAssetId, previewAssetIds }
    },

    markCompleted: async (view, input) => {
      const job = requireClaimed()

      await markRenderJobCompleted({
        renderJobId: job.renderJobId,
        outputPdfAssetId: input.primaryAssetId,
        outputPreviewAssetIds: input.previewAssetIds,
        outputReport: input.report
      })
    },

    markFailed: async (view, input) => {
      await markRenderJobFailed({
        renderJobId: view.jobId,
        failureCode: input.failureCode as RenderJobFailureCode,
        failureDetail: input.failureDetail
      })
    }
  }
}
