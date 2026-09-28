import 'server-only'

/**
 * TASK-1921 — fuentes de una pieza de marca (plates, fotos, logos). El intent o el manifiesto las nombran con la misma
 * cadena que usa el taller local; el pedido las traduce a assets del uploader canónico (`sources`). Aquí se valida que
 * cada una exista, sea una fuente de marca subida para esto y no esté en cuarentena, se adjuntan los borradores al pedido
 * (quedan dueños de él: nadie los borra por huérfanos) y se leen los bytes para el tamaño de las fotos de Glitch y para
 * el worker. Una ruta local nunca se lee.
 */

import sharp from 'sharp'

import { attachAssetToAggregate, getAssetById } from '@/lib/storage/greenhouse-assets'
import { downloadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'
import type { GreenhouseAssetRecord } from '@/types/assets'

import { BrandRenderMissingSourceError } from './errors'

const SOURCE_CONTEXTS = new Set(['brand_render_source_draft', 'brand_render_source'])
const SOURCE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export interface ResolvedBrandSource {
  name: string
  assetId: string
  mimeType: string
  sha256: string | null
  status: GreenhouseAssetRecord['status']
}

/**
 * Exige que cada nombre usado tenga su asset y que el asset sea una fuente de marca válida. Devuelve SÓLO las fuentes
 * usadas (las demás de `sources` no entran al pedido ni a su clave de idempotencia).
 */
export const resolveBrandSources = async (input: {
  sourcePaths: readonly string[]
  sources: Readonly<Record<string, string>>
}): Promise<ResolvedBrandSource[]> => {
  const missing = input.sourcePaths.filter((name) => !input.sources[name])

  if (missing.length > 0) {
    throw new BrandRenderMissingSourceError(`Faltan ${missing.length} fuente(s): súbelas por el uploader y nómbralas en sources.`, { missing })
  }

  const resolved: ResolvedBrandSource[] = []
  const invalid: { name: string; reason: string }[] = []

  for (const name of [...input.sourcePaths].sort()) {
    const assetId = input.sources[name]!
    const asset = await getAssetById(assetId)

    if (!asset || asset.status === 'deleted' || asset.status === 'orphaned') invalid.push({ name, reason: 'not_found' })
    else if (asset.status === 'quarantined') invalid.push({ name, reason: 'quarantined' })
    else if (!SOURCE_CONTEXTS.has(asset.ownerAggregateType)) invalid.push({ name, reason: 'wrong_context' })
    else if (!SOURCE_MIME_TYPES.has(asset.mimeType)) invalid.push({ name, reason: 'unsupported_type' })
    else resolved.push({ name, assetId, mimeType: asset.mimeType, sha256: asset.contentHash, status: asset.status })
  }

  if (invalid.length > 0) {
    throw new BrandRenderMissingSourceError('Hay fuentes que no se pueden usar: deben ser imágenes PNG, JPEG o WebP subidas como fuente de marca.', { invalid })
  }

  return resolved
}

/** Adjunta al pedido los borradores (una fuente ya adjunta a otro pedido se reutiliza tal cual). */
export const attachBrandSources = async (input: {
  requestId: string
  sources: readonly ResolvedBrandSource[]
  actorUserId: string | null
  client?: Parameters<typeof attachAssetToAggregate>[0]['client']
}): Promise<void> => {
  for (const source of input.sources) {
    if (source.status !== 'pending') continue

    await attachAssetToAggregate({
      assetId: source.assetId,
      ownerAggregateType: 'brand_render_source',
      ownerAggregateId: input.requestId,
      actorUserId: input.actorUserId,
      metadata: { sourceName: source.name },
      client: input.client
    })
  }
}

/** Bytes de una fuente por su assetId (el worker y el tamaño de las fotos de Glitch). */
export const readBrandSourceBytes = async (assetId: string): Promise<{ bytes: Buffer; mimeType: string }> => {
  const asset = await getAssetById(assetId)

  if (!asset || asset.status === 'deleted' || asset.status === 'quarantined') throw new Error(`missing_asset:${assetId}`)

  const file = await downloadGreenhouseStorageObject({ bucketName: asset.bucketName, objectName: asset.objectPath })

  return { bytes: Buffer.from(file.arrayBuffer), mimeType: asset.mimeType }
}

/** Tamaño original (ya orientado) de cada foto de Glitch: el mapper traslada rostros y lente al recorte del hueco. */
export const readBrandSourceImageSizes = async (
  entries: readonly { name: string; assetId: string }[]
): Promise<Record<string, { width: number; height: number }>> => {
  const sizes: Record<string, { width: number; height: number }> = {}

  for (const entry of entries) {
    const { bytes } = await readBrandSourceBytes(entry.assetId)
    const meta = await sharp(bytes).rotate().metadata()
    const width = meta.autoOrient?.width ?? meta.width
    const height = meta.autoOrient?.height ?? meta.height

    if (!width || !height) throw new BrandRenderMissingSourceError('Una foto no tiene dimensiones legibles.', { invalid: [{ name: entry.name, reason: 'unreadable' }] })

    sizes[entry.name] = { width, height }
  }

  return sizes
}
