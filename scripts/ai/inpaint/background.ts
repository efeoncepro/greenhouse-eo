import { join } from 'node:path'

import sharp from 'sharp'

import type { InpaintImageAdapter, ProviderMaskMode } from './adapters/types'
import { maskFromLayers } from './layers'
import { encodeMaskPng, erode, feather, invert, maskFromSubject, type CanonicalMask } from './mask'
import { runImageInpaint, type ImageInpaintResult } from './pipeline-image'
import { sha256, writeFileEnsured } from './run-io'

/**
 * `pnpm ai:inpaint background` (TASK-1973, Slice 5): cambia el fondo y deja el SUJETO intacto en delta 0.
 *
 * La máscara es el inverso del sujeto (matting local de IMG.LY o capas de `pnpm ai:layers`). El sujeto se erosiona
 * `edge` px antes de invertir para que el modelo rehaga el borde fino (pelo, contornos translúcidos) contra el fondo
 * nuevo; esa franja es la costura que se mide y se reporta.
 */
export const BACKGROUND_PROMPT_SUFFIX =
  'Replace only the background behind the subject. Keep the subject exactly as it is; match the light direction and color temperature of the new background on the subject edges.'

export const backgroundMask = async (subject: CanonicalMask, edgePx = 3): Promise<CanonicalMask> => feather(invert(erode(subject, edgePx)), Math.max(1, edgePx))

export interface BackgroundOptions {
  imagePath: string
  layersJson?: string
  layerSelectors?: string[]
  edgePx?: number
  prompt: string
  adapter: InpaintImageAdapter
  model?: string
  quality?: string
  providerMask?: ProviderMaskMode
  count?: number
  runRoot: string
  dryRun?: boolean
  force?: boolean
  maxUsd?: number
  yes?: boolean
  allowBrand?: boolean
  log?: (line: string) => void
}

export const runBackground = async (options: BackgroundOptions): Promise<ImageInpaintResult> => {
  const log = options.log ?? (line => process.stdout.write(`${line}\n`))
  const meta = await sharp(options.imagePath).metadata()

  if (!meta.width || !meta.height) throw new Error('No se pudo leer el tamaño de la imagen.')

  const subject = options.layersJson
    ? await maskFromLayers(options.layersJson, options.layerSelectors ?? [], { width: meta.width, height: meta.height })
    : await maskFromSubject(options.imagePath, { editable: 'subject' })

  const mask = await backgroundMask(subject, options.edgePx ?? 3)
  const png = await encodeMaskPng(mask)
  const maskPath = join(options.runRoot, 'background-masks', `${sha256(png).slice(0, 12)}.png`)

  await writeFileEnsured(maskPath, png)
  log(`  ✎ fondo = inverso del sujeto (${options.layersJson ? 'capas' : 'matting local'}), borde rehecho ${options.edgePx ?? 3} px`)

  const result = await runImageInpaint({
    imagePath: options.imagePath,
    maskPath,
    prompt: options.prompt,
    promptSuffix: BACKGROUND_PROMPT_SUFFIX,
    adapter: options.adapter,
    model: options.model,
    quality: options.quality,
    providerMask: options.providerMask,
    count: options.count,
    crop: 'off',
    runRoot: options.runRoot,
    dryRun: options.dryRun,
    force: options.force,
    maxUsd: options.maxUsd,
    yes: options.yes,
    allowBrand: options.allowBrand,
    log
  })

  for (const candidate of result.manifest.candidates) {
    log(`    · costura en el borde del sujeto: delta medio ${candidate.seam.meanDelta}/255 en ${candidate.seam.pixels} px (míralo al 100 %)`)
  }

  return result
}
