import 'server-only'

import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'
import { promisify } from 'node:util'

import { config as loadEnv } from 'dotenv'

import {
  awaitFalRequest,
  FAL_ACCOUNT_ENV_VARS,
  getFalAccountBalances,
  getFalEndpointPricing,
  getFalRequestStatus,
  isFalBalanceLock,
  resolveFalQueueHandle,
  runFalModel,
  uploadFalFile,
  type FalAccountName
} from '@/lib/ai/fal'
import { FAL_CAPABILITIES, findFalCapability, type FalCapability, type FalReferenceSlot } from '@/lib/ai/fal-capabilities'
import {
  assertMaxInputImages,
  assertSeedAllowed,
  assertSplitThreshold,
  assertTrainingFrames,
  detectMediaFormat,
  parseLoraFlag,
  reconcileOutputExtension,
  resolveImageOutputFormat
} from '@/lib/ai/fal-input-rules'
import { estimateFalCost, resolveFalCostCap } from '@/lib/ai/fal-pricing'
import { findHiggsfieldCapability, HIGGSFIELD_CAPABILITY_PREFIX } from '@/lib/ai/higgsfield-capabilities'

import { printHiggsfieldCapabilities, runHiggsfieldLane } from './higgsfield-lane'

/**
 * CLI de modelos de media para Greenhouse — `pnpm ai:fal`. Dos proveedores: fal.ai (default) y Higgsfield.
 *
 * Hermano de `pnpm ai:image`, NO su reemplazo. Son CLIs separados a propósito: `ai:image` habla el
 * contrato de OpenAI (model/quality/size) y fal tiene un esquema de input POR ENDPOINT. Mezclarlos
 * ensuciaría el que ya funciona.
 *
 * Es model-agnostic por diseño: `--capability` resuelve un slug conocido del registro, y `--model`
 * acepta CUALQUIER slug de fal — incluidos los que el registro todavía no lista.
 *
 * Higgsfield (`--provider higgsfield`, implícito en cualquier `--capability hf-*`) vive en `higgsfield-lane.ts`: valida
 * contra el JSON Schema del endpoint, pide el precio EXACTO a la API de estimación (que tampoco cobra) y comparte los
 * flags de medios/video de abajo. Los flags propios de fal (LoRA, keyframes, --task, entrenamiento…) se rechazan.
 *   pnpm ai:fal --capability hf-soul2 --prompt "<texto>" --aspect 3:4 --out retrato.jpg
 *   pnpm ai:fal --capability hf-kling3-std-t2v --prompt "<texto>" --duration 5 --estimate
 *   pnpm ai:fal --provider higgsfield --request-id <id> --status | --cancel
 *
 * Uso:
 *   pnpm ai:fal --list
 *   pnpm ai:fal --balance                     (saldo USD de cada cuenta de fal configurada; gratis)
 *   pnpm ai:fal --capability seedream5-pro --prompt "<texto>" --out out.png
 *   pnpm ai:fal --capability seedream5-pro-layerize --image poster.png --out-dir ./capas
 *   pnpm ai:fal --capability h3turbo-t2v --prompt "<texto>" --duration 5 --resolution 768P --out clip.mp4
 *   pnpm ai:fal --capability h3max-camera --image escena.png --camera-trajectory '[{"distance":1,"elevation":10,"azimuth":0,"time":0},{"distance":1,"elevation":10,"azimuth":60,"time":1}]'
 *   pnpm ai:fal --capability h3-train-t2v --training-data dataset.zip --steps 1500 --trigger "estilo efeonce"
 *   pnpm ai:fal --capability h3-t2v --request-id <id> --out clip.mp4     (retoma sin volver a pagar)
 *
 * Flags generales:
 *   --capability <id> | --model <slug>
 *   --prompt <texto> | --prompt-file <path>
 *   --image <path|url>   Entrada visual (o imagen de referencia en reference-to-video); repetible
 *   --input <json>       JSON extra que se fusiona con el input (escape hatch para campos no cubiertos)
 *   --out <path> | --out-dir <dir>
 *   --timeout <ms>       Presupuesto de polling (imagen 3 min · video 30 min · entrenamiento 3 h)
 *   --request-id <id>    Retoma un trabajo ya encolado en vez de enviar uno nuevo
 *   --detach             Encola, imprime request_id y cuenta, y termina sin esperar (recupéralo con --request-id)
 *   --status             Con --request-id: consulta una vez si terminó, sin esperar ni descargar (no cobra)
 *   --json               Imprime el output crudo del modelo
 *   --yes                Confirma corridas cuya estimación supera el tope (default USD 1; env FAL_COST_CONFIRM_USD)
 *   --max-usd <n>        Tope de confirmación para esta corrida
 *   --provider <fal|higgsfield>  Default fal; `--capability hf-*` implica higgsfield
 *   --estimate           Valida e imprime el costo sin encolar (fal: estimación local · higgsfield: API del proveedor)
 *   --cancel             Higgsfield, con --request-id: cancela mientras siga en cola (se reembolsa)
 *   --fal-account <FAL_API_KEY|FAL_API_KEY_B>  Fuerza una cuenta. Omitido = la de más saldo, y si fal la bloquea por
 *                        saldo pasa sola a la otra (el bloqueo ocurre antes de encolar: no cobra)
 *
 * Imagen:  --size <enum|WxH> · --count <n> · --format jpeg|png
 * Video:   --duration · --resolution · --aspect · --bitrate · --task · --no-audio · --end-image
 *          --video <path|url> y --audio <path|url> (referencias, repetibles) · --prompt-expansion <modo>
 *          --lora <path[@scale][#weight_name]> (repetible) · --camera-trajectory <json>
 *          Flux 3: --keyframe <imagen>@<frame_index> (repetible) · --safety-tolerance 0-4 · --draft-cache <url>
 *          (en edit/extend el video de origen va por --video)
 *          Wan 3.0: --thinking · --web-url <url> · --file <path|url> (ambos exigen --thinking) · --no-prompt-expansion
 *          --seed <n> (cualquier endpoint que lo acepte)
 * LoRA:    --training-data <zip|url> · --steps <n> · --rank <n> · --learning-rate <n> · --trigger <frase>
 *          --frames <n> (22–124, frames % 17 == 5) · --split-threshold <s> (1–60)
 *
 * Sin --resolution en video, el CLI envía la resolución MÁS BARATA del endpoint y lo avisa (Wan 3.0 y H3 base
 * tienen defaults caros: 1080p y 2K). Antes de encolar imprime el costo estimado y pide --yes sobre el tope.
 */

loadEnv({ path: join(process.cwd(), '.env.local') })

