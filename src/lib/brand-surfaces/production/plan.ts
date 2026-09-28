/**
 * Plan de un pedido de render de marca (TASK-1921). Puro: traduce el pedido a UN job por catálogo usando los mappers
 * que ya existen —`planSurfacePiece`, `planSurfaceDocument` (TASK-1919/1927) y `planGlitchManifest` (TASK-1923: despacha
 * la edición semanal a `planGlitchEdition` y el Glitch Flash a `planGlitchFlash` por `edition.kind`)—, sin copiar reglas.
 * El contrato de AXIS y la aprobación de la receta se validan aquí, antes de encolar: una receta no aprobada nunca llega a
 * la cola.
 *
 * Además reúne las FUENTES que el pedido nombra (plates, fotos, logos): el command las exige todas en `sources`.
 */

import type { CompositionPlanInput } from '@/lib/artifact-composer/pure'
import { isGlitchFlashPlan, planGlitchManifest, type GlitchAssetRequest } from '@/lib/glitch-composition'

import { planSurfacePiece, type SurfaceIntent } from '../index'
import { planSurfaceDocument, type SurfaceDocumentIntent } from '../document'
import type { SurfaceAssetRequest } from '../types'
import { BRAND_RENDER_OUTPUT_TARGET, type BrandRenderCatalogName, type BrandRenderOutputTarget, type BrandRenderRequest } from './contracts'

export type BrandRenderAssetRequests =
  | { kind: 'surface'; requests: SurfaceAssetRequest[] }
  | { kind: 'glitch'; requests: GlitchAssetRequest[] }

export interface PlannedBrandRenderJob {
  catalogName: BrandRenderCatalogName
  outputTarget: BrandRenderOutputTarget
  artifactId: string
  input: CompositionPlanInput
  assets: BrandRenderAssetRequests
}

export interface PlannedBrandRender {
  family: BrandRenderRequest['family']
  /** Sin datos sensibles: para listar y auditar sin abrir el plan. */
  summary: Record<string, unknown>
  jobs: PlannedBrandRenderJob[]
  /** Nombres de fuente que el intent o el manifiesto usan (cada uno debe venir en `sources`). */
  sourcePaths: string[]
}

export interface PlanBrandRenderOptions {
  artifactId: string
  /** Tamaño original de cada foto de Glitch (rostros y lente sobre la foto original, TASK-1923 `fitRegion`). */
  photoSizes?: Readonly<Record<string, { width: number; height: number }>>
}

const surfacePaths = (assets: readonly SurfaceAssetRequest[]): string[] =>
  assets.flatMap((asset) => {
    if (asset.kind === 'svg') return []
    if (asset.kind === 'painted') return [asset.photo.path]

    return [asset.path]
  })

/** Las referencias `asset-ref:` que usan las láminas de un plan (en cualquier nivel de sus slots). */
const refsUsedBy = (plan: CompositionPlanInput): Set<string> => {
  const found = new Set<string>()

  const walk = (value: unknown) => {
    if (typeof value === 'string') {
      if (value.startsWith('asset-ref:')) found.add(value.slice('asset-ref:'.length))

      return
    }

    if (Array.isArray(value)) value.forEach(walk)
    else if (value && typeof value === 'object') Object.values(value).forEach(walk)
  }

  plan.slides.forEach((slide) => walk(slide.slots))

  return found
}

