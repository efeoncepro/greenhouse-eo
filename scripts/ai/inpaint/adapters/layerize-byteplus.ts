import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import sharp from 'sharp'

import { bytePlusImageRate, findBytePlusModel } from '@/lib/ai/byteplus-catalog'
import { generateBytePlusImages, readBytePlusOutput } from '@/lib/ai/byteplus'

import { alphaCoverage, layerFileName, type LayerRecord, type LayersDocument } from '../layers'
import { exists, readJson, sha256, stableStringify, writeFileEnsured, writeJson } from '../run-io'
import type { LayerizeOptions, LayerizeResult } from './layerize-fal'

export interface BytePlusLayerizeOptions extends LayerizeOptions { model?: 'seedream5-pro' | 'seedream5-flash' }

export const runBytePlusLayerize = async (options: BytePlusLayerizeOptions): Promise<LayerizeResult> => {
  const log = options.log ?? (line => process.stdout.write(`${line}\n`))
  const model = findBytePlusModel(options.model ?? 'seedream5-pro')
  const bytes = await readFile(options.imagePath)
  const meta = await sharp(bytes).metadata()

  if (!meta.width || !meta.height || !meta.format) throw new Error('Imagen de entrada inválida.')
  const imageSize = options.imageSize ?? 'auto'
  const key = sha256(stableStringify({ provider: 'byteplus', model: model.model, source: sha256(bytes), imageSize, prompt: options.prompt }))
  const runDir = join(options.runRoot, 'layers', `byteplus-${key.slice(0, 16)}`)
  const layersJson = join(runDir, 'layers.json')
  // 17 salidas al tier mayor: la forma de cada capa puede variar en auto.
  const capUsd = 17 * bytePlusImageRate(model, 4_624_220, true)

  log(`BytePlus ${model.id}: cota USD ${capUsd.toFixed(4)} (hasta 16 capas + base; tarifa por tamaño de cada salida).`)

  if (!options.force && await exists(layersJson)) return { runDir, layersJson, document: await readJson<LayersDocument>(layersJson), reused: true }
  if (options.dryRun) return { runDir, layersJson, document: null, reused: false }
  if (await exists(join(runDir, 'receipt.json')) && !options.force) throw new Error('Hay una respuesta BytePlus previa sin layers.json; no se repite para evitar doble gasto. Revisar la corrida o usar --force explícitamente.')
  const maxUsd = options.maxUsd ?? 1

  if (!Number.isFinite(maxUsd) || maxUsd <= 0) throw new Error('--max-usd debe ser positivo.')
  if (capUsd > maxUsd && (!options.yes || options.maxUsd !== undefined)) throw new Error(`La cota supera USD ${maxUsd}; aumenta --max-usd explícitamente.`)
  const normalized = await sharp(bytes).png().toBuffer()
  const size = { auto: 'auto', auto_1K: '1K', 'auto_1.5K': '1.5K', auto_2K: '2K' }[imageSize]

  const response = await generateBytePlusImages({
    model: model.model, image: `data:image/png;base64,${normalized.toString('base64')}`,
    layer_decomposition: true, size, response_format: 'url', output_format: 'png',
    ...(options.prompt ? { prompt: options.prompt } : {})
  })

  await writeJson(join(runDir, 'receipt.json'), { provider: 'byteplus', model: model.model, requestId: response.requestId, usage: response.data.usage })
  const entries = [...response.data.data].sort((a, b) => (a.z_index ?? -1) - (b.z_index ?? -1))

  if (entries.length < 2 || entries.length > 17 || entries[0]?.z_index !== 0 || entries.some(item => item.error) || new Set(entries.map(item => item.z_index)).size !== entries.length) {
    throw new Error('Respuesta de capas incompleta o inválida; la respuesta recibida no se reintenta.')
  }

  const layers: LayerRecord[] = []
  let base: LayersDocument['base'] | null = null
  let estimatedUsd = 0
  const rates: number[] = []

  for (const entry of entries) {
    const index = entry.z_index!
    const png = await sharp(await readBytePlusOutput(entry)).png().toBuffer({ resolveWithObject: true })
    const file = index === 0 ? '00-base.png' : layerFileName(index, entry.name ?? null)
    const absolute = entry.bounding_box?.absolute

    const box = absolute?.length === 4 && absolute.every(Number.isFinite)
      ? { left: absolute[0], top: absolute[1], right: absolute[2], bottom: absolute[3] } : null

    if (index !== 0 && (!box || box.right <= box.left || box.bottom <= box.top)) throw new Error('Capa sin caja válida; no se usa para máscaras.')
    if (index !== 0 && png.info.channels !== 4) throw new Error('Capa sin canal alfa; no se usa como capa transparente.')
    await writeFileEnsured(join(runDir, file), png.data)
    if (index === 0) base = { file, width: png.info.width, height: png.info.height }
    const rate = bytePlusImageRate(model, png.info.width * png.info.height, true)

    rates.push(rate)
    estimatedUsd += rate
    layers.push({ index, zIndex: index, name: entry.name ?? null, description: entry.description ?? null, file,
      width: png.info.width, height: png.info.height, box,
      alphaCoverage: box ? Math.round(await alphaCoverage(png.data) * 1000) / 1000 : null })
  }

  if (!base) throw new Error('Falta la base de Layerize.')

  const document: LayersDocument = {
    kind: 'ai-layers', version: 1, source: { image: options.imagePath, sha256: sha256(bytes), width: meta.width, height: meta.height }, base, layers,
    request: { prompt: options.prompt ?? null, imageSize },
    cost: { layerCount: layers.length - 1, perLayerUsd: new Set(rates).size === 1 ? rates[0] : null,
      estimatedUsd: Math.round(estimatedUsd * 1e6) / 1e6, note: 'Estimado por tamaño de cada capa + base; no settlement. Tarifas de la cuenta 2026-10-12.' },
    providerMeta: { provider: 'byteplus', model: model.model, requestId: response.requestId, usage: response.data.usage }
  }

  await writeJson(layersJson, document)
  log(`${layers.length - 1} capas + base; costo estimado USD ${document.cost.estimatedUsd!.toFixed(4)}.`)

  return { runDir, layersJson, document, reused: false }
}
