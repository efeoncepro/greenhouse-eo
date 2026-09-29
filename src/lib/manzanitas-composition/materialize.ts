/**
 * Materializa los assets que pide `planManzanitasIntent` (TASK-1939). Usa sharp: NO se exporta desde el índice puro del
 * dominio. Lo usa `pnpm manzanitas:compose` (lee del disco); el worker podrá usarlo con otro `SourceLoader`.
 *
 * - Foto: la procesa al tamaño exacto del lienzo de la pieza (cubre y centra; color, sin tratamiento: registro cine).
 * - Lente: la misma foto al tamaño del lienzo, incrustada en la receta `post` de La órbita (`lensRecipe`), que ya trae
 *   la foto apagada afuera, la foto a color dentro del círculo, el anillo, el arco y la esfera.
 * - Órbita del paso: el SVG de `orbitSvg` tal cual.
 *
 * Devuelve cada asset como data URI (clave sin `asset-ref:`) y un registro por asset con sus hashes (procedencia).
 */

import { createHash } from 'node:crypto'

import sharp from 'sharp'

import type { ManzanitasAssetRequest } from './index'

export interface SourceBytes {
  bytes: Buffer
  mimeType: string | null
}

/** Devuelve los bytes de la fuente que el intent nombra con `path` (disco en el comando). */
export type SourceLoader = (path: string) => Promise<SourceBytes>

export interface MaterializedManzanitasAssets {
  externalAssets: Record<string, string>
  log: { ref: string; kind: ManzanitasAssetRequest['kind']; source: { path: string | null; sha256: string }; processed: { sha256: string; width: number; height: number } }[]
}

const sha256 = (buf: Buffer | string) => createHash('sha256').update(buf).digest('hex')

const processPhoto = async (input: Buffer, width: number, height: number) => {
  const png = await sharp(input).rotate().resize(width, height, { fit: 'cover', position: 'centre' }).removeAlpha().png({ compressionLevel: 9 }).toBuffer()

  return { png, sha256: sha256(png), dataUri: `data:image/png;base64,${png.toString('base64')}` }
}

const svgDataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

export const materializeManzanitasAssets = async (assets: readonly ManzanitasAssetRequest[], load: SourceLoader): Promise<MaterializedManzanitasAssets> => {
  const cache = new Map<string, Buffer>()
  const out: MaterializedManzanitasAssets = { externalAssets: {}, log: [] }

  const bytesOf = async (path: string) => {
    if (!cache.has(path)) cache.set(path, (await load(path)).bytes)

    return cache.get(path)!
  }

  for (const request of assets) {
    if (request.kind === 'orbit') {
      out.externalAssets[request.ref] = svgDataUri(request.svg)
      out.log.push({ ref: request.ref, kind: 'orbit', source: { path: null, sha256: sha256(request.svg) }, processed: { sha256: sha256(request.svg), width: 1080, height: 1350 } })
      continue
    }

    const source = await bytesOf(request.path)
    const photo = await processPhoto(source, request.width, request.height)

    if (request.kind === 'photo') {
      out.externalAssets[request.ref] = photo.dataUri
      out.log.push({ ref: request.ref, kind: 'photo', source: { path: request.path, sha256: sha256(source) }, processed: { sha256: photo.sha256, width: request.width, height: request.height } })
      continue
    }

    // La Lente: la foto procesada entra en la receta de La órbita en los dos lugares que la nombran (afuera y adentro).
    if (!request.svg.includes(request.placeholder)) throw new Error(`manzanitas: la receta de la Lente de ${request.ref} no trae el marcador de la foto.`)

    const svg = request.svg.split(request.placeholder).join(photo.dataUri)

    out.externalAssets[request.ref] = svgDataUri(svg)
    out.log.push({ ref: request.ref, kind: 'lens', source: { path: request.path, sha256: sha256(source) }, processed: { sha256: sha256(svg), width: request.width, height: request.height } })
  }

  return out
}
