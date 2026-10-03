import { join } from 'node:path'

import type { InpaintImageAdapter, ProviderMaskMode } from './adapters/types'
import { buildExpandedCanvas, expansionMask, planExpansion, type ExpandAnchor, type ExpansionPlan } from './expand'
import { encodeMaskPng } from './mask'
import { runImageInpaint, type ImageInpaintResult } from './pipeline-image'
import { encodeRgbaPng, loadRgba } from './raw'
import { readJson, sha256, stableStringify, writeFileEnsured, writeJson } from './run-io'

/**
 * `pnpm ai:inpaint expand` (TASK-1973, Slice 1): arma el lienzo expandido y su máscara y delega en el pipeline de
 * imagen, que genera, recompone y verifica la escena en delta 0 fuera de la franja de fundido.
 */
export interface ExpandOptions {
  imagePath: string
  to?: string
  canvas?: { width: number; height: number }
  scale?: number
  anchor?: ExpandAnchor
  fill?: 'mirror' | 'neutral'
  blend?: number
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

export interface ExpandResult extends ImageInpaintResult {
  plan: ExpansionPlan
}

export const DEFAULT_EXPAND_PROMPT_SUFFIX =
  'Extend the scene naturally into the empty margins: continue the surfaces, light, perspective and grain of the photo. Do not add new subjects, text or logos.'

export const runExpand = async (options: ExpandOptions): Promise<ExpandResult> => {
  const log = options.log ?? (line => process.stdout.write(`${line}\n`))
  const source = await loadRgba(options.imagePath, 'escena')
  const plan = planExpansion({ sourceWidth: source.width, sourceHeight: source.height, to: options.to, canvas: options.canvas, scale: options.scale, anchor: options.anchor })
  const blend = options.blend ?? 24

  log(
    `  ⤢ lienzo ${plan.canvas.width}x${plan.canvas.height} · escena ${plan.scene.width}x${plan.scene.height} en (${plan.scene.left}, ${plan.scene.top})` +
      (plan.scale < 1 ? ` · escena re-muestreada al ${(plan.scale * 100).toFixed(1)} %` : '') +
      ` · relleno previo ${options.fill ?? 'mirror'} · fundido ${blend} px`
  )

  const canvas = await buildExpandedCanvas(source, plan, options.fill ?? 'mirror')
  const mask = expansionMask(plan, blend)
  const canvasPng = await encodeRgbaPng(canvas)
  const id = sha256(stableStringify({ image: sha256(source.data), plan, fill: options.fill ?? 'mirror', blend })).slice(0, 12)
  const canvasPath = join(options.runRoot, 'expand-inputs', `${id}-canvas.png`)
  const maskPath = join(options.runRoot, 'expand-inputs', `${id}-mask.png`)

  await writeFileEnsured(canvasPath, canvasPng)
  await writeFileEnsured(maskPath, await encodeMaskPng(mask))

  const result = await runImageInpaint({
    imagePath: canvasPath,
    maskPath,
    prompt: options.prompt,
    promptSuffix: DEFAULT_EXPAND_PROMPT_SUFFIX,
    adapter: options.adapter,
    model: options.model,
    quality: options.quality,
    providerMask: options.providerMask,
    count: options.count,
    // El área nueva rodea la escena: se genera el lienzo completo.
    crop: 'off',
    runRoot: options.runRoot,
    dryRun: options.dryRun,
    force: options.force,
    maxUsd: options.maxUsd,
    yes: options.yes,
    allowBrand: options.allowBrand,
    log
  })

  const manifestPath = join(result.runDir, 'manifest.json')
  const manifest = await readJson<Record<string, unknown>>(manifestPath)

  if (manifest) {
    await writeJson(manifestPath, { ...manifest, expand: { source: options.imagePath, sourceSha256: sha256(source.data), to: options.to ?? null, plan, fill: options.fill ?? 'mirror', blend } })
  }

  return { ...result, plan }
}