const DEFAULT_OUT_DIR = join(process.cwd(), 'public', 'images', 'generated')
const DEFAULT_TIMEOUT_MS = 180_000
/**
 * El video tarda bastante más que una imagen; el default sube solo para capacidades de video. 30 min porque Seedance
 * 2.5 referencias a video superó 15 min en la verificación del 2026-09-16 (y se recuperó con --request-id).
 */
const VIDEO_TIMEOUT_MS = 1_800_000
/** Un entrenamiento de miles de steps corre por horas. */
const TRAINING_TIMEOUT_MS = 10_800_000

interface CliArgs {
  capability?: string
  model?: string
  prompt?: string
  promptFile?: string
  images: string[]
  duration?: string
  resolution?: string
  aspect?: string
  bitrate?: string
  task?: string
  noAudio: boolean
  endImage?: string
  audios: string[]
  videos: string[]
  promptExpansion?: string
  loras: string[]
  cameraTrajectory?: string
  trainingData?: string
  steps?: string
  rank?: string
  learningRate?: string
  trigger?: string
  keyframes: string[]
  safetyTolerance?: string
  draftCache?: string
  thinking: boolean
  webUrl?: string
  file?: string
  noPromptExpansion: boolean
  seed?: string
  frames?: string
  splitThreshold?: string
  yes: boolean
  maxUsd?: string
  requestId?: string
  size?: string
  count?: number
  format?: string
  extraInput?: string
  out?: string
  outDir?: string
  timeoutMs?: number
  json: boolean
  list: boolean
  balance: boolean
  detach: boolean
  status: boolean
  falAccount?: FalAccountName
  provider?: MediaProvider
  estimate: boolean
  cancel: boolean
  help: boolean
}

const MEDIA_PROVIDERS = ['fal', 'higgsfield'] as const

type MediaProvider = (typeof MEDIA_PROVIDERS)[number]

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = { images: [], audios: [], videos: [], loras: [], keyframes: [], noAudio: false, thinking: false, noPromptExpansion: false, json: false, list: false, balance: false, detach: false, status: false, estimate: false, cancel: false, yes: false, help: false }

  let i = 0

  const next = (): string => {
    const value = argv[++i]

    if (value === undefined) throw new Error(`Falta el valor de ${argv[i - 1]}`)

    return value
  }

  for (; i < argv.length; i++) {
    switch (argv[i]) {
      case '--capability': args.capability = next(); break
      case '--model': args.model = next(); break
      case '--prompt': args.prompt = next(); break
      case '--prompt-file': args.promptFile = next(); break
      case '--image': args.images.push(next()); break
      case '--duration': args.duration = next(); break
      case '--resolution': args.resolution = next(); break
      case '--aspect': args.aspect = next(); break
      case '--bitrate': args.bitrate = next(); break
      case '--task': args.task = next(); break
      case '--no-audio': args.noAudio = true; break
      case '--end-image': args.endImage = next(); break
      case '--audio': args.audios.push(next()); break
      case '--video': args.videos.push(next()); break
      case '--prompt-expansion': args.promptExpansion = next(); break
      case '--lora': args.loras.push(next()); break
      case '--camera-trajectory': args.cameraTrajectory = next(); break
      case '--training-data': args.trainingData = next(); break
      case '--steps': args.steps = next(); break
      case '--rank': args.rank = next(); break
      case '--learning-rate': args.learningRate = next(); break
      case '--trigger': args.trigger = next(); break
      case '--keyframe': args.keyframes.push(next()); break
      case '--safety-tolerance': args.safetyTolerance = next(); break
      case '--draft-cache': args.draftCache = next(); break
      case '--thinking': args.thinking = true; break
      case '--web-url': args.webUrl = next(); break
      case '--file': args.file = next(); break
      case '--no-prompt-expansion': args.noPromptExpansion = true; break
      case '--seed': args.seed = next(); break
      case '--frames': args.frames = next(); break
      case '--split-threshold': args.splitThreshold = next(); break
      case '--yes': args.yes = true; break
      case '--max-usd': args.maxUsd = next(); break
      case '--request-id': args.requestId = next(); break
      case '--size': args.size = next(); break
      case '--count': args.count = Math.max(1, Number(next()) || 1); break
      case '--format': args.format = next(); break
      case '--input': args.extraInput = next(); break
      case '--out': args.out = next(); break
      case '--out-dir': args.outDir = next(); break
      case '--timeout': args.timeoutMs = Math.max(10_000, Number(next()) || DEFAULT_TIMEOUT_MS); break
      case '--json': args.json = true; break
      case '--list': args.list = true; break
      case '--balance': args.balance = true; break
      case '--detach': args.detach = true; break
      case '--status': args.status = true; break
      case '--estimate': args.estimate = true; break
      case '--cancel': args.cancel = true; break

      case '--provider': {
        const value = next()

        if (!(MEDIA_PROVIDERS as readonly string[]).includes(value)) {
          throw new Error(`--provider debe ser uno de: ${MEDIA_PROVIDERS.join(', ')}.`)
        }

        args.provider = value as MediaProvider
        break
      }

      case '--fal-account': {
        const value = next()

        if (!(FAL_ACCOUNT_ENV_VARS as readonly string[]).includes(value)) {
          throw new Error(`--fal-account debe ser uno de: ${FAL_ACCOUNT_ENV_VARS.join(', ')}.`)
        }

        args.falAccount = value as FalAccountName
        break
      }

      case '--help':
      case '-h': args.help = true; break
      default: throw new Error(`Argumento desconocido: ${argv[i]}`)
    }
  }

  return args
}

const resolvePath = (p: string): string => (isAbsolute(p) ? p : join(process.cwd(), p))
const isRemote = (value: string) => /^https?:\/\//i.test(value)

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.zip': 'application/zip',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

/**
 * ¿El video local trae pista de audio? `null` si no se puede saber (URL remota o ffprobe no instalado): en ese
 * caso el CLI avisa en vez de bloquear.
 */
const hasAudioTrack = async (source: string): Promise<boolean | null> => {
  if (isRemote(source)) return null

  try {
    const { stdout } = await promisify(execFile)('ffprobe', [
      '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', resolvePath(source)
    ])

    return stdout.trim().length > 0
  } catch {
    return null
  }
}

const mimeFor = (path: string): string => MIME_BY_EXT[extname(path).toLowerCase()] ?? 'application/octet-stream'