export const planBrandRender = (request: BrandRenderRequest, options: PlanBrandRenderOptions): PlannedBrandRender => {
  if (request.family === 'graphic_line_piece') {
    const piece = planSurfacePiece(request.intent as unknown as SurfaceIntent, { artifactId: options.artifactId })

    return {
      family: request.family,
      summary: {
        surface: (request.intent as { surface?: unknown }).surface ?? null,
        recipe: (request.intent as { recipe?: unknown }).recipe ?? null,
        contentType: piece.contentType,
        use: piece.use,
        layout: piece.layout
      },
      jobs: [
        {
          catalogName: piece.catalog,
          outputTarget: BRAND_RENDER_OUTPUT_TARGET[piece.catalog],
          artifactId: options.artifactId,
          input: piece.plan,
          assets: { kind: 'surface', requests: piece.assets }
        }
      ],
      sourcePaths: [...new Set(surfacePaths(piece.assets))]
    }
  }

  if (request.family === 'graphic_line_document') {
    const doc = planSurfaceDocument(request.intent as unknown as SurfaceDocumentIntent, { artifactId: options.artifactId })

    return {
      family: request.family,
      summary: { use: doc.use, pages: doc.plan.slides.length },
      jobs: [
        {
          catalogName: doc.catalog,
          outputTarget: BRAND_RENDER_OUTPUT_TARGET[doc.catalog],
          artifactId: options.artifactId,
          input: doc.plan,
          assets: { kind: 'surface', requests: doc.assets }
        }
      ],
      sourcePaths: [...new Set(surfacePaths(doc.assets))]
    }
  }

  // Glitch: la licencia de Guttery la declara el brand pack `axis` (extensión glitch, embedRights) que el Job lleva en
  // su imagen. Si la fuente faltara, el render falla cerrado (`font_fallback_detected`), nunca con otra letra.
  // Un manifiesto con `edition.kind: 'flash'` es un Glitch Flash (una noticia, sin número ni overlays); cualquier otro es
  // la edición semanal. El despacho es del mapper: aquí no se decide el formato.
  const edition = planGlitchManifest(request.manifest, { artifactId: options.artifactId, narratorLicenseStatus: 'licensed', photoSizes: options.photoSizes })

  const jobs = [edition.carousel, edition.stills, edition.overlays]
    .filter((target) => target.plan.slides.length > 0)
    .map((target): PlannedBrandRenderJob => {
      const used = refsUsedBy(target.plan)
      const slideIds = new Set(target.plan.slides.map((slide) => slide.slideId))

      const requests = edition.assets
        .filter((asset) => used.has(asset.ref))
        .map((asset) =>
          asset.kind === 'photo'
            ? { ...asset, fractures: asset.fractures.map((f) => ({ ...f, slideIds: f.slideIds.filter((id) => slideIds.has(id)) })).filter((f) => f.slideIds.length > 0) }
            : asset
        )

      return {
        catalogName: target.catalog,
        outputTarget: BRAND_RENDER_OUTPUT_TARGET[target.catalog],
        artifactId: target.plan.artifactId,
        input: target.plan,
        assets: { kind: 'glitch', requests }
      }
    })

  return {
    family: request.family,
    summary: isGlitchFlashPlan(edition)
      ? { kind: 'flash', slug: edition.slug, title: edition.title, edition: null, coverTemplate: null, catalogs: jobs.map((job) => job.catalogName) }
      : { edition: edition.edition, coverTemplate: edition.coverTemplate, catalogs: jobs.map((job) => job.catalogName) },
    jobs,
    sourcePaths: [...new Set(edition.assets.map((asset) => asset.path))]
  }
}

/**
 * Las fotos de un manifiesto de Glitch (para leer su tamaño antes de planificar): las de las noticias, la del host del
 * video (semanal) y la de portada del Flash (`cover.photo`, que en la semanal no existe: su portada sale de una noticia).
 */
export const glitchPhotoPaths = (manifest: Record<string, unknown>): string[] => {
  const news = Array.isArray(manifest.news) ? (manifest.news as { photo?: { file?: unknown } }[]) : []
  const host = (manifest.video as { hostPhoto?: { file?: unknown } | null } | null | undefined)?.hostPhoto?.file
  const cover = (manifest.cover as { photo?: { file?: unknown } | null } | null | undefined)?.photo?.file

  return [...new Set([...news.map((n) => n.photo?.file), host, cover].filter((file): file is string => typeof file === 'string' && file.length > 0))]
}
