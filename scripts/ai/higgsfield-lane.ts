import 'server-only'

import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import { resolveFalCostCap } from '@/lib/ai/fal-pricing'
import {
  awaitHiggsfieldRequest,
  cancelHiggsfieldRequest,
  estimateHiggsfieldCost,
  getHiggsfieldRequestStatus,
  isHiggsfieldConcurrencyLimit,
  isHiggsfieldInsufficientCredits,
  runHiggsfieldModel,
  uploadHiggsfieldFile,
  type HiggsfieldModelResult
} from '@/lib/ai/higgsfield'
import {
  findHiggsfieldCapability,
  getHiggsfieldSchema,
  HIGGSFIELD_CAPABILITIES,
  HIGGSFIELD_SCHEMA_CAPTURED_AT
} from '@/lib/ai/higgsfield-capabilities'
import { buildHiggsfieldInput, validateHiggsfieldInput } from '@/lib/ai/higgsfield-input-rules'
import { estimateHiggsfieldFormulaCost } from '@/lib/ai/higgsfield-pricing'

/**
 * Carril Higgsfield de `pnpm ai:fal` (`--provider higgsfield`, o cualquier `--capability hf-*`).
 *
 * Misma disciplina que el carril fal — validar antes de gastar, estimar y exigir `--yes` sobre el tope, poder retomar
 * sin volver a pagar, descargar siempre — con tres diferencias del proveedor:
 * 1. El precio NO se calcula: lo devuelve la API de estimación, que además valida el cuerpo sin cobrar.
 * 2. Seedance y Wan 3.0 sólo publican una fórmula: la CLI la aplica como cota (antes de descuento) y, si falta un dato
 *    que la fórmula necesita (duración de un video remoto), exige `--yes`.
 * 3. La salida vive ≥ 7 días en el proveedor: un trabajo desacoplado hay que descargarlo dentro de esa ventana.
 *
 * Los helpers de archivo/descarga llegan inyectados desde `fal-image.ts` para no duplicar su lógica (detección real
 * de formato, normalización de assets).
 */

const DEFAULT_TIMEOUT_MS = 180_000
const VIDEO_TIMEOUT_MS = 1_800_000

export interface HiggsfieldLaneArgs {
  capability?: string
  model?: string
  prompt?: string
  promptFile?: string
  images: string[]
  endImage?: string
  videos: string[]
  audios: string[]
  duration?: string
  resolution?: string
  aspect?: string
  seed?: string
  count?: number
  format?: string
  noAudio: boolean
  thinking: boolean
  webUrl?: string
  file?: string
  noPromptExpansion: boolean
  extraInput?: string
  out?: string
  outDir?: string
  timeoutMs?: number
  requestId?: string
  json: boolean
  detach: boolean
  status: boolean
  cancel: boolean
  estimate: boolean
  yes: boolean
  maxUsd?: string
  /** Flags que sólo tienen sentido en fal: si llegan, el carril los rechaza por nombre. */
  falOnlyFlags: string[]
}

export interface HiggsfieldLaneHelpers {
  resolvePath: (path: string) => string
  isRemote: (value: string) => boolean
  mimeFor: (path: string) => string
  extractAssets: (output: unknown) => { url: string; suggestedName: string; meta?: Record<string, unknown> }[]
  downloadAsset: (url: string, target: string) => Promise<{ bytes: number; path: string }>
  /** Duración de un video LOCAL con ffprobe; `null` si es remoto o no se puede medir. */
  probeDurationSeconds: (source: string | undefined) => Promise<number | null>
  defaultOutDir: string
}

const write = (text: string) => process.stdout.write(text)
const warn = (text: string) => process.stderr.write(text)

