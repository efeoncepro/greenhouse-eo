import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'

import { config as loadEnv } from 'dotenv'

import { runFalModel, uploadFalFile } from '@/lib/ai/fal'
import { FAL_CAPABILITIES, findFalCapability, type FalCapability } from '@/lib/ai/fal-capabilities'

/**
 * CLI de fal.ai para Greenhouse — `pnpm ai:fal`.
 *
 * Hermano de `pnpm ai:image`, NO su reemplazo. Son CLIs separados a propósito: `ai:image` habla el
 * contrato de OpenAI (model/quality/size) y fal tiene un esquema de input POR ENDPOINT. Mezclarlos
 * ensuciaría el que ya funciona.
 *
 * Es model-agnostic por diseño: `--capability` resuelve un slug conocido del registro, y `--model`
 * acepta CUALQUIER slug de fal — incluidos los que el registro todavía no lista. Por eso agregar video
 * no exige tocar este archivo: basta declarar la capacidad, o pasar su slug a mano.
 *
 * Uso:
 *   pnpm ai:fal --list
 *   pnpm ai:fal --capability seedream5-pro --prompt "<texto>" --out out.png
 *   pnpm ai:fal --capability seedream5-pro-edit --image base.png --prompt "<delta>" --out out.png
 *   pnpm ai:fal --capability seedream5-pro-layerize --image poster.png --out-dir ./capas
 *   pnpm ai:fal --model <cualquier/slug/fal> --prompt "<texto>" --input '{"campo":"valor"}'
 *
 * Flags:
 *   --capability <id>   Capacidad del registro (ver --list)
 *   --model <slug>      Slug de fal directo (model-agnostic; ignora el registro)
 *   --prompt <texto> | --prompt-file <path>
 *   --image <path|url>  Entrada visual; repetible. Los archivos locales se suben al storage de fal
 *   --size <valor>      image_size: enum (auto_2K, landscape_16_9, …) o WxH
 *   --count <n>         num_images
 *   --format jpeg|png
 *   --input <json>      JSON extra que se fusiona con el input (escape hatch para campos no cubiertos)
 *   --out <path>        Salida única · --out-dir <dir> para varias
 *   --timeout <ms>      Presupuesto de polling (default 180000; el video necesita más)
 *   --json              Imprime el output crudo del modelo
 */

loadEnv({ path: join(process.cwd(), '.env.local') })

const DEFAULT_OUT_DIR = join(process.cwd(), 'public', 'images', 'generated')
const DEFAULT_TIMEOUT_MS = 180_000
/** El video tarda bastante más que una imagen; el default sube solo para capacidades de video. */
const VIDEO_TIMEOUT_MS = 900_000

interface CliArgs {
  capability?: string
  duration?: string
  resolution?: string
  aspect?: string
  bitrate?: string
  task?: string
  noAudio: boolean
  endImage?: string
  audios: string[]
  videos: string[]
  model?: string
  prompt?: string
  promptFile?: string
  images: string[]
  size?: string
  count?: number
  format?: string
  extraInput?: string
  out?: string
  outDir?: string
  timeoutMs: number
  json: boolean
  list: boolean
  help: boolean
}

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = {
    images: [],
    audios: [],
    videos: [],
    noAudio: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    json: false,
    list: false,
    help: false
  }

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
      case '--size': args.size = next(); break
      case '--count': args.count = Math.max(1, Number(next()) || 1); break
      case '--format': args.format = next(); break
      case '--input': args.extraInput = next(); break
      case '--out': args.out = next(); break
      case '--out-dir': args.outDir = next(); break
      case '--timeout': args.timeoutMs = Math.max(10_000, Number(next()) || DEFAULT_TIMEOUT_MS); break
      case '--json': args.json = true; break
      case '--list': args.list = true; break
      case '--help':
      case '-h': args.help = true; break
      default: throw new Error(`Argumento desconocido: ${argv[i]}`)
    }
  }

  return args
}

const resolvePath = (p: string): string => (isAbsolute(p) ? p : join(process.cwd(), p))
const isRemote = (value: string) => /^https?:\/\//i.test(value)

const mimeFor = (path: string): string => {
  const ext = extname(path).toLowerCase()

  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.mp4') return 'video/mp4'

  return 'image/png'
}

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

interface DownloadableAsset {
  url: string
  suggestedName: string
  meta?: Record<string, unknown>
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
      const image = (entry.image ?? {}) as Record<string, unknown>
      const url = typeof image.url === 'string' ? image.url : null

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