/** Sube los archivos locales y deja pasar las URLs remotas tal cual. */
const resolveMediaUrls = async (inputs: string[]): Promise<string[]> => {
  const urls: string[] = []

  for (const input of inputs) {
    if (isRemote(input)) {
      urls.push(input)
      continue
    }

    const path = resolvePath(input)
    const bytes = await readFile(path)

    process.stdout.write(`  ↑ subiendo ${basename(path)} …\n`)

    const uploaded = await uploadFalFile({
      bytes: new Uint8Array(bytes),
      fileName: basename(path),
      contentType: mimeFor(path)
    })

    urls.push(uploaded.url)
  }

  return urls
}

/** `image_size` acepta el enum del proveedor o un objeto {width,height}: WxH se traduce. */
const parseSize = (raw: string): string | { width: number; height: number } => {
  const match = /^(\d+)x(\d+)$/i.exec(raw.trim())

  return match ? { width: Number(match[1]), height: Number(match[2]) } : raw.trim()
}

const parseCameraTrajectory = (raw: string, maxKeyframes: number): Record<string, number>[] => {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('--camera-trajectory no es JSON válido. Espera un arreglo de {distance, elevation, azimuth, time}.')
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('--camera-trajectory debe ser un arreglo con al menos un keyframe.')
  }

  if (parsed.length > maxKeyframes) {
    throw new Error(`--camera-trajectory trae ${parsed.length} keyframes; el máximo es ${maxKeyframes}.`)
  }

  return parsed.map((frame, index) => {
    const entry = (frame ?? {}) as Record<string, unknown>

    for (const key of ['distance', 'elevation', 'azimuth', 'time']) {
      if (typeof entry[key] !== 'number' || !Number.isFinite(entry[key])) {
        throw new Error(`--camera-trajectory keyframe ${index}: "${key}" debe ser numérico.`)
      }
    }

    const { distance, elevation, azimuth, time } = entry as Record<string, number>

    if (elevation < -90 || elevation > 90) throw new Error(`keyframe ${index}: elevation fuera de [-90, 90].`)
    if (time < 0 || time > 1) throw new Error(`keyframe ${index}: time fuera de [0, 1].`)

    return { distance, elevation, azimuth, time }
  })
}

/** Valida cantidad contra el slot declarado y resuelve las URLs. */
const resolveReferences = async (
  flag: string,
  values: string[],
  slot: FalReferenceSlot | undefined,
  capability: FalCapability | null
): Promise<{ field: string; urls: string[] } | null> => {
  if (!values.length) return null

  if (capability && !slot) {
    throw new Error(`"${capability.id}" no acepta ${flag}.`)
  }

  if (slot?.max !== null && slot?.max !== undefined && values.length > slot.max) {
    throw new Error(`${flag} admite hasta ${slot.max} en "${capability?.id}"; pasaste ${values.length}.`)
  }

  return { field: slot?.field ?? (flag === '--video' ? 'video_urls' : 'audio_urls'), urls: await resolveMediaUrls(values) }
}

interface DownloadableAsset {
  url: string
  suggestedName: string
  meta?: Record<string, unknown>
}

const fileUrl = (value: unknown): string | null => {
  const entry = (value ?? {}) as Record<string, unknown>

  return typeof entry.url === 'string' ? entry.url : null
}

/** Normaliza la salida del modelo a una lista de assets descargables, sea cual sea su forma. */
const extractAssets = (output: unknown, capability: FalCapability | null): DownloadableAsset[] => {
  const assets: DownloadableAsset[] = []
  const body = (output ?? {}) as Record<string, unknown>

  // Capas: el caso rico — cada una trae nombre, z_index y bounding box.
  const layers = body.layers

  if (Array.isArray(layers)) {
    layers.forEach((layer, index) => {
      const entry = layer as Record<string, unknown>
      const url = fileUrl(entry.image)

      if (!url) return

      const rawName = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : `layer-${index}`
      const slug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `layer-${index}`
      const z = typeof entry.z_index === 'number' ? entry.z_index : index

      assets.push({
        url,
        suggestedName: `${String(z).padStart(2, '0')}-${slug}`,
        meta: { name: entry.name, description: entry.description, z_index: entry.z_index, bounding_box: entry.bounding_box }
      })
    })

    if (assets.length) return assets
  }

  // Imágenes.
  const images = body.images

  if (Array.isArray(images)) {
    images.forEach((image, index) => {
      const entry = image as Record<string, unknown>

      if (typeof entry.url === 'string') {
        assets.push({ url: entry.url, suggestedName: `image-${index}`, meta: { width: entry.width, height: entry.height } })
      }
    })

    if (assets.length) return assets
  }

  // Entrenamiento: la LoRA es el entregable; config y dataset de depuración la acompañan.
  for (const [key, name] of [['lora_file', 'lora'], ['config_file', 'config'], ['debug_dataset', 'debug-dataset']] as const) {
    const url = fileUrl(body[key])

    if (url) assets.push({ url, suggestedName: name })
  }

  if (assets.length) return assets

  // Video: single object o array, según el endpoint.
  const video = body.video ?? body.videos

  if (video && typeof video === 'object') {
    const list = Array.isArray(video) ? video : [video]

    list.forEach((item, index) => {
      const url = fileUrl(item)

      if (url) assets.push({ url, suggestedName: `video-${index}` })
    })
  }

  if (!assets.length && capability) {
    process.stderr.write(
      `  ⚠ el output no trajo "${capability.outputKey}". Usa --json para ver la forma real y ajusta el registro.\n`
    )
  }

  return assets
}

/**
 * Descarga y guarda con la extensión del formato REAL (por sus bytes). Si difiere de la pedida, corrige la ruta y lo
 * avisa: nunca más un JPEG guardado como .png.
 */
const downloadAsset = async (url: string, target: string): Promise<{ bytes: number; path: string }> => {
  const response = await fetch(url)

  if (!response.ok) throw new Error(`No se pudo descargar ${url} (HTTP ${response.status})`)

  const buffer = Buffer.from(await response.arrayBuffer())
  const finalPath = reconcileOutputExtension(target, detectMediaFormat(new Uint8Array(buffer.subarray(0, 32))))

  if (finalPath !== target) {
    process.stderr.write(`  ⚠ el archivo real no coincide con la extensión pedida: se guarda como ${basename(finalPath)}\n`)
  }

  await mkdir(dirname(finalPath), { recursive: true })
  await writeFile(finalPath, buffer)

  return { bytes: buffer.length, path: finalPath }
}

