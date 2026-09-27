/**
 * Un documento de «La órbita» (contrato `efeonce.surface-composition` 0.1.2): varias páginas de UNA superficie,
 * validadas como un todo (TASK-1927). Hoy, el deck: un brochure o una propuesta que salen en un solo PDF.
 *
 * `planSurfaceDocument(intent)` no reimplementa ninguna regla del documento. AXIS (`resolveSurfaceDocument`) propaga a
 * cada página lo que omite (superficie, formato, uso, línea, versión, el punto fijo de la navegación del marco), valida
 * cada página por separado y el conjunto (portada primero y cierre al final en un brochure, al menos una página de
 * servicio, una sola navegación, la línea del marco, la foto que alterna entre portada y cierre). Si devuelve un solo
 * issue, no se planea NADA: ni siquiera las páginas válidas de un documento inválido.
 *
 * Es puro, como `planSurfacePiece`: no lee archivos ni renderiza. Lo usa el CLI local y, cuando exista, la ruta
 * productiva (TASK-1921).
 */

import { resolveSurfaceDocument } from '@efeoncepro/axis-ui-contracts'

import { planFromManifest } from './index'
import type { SurfaceIntent, SurfaceManifest } from './shared'
import { SurfacePieceError, type GraphicLineCatalogName, type SurfaceAssetRequest, type SurfacePiecePlan } from './types'

/** Una página del documento: un intent de superficie que puede omitir lo que el documento propaga. */
export type SurfaceDocumentPage = Partial<SurfaceIntent> & ({ recipe: string } | { role: string })

export interface SurfaceDocumentIntent {
  contract?: string
  version?: string
  surface: string
  format: string
  use: 'proposal' | 'brochure'
  line?: string
  sections?: number
  pages: SurfaceDocumentPage[]
}

export interface SurfaceDocumentOutlineEntry {
  page: number
  recipe: string
  role: string
  layout: string | null
  line: string
  progress: { sections: number; current: number } | null
  status: string
}

/** El manifest `axis.surface-document.v1` que devuelve AXIS. */
export interface SurfaceDocumentManifest {
  schema: string
  contract: string
  status: string
  surface: string
  format: string
  use: 'proposal' | 'brochure'
  line: string
  sections: number | null
  pageCount: number
  outline: SurfaceDocumentOutlineEntry[]
  pages: (SurfaceManifest & { recipe?: { id?: string }; role?: string; line?: string })[]
  issues: { code: string; path?: string; message?: string }[]
}

export interface SurfaceDocumentPlan {
  catalog: GraphicLineCatalogName
  use: 'proposal' | 'brochure'
  /** El plan del composer: una lámina por página, en el orden del `outline`. */
  plan: SurfacePiecePlan['plan']
  /** La unión de los assets de todas las páginas, sin repetir una referencia. */
  assets: SurfaceAssetRequest[]
  /** El manifest de documento de AXIS (se guarda junto al PDF para auditarlo). */
  manifest: SurfaceDocumentManifest
}

export interface PlanSurfaceDocumentOptions {
  artifactId: string
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export const planSurfaceDocument = (intent: SurfaceDocumentIntent, options: PlanSurfaceDocumentOptions): SurfaceDocumentPlan => {
  const manifest = resolveSurfaceDocument(intent as never) as unknown as SurfaceDocumentManifest
  const issues = manifest.issues ?? []

  if (issues.length > 0 || manifest.status !== 'resolved') {
    throw new SurfacePieceError(
      `El contrato de documento rechazó el ${intent.use === 'brochure' ? 'brochure' : 'documento'}: ${issues.map(issue => issue.code).join(', ') || manifest.status}.`,
      'surface-issues',
      issues
    )
  }

  if (manifest.pages.length !== intent.pages.length || manifest.outline.length !== intent.pages.length) {
    throw new SurfacePieceError('AXIS resolvió un número de páginas distinto al del documento.', 'surface-issues')
  }

  const slides: SurfacePiecePlan['plan']['slides'] = []
  const assets = new Map<string, SurfaceAssetRequest>()
  let catalog: GraphicLineCatalogName | null = null

  manifest.pages.forEach((page, index) => {
    const source = intent.pages[index]
    const entry = manifest.outline[index]!

    if (!isObject(source)) throw new SurfacePieceError(`La página ${index + 1} del documento no es un intent.`, 'invalid-intent')

    // El intent de la página, con lo que el documento propagó: los builders leen de él la línea y los pasos.
    const pageIntent = {
      contract: manifest.contract,
      version: intent.version ?? String((page as { version?: unknown }).version ?? ''),
      ...source,
      surface: manifest.surface,
      format: manifest.format,
      use: manifest.use,
      role: entry.role,
      recipe: entry.recipe,
      line: entry.line
    } as SurfaceIntent

    const piece = planFromManifest(pageIntent, page, { artifactId: options.artifactId })

    if (catalog && piece.catalog !== catalog) {
      throw new SurfacePieceError('Un documento sale de un solo catálogo: sus páginas resolvieron a catálogos distintos.', 'invalid-intent')
    }

    catalog = piece.catalog

    const slide = piece.plan.slides[0]!

    slides.push({ ...slide, slideId: `p${String(index + 1).padStart(2, '0')}-${slide.slideId}` })

    for (const asset of piece.assets) if (!assets.has(asset.ref)) assets.set(asset.ref, asset)
  })

  if (!catalog) throw new SurfacePieceError('El documento no tiene páginas.', 'invalid-intent')

  return {
    catalog,
    use: manifest.use,
    plan: { artifactId: options.artifactId, slides },
    assets: [...assets.values()],
    manifest
  }
}
