/**
 * artifact-worker — Cloud Run JOB de render de artefactos (TASK-1391 Slice 2).
 *
 * PRIMER Cloud Run Job del ecosistema (frontera autorizada 2026-07-12 por excepción documentada
 * de EPIC-027). Una ejecución = UN artefacto (`tasks=1`, `parallelism=1`). No expone HTTP: lo
 * invoca el dispatcher autenticado vía Jobs API con `RENDER_JOB_ID` en el override de env.
 *
 * Contrato duro:
 *   - SOLO ejecuta filas de `proposal_render_jobs` (manifest inmutable, hash sellado).
 *   - Re-resuelve el manifest contra SU copia del catálogo y compara byte a byte con el hash del
 *     job: cualquier drift (plantilla/contrato/brand pack distinto al encolado) = `manifest_drift`,
 *     NO se renderiza.
 *   - Los gates de publicación (geometría + missing_asset + font_fallback + blank_slide + filler
 *     fail-closed) viven DENTRO de composeArtifact/renderSlide — acá solo se mapean a failure_code.
 *   - Peso/páginas contra las constraints FIJADAS en el job (nunca un default re-leído).
 *   - Outputs → asset store canónico privado (context proposal_deliverable) + vínculo semántico
 *     proposal_assets + estado/outbox vía los primitives del dominio. Nada de SQL propio.
 *
 * Runtime: tsx sobre el árbol fuente (SIN bundle) — todos los paths module-relative del catálogo
 * (templates/fonts/assets/brand pack) resuelven idéntico al CLI local probado. Decisión Slice 2:
 * elimina la bug class de reubicación de assets al bundlear; el costo es imagen más grande.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { initSentryForService } from '../_shared/sentry-init'

initSentryForService('artifact-worker')

import { composeArtifact } from '@/lib/artifact-composer'
import { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'
import { SlideQualityError } from '@/lib/artifact-composer/quality-gates'
import { SlideGeometryError, SlotFillError } from '@/lib/artifact-composer/render'
import { attachProposalAsset } from '@/lib/commercial/tenders/proposals/assets'
import {
  claimNextRenderJobForExecution,
  getProposalRenderJob,
  getRenderJobManifest,
  hashResolvedManifest,
  isArtifactRenderJobsEnabled,
  markRenderJobCompleted,
  markRenderJobFailed,
  markRenderJobRunning,
  type ProposalRenderJobRecord,
  type RenderJobFailureCode
} from '@/lib/commercial/tenders/proposals/render-jobs'
import { storeSystemGeneratedPrivateAsset } from '@/lib/storage/greenhouse-assets'
import { captureWithDomain } from '@/lib/observability/capture'

const CATALOGS = new Map([[deckAxisCatalog.name, deckAxisCatalog]])

// uploaded_by_user_id es FK nullable a users: un Job no tiene usuario — null (precedente:
// quote-pdf-asset). El vínculo semántico con el job vive en metadata.renderJobId.
const WORKER_ACTOR_USER = null

const log = (msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ svc: 'artifact-worker', msg, ...extra }))

const classifyFailure = (error: unknown): { code: RenderJobFailureCode; detail: string } => {
  if (error instanceof SlideQualityError) {
    return { code: error.code, detail: error.message }
  }

  if (error instanceof SlideGeometryError) {
    return { code: 'geometry_rejected', detail: error.message }
  }

  if (error instanceof SlotFillError) {
    // 1ª bug class (copy del prototipo): el filler aborta — no es reintentable con el mismo plan.
    return { code: 'semantic_rejected', detail: error.message }
  }

  return { code: 'render_error', detail: error instanceof Error ? error.message : String(error) }
}

const renderJob = async (job: ProposalRenderJobRecord): Promise<void> => {
  const startedAt = Date.now()
  const catalog = CATALOGS.get(job.catalogName)

  if (!catalog) {
    await markRenderJobFailed({
      renderJobId: job.renderJobId,
      failureCode: 'manifest_drift',
      failureDetail: `El catálogo "${job.catalogName}" no está empaquetado en este worker.`
    })

    return
  }

  const manifest = await getRenderJobManifest(job.renderJobId)

  if (!manifest) {
    await markRenderJobFailed({
      renderJobId: job.renderJobId,
      failureCode: 'render_error',
      failureDetail: 'El job no tiene manifest persistido.'
    })

    return
  }

  const input = manifest.input as { artifactId: string; slides: Array<Record<string, unknown>> }
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'artifact-'))

  try {
    // composeArtifact re-resuelve el manifest contra la copia LOCAL del catálogo (selector,
    // hashes de template/contrato/brand pack/fuentes, validadores) y lo emite junto al PDF.
    const result = await composeArtifact(
      catalog,
      { tenderId: input.artifactId, slides: input.slides as never },
      outDir,
      { maxPdfMb: (job.constraints?.maxPdfMb as number | undefined) ?? 20 }
    )

    // DRIFT CHECK: el manifest re-resuelto DEBE ser byte a byte el encolado. Si una plantilla,
    // contrato o brand pack cambió desde el enqueue, el artefacto sería OTRO — no se publica.
    const emittedManifest = JSON.parse(
      await fs.readFile(path.join(outDir, `${input.artifactId}.manifest.json`), 'utf8')
    ) as Record<string, unknown>

    const emittedHash = hashResolvedManifest(emittedManifest)

    if (emittedHash !== job.manifestHash) {
      await markRenderJobFailed({
        renderJobId: job.renderJobId,
        failureCode: 'manifest_drift',
        failureDetail: `El manifest re-resuelto (${emittedHash.slice(0, 12)}…) difiere del encolado (${job.manifestHash.slice(0, 12)}…): el catálogo cambió desde el enqueue.`
      })

      return
    }

    // Constraints FIJADAS del job (nunca defaults re-leídos).
    const pdfBytes = result.pdfBytes ?? 0
    const maxPdfMb = (job.constraints?.maxPdfMb as number | undefined) ?? 20

    if (job.outputTarget === 'pdf-merged' && pdfBytes > maxPdfMb * 1024 * 1024) {
      await markRenderJobFailed({
        renderJobId: job.renderJobId,
        failureCode: 'size_rejected',
        failureDetail: `PDF de ${(pdfBytes / 1024 / 1024).toFixed(2)} MB supera el límite de ${maxPdfMb} MB del requisito-set.`
      })

      return
    }

    const maxPages = job.constraints?.maxPages as number | null | undefined

    if (typeof maxPages === 'number' && input.slides.length > maxPages) {
      await markRenderJobFailed({
        renderJobId: job.renderJobId,
        failureCode: 'size_rejected',
        failureDetail: `${input.slides.length} láminas superan el máximo de ${maxPages} páginas del requisito-set.`
      })

      return
    }

    // Upload: PDF final + previews PNG como assets privados system-generated.
    let outputPdfAssetId: string | null = null

    if (result.pdfPath) {
      const stored = await storeSystemGeneratedPrivateAsset({
        ownerAggregateType: 'proposal_deliverable',
        ownerAggregateId: job.proposalId,
        fileName: path.basename(result.pdfPath),
        mimeType: 'application/pdf',
        bytes: await fs.readFile(result.pdfPath),
        actorUserId: WORKER_ACTOR_USER,
        metadata: {
          renderJobId: job.renderJobId,
          manifestHash: job.manifestHash,
          artifactPurpose: job.artifactPurpose,
          audience: job.audience
        }
      })

      outputPdfAssetId = stored.assetId

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

    for (const slidePath of result.slidePaths) {
      const stored = await storeSystemGeneratedPrivateAsset({
        ownerAggregateType: 'proposal_deliverable',
        ownerAggregateId: job.proposalId,
        fileName: path.basename(slidePath),
        mimeType: 'image/png',
        bytes: await fs.readFile(slidePath),
        actorUserId: WORKER_ACTOR_USER,
        metadata: { renderJobId: job.renderJobId, kind: 'preview' }
      })

      previewAssetIds.push(stored.assetId)
    }

    await markRenderJobCompleted({
      renderJobId: job.renderJobId,
      outputPdfAssetId,
      outputPreviewAssetIds: previewAssetIds,
      outputReport: {
        durationMs: Date.now() - startedAt,
        pdfBytes,
        slides: result.slidePaths.length,
        warnings: result.warnings,
        manifestHash: job.manifestHash
      }
    })

    log('render completed', {
      renderJobId: job.renderJobId,
      durationMs: Date.now() - startedAt,
      pdfBytes,
      previews: previewAssetIds.length
    })
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
}

const main = async (): Promise<void> => {
  if (!isArtifactRenderJobsEnabled()) {
    log('flag OFF — skip')

    return
  }

  // Dos modos:
  //   · RENDER_JOB_ID en env → ejecución dirigida (smoke/replay manual del operador).
  //   · sin RENDER_JOB_ID → CLAIM ATÓMICO del próximo job por prioridad (FOR UPDATE SKIP LOCKED).
  //     Es el modo normal: el dispatcher sólo lanza la ejecución (jobs.run, sin overrides — no
  //     necesita `runWithOverrides`), y el worker elige. Dos ejecuciones concurrentes nunca toman
  //     el mismo job.
  const directJobId = process.env.RENDER_JOB_ID?.trim()

  let job: ProposalRenderJobRecord | null

  if (directJobId) {
    const running = await markRenderJobRunning(directJobId)

    job = await getProposalRenderJob({ ownerOrgId: running.ownerOrgId, renderJobId: directJobId })
  } else {
    job = await claimNextRenderJobForExecution()

    if (!job) {
      log('sin jobs en cola — nada que hacer')

      return
    }
  }

  if (!job) throw new Error(`Job ${directJobId} desapareció tras el claim (imposible: tabla append-only).`)

  const renderJobId = job.renderJobId

  try {
    await renderJob(job)
  } catch (error) {
    const { code, detail } = classifyFailure(error)

    captureWithDomain(error, 'commercial', {
      tags: { source: 'artifact_worker', failureCode: code },
      extra: { renderJobId }
    })

    await markRenderJobFailed({ renderJobId, failureCode: code, failureDetail: detail })

    // El fallo queda gobernado en el job; la ejecución sale 0 (el retry es del dominio, no de
    // Cloud Run — max-retries=0 en el Job para no re-ejecutar fuera del contrato).
    log('render failed (gobernado)', { renderJobId, code })
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[artifact-worker] fallo no gobernado:', error)
    process.exit(1)
  })