const printCapabilities = () => {
  process.stdout.write('\nCapacidades registradas (pnpm ai:fal --capability <id>):\n\n')

  for (const kind of ['image', 'video', 'training'] as const) {
    process.stdout.write(`  ${kind.toUpperCase()}\n`)

    for (const capability of FAL_CAPABILITIES.filter(item => item.kind === kind)) {
      const state = capability.unsupportedReason
        ? 'NO OPERABLE POR COLA'
        : capability.verifiedAt
          ? `verificada ${capability.verifiedAt}`
          : 'SIN VERIFICAR'

      process.stdout.write(`    ${capability.id.padEnd(24)} ${capability.label}\n`)
      process.stdout.write(`    ${''.padEnd(24)} ${capability.slug}  [${state}]\n`)
    }

    process.stdout.write('\n')
  }

  process.stdout.write('  Cualquier otro slug de fal: pnpm ai:fal --model <slug> --input \'{"campo":"valor"}\'\n\n')
}

/** Construye el input validando CADA flag contra el contrato del endpoint, antes de gastar. */
const buildInput = async (args: CliArgs, capability: FalCapability | null): Promise<Record<string, unknown>> => {
  const prompt = args.promptFile ? (await readFile(resolvePath(args.promptFile), 'utf8')).trim() : args.prompt?.trim()
  const video = capability?.video ?? null
  const training = capability?.training ?? null
  const input: Record<string, unknown> = {}
  const isReference = capability?.operation === 'reference-to-video'

  if (capability?.requiresPrompt && !prompt) {
    throw new Error(`La capacidad "${capability.id}" requiere --prompt o --prompt-file.`)
  }

  if (capability) {
    const referenceCount = args.images.length + args.videos.length + args.audios.length
    // En editar/extender, el medio principal es un VIDEO: llega por --video, no por --image.
    const primaryIsVideo = capability.inputMediaField === 'video_url'
    const primary = primaryIsVideo ? args.videos : args.images
    const primaryFlag = primaryIsVideo ? '--video' : '--image'

    if (primaryIsVideo && args.images.length) {
      throw new Error(`"${capability.id}" parte de un video: pásalo con --video, no con --image.`)
    }

    if (isReference && capability.video?.requiresVisualReference && args.images.length + args.videos.length === 0) {
      throw new Error(`"${capability.id}" necesita al menos una imagen o un video de referencia; el audio solo no alcanza.`)
    }

    // Wan 3.0 puede basar el video en una web o un documento en vez de medios.
    if (isReference && referenceCount === 0 && !args.webUrl && !args.file) {
      throw new Error(`"${capability.id}" necesita al menos una referencia: --image, --video o --audio.`)
    }

    if (!isReference && capability.inputMedia !== 'none' && !primary.length) {
      throw new Error(`La capacidad "${capability.id}" requiere ${primaryFlag}.`)
    }

    if (capability.inputMedia === 'none' && args.images.length) {
      throw new Error(
        capability.video?.keyframes
          ? `"${capability.id}" recibe las imágenes como --keyframe <imagen>@<frame_index>, no como --image.`
          : `La capacidad "${capability.id}" no recibe imágenes de entrada; quita --image.`
      )
    }

    if (capability.inputMedia === 'one' && primary.length > 1) {
      throw new Error(`La capacidad "${capability.id}" recibe un solo ${primaryFlag}.`)
    }

    const videoOnly: [string, unknown][] = [
      ['--duration', args.duration], ['--resolution', args.resolution], ['--aspect', args.aspect],
      ['--bitrate', args.bitrate], ['--task', args.task], ['--end-image', args.endImage],
      ['--prompt-expansion', args.promptExpansion], ['--camera-trajectory', args.cameraTrajectory],
      ['--no-audio', args.noAudio || undefined], ['--lora', args.loras.length || undefined],
      ['--keyframe', args.keyframes.length || undefined], ['--safety-tolerance', args.safetyTolerance],
      ['--draft-cache', args.draftCache], ['--thinking', args.thinking || undefined], ['--web-url', args.webUrl],
      ['--file', args.file], ['--no-prompt-expansion', args.noPromptExpansion || undefined]
    ]

    if (!video) {
      const misplaced = videoOnly.find(([, value]) => value !== undefined)

      if (misplaced) throw new Error(`${misplaced[0]} no aplica a "${capability.id}" (${capability.kind}).`)
    }

    const trainingOnly: [string, unknown][] = [
      ['--training-data', args.trainingData], ['--steps', args.steps], ['--rank', args.rank],
      ['--learning-rate', args.learningRate], ['--trigger', args.trigger], ['--frames', args.frames],
      ['--split-threshold', args.splitThreshold]
    ]

    if (!training) {
      const misplaced = trainingOnly.find(([, value]) => value !== undefined)

      if (misplaced) throw new Error(`${misplaced[0]} sólo aplica a entrenamiento de LoRA.`)
    }
  }

  if (prompt) input.prompt = prompt

  // ── Video ────────────────────────────────────────────────────────────────────────────────────
  if (args.duration) {
    const isAuto = args.duration === 'auto'
    const seconds = Number(args.duration)
    const contract = video?.duration

    if (video && !contract) {
      throw new Error(`"${capability?.id}" no acepta --duration: hereda la del video de origen.`)
    }

    if (isAuto && contract && !contract.acceptsAuto) {
      throw new Error(`"${capability?.id}" no acepta --duration auto; usa ${contract.min}–${contract.max}.`)
    }

    if (!isAuto && (!Number.isInteger(seconds) || seconds < (contract?.min ?? 1))) {
      throw new Error(`--duration "${args.duration}" no es válido${contract ? `: mínimo ${contract.min} s` : ''}.`)
    }

    if (!isAuto && contract && seconds > contract.max) {
      throw new Error(`--duration ${seconds}s excede el máximo de "${capability?.id}" (${contract.max}s).`)
    }

    // `auto` viaja como texto salvo que el endpoint lo pida como `null` (Wan 3.0); los segundos, como número sólo
    // si el endpoint los pide enteros.
    input.duration = isAuto ? (contract?.autoValue === null ? null : 'auto') : contract?.encoding === 'integer' ? seconds : args.duration
  }

  if (args.resolution) {
    const canonical = video?.resolutions.find(value => value.toLowerCase() === args.resolution!.toLowerCase())

    if (video && video.resolutions.length === 0) {
      throw new Error(`"${capability?.id}" no acepta --resolution${video.draftCache === 'produces' ? ': los drafts salen a resolución fija; la final se obtiene con flux3-enhance' : ''}.`)
    }

    if (video && !canonical) {
      throw new Error(`--resolution "${args.resolution}" no está en "${capability?.id}". Soportadas: ${video.resolutions.join(', ')}.`)
    }

    input.resolution = canonical ?? args.resolution
  }

  if (args.aspect) {
    if (video && video.aspectRatios.length === 0) {
      throw new Error(`"${capability?.id}" no acepta --aspect: el encuadre sale del medio de entrada.`)
    }

    if (video && !video.aspectRatios.includes(args.aspect)) {
      throw new Error(`--aspect "${args.aspect}" no está en "${capability?.id}". Soportados: ${video.aspectRatios.join(', ')}.`)
    }

    input.aspect_ratio = args.aspect
  }

  if (args.bitrate) {
    if (video && !video.supportsBitrateMode) throw new Error(`"${capability?.id}" no acepta --bitrate.`)
    input.bitrate_mode = args.bitrate
  }

  if (args.task) {
    if (video && !video.acceptsTask) {
      throw new Error(`"${capability?.id}" no acepta --task; sólo Seedance 2.5 reference-to-video lo expone.`)
    }

    if (!['reference', 'editing', 'extension'].includes(args.task)) {
      throw new Error(`--task "${args.task}" no es válido: reference, editing o extension.`)
    }

    // editing/extension trabajan SOBRE un video: sin él, fal no tiene qué editar ni continuar.
    if (args.task !== 'reference' && !args.videos.length) {
      throw new Error(`--task ${args.task} necesita el video de origen por --video.`)
    }

    // El proveedor fuerza estos campos a auto: pasarlos sólo engañaría al operador sobre lo que va a recibir.
    if (args.task === 'editing' && (args.duration || args.aspect)) {
      throw new Error('--task editing ignora --duration y --aspect (el proveedor los fuerza a auto): quítalos.')
    }

    if (args.task === 'extension' && args.aspect) {
      throw new Error('--task extension ignora --aspect (el proveedor lo fuerza a auto): quítalo.')
    }

    input.task = args.task
  }

  if (args.noAudio) {
    if (video && !video.supportsAudioToggle) throw new Error(`"${capability?.id}" no acepta --no-audio.`)
    input[video?.audioField ?? 'generate_audio'] = false
  }

  if (args.promptExpansion) {
    if (video && !video.promptExpansion) throw new Error(`"${capability?.id}" no acepta --prompt-expansion.`)

    if (video?.promptExpansion && !video.promptExpansion.modes.includes(args.promptExpansion)) {
      throw new Error(`--prompt-expansion "${args.promptExpansion}" no está en "${capability?.id}". Modos: ${video.promptExpansion.modes.join(', ')}.`)
    }

    input.prompt_expansion_mode = args.promptExpansion
  } else if (video?.promptExpansion?.required) {
    // El endpoint rechaza el pedido sin el campo: se envía el default declarado, explícito.
    input.prompt_expansion_mode = video.promptExpansion.defaultMode
  }

  if (video?.loras) {
    if (!args.loras.length) throw new Error(`"${capability?.id}" exige al menos un --lora <path[@scale]>.`)
    if (args.loras.length > video.loras.max) throw new Error(`"${capability?.id}" admite hasta ${video.loras.max} --lora.`)

    input.loras = args.loras.map(raw => parseLoraFlag(raw, video.loras!.scaleMin, video.loras!.scaleMax))
  } else if (args.loras.length) {
    if (capability) throw new Error(`"${capability.id}" no acepta --lora; usa su variante /lora.`)
    input.loras = args.loras.map(raw => parseLoraFlag(raw, 0, 4))
  }

  if (args.cameraTrajectory) {
    if (video && !video.cameraTrajectory) throw new Error(`"${capability?.id}" no acepta --camera-trajectory.`)
    input.camera_trajectory = parseCameraTrajectory(args.cameraTrajectory, video?.cameraTrajectory?.maxKeyframes ?? 12)
  }

  if (args.noPromptExpansion) {
    if (video && !video.promptExpansionToggle) {
      throw new Error(`"${capability?.id}" no acepta --no-prompt-expansion${video.promptExpansion ? '; usa --prompt-expansion disabled' : ''}.`)
    }

    input.enable_prompt_expansion = false
  }

  if (args.thinking) {
    if (video && !video.thinking) throw new Error(`"${capability?.id}" no acepta --thinking.`)
    input.enable_thinking = true
  }

  if (args.webUrl || args.file) {
    const flag = args.webUrl ? '--web-url' : '--file'

    if (video && !video.thinking?.groundingSources) {
      throw new Error(`"${capability?.id}" no acepta ${flag}; sólo Wan 3.0 referencias a video se basa en una web o un documento.`)
    }

    // El proveedor exige el razonamiento para leer la fuente: se pide explícito para que el operador sepa que lo activa.
    if (video && !args.thinking) throw new Error(`${flag} exige --thinking (el modelo razona sobre la fuente antes de generar).`)

    if (args.webUrl) {
      if (!isRemote(args.webUrl)) throw new Error('--web-url debe ser una URL pública http(s).')
      input.web_url = args.webUrl
    }

    if (args.file) input.file_url = (await resolveMediaUrls([args.file]))[0]
  }

  if (args.seed !== undefined) {
    assertSeedAllowed(capability, args.seed)

    const seed = Number(args.seed)

    if (!Number.isInteger(seed) || seed < 0) throw new Error('--seed debe ser un entero >= 0.')
    input.seed = seed
  }

  if (args.safetyTolerance !== undefined) {
    const tolerance = Number(args.safetyTolerance)
    const range = video?.safetyTolerance

    if (video && !range) throw new Error(`"${capability?.id}" no acepta --safety-tolerance.`)

    if (!Number.isInteger(tolerance) || (range && (tolerance < range.min || tolerance > range.max))) {
      throw new Error(`--safety-tolerance debe ser entero${range ? ` entre ${range.min} y ${range.max}` : ''}.`)
    }

    input.safety_tolerance = tolerance
  }

  if (video?.keyframes) {
    if (!args.keyframes.length) throw new Error(`"${capability?.id}" exige al menos un --keyframe <imagen>@<frame_index>.`)
    if (args.keyframes.length > video.keyframes.max) throw new Error(`"${capability?.id}" admite hasta ${video.keyframes.max} --keyframe.`)

    const parsed = args.keyframes.map(raw => {
      const at = raw.lastIndexOf('@')
      const index = Number(raw.slice(at + 1))

      if (at <= 0 || !Number.isInteger(index) || index < 0) {
        throw new Error(`--keyframe "${raw}" debe tener la forma <imagen>@<frame_index> con un índice entero >= 0.`)
      }

      return { source: raw.slice(0, at), frameIndex: index }
    })

    const urls = await resolveMediaUrls(parsed.map(item => item.source))

    input.keyframes = parsed.map((item, i) => ({ frame_index: item.frameIndex, image_url: urls[i] }))
  } else if (args.keyframes.length && capability) {
    throw new Error(`"${capability.id}" no acepta --keyframe; usa flux3-keyframes.`)
  }

  if (video?.draftCache === 'consumes') {
    if (!args.draftCache) throw new Error(`"${capability?.id}" exige --draft-cache <url> (lo imprime un draft de Flux 3).`)
    input.draft_cache_url = args.draftCache
  } else if (args.draftCache && capability) {
    throw new Error(`"${capability.id}" no acepta --draft-cache; sólo flux3-enhance lo consume.`)
  }

  // ── Medios ───────────────────────────────────────────────────────────────────────────────────
  if (args.images.length) {
    const slot = video?.references?.images

    assertMaxInputImages(capability, args.images.length)

    if (slot?.max !== null && slot?.max !== undefined && args.images.length > slot.max) {
      throw new Error(`--image admite hasta ${slot.max} en "${capability?.id}"; pasaste ${args.images.length}.`)
    }

    const urls = await resolveMediaUrls(args.images)
    const field = capability?.inputMediaField ?? (urls.length > 1 ? 'image_urls' : 'image_url')

    // Campo singular (`image_url`, `start_image_url`) recibe una URL; los plurales, la lista.
    input[field] = capability?.inputMedia === 'one' || (!capability && field === 'image_url') ? urls[0] : urls
  }

  if (video?.endImageRequired && !args.endImage) {
    throw new Error(`"${capability?.id}" exige --end-image: el último cuadro es obligatorio.`)
  }

  if (args.endImage) {
    if (video && !video.acceptsEndImage) throw new Error(`"${capability?.id}" no acepta --end-image.`)

    const [endUrl] = await resolveMediaUrls([args.endImage])

    input.end_image_url = endUrl
  }

  let referenceVideos = args.videos

  if (video?.requiresSourceAudio && args.videos.length) {
    const audio = await hasAudioTrack(args.videos[0])

    if (audio === false) {
      throw new Error(
        `"${capability?.id}" exige que el video de origen traiga pista de audio; sin ella fal lo rechaza tras encolarlo ` +
          '(422 genérico). Agrega una pista (aunque sea silencio) o genera el origen sin --no-audio.'
      )
    }

    if (audio === null) {
      process.stderr.write('  ⚠ no se pudo verificar la pista de audio del origen: sin ella, fal rechaza la extensión.\n')
    }
  }

  if (capability?.inputMediaField === 'video_url') {
    const [sourceUrl] = await resolveMediaUrls(args.videos)

    input.video_url = sourceUrl
    referenceVideos = []
  }

  for (const [flag, values, slot] of [
    ['--video', referenceVideos, video?.references?.videos],
    ['--audio', args.audios, video?.references?.audios]
  ] as const) {
    const resolved = await resolveReferences(flag, values, slot, capability)

    if (resolved) input[resolved.field] = resolved.urls
  }

  // ── Entrenamiento ────────────────────────────────────────────────────────────────────────────
  if (training) {
    if (args.steps !== undefined) {
      const steps = Number(args.steps)

      if (!Number.isInteger(steps) || steps < training.steps.min || steps > training.steps.max) {
        throw new Error(`--steps debe ser entero entre ${training.steps.min} y ${training.steps.max}.`)
      }

      input.number_of_steps = steps
    }

    if (args.rank !== undefined) {
      const rank = Number(args.rank)

      if (!training.ranks.includes(rank)) throw new Error(`--rank debe ser uno de ${training.ranks.join(', ')}.`)
      input.rank = rank
    }

    if (args.learningRate !== undefined) {
      const rate = Number(args.learningRate)

      if (!Number.isFinite(rate) || rate < training.learningRate.min || rate > training.learningRate.max) {
        throw new Error(`--learning-rate debe estar entre ${training.learningRate.min} y ${training.learningRate.max}.`)
      }

      input.learning_rate = rate
    }

    if (args.trigger) input.trigger_phrase = args.trigger
    if (args.frames !== undefined) input.number_of_frames = assertTrainingFrames(training, args.frames)
    if (args.splitThreshold !== undefined) input.split_input_duration_threshold = assertSplitThreshold(training, args.splitThreshold)

    if (args.trainingData) {
      const [dataUrl] = await resolveMediaUrls([args.trainingData])

      input[training.dataField] = dataUrl
    }
  }

  // ── Imagen ───────────────────────────────────────────────────────────────────────────────────
  if (args.size) input.image_size = parseSize(args.size)
  if (args.count) input.num_images = args.count
  // Seedream Pro entrega JPEG por defecto: sin esto, `--out x.png` guardaba un JPEG con extensión .png.
  const outputFormat = resolveImageOutputFormat({ capability, format: args.format, outPath: args.out })

  if (outputFormat) input.output_format = outputFormat

  if (args.extraInput) Object.assign(input, JSON.parse(args.extraInput) as Record<string, unknown>)

  // `--input` también pasa por las reglas del entrenador: una regla que se salta por el escape hatch no protege.
  if (training) {
    if (input.number_of_frames !== undefined) assertTrainingFrames(training, input.number_of_frames)
    if (input.split_input_duration_threshold !== undefined) assertSplitThreshold(training, input.split_input_duration_threshold)

    const steps = Number(input.number_of_steps ?? training.steps.defaultValue)

    if (steps < training.minBillableSteps) {
      process.stderr.write(`  ⚠ ${steps} steps: fal cobra un mínimo de ${training.minBillableSteps} steps.\n`)
    }
  }

  // Sin --resolution, la más barata del endpoint (explícita): Wan 3.0 (1080p) y H3 base (2K) tienen defaults caros.
  if (video && !args.resolution && video.resolutions.length && input.resolution === undefined) {
    input.resolution = video.resolutions[0]
    process.stdout.write(`  · sin --resolution: uso ${video.resolutions[0]}, la más barata de "${capability?.id}" (opciones: ${video.resolutions.join(', ')})\n`)
  }

  if (training && typeof input[training.dataField] !== 'string') {
    throw new Error(`"${capability?.id}" requiere --training-data <zip|url> (o ${training.dataField} en --input).`)
  }

  return input
}

