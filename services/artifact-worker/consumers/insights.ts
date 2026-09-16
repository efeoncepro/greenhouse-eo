/**
 * TASK-1846 Slice 1 — adapter de Efeonce Insights sobre el contrato de consumer.
 *
 * La unidad reclamable es el OUTPUT (un target de una edición), no el run: fallar `report_pdf`
 * conserva `deck_pdf` exitoso y el retry no repite los exitosos.
 *
 * Boundary: este adapter NO calcula métricas ni toca los módulos productores. Recibe un manifest
 * sellado, lo verifica y persiste bytes. Las métricas viven en su dueño (arquitectura §3).
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'
import {
  claimNextInsightOutputForExecution,
  getInsightOutputManifest,
  isInsightsRenderEnabled,
  markInsightOutputCompleted,
  markInsightOutputFailed
} from '@/lib/efeonce-insights/render/store'
import type { InsightOutputRecord, InsightRenderFailureCode } from '@/lib/efeonce-insights/render/contracts'
import { storeSystemGeneratedPrivateAsset } from '@/lib/storage/greenhouse-assets'

import type { RenderConsumer, RenderJobView, RenderedArtifact } from '../consumer-contract'

const WORKER_ACTOR_USER = null

// Hoy sólo el catálogo deck. El catálogo A4 del informe vertical llega con TASK-1847; hasta
// entonces un output `report_pdf` encolado con otro catálogo falla como manifest_drift, que es la
// respuesta honesta (el worker no improvisa un catálogo que no tiene empaquetado).
const CATALOGS = new Map([[deckAxisCatalog.name, deckAxisCatalog]])

export const createInsightsConsumer = (): RenderConsumer => {
  let claimed: InsightOutputRecord | null = null

  const toView = (record: InsightOutputRecord): RenderJobView => {
    claimed = record

    return {
      jobId: record.insightOutputId,
      ownerOrgId: record.organizationId,
      catalogName: record.catalogName,
      manifestHash: record.manifestHash,
      artifactId: record.editionId,
      outputTarget: record.output,
      constraints: record.constraints
    }
  }

  const requireClaimed = (): InsightOutputRecord => {
    if (!claimed) throw new Error('Consumer insights: no hay output reclamado en este proceso.')

    return claimed
  }

  return {
    key: 'insights',
    observabilityDomain: 'insights',

    isEnabled: () => isInsightsRenderEnabled(),

    claimNext: async () => {
      const record = await claimNextInsightOutputForExecution()

      return record ? toView(record) : null
    },

    // El replay dirigido de un output llega con el retry gobernado del Slice 3; hoy el worker sólo
    // opera por claim. Devolver null es honesto: no hay camino, no se finge uno.
    claimById: async () => null,

    getManifest: jobId => getInsightOutputManifest(jobId),

    getCatalog: name => CATALOGS.get(name) ?? null,

    storeOutputs: async (view, rendered: RenderedArtifact) => {
      const record = requireClaimed()
      let primaryAssetId: string | null = null

      if (rendered.pdfPath) {
        const stored = await storeSystemGeneratedPrivateAsset({
          ownerAggregateType: 'insight_output',
          // El asset cuelga de la EDICIÓN, nunca de una propuesta: son dominios distintos y su
          // historial no se mezcla.
          ownerAggregateId: record.editionId,
          fileName: path.basename(rendered.pdfPath),
          mimeType: 'application/pdf',
          bytes: await fs.readFile(rendered.pdfPath),
          actorUserId: WORKER_ACTOR_USER,
          metadata: {
            insightOutputId: record.insightOutputId,
            renderRunId: record.renderRunId,
            manifestHash: record.manifestHash,
            output: record.output,
            audience: record.audience
          }
        })

        primaryAssetId = stored.assetId
      }

      const previewAssetIds: string[] = []

      for (const slidePath of rendered.slidePaths) {
        const preview = await storeSystemGeneratedPrivateAsset({
          ownerAggregateType: 'insight_output',
          ownerAggregateId: record.editionId,
          fileName: path.basename(slidePath),
          mimeType: 'image/png',
          bytes: await fs.readFile(slidePath),
          actorUserId: WORKER_ACTOR_USER,
          metadata: { insightOutputId: record.insightOutputId, kind: 'preview' }
        })

        previewAssetIds.push(preview.assetId)
      }

      return { primaryAssetId, previewAssetIds }
    },

    markCompleted: async (view, input) => {
      // El CHECK de la tabla exige asset en `completed`: un output "completo" sin bytes es
      // justamente lo que el puerto de outputs no puede aceptar para emitir.
      if (!input.primaryAssetId) {
        await markInsightOutputFailed({
          insightOutputId: view.jobId,
          failureCode: 'render_error',
          failureDetail: 'El render terminó sin producir el archivo principal del output.'
        })

        return
      }

      await markInsightOutputCompleted({
        insightOutputId: view.jobId,
        outputAssetId: input.primaryAssetId,
        outputReport: { ...input.report, previewAssetIds: input.previewAssetIds }
      })
    },

    markFailed: async (view, input) => {
      await markInsightOutputFailed({
        insightOutputId: view.jobId,
        failureCode: input.failureCode as InsightRenderFailureCode,
        failureDetail: input.failureDetail
      })
    }
  }
}
