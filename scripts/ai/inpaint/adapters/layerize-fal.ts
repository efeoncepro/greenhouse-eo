import { join } from 'node:path'

import sharp from 'sharp'

import { runFalModel, uploadFalFile } from '@/lib/ai/fal'
import { findFalCapability } from '@/lib/ai/fal-capabilities'

import { alphaCoverage, layerFileName, type LayerRecord, type LayersDocument } from '../layers'
import { exists, readJson, sha256, stableStringify, writeFileEnsured, writeJson } from '../run-io'

/**
 * Corrida de Seedream 5 Pro Layerize para `pnpm ai:layers` (TASK-1973). Precio y slug salen del catálogo
 * `fal-capabilities.ts`; el número de capas lo decide el modelo, así que la estimación es una COTA (16 capas + base,
 * porque si la base se cobra está sin dato) y el costo registrado es por las capas que llegaron.
 */
export const LAYERIZE_ID = 'seedream5-pro-layerize'
export const LAYERIZE_MAX_LAYERS = 16

export interface LayerizeOptions {
  imagePath: string
  prompt?: string
  imageSize?: 'auto' | 'auto_1K' | 'auto_1.5K' | 'auto_2K'
  /** Carpeta de la pieza; la corrida vive en `<runRoot>/layers/<id>/`. */
  runRoot: string
  dryRun?: boolean
  force?: boolean
  maxUsd?: number
  yes?: boolean
  log?: (line: string) => void
}

export interface LayerizeResult {
  runDir: string
  layersJson: string
  document: LayersDocument | null
  reused: boolean
}

const perLayerUsd = (area: number): number | null => {
  const rule = findFalCapability(LAYERIZE_ID)?.pricing?.publishedUsdByArea

  if (!rule) return null

  return area > 1536 * 1536 ? rule.above1536sq : rule.upTo1536sq
}

const resolveCostCap = (maxUsd: number | undefined) => maxUsd ?? Number(process.env.AI_COST_CONFIRM_USD ?? process.env.FAL_COST_CONFIRM_USD ?? 1)

/** Cota de costo antes de gastar: 16 capas + la base. Exportada para probarla sin red. */
export const estimateLayerizeUsd = (width: number, height: number): { usd: number | null; perLayer: number | null; basis: string } => {
  const perLayer = perLayerUsd(width * height)

  if (perLayer === null) return { usd: null, perLayer, basis: 'sin precio en el catálogo' }

  const usd = Math.round(perLayer * (LAYERIZE_MAX_LAYERS + 1) * 10_000) / 10_000

  return { usd, perLayer, basis: `cota: hasta ${LAYERIZE_MAX_LAYERS} capas + base × USD ${perLayer} (el modelo decide cuántas; si la base se cobra está sin dato)` }
}