/** Duración de un video local con ffprobe (para estimar edit/enhance); `null` si no se puede medir. */
const probeDurationSeconds = async (source: string | undefined): Promise<number | null> => {
  if (!source || isRemote(source)) return null

  try {
    const { stdout } = await promisify(execFile)('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', resolvePath(source)])
    const seconds = Number(stdout.trim())

    return Number.isFinite(seconds) ? seconds : null
  } catch {
    return null
  }
}

/**
 * Imprime el costo estimado y exige --yes sobre el tope. No bloquea cuando no hay estimación (slug fuera del registro
 * o datos faltantes): lo avisa, para no frenar un `--model` directo.
 */
const confirmEstimatedCost = async (params: {
  args: CliArgs
  capability: FalCapability | null
  slug: string
  input: Record<string, unknown>
}) => {
  const { args, capability, slug, input } = params
  const cap = resolveFalCostCap(args.maxUsd)

  if (!capability) {
    process.stdout.write(`  $ costo: sin estimación (slug fuera del registro) · revisa fal.ai/models/${slug}\n`)

    return
  }

  const needsApi = capability.pricing && (capability.pricing.unit === 'token_1k' || capability.pricing.unit === 'step' || !(capability.pricing.publishedUsdByResolution || capability.pricing.publishedUsdPerUnit || capability.pricing.publishedUsdByArea))
  const apiPrice = needsApi ? await getFalEndpointPricing(slug) : null
  // Sólo editar cobra la duración del video de origen; extender cobra los segundos NUEVOS de --duration.
  const sourceSeconds = capability.operation === 'video-edit' ? await probeDurationSeconds(args.videos[0]) : null
  const estimate = estimateFalCost({ capability, input, apiPrice, sourceSeconds })

  if (estimate.usd === null) {
    process.stdout.write(`  $ costo: sin estimación (${estimate.basis})\n`)

    return
  }

  process.stdout.write(`  $ costo estimado ≈ USD ${estimate.usd.toFixed(2)} · ${estimate.basis}\n`)

  if (estimate.usd > cap && !args.yes) {
    throw new Error(`la estimación (USD ${estimate.usd.toFixed(2)}) supera el tope de USD ${cap.toFixed(2)}. Repite con --yes para confirmar o ajusta --max-usd.`)
  }
}

