/**
 * TASK-1921 Slice 4 — adapter del render de piezas de marca («La órbita» y Glitch) sobre el contrato de consumer.
 *
 * La unidad reclamable es el JOB (un catálogo de un pedido): en Glitch, fallar los overlays conserva el carrusel y las
 * portadas ya producidos, y el reintento no repite los exitosos.
 *
 * Qué hace acá y no en el encolado: leer los BYTES de las fuentes (plates, fotos, logos) del asset store y
 * materializarlos con los mismos helpers que el taller local (`materializeSurfaceAssets` / `materializeGlitchAssets`).
 * En Glitch la falla en bytes se calcula de la foto ya procesada y se agrega al plan como slot `bytes` — por eso ese
 * slot no está en el input sellado y se quita antes de comparar el input emitido contra el sellado.
 *
 * Boundary: este adapter no decide reglas de marca. El plan ya salió validado por el command (contrato AXIS + receta
 * aprobada); aquí sólo se compone lo sellado y se guardan los bytes como assets privados de la marca.
 */

import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { CompositionPlanInput } from '@/lib/artifact-composer/pure'
import { hashResolvedManifest } from '@/lib/artifact-composer/pure'
import { brandRenderAxisVersions } from '@/lib/brand-surfaces/production/commands'
import {
  BRAND_RENDER_DERIVED_SLOTS,
  toBrandRenderFailureCode
} from '@/lib/brand-surfaces/production/contracts'
import { BrandRenderFenceLostError } from '@/lib/brand-surfaces/production/errors'
import { isBrandRenderEnabled } from '@/lib/brand-surfaces/production/flags'
import { materializeSurfaceAssets } from '@/lib/brand-surfaces/production/materialize'
import { readBrandSourceBytes } from '@/lib/brand-surfaces/production/sources'
import {
  claimBrandRenderJobById,
  claimNextBrandRenderJob,
  getBrandRenderJobPayload,
  markBrandRenderJobCompleted,
  markBrandRenderJobFailed,
  type BrandRenderJobRecord
} from '@/lib/brand-surfaces/production/store'
import type { SurfaceAssetRequest } from '@/lib/brand-surfaces/types'
import { attachFractures, type GlitchAssetRequest } from '@/lib/glitch-composition'
import { materializeGlitchAssets, type SourceLoader } from '@/lib/glitch-composition/materialize'
import { storeSystemGeneratedPrivateAsset } from '@/lib/storage/greenhouse-assets'

import { BRAND_RENDER_CATALOG_FACTORIES, isBrandRenderCatalogName } from '../brand/painters'
import type { RenderConsumer, RenderJobView, RenderedArtifact } from '../consumer-contract'

const WORKER_ACTOR_USER = null

/** Prefijo del error que levanta la lectura de una fuente ausente o en cuarentena (`readBrandSourceBytes`). */
const MISSING_ASSET_PREFIX = 'missing_asset:'

type AssetRequests =
  | { kind: 'surface'; requests: SurfaceAssetRequest[]; sources: Record<string, string> }
  | { kind: 'glitch'; requests: GlitchAssetRequest[]; sources: Record<string, string> }

interface MaterializedJob {
  externalAssets: Record<string, string>
  /** Láminas a las que el worker les agregó el slot derivado `bytes` (sólo Glitch). */
  derivedSlides: Set<string>
  sources: { name: string; assetId: string; sha256: string }[]
}

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex')

/**
 * El input emitido sin los slots que el worker derivó. Sólo se quitan de las láminas a las que ESTE worker se los
 * agregó: un `bytes` que viniera en el sellado seguiría contando para el drift.
 */
export const stripDerivedSlots = (input: CompositionPlanInput, derivedSlides: ReadonlySet<string>): CompositionPlanInput => ({
  ...input,
  slides: input.slides.map(slide => {
    if (!derivedSlides.has(slide.slideId)) return slide

    const slots = { ...(slide.slots as Record<string, unknown>) }

    for (const key of BRAND_RENDER_DERIVED_SLOTS) delete slots[key]

    return { ...slide, slots: slots as typeof slide.slots }
  })
})

/** Carga las fuentes nombradas por el plan desde el asset store (nunca una ruta local) y registra su hash. */
const sourceLoader = (sources: Readonly<Record<string, string>>, seen: MaterializedJob['sources']): SourceLoader => async name => {
  const assetId = sources[name]

  if (!assetId) throw new Error(`${MISSING_ASSET_PREFIX}${name}`)

  const source = await readBrandSourceBytes(assetId)

  if (!seen.some(entry => entry.name === name)) seen.push({ name, assetId, sha256: sha256(source.bytes) })

  return { bytes: source.bytes, mimeType: source.mimeType }
}