export const runLayerize = async (options: LayerizeOptions): Promise<LayerizeResult> => {
  const log = options.log ?? (line => process.stdout.write(`${line}\n`))
  const capability = findFalCapability(LAYERIZE_ID)

  if (!capability) throw new Error(`La capacidad ${LAYERIZE_ID} no está en el catálogo de fal.`)

  const meta = await sharp(options.imagePath).metadata()

  if (!meta.width || !meta.height) throw new Error('No se pudo leer el tamaño de la imagen.')

  const area = meta.width * meta.height

  if (area < 512 * 512 || area > 6000 * 6000) throw new Error(`Layerize acepta entre 512² y 6000² px; la imagen tiene ${meta.width}x${meta.height}.`)

  const bytes = await sharp(options.imagePath).png().toBuffer()
  const imageSize = options.imageSize ?? 'auto'
  const key = sha256(stableStringify({ v: 1, image: sha256(bytes), prompt: options.prompt ?? null, imageSize }))
  const runDir = join(options.runRoot, 'layers', key.slice(0, 12))
  const layersJson = join(runDir, 'layers.json')
  const estimate = estimateLayerizeUsd(meta.width, meta.height)

  log(estimate.usd === null ? `  $ costo: sin estimación (${estimate.basis})` : `  $ costo estimado ≤ USD ${estimate.usd.toFixed(2)} · ${estimate.basis}`)

  if (!options.force && !options.dryRun && (await exists(layersJson))) {
    log(`  ↺ esta imagen ya se separó con los mismos parámetros: se reutiliza ${runDir.replace(process.cwd(), '.')} sin pagar (--force para repetir)`)

    return { runDir, layersJson, document: await readJson<LayersDocument>(layersJson), reused: true }
  }

  if (options.dryRun) {
    log('  ◌ dry-run: nada se envió al proveedor.')

    return { runDir, layersJson, document: null, reused: false }
  }

  const cap = resolveCostCap(options.maxUsd)

  if (estimate.usd !== null && estimate.usd > cap && !options.yes) {
    throw new Error(`La cota (USD ${estimate.usd.toFixed(2)}) supera el tope de USD ${cap.toFixed(2)}. Repite con --yes o ajusta --max-usd.`)
  }

  const uploaded = await uploadFalFile({ bytes, fileName: 'source.png', contentType: 'image/png' })

  log(`  → ${capability.slug} …`)

  const result = await runFalModel<Record<string, unknown>>({
    model: capability.slug,
    input: { image_url: uploaded.url, image_size: imageSize, ...(options.prompt ? { prompt: options.prompt } : {}) },
    pollTimeoutMs: 10 * 60_000
  })

  if (!result.ok || !result.output) throw new Error(`fal ${capability.slug} falló (HTTP ${result.httpStatus})${result.errorDetail ? `: ${result.errorDetail}` : ''}`)

  const raw = Array.isArray(result.output.layers) ? (result.output.layers as Array<Record<string, unknown>>) : []

  if (!raw.length) throw new Error('Layerize no devolvió capas.')

  const layers: LayerRecord[] = []
  let base: LayersDocument['base'] | null = null

  for (let index = 0; index < raw.length; index += 1) {
    const entry = raw[index]
    const url = (entry.image as { url?: unknown } | undefined)?.url

    if (typeof url !== 'string') continue

    const response = await fetch(url)

    if (!response.ok) throw new Error(`No se pudo descargar la capa ${index} (HTTP ${response.status}).`)

    const png = await sharp(Buffer.from(await response.arrayBuffer())).png().toBuffer({ resolveWithObject: true })
    const name = typeof entry.name === 'string' ? entry.name : null
    const file = index === 0 ? '00-base.png' : layerFileName(index, name)
    const absolute = (entry.bounding_box as { absolute?: unknown } | null | undefined)?.absolute

    await writeFileEnsured(join(runDir, file), png.data)

    const box = Array.isArray(absolute) && absolute.length === 4 ? { left: Number(absolute[0]), top: Number(absolute[1]), right: Number(absolute[2]), bottom: Number(absolute[3]) } : null

    if (index === 0) base = { file, width: png.info.width, height: png.info.height }

    layers.push({
      index,
      zIndex: typeof entry.z_index === 'number' ? entry.z_index : index,
      name,
      description: typeof entry.description === 'string' ? entry.description : null,
      file,
      width: png.info.width,
      height: png.info.height,
      box,
      alphaCoverage: box ? Math.round((await alphaCoverage(png.data)) * 1000) / 1000 : null
    })
  }

  if (!base) throw new Error('Layerize no devolvió la imagen base.')

  const separated = layers.filter(layer => layer.box).length
  const perLayer = perLayerUsd(base.width * base.height)

  const document: LayersDocument = {
    kind: 'ai-layers',
    version: 1,
    source: { image: options.imagePath, sha256: sha256(bytes), width: meta.width, height: meta.height },
    base,
    layers,
    request: { prompt: options.prompt ?? null, imageSize },
    cost: {
      layerCount: separated,
      perLayerUsd: perLayer,
      estimatedUsd: perLayer === null ? null : Math.round(perLayer * separated * 10_000) / 10_000,
      note: 'Por capa separada; si la base también se cobra está sin dato: confirmar con pnpm ai:fal --balance antes y después.'
    },
    providerMeta: { requestId: result.requestId, account: result.account }
  }

  await writeJson(layersJson, document)
  log(`  ✓ ${separated} capa(s) + base ${base.width}x${base.height} · costo ≈ USD ${document.cost.estimatedUsd?.toFixed(3) ?? 'sin dato'}`)

  return { runDir, layersJson, document, reused: false }
}