export const printHiggsfieldCapabilities = () => {
  write(`\nCapacidades Higgsfield (pnpm ai:fal --capability <id>; esquemas del ${HIGGSFIELD_SCHEMA_CAPTURED_AT}):\n\n`)

  for (const kind of ['image', 'video'] as const) {
    write(`  ${kind.toUpperCase()}\n`)

    for (const capability of HIGGSFIELD_CAPABILITIES.filter(item => item.kind === kind)) {
      const state = capability.verifiedAt
        ? `generación verificada ${capability.verifiedAt}`
        : capability.estimateVerifiedAt
          ? `estimación verificada ${capability.estimateVerifiedAt}`
          : 'SIN VERIFICAR'

      write(`    ${capability.id.padEnd(24)} ${capability.label}\n`)
      write(`    ${''.padEnd(24)} ${capability.endpoint}  [${state}]${capability.note ? ` · ${capability.note}` : ''}\n`)
    }

    write('\n')
  }

  write('  Cualquier otro endpoint de Higgsfield: pnpm ai:fal --provider higgsfield --model <endpoint> --input \'{"campo":"valor"}\'\n')
  write('  Refrescar esquemas: pnpm ai:higgsfield:sync-schemas\n\n')
}

/** Sube los archivos locales al storage de Higgsfield y deja pasar las URLs públicas tal cual. */
const resolveMedia = async (inputs: string[], helpers: HiggsfieldLaneHelpers): Promise<string[]> => {
  const urls: string[] = []

  for (const input of inputs) {
    if (helpers.isRemote(input)) {
      urls.push(input)
      continue
    }

    const path = helpers.resolvePath(input)
    const bytes = await readFile(path)

    write(`  ↑ subiendo ${basename(path)} …\n`)
    urls.push((await uploadHiggsfieldFile({ bytes: new Uint8Array(bytes), contentType: helpers.mimeFor(path) })).url)
  }

  return urls
}

const resumeHint = (requestId: string, label: string) => `pnpm ai:fal --provider higgsfield ${label} --request-id ${requestId}`

const reportFailure = (result: HiggsfieldModelResult, label: string): never => {
  warn(`FATAL: ${result.model} falló (HTTP ${result.httpStatus}${result.status ? ` · estado ${result.status}` : ''})${result.errorDetail ? `: ${result.errorDetail}` : ''}\n`)

  if (isHiggsfieldConcurrencyLimit(result.httpStatus, result.errorDetail)) {
    warn('  la cuenta llegó a su tope de requests simultáneos: espera que termine alguno (--status) y reintenta. No se cobró.\n')
  }

  if (isHiggsfieldInsufficientCredits(result.httpStatus, result.errorDetail)) {
    warn('  la cuenta de API de Higgsfield no tiene créditos (son distintos de los de la suscripción de la app). Recárgalos en console.higgsfield.ai/billing. No se cobró.\n')
  }

  if (result.requestId) {
    warn(`  request_id ${result.requestId}${result.correlationId ? ` · correlation_id ${result.correlationId}` : ''}\n`)

    // Un timeout local NO detiene el trabajo: sigue corriendo en el proveedor y se cobra si termina.
    if (result.httpStatus === 408 || result.httpStatus === 0) {
      warn(`  el trabajo sigue en Higgsfield; retómalo con:\n  ${resumeHint(result.requestId, label)}\n`)
    }
  }

  process.exit(1)
}