export const createBrandRenderConsumer = (): RenderConsumer => {
  let claimed: BrandRenderJobRecord | null = null
  let materialized: MaterializedJob | null = null

  const toView = (record: BrandRenderJobRecord): RenderJobView => {
    claimed = record
    materialized = null

    return {
      jobId: record.jobId,
      ownerOrgId: record.organizationId,
      catalogName: record.catalogName,
      manifestHash: record.manifestHash,
      artifactId: record.artifactId,
      outputTarget: record.outputTarget,
      constraints: record.constraints
    }
  }

  const requireClaimed = (): BrandRenderJobRecord => {
    if (!claimed) throw new Error('Consumer brand-render: no hay job reclamado en este proceso.')

    return claimed
  }

  /** Si otra ejecución reclamó el job mientras se renderizaba, esta no escribe nada: el job ya es de la otra. */
  const ignoreFenceLost = async (jobId: string, write: () => Promise<unknown>): Promise<void> => {
    try {
      await write()
    } catch (error) {
      if (error instanceof BrandRenderFenceLostError) {
        console.log(JSON.stringify({ svc: 'artifact-worker', consumer: 'brand-render', msg: 'fence perdido: el job lo tomó otra ejecución', jobId }))

        return
      }

      throw error
    }
  }

  return {
    key: 'brand-render',
    observabilityDomain: 'brand_render',

    isEnabled: () => isBrandRenderEnabled(),

    claimNext: async () => {
      const record = await claimNextBrandRenderJob()

      return record ? toView(record) : null
    },

    claimById: async jobId => {
      const record = await claimBrandRenderJobById(jobId)

      return record ? toView(record) : null
    },

    getManifest: async jobId => {
      const payload = await getBrandRenderJobPayload(jobId)

      if (!payload) return null

      const input = payload.manifest.input as CompositionPlanInput
      const assets = payload.assetRequests as unknown as AssetRequests
      const sources: MaterializedJob['sources'] = []
      const load = sourceLoader(assets.sources ?? {}, sources)

      if (assets.kind === 'glitch') {
        const glitch = await materializeGlitchAssets(assets.requests, load)

        materialized = { externalAssets: glitch.externalAssets, derivedSlides: new Set(Object.keys(glitch.cellsBySlide)), sources }

        return { ...payload.manifest, input: attachFractures(input, glitch.cellsBySlide) }
      }

      materialized = { externalAssets: await materializeSurfaceAssets(assets.requests, load), derivedSlides: new Set(), sources }

      return payload.manifest
    },

    getCatalog: name => (isBrandRenderCatalogName(name) ? BRAND_RENDER_CATALOG_FACTORIES[name]() : null),

    // Se sella el INPUT canónico (como Insights): lo que importa es que se compongan EXACTAMENTE las láminas selladas.
    verifyEmittedManifest: (view, emitted) => {
      const input = stripDerivedSlots(emitted.input as CompositionPlanInput, materialized?.derivedSlides ?? new Set())
      const emittedInputHash = hashResolvedManifest({ input })

      if (emittedInputHash === view.manifestHash) return null

      return `El input compuesto (${emittedInputHash.slice(0, 12)}…) difiere del sellado al encolar (${view.manifestHash.slice(0, 12)}…): el artefacto no corresponde al pedido.`
    },

    // Los bytes ya se materializaron en getManifest (Glitch necesita la foto procesada para calcular su falla).
    resolveExternalAssets: async () => materialized?.externalAssets ?? {},

    // Lo que se guarda es lo que el target produce: el PDF en `pdf-merged`, cada PNG en `png-set`.
    storeOutputs: async (view, rendered: RenderedArtifact) => {
      const record = requireClaimed()

      const store = async (filePath: string, mimeType: string, index: number | null) => {
        const stored = await storeSystemGeneratedPrivateAsset({
          ownerAggregateType: 'brand_render_output',
          ownerAggregateId: record.requestId,
          fileName: path.basename(filePath),
          mimeType,
          bytes: await fs.readFile(filePath),
          actorUserId: WORKER_ACTOR_USER,
          metadata: { jobId: record.jobId, catalogName: record.catalogName, manifestHash: record.manifestHash, index }
        })

        return stored.assetId
      }

      if (view.outputTarget === 'pdf-merged') {
        return { primaryAssetId: rendered.pdfPath ? await store(rendered.pdfPath, 'application/pdf', null) : null, previewAssetIds: [] }
      }

      const pngs: string[] = []

      for (const [index, slidePath] of rendered.slidePaths.entries()) pngs.push(await store(slidePath, 'image/png', index))

      return { primaryAssetId: pngs[0] ?? null, previewAssetIds: pngs.slice(1) }
    },

    markCompleted: async (view, input) => {
      const record = requireClaimed()
      const outputAssetIds = [input.primaryAssetId, ...input.previewAssetIds].filter((id): id is string => Boolean(id))

      // El CHECK de la tabla exige assets en `completed`: una salida "completa" sin bytes no se registra como tal.
      if (outputAssetIds.length === 0) {
        await ignoreFenceLost(view.jobId, () =>
          markBrandRenderJobFailed({
            jobId: view.jobId,
            fenceToken: record.fenceToken,
            failureCode: 'render_error',
            failureDetail: 'El render terminó sin producir archivos.'
          })
        )

        return
      }

      await ignoreFenceLost(view.jobId, () =>
        markBrandRenderJobCompleted({
          jobId: view.jobId,
          fenceToken: record.fenceToken,
          outputAssetIds,
          outputReport: input.report,
          provenance: {
            requestId: record.requestId,
            jobId: record.jobId,
            catalogName: record.catalogName,
            manifestHash: record.manifestHash,
            axis: brandRenderAxisVersions(),
            sources: materialized?.sources ?? []
          }
        })
      )
    },

    markFailed: async (view, input) => {
      // Una fuente ausente o en cuarentena llega como `render_error` del motor genérico: aquí se nombra por lo que es.
      const failureCode = input.failureDetail.startsWith(MISSING_ASSET_PREFIX) ? 'missing_asset' : toBrandRenderFailureCode(input.failureCode)

      await ignoreFenceLost(view.jobId, () =>
        markBrandRenderJobFailed({
          jobId: view.jobId,
          fenceToken: claimed?.fenceToken,
          failureCode,
          failureDetail: input.failureDetail
        })
      )
    }
  }
}