  // Video: single object o array, según el endpoint.
  const video = body.video ?? body.videos

  if (video && typeof video === 'object') {
    const list = Array.isArray(video) ? video : [video]

    list.forEach((item, index) => {
      const entry = item as Record<string, unknown>

      if (typeof entry.url === 'string') assets.push({ url: entry.url, suggestedName: `video-${index}` })
    })
  }

  if (!assets.length && capability) {
    process.stderr.write(
      `  ⚠ el output no trajo "${capability.outputKey}". Usa --json para ver la forma real y ajusta el registro.\n`
    )
  }

  return assets
}

const downloadAsset = async (url: string, target: string) => {
  const response = await fetch(url)

  if (!response.ok) throw new Error(`No se pudo descargar ${url} (HTTP ${response.status})`)

  const buffer = Buffer.from(await response.arrayBuffer())

  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, buffer)

  return buffer.length
}

const printCapabilities = () => {
  process.stdout.write('\nCapacidades registradas (pnpm ai:fal --capability <id>):\n\n')

  for (const kind of ['image', 'video'] as const) {
    process.stdout.write(`  ${kind.toUpperCase()}\n`)

    for (const capability of FAL_CAPABILITIES.filter(item => item.kind === kind)) {
      const state = capability.verifiedAt ? `verificada ${capability.verifiedAt}` : 'SIN VERIFICAR'

      process.stdout.write(`    ${capability.id.padEnd(24)} ${capability.label}\n`)
      process.stdout.write(`    ${''.padEnd(24)} ${capability.slug}  [${state}]\n`)
    }

    process.stdout.write('\n')
  }

  process.stdout.write('  Cualquier otro slug de fal: pnpm ai:fal --model <slug> --input \'{"campo":"valor"}\'\n\n')
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    process.stdout.write('Ver el encabezado de scripts/ai/fal-image.ts para el detalle de flags.\n')
    printCapabilities()
    process.exit(0)
  }

  if (args.list) {
    printCapabilities()
    process.exit(0)
  }

  if (!args.capability && !args.model) {
    throw new Error('Indica --capability <id> (ver --list) o --model <slug> para un slug directo.')
  }

  const capability = args.capability ? findFalCapability(args.capability) ?? null : null

  if (args.capability && !capability) {
    throw new Error(
      `--capability "${args.capability}" no existe. Válidas: ${FAL_CAPABILITIES.map(item => item.id).join(', ')}`
    )
  }

  const slug = args.model ?? capability?.slug

  if (!slug) throw new Error('No se pudo resolver el slug del modelo.')

  const prompt = args.promptFile ? (await readFile(resolvePath(args.promptFile), 'utf8')).trim() : args.prompt?.trim()

  if (capability?.requiresPrompt && !prompt) {
    throw new Error(`La capacidad "${capability.id}" requiere --prompt o --prompt-file.`)
  }

  if (capability && capability.inputMedia !== 'none' && !args.images.length) {
    throw new Error(`La capacidad "${capability.id}" requiere al menos un --image.`)
  }

  if (capability && capability.inputMedia === 'none' && args.images.length) {
    throw new Error(`La capacidad "${capability.id}" no recibe imágenes de entrada; quita --image.`)
  }

  // Una capacidad declarada y nunca ejercitada puede fallar o devolver otra forma: se avisa ANTES de gastar.
  if (capability && !capability.verifiedAt) {
    process.stderr.write(
      `⚠ "${capability.id}" está declarada pero NO verificada contra el API real. ` +
        'Si funciona, anota la fecha en src/lib/ai/fal-capabilities.ts.\n'
    )
  }

  const videoContract = capability?.video ?? null

  // El contrato de video difiere POR ENDPOINT. Validar acá evita quemar una corrida pidiéndole 4K a un
  // modelo que topa en 1080p, o 30 s a uno que llega a 15: el proveedor lo rechazaría después de cobrar
  // la cola, y el operador se enteraría por un error críptico.
  if (args.duration && args.duration !== 'auto') {
    const seconds = Number(args.duration)

    if (!Number.isFinite(seconds) || seconds < 1) {
      throw new Error(`--duration "${args.duration}" no es válido: usa "auto" o un número de segundos.`)
    }

    if (videoContract && seconds > videoContract.maxDurationSeconds) {
      throw new Error(
        `--duration ${seconds}s excede el máximo de "${capability?.id}" (${videoContract.maxDurationSeconds}s).`
      )
    }
  }

  if (args.resolution && videoContract && !videoContract.resolutions.includes(args.resolution)) {
    throw new Error(
      `--resolution "${args.resolution}" no está en "${capability?.id}". Soportadas: ${videoContract.resolutions.join(', ')}.`
    )
  }

  if (args.aspect && videoContract && !videoContract.aspectRatios.includes(args.aspect)) {
    throw new Error(
      `--aspect "${args.aspect}" no está en "${capability?.id}". Soportados: ${videoContract.aspectRatios.join(', ')}.`
    )
  }

  if (args.bitrate && videoContract && !videoContract.supportsBitrateMode) {
    throw new Error(`"${capability?.id}" no acepta --bitrate; ese endpoint no expone bitrate_mode.`)
  }

  if (args.task && capability && capability.operation !== 'reference-to-video') {
    throw new Error(`--task sólo aplica a reference-to-video; "${capability.id}" es ${capability.operation}.`)
  }

  const input: Record<string, unknown> = {}

  if (prompt) input.prompt = prompt
  if (args.duration) input.duration = args.duration
  if (args.resolution) input.resolution = args.resolution
  if (args.aspect) input.aspect_ratio = args.aspect
  if (args.bitrate) input.bitrate_mode = args.bitrate
  if (args.task) input.task = args.task
  if (args.noAudio) input.generate_audio = false
  if (args.size) input.image_size = parseSize(args.size)
  if (args.count) input.num_images = args.count
  if (args.format) input.output_format = args.format

  if (args.images.length) {
    const urls = await resolveMediaUrls(args.images)
    const field = capability?.inputMediaField ?? (urls.length > 1 ? 'image_urls' : 'image_url')

    input[field] = field === 'image_urls' ? urls : urls[0]
  }

  if (args.endImage) {
    const [endUrl] = await resolveMediaUrls([args.endImage])

    input.end_image_url = endUrl
  }

  if (args.audios.length) input.audio_urls = await resolveMediaUrls(args.audios)
  if (args.videos.length) input.video_urls = await resolveMediaUrls(args.videos)

  if (args.extraInput) Object.assign(input, JSON.parse(args.extraInput) as Record<string, unknown>)

  const timeoutMs =
    args.timeoutMs === DEFAULT_TIMEOUT_MS && capability?.kind === 'video' ? VIDEO_TIMEOUT_MS : args.timeoutMs

  process.stdout.write(`→ ${slug}${capability?.kind === 'video' ? ` · hasta ${Math.round(timeoutMs / 1000)}s de espera` : ''}\n`)

  const result = await runFalModel({ model: slug, input, pollTimeoutMs: timeoutMs })

  if (!result.ok) {
    process.stderr.write(`FATAL: ${slug} falló (HTTP ${result.httpStatus})${result.errorDetail ? `: ${result.errorDetail}` : ''}\n`)
    process.exit(1)
  }

  if (args.json) process.stdout.write(`${JSON.stringify(result.output, null, 2)}\n`)

  const assets = extractAssets(result.output, capability)

  if (!assets.length) {
    process.stdout.write(`  ✓ sin assets descargables · ${result.latencyMs} ms\n`)
    process.exit(0)
  }

  const outDir = args.outDir ? resolvePath(args.outDir) : DEFAULT_OUT_DIR
  const manifest: Record<string, unknown>[] = []

  for (const [index, asset] of assets.entries()) {
    const remoteExt = extname(new URL(asset.url).pathname) || '.png'

    const target =
      args.out && assets.length === 1
        ? resolvePath(args.out)
        : join(outDir, `${asset.suggestedName}${remoteExt}`)

    const bytes = await downloadAsset(asset.url, target)

    process.stdout.write(`  ✓ ${Math.round(bytes / 1024)}KB · ${target.replace(process.cwd(), '.')}\n`)
    manifest.push({ index, file: target.replace(`${process.cwd()}/`, ''), ...asset.meta })
  }

  // Las capas traen metadata que se pierde si sólo se guardan los PNG.
  if (capability?.outputKey === 'layers') {
    const manifestPath = join(outDir, 'layers.json')

    await writeFile(manifestPath, `${JSON.stringify({ slug, layers: manifest }, null, 2)}\n`)
    process.stdout.write(`  ✓ metadata de capas → ${manifestPath.replace(process.cwd(), '.')}\n`)
  }

  process.stdout.write(`done · ${result.latencyMs} ms · ${assets.length} asset(s)\n`)
}

void main().catch((error: unknown) => {
  process.stderr.write(`FATAL: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