/**
 * Proveedor de la corrida: `--provider` explícito, o Higgsfield si la capacidad es `hf-*`. Un `hf-*` con
 * `--provider fal` es contradictorio y se rechaza en vez de adivinar.
 */
const resolveProvider = (args: CliArgs): MediaProvider => {
  const isHiggsfieldId = Boolean(args.capability?.startsWith(HIGGSFIELD_CAPABILITY_PREFIX))

  if (isHiggsfieldId && args.provider === 'fal') {
    throw new Error(`--capability ${args.capability} es de Higgsfield; quita --provider fal.`)
  }

  if (isHiggsfieldId && args.capability && !findHiggsfieldCapability(args.capability)) {
    throw new Error(`--capability "${args.capability}" no existe en Higgsfield. Ver pnpm ai:fal --list --provider higgsfield.`)
  }

  return args.provider ?? (isHiggsfieldId ? 'higgsfield' : 'fal')
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    process.stdout.write('Ver el encabezado de scripts/ai/fal-image.ts para el detalle de flags.\n')
    if (args.provider !== 'higgsfield') printCapabilities()
    if (args.provider !== 'fal') printHiggsfieldCapabilities()
    process.exit(0)
  }

  if (args.balance) {
    if (args.provider !== 'higgsfield') {
      for (const { account, balance } of await getFalAccountBalances()) {
        process.stdout.write(`${account.padEnd(14)} ${balance === null ? 'saldo no disponible' : `USD ${balance.toFixed(2)}`}\n`)
      }
    }

    // Higgsfield no documenta un endpoint de saldo: no se inventa uno.
    if (args.provider !== 'fal') process.stdout.write(`${'HIGGSFIELD'.padEnd(14)} sin API de saldo documentada · console.higgsfield.ai/billing\n`)

    process.exit(0)
  }

  if (args.list) {
    if (args.provider !== 'higgsfield') printCapabilities()
    if (args.provider !== 'fal') printHiggsfieldCapabilities()
    process.exit(0)
  }

  const provider = resolveProvider(args)

  if (provider === 'higgsfield') {
    const falOnly: [string, unknown][] = [
      ['--bitrate', args.bitrate], ['--task', args.task], ['--prompt-expansion', args.promptExpansion],
      ['--lora', args.loras.length || undefined], ['--camera-trajectory', args.cameraTrajectory],
      ['--keyframe', args.keyframes.length || undefined], ['--safety-tolerance', args.safetyTolerance],
      ['--draft-cache', args.draftCache], ['--training-data', args.trainingData], ['--steps', args.steps],
      ['--rank', args.rank], ['--learning-rate', args.learningRate], ['--trigger', args.trigger],
      ['--frames', args.frames], ['--split-threshold', args.splitThreshold], ['--size', args.size],
      ['--fal-account', args.falAccount]
    ]

    await runHiggsfieldLane(
      { ...args, falOnlyFlags: falOnly.filter(([, value]) => value !== undefined).map(([flag]) => flag) },
      {
        resolvePath,
        isRemote,
        mimeFor,
        extractAssets: output => extractAssets(output, null),
        downloadAsset,
        probeDurationSeconds,
        defaultOutDir: DEFAULT_OUT_DIR
      }
    )

    return
  }

  if (args.cancel) throw new Error('--cancel sólo existe en Higgsfield: fal no expone cancelación en esta CLI.')

  if (!args.capability && !args.model) {
    throw new Error('Indica --capability <id> (ver --list) o --model <slug> para un slug directo.')
  }

  const capability = args.capability ? findFalCapability(args.capability) ?? null : null

  if (args.capability && !capability) {
    throw new Error(
      `--capability "${args.capability}" no existe. Válidas: ${FAL_CAPABILITIES.map(item => item.id).join(', ')}`
    )
  }

  if (capability?.unsupportedReason) {
    throw new Error(`"${capability.id}" no se puede operar desde este CLI: ${capability.unsupportedReason}`)
  }

  const slug = args.model ?? capability?.slug

  if (!slug) throw new Error('No se pudo resolver el slug del modelo.')

  const kindTimeout =
    capability?.kind === 'training' ? TRAINING_TIMEOUT_MS : capability?.kind === 'video' ? VIDEO_TIMEOUT_MS : DEFAULT_TIMEOUT_MS

  const timeoutMs = args.timeoutMs ?? kindTimeout

  const resumeHint = (requestId: string, account: FalAccountName | null) =>
    `pnpm ai:fal ${capability ? `--capability ${capability.id}` : `--model ${slug}`} --request-id ${requestId}${
      account ? ` --fal-account ${account}` : ''
    }`

  if (args.status) {
    if (!args.requestId) throw new Error('--status necesita --request-id <id>.')

    const state = await getFalRequestStatus({ model: slug, requestId: args.requestId, account: args.falAccount })

    if (!state.status) {
      throw new Error(`fal no encontró el request ${args.requestId} (HTTP ${state.httpStatus})${state.errorDetail ? `: ${state.errorDetail}` : ''}.`)
    }

    const position = state.queuePosition !== null ? ` · posición en cola ${state.queuePosition}` : ''

    process.stdout.write(`${state.status}${position} · cuenta ${state.account}\n`)

    if (state.status === 'COMPLETED') process.stdout.write(`  descárgalo con: ${resumeHint(args.requestId, state.account)}\n`)

    process.exit(0)
  }

  if (args.detach && args.requestId) throw new Error('--detach es para encolar uno nuevo; con --request-id usa --status.')

  let result

  if (args.requestId) {
    process.stdout.write(`↻ retomando ${slug} · request ${args.requestId}\n`)
    result = await awaitFalRequest({ model: slug, requestId: args.requestId, pollTimeoutMs: timeoutMs, account: args.falAccount })
  } else {
    // Una capacidad declarada y nunca ejercitada puede fallar o devolver otra forma: se avisa ANTES de gastar.
    if (capability && !capability.verifiedAt) {
      process.stderr.write(
        `⚠ "${capability.id}" está declarada pero NO verificada contra el API real. ` +
          'Si funciona, anota la fecha en src/lib/ai/fal-capabilities.ts.\n'
      )
    }

    const input = await buildInput(args, capability)

    await confirmEstimatedCost({ args, capability, slug, input })

    if (args.estimate) {
      process.stdout.write(`  (sólo estimación: no se encoló nada)\n  cuerpo: ${JSON.stringify(input)}\n`)
      process.exit(0)
    }

    process.stdout.write(`→ ${slug} · hasta ${Math.round(timeoutMs / 1000)}s de espera\n`)

    result = await runFalModel({
      model: slug,
      input,
      pollTimeoutMs: timeoutMs,
      account: args.falAccount,
      detach: args.detach,
      onEnqueued: handle => {
        process.stdout.write(`  ⋯ encolado · request_id ${handle.requestId} · cuenta ${handle.account}\n`)

        // La reconstrucción del retome debe coincidir con lo que fal devolvió; si no, el retome fallaría.
        const rebuilt = resolveFalQueueHandle(slug, handle.requestId)

        if (rebuilt.statusUrl !== handle.statusUrl) {
          process.stderr.write(`  ⚠ --request-id no podrá retomar este trabajo: fal usa ${handle.statusUrl}\n`)
        }
      }
    })
  }

  if (!result.ok) {
    process.stderr.write(`FATAL: ${slug} falló (HTTP ${result.httpStatus})${result.errorDetail ? `: ${result.errorDetail}` : ''}\n`)

    // Si llegó hasta acá bloqueado por saldo, ya se probaron TODAS las cuentas configuradas (o se forzó una).
    if (isFalBalanceLock(result.httpStatus, result.errorDetail)) {
      const balances = await getFalAccountBalances().catch(() => [])

      process.stderr.write(
        `  todas las cuentas de fal probadas están sin saldo: ${
          balances.map(item => `${item.account} ${item.balance === null ? '?' : `USD ${item.balance.toFixed(2)}`}`).join(' · ') ||
          'saldo no disponible'
        }. Recarga la cuenta que corresponde en fal.ai/dashboard/billing.\n`
      )
    }

    if (result.requestId) {
      process.stderr.write(`  request_id ${result.requestId}\n`)

      // Un timeout local NO detiene el trabajo en fal: sigue corriendo y se cobra. Se puede retomar.
      if (result.httpStatus === 408) {
        process.stderr.write(`  el trabajo sigue en fal; retómalo con:\n  ${resumeHint(result.requestId, result.account)}\n`)
      }
    }

    process.exit(1)
  }

  if (args.detach && result.requestId) {
    process.stdout.write(
      `  desacoplado: el trabajo sigue en fal.\n  estado:   pnpm ai:fal ${capability ? `--capability ${capability.id}` : `--model ${slug}`} --request-id ${result.requestId} --status${
        result.account ? ` --fal-account ${result.account}` : ''
      }\n  resultado: ${resumeHint(result.requestId, result.account)}\n`
    )
    process.exit(0)
  }

  if (args.json) process.stdout.write(`${JSON.stringify(result.output, null, 2)}\n`)

  const body = (result.output ?? {}) as Record<string, unknown>

  // H3 (expanded_prompt), Wan 3.0 (actual_prompt) y Grok (revised_prompt) reescriben el prompt: se muestra un
  // extracto; --json trae el texto completo.
  // Flux 3 draft: el cache es lo que permite subir a calidad final sin re-generar la toma.
  const draftCache = fileUrl(body.draft_cache) ?? (typeof body.draft_cache === 'string' ? body.draft_cache : null)

  if (draftCache) {
    process.stdout.write(`  draft_cache: ${draftCache}\n  mejóralo con: pnpm ai:fal --capability flux3-enhance --draft-cache "${draftCache}" --out <ruta>\n`)
  }

  const rewritten = [body.expanded_prompt, body.actual_prompt, body.revised_prompt].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  )

  if (rewritten) {
    const expanded = rewritten.trim().replace(/\s+/g, ' ')

    process.stdout.write(`  prompt expandido: ${expanded.length > 220 ? `${expanded.slice(0, 220)}… (--json para verlo entero)` : expanded}\n`)
  }

  const assets = extractAssets(result.output, capability)

  if (!assets.length) {
    process.stdout.write(`  ✓ sin assets descargables · ${result.latencyMs} ms\n`)
    process.exit(0)
  }

  const outDir = args.outDir ? resolvePath(args.outDir) : DEFAULT_OUT_DIR
  const manifest: Record<string, unknown>[] = []

  for (const [index, asset] of assets.entries()) {
    const remoteExt = extname(new URL(asset.url).pathname) || '.bin'

    const target =
      args.out && assets.length === 1
        ? resolvePath(args.out)
        : join(outDir, `${asset.suggestedName}${remoteExt}`)

    const saved = await downloadAsset(asset.url, target)

    process.stdout.write(`  ✓ ${Math.round(saved.bytes / 1024)}KB · ${saved.path.replace(process.cwd(), '.')}\n`)
    manifest.push({ index, file: saved.path.replace(`${process.cwd()}/`, ''), ...asset.meta })
  }

  // Las capas traen metadata que se pierde si sólo se guardan los PNG.
  if (capability?.outputKey === 'layers') {
    const manifestPath = join(outDir, 'layers.json')

    await writeFile(manifestPath, `${JSON.stringify({ slug, layers: manifest }, null, 2)}\n`)
    process.stdout.write(`  ✓ metadata de capas → ${manifestPath.replace(process.cwd(), '.')}\n`)
  }

  process.stdout.write(
    `done · ${result.latencyMs} ms · ${assets.length} asset(s) · request_id ${result.requestId} · cuenta ${result.account}\n`
  )
}

void main().catch((error: unknown) => {
  process.stderr.write(`FATAL: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