export const runHiggsfieldLane = async (args: HiggsfieldLaneArgs, helpers: HiggsfieldLaneHelpers) => {
  if (args.falOnlyFlags.length) {
    throw new Error(`${args.falOnlyFlags.join(', ')} ${args.falOnlyFlags.length === 1 ? 'es' : 'son'} de fal y no aplica${args.falOnlyFlags.length === 1 ? '' : 'n'} a Higgsfield. Para campos propios del endpoint usa --input '{...}'.`)
  }

  if (args.cancel || args.status) {
    if (!args.requestId) throw new Error(`${args.cancel ? '--cancel' : '--status'} necesita --request-id <id>.`)

    if (args.cancel) {
      const cancel = await cancelHiggsfieldRequest({ requestId: args.requestId })

      if (!cancel.ok) {
        throw new Error(`Higgsfield no canceló ${args.requestId} (HTTP ${cancel.httpStatus})${cancel.errorDetail ? `: ${cancel.errorDetail}` : ''}. Sólo se cancela mientras siga en cola.`)
      }

      write(`cancelado · ${args.requestId} (se reembolsa)\n`)

      return
    }

    const state = await getHiggsfieldRequestStatus({ requestId: args.requestId })

    if (!state.status) {
      throw new Error(`Higgsfield no encontró el request ${args.requestId} (HTTP ${state.httpStatus})${state.errorDetail ? `: ${state.errorDetail}` : ''}.`)
    }

    write(`${state.status}${state.errorDetail ? ` · ${state.errorDetail}` : ''}\n`)

    if (state.status === 'completed') {
      write(`  descárgalo con: ${resumeHint(args.requestId, args.capability ? `--capability ${args.capability}` : '')} (la salida dura ≥ 7 días en el proveedor)\n`)
    }

    return
  }

  const capability = args.capability ? findHiggsfieldCapability(args.capability) ?? null : null

  if (args.capability && !capability) {
    throw new Error(`--capability "${args.capability}" no existe en Higgsfield. Válidas: ${HIGGSFIELD_CAPABILITIES.map(item => item.id).join(', ')}`)
  }

  const endpoint = args.model ?? capability?.endpoint

  if (!endpoint) throw new Error('Indica --capability hf-<id> (ver --list) o --provider higgsfield --model <endpoint>.')

  const label = capability ? `--capability ${capability.id}` : `--model ${endpoint}`
  const isVideo = capability ? capability.kind === 'video' : /video|frame/i.test(endpoint)
  const timeoutMs = args.timeoutMs ?? (isVideo ? VIDEO_TIMEOUT_MS : DEFAULT_TIMEOUT_MS)

  if (args.detach && args.requestId) throw new Error('--detach es para encolar uno nuevo; con --request-id usa --status.')

  let result: HiggsfieldModelResult

  if (args.requestId) {
    write(`↻ retomando ${endpoint} · request ${args.requestId}\n`)
    result = await awaitHiggsfieldRequest({ requestId: args.requestId, model: endpoint, pollTimeoutMs: timeoutMs })
  } else {
    const schema = getHiggsfieldSchema(endpoint)

    if (!schema) warn(`  ⚠ "${endpoint}" no tiene esquema en el snapshot: sólo lo valida la estimación del proveedor.\n`)

    const prompt = args.promptFile ? (await readFile(helpers.resolvePath(args.promptFile), 'utf8')).trim() : args.prompt?.trim()

    let extraInput: Record<string, unknown> | undefined

    if (args.extraInput) {
      try {
        extraInput = JSON.parse(args.extraInput) as Record<string, unknown>
      } catch {
        throw new Error('--input no es JSON válido.')
      }
    }

    const media = {
      images: await resolveMedia(args.images, helpers),
      endImage: args.endImage ? (await resolveMedia([args.endImage], helpers))[0] : undefined,
      videos: await resolveMedia(args.videos, helpers),
      audios: await resolveMedia(args.audios, helpers),
      fileUrl: args.file ? (await resolveMedia([args.file], helpers))[0] : undefined
    }

    const { input, notes } = buildHiggsfieldInput({
      capabilityLabel: capability?.id ?? endpoint,
      schema,
      flags: {
        prompt,
        ...media,
        duration: args.duration,
        resolution: args.resolution,
        aspect: args.aspect,
        seed: args.seed,
        count: args.count,
        format: args.format,
        noAudio: args.noAudio,
        thinking: args.thinking,
        webUrl: args.webUrl,
        noPromptExpansion: args.noPromptExpansion,
        extraInput
      }
    })

    for (const note of notes) write(`  · ${note}\n`)

    if (schema) {
      const problems = validateHiggsfieldInput(schema, input)

      if (problems.length) {
        throw new Error(`el cuerpo no cumple el esquema de "${capability?.id ?? endpoint}":\n  - ${problems.join('\n  - ')}`)
      }
    }

    // La estimación valida con el esquema real del proveedor y no cobra: es la última puerta antes de gastar.
    const estimate = await estimateHiggsfieldCost({ model: endpoint, input })

    if (!estimate.ok) {
      throw new Error(`Higgsfield rechazó el cuerpo al estimar (HTTP ${estimate.httpStatus}, no se cobró): ${estimate.errorDetail}`)
    }

    const cap = resolveFalCostCap(args.maxUsd)

    if (estimate.usd !== null) {
      const discount = estimate.discountUsd ? ` (descuento ${estimate.discountPercentage ?? '?'} %: −USD ${estimate.discountUsd.toFixed(3)})` : ''

      write(`  $ costo exacto del proveedor = USD ${estimate.usd.toFixed(3)} · ${estimate.credits ?? '?'} créditos${discount}\n`)

      if (estimate.usd > cap && !args.yes && !args.estimate) {
        throw new Error(`el costo (USD ${estimate.usd.toFixed(3)}) supera el tope de USD ${cap.toFixed(2)}. Repite con --yes para confirmar o ajusta --max-usd.`)
      }
    } else {
      const measured = await Promise.all(args.videos.map(video => helpers.probeDurationSeconds(video)))
      const inputVideoSeconds = measured.every((value): value is number => value !== null) ? measured.reduce((sum, value) => sum + value, 0) : null
      const formula = estimateHiggsfieldFormulaCost({ endpoint, input, inputVideoSeconds })

      if (formula) {
        write(`  $ costo ≈ USD ${formula.usd.toFixed(3)} (cota) · ${formula.basis}\n`)

        if (formula.usd > cap && !args.yes && !args.estimate) {
          throw new Error(`la cota de costo (USD ${formula.usd.toFixed(3)}) supera el tope de USD ${cap.toFixed(2)}. Repite con --yes para confirmar o ajusta --max-usd.`)
        }
      } else {
        write(`  $ sin monto calculable; fórmula del proveedor: ${estimate.pricingDescription ?? 'sin descripción'}\n`)

        if (!args.yes && !args.estimate) {
          throw new Error('sin monto calculable no se encola sin confirmar: revisa la fórmula y repite con --yes.')
        }
      }
    }

    if (args.estimate) {
      write(`  (sólo estimación: no se encoló nada)\n  cuerpo: ${JSON.stringify(input)}\n`)

      return
    }

    write(`→ ${endpoint} · hasta ${Math.round(timeoutMs / 1000)}s de espera\n`)

    result = await runHiggsfieldModel({
      model: endpoint,
      input,
      pollTimeoutMs: timeoutMs,
      detach: args.detach,
      onEnqueued: handle => write(`  ⋯ encolado · request_id ${handle.requestId}\n`)
    })
  }

  if (!result.ok) reportFailure(result, label)

  if (args.detach && result.requestId) {
    write(
      `  desacoplado: el trabajo sigue en Higgsfield.\n  estado:    pnpm ai:fal --provider higgsfield --request-id ${result.requestId} --status\n` +
        `  cancelar:  pnpm ai:fal --provider higgsfield --request-id ${result.requestId} --cancel   (sólo mientras siga en cola)\n` +
        `  resultado: ${resumeHint(result.requestId, label)}\n  ⚠ la salida dura ≥ 7 días en el proveedor: descárgala dentro de esa ventana.\n`
    )

    return
  }

  if (args.json) write(`${JSON.stringify(result.output, null, 2)}\n`)

  const assets = helpers.extractAssets(result.output)

  if (!assets.length) {
    warn('  ⚠ el estado completed no trajo images/video. Usa --json para ver la forma real.\n')
    write(`  ✓ sin assets descargables · ${result.latencyMs} ms\n`)

    return
  }

  const outDir = args.outDir ? helpers.resolvePath(args.outDir) : helpers.defaultOutDir

  for (const asset of assets) {
    const remoteExt = extname(new URL(asset.url).pathname) || '.bin'
    const target = args.out && assets.length === 1 ? helpers.resolvePath(args.out) : `${outDir}/${asset.suggestedName}${remoteExt}`
    const saved = await helpers.downloadAsset(asset.url, target)

    write(`  ✓ ${Math.round(saved.bytes / 1024)}KB · ${saved.path.replace(process.cwd(), '.')}\n`)
  }

  write(`done · ${result.latencyMs} ms · ${assets.length} asset(s) · request_id ${result.requestId} · higgsfield\n`)
}
