/**
 * Materializa los assets que pide `planGlitchEdition` (TASK-1921; antes vivía en el CLI de TASK-1923). Lo comparten
 * `pnpm glitch:compose` (lee del disco) y el `artifact-worker` (lee del asset store): la única diferencia es el
 * `SourceLoader`. Usa sharp: NO se exporta desde el índice puro del dominio.
 *
 * Por cada foto: la procesa al tamaño exacto de su hueco (duotono o color), calcula la falla en bytes sobre la foto YA
 * procesada (su SHA-256 es la semilla) y la pinta con el color muestreado del borde. La lente se corta de la foto a
 * color. Devuelve las fotos como data URI (clave sin `asset-ref:`), las celdas de la falla por lámina y un registro
 * por asset con sus hashes (procedencia).
 */

import { createHash } from 'node:crypto'

import { glitchLine } from '@efeoncepro/axis-tokens'

import { computeByteFracture, paintByteFracture, type PaintedByteCell } from './byte-fracture'
import { processLensDetail, processPhoto, sampleEdge, type ProcessedPhoto } from './photos'
import type { GlitchAssetRequest } from './types'

export interface SourceBytes {
  bytes: Buffer
  mimeType: string | null
}

/** Devuelve los bytes de la fuente que el manifiesto nombra con `path` (disco en el CLI, asset store en el worker). */
export type SourceLoader = (path: string) => Promise<SourceBytes>

export interface MaterializedGlitchAssets {
  externalAssets: Record<string, string>
  cellsBySlide: Record<string, PaintedByteCell[]>
  log: { ref: string; kind: GlitchAssetRequest['kind']; source: { path: string; sha256: string }; processed: { sha256: string; width: number; height: number } }[]
}

const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex')

export const materializeGlitchAssets = async (assets: readonly GlitchAssetRequest[], load: SourceLoader): Promise<MaterializedGlitchAssets> => {
  const cache = new Map<string, Buffer>()
  const out: MaterializedGlitchAssets = { externalAssets: {}, cellsBySlide: {}, log: [] }

  const bytesOf = async (path: string) => {
    if (!cache.has(path)) cache.set(path, (await load(path)).bytes)

    return cache.get(path)!
  }

  for (const request of assets) {
    const source = await bytesOf(request.path)
    let photo: ProcessedPhoto

    if (request.kind === 'lens') {
      photo = await processLensDetail(source, request.fit, request.region, request.diameter)
    } else {
      photo = await processPhoto(source, request.fit, request.treatment)

      for (const f of request.fractures) {
        const fracture = computeByteFracture({ seed: photo.sha256, photo: f.box, edge: f.edge, profile: f.profile, canvas: f.canvas, faceRegions: f.faceRegions, clip: f.clip })
        const samples = await sampleEdge(photo, f.edge, fracture.samples, fracture.cell, fracture.pitch)
        const cells = paintByteFracture(fracture, samples, glitchLine.color.ground)

        for (const slideId of f.slideIds) (out.cellsBySlide[slideId] ??= []).push(...cells)
      }
    }

    out.externalAssets[request.ref] = photo.dataUri
    out.log.push({ ref: request.ref, kind: request.kind, source: { path: request.path, sha256: sha256(source) }, processed: { sha256: photo.sha256, width: photo.width, height: photo.height } })
  }

  return out
}
