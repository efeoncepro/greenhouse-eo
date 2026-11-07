import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join } from 'node:path'
import { spawn } from 'node:child_process'

import { config as loadEnv } from 'dotenv'
import sharp from 'sharp'

import {
  assertOpenAIImageInputFidelitySupported,
  assertOpenAIImageModelAvailable,
  assertOpenAIImageOptionsSupported,
  assertOpenAIImageQualitySupported,
  assertOpenAIImageSizeSupported,
  editOpenAIImage,
  estimateOpenAIImageOutputTokens,
  estimateOpenAIImageOutputUsd,
  generateOpenAIImage,
  isOpenAIImageBackground,
  isOpenAIImageComplexity,
  isOpenAIImageModel,
  isOpenAIImageModeration,
  isOpenAIImageInputFidelity,
  isOpenAIImageOutputFormat,
  isOpenAIImageQuality,
  isOpenAIImageSvgReasoningEffort,
  openAIImageModelsWith,
  OPENAI_IMAGE_BACKGROUNDS,
  OPENAI_IMAGE_COMPLEXITIES,
  OPENAI_IMAGE_GIF_FRAME_RANGE,
  OPENAI_IMAGE_INPUT_FIDELITIES,
  OPENAI_IMAGE_MODEL_IDS,
  OPENAI_IMAGE_MODERATIONS,
  OPENAI_IMAGE_OUTPUT_FORMATS,
  OPENAI_IMAGE_QUALITIES,
  OPENAI_IMAGE_SVG_REASONING_EFFORTS,
  type OpenAIImageBackground,
  type OpenAIImageComplexity,
  type OpenAIImageInputFidelity,
  type OpenAIImageModel,
  type OpenAIImageModeration,
  type OpenAIImageOutputFormat,
  type OpenAIImageQuality,
  type OpenAIImageSize,
  type OpenAIImageSvgReasoningEffort
} from '@/lib/ai/openai-image'

import { resolveOutputDir } from './resolve-output-dir'

// Self-contained: load .env.local so OPENAI_API_KEY_SECRET_REF resolves without manual sourcing.
loadEnv({ path: join(process.cwd(), '.env.local') })

/**
 * Greenhouse AI image CLI — generate images with OpenAI GPT Image (default gpt-image-2.5-flare since 2026-11-05).
 *
 * Canonical entry point: src/lib/ai/openai-image.ts (`generateOpenAIImage`). This CLI is
 * the operational wrapper around it (flexible out path + timeout + batch). For repo-bound
 * product assets prefer the runtime helper `src/lib/ai/image-generator.ts`; this CLI is for
 * operator/agent-driven generation (concepts, mockup fixtures, icon/asset batches).
 *
 * Usage:
 *   pnpm ai:image --prompt "a teal orbital mark, flat vector, transparent" [options]
 *   pnpm ai:image --prompt-file ./prompt.txt --out public/images/generated/mark.png
 *   pnpm ai:image --batch ./concepts.json   # [{ "filename": "a.png", "prompt": "…" }, …]
 *
 * Reference EDIT (image-to-image) — canonical path for character/asset consistency:
 *   pnpm ai:image --image ref.png --prompt "keep this exact character, change only <delta>" --out out.png
 *   --image can be repeated to pass multiple reference images.
 *
 * Options (all optional unless noted):
 *   --prompt <text>         Prompt text (required unless --prompt-file or --batch)
 *   --prompt-file <path>    Read the prompt from a file (long prompts)
 *   --batch <path>          JSON array of { filename, prompt } — generates each
 *   --image <path>          Reference image to EDIT (repeatable). Switches to image-to-image
 *                           via editOpenAIImage — preserves the reference (identity, style, logo)
 *                           while the prompt changes only the requested delta.
 *   --mask <path>           Máscara PNG que marca QUÉ zona se edita (inpainting). Requiere --image.
 *                           Mismo formato y mismas dimensiones que la primera --image; las zonas
 *                           TRANSPARENTES de la máscara son las que el modelo reemplaza.
 *                           OJO: no abarata la corrida. El modelo devuelve la imagen COMPLETA, así que
 *                           el output se cobra igual que una generación, y encima suma la imagen y la
 *                           máscara como tokens de entrada.
 *   --input-fidelity <f>    low | high — how strictly to preserve the reference (edit mode).
 *                           Sólo lo transportan gpt-image-1.5 / 1 / 1-mini. En la familia 2.5 la guía de
 *                           OpenAI lo excluye explícitamente: se ignora y la identidad se pide por prompt.
 *   --out <path>            Output file path (single prompt). Default: <out-dir>/<slug>-<ts>.png
 *                           Con --batch es el DIRECTORIO del lote (sin extensión); con extensión de imagen aborta.
 *   --out-dir <dir>         Output directory. Default: public/images/generated
 *   --size <WxH>            1024x1024 | 1536x1024 | 1024x1536 | 2048x... (default 1536x1024). Se valida en local:
 *                           GPT Image 2/2.5/2.6 = múltiplos de 16, borde ≤ 3840, relación ≤ 3:1, área 655.360–8.294.400;
 *                           modelos anteriores = sólo 1024x1024, 1536x1024, 1024x1536 o auto. En GIF es cada cuadro.
 *   --format <f>            png | jpeg | webp | gif | svg (gif y svg sólo GPT Image 2.6). Omitido: se deduce de la
 *                           extensión de --out (.jpg → jpeg, .gif, .svg), o png
 *   --quality <q>           low | medium | high | auto (default high)
 *                           xhigh | max — sólo en las familias GPT Image 2.5 y 2.6
 *   --complexity <c>        low | medium | high — sólo 2.6 (esfuerzo de planificación; omitido = high en OpenAI)
 *   --markup <png>          capa de anotaciones para editar guiado por marcas (2.5 y 2.6; requiere --image)
 *   --svg-model <m>         modelo que escribe el SVG (default gpt-5.5) · --svg-effort none…max (default low)
 *   --frames <n> · --frame-ms <ms>   cuadros y duración del GIF (default de OpenAI: 9 y 200)
 *   --compression <0-100>   output_compression de jpeg/webp · --moderation auto|low
 *   --estimate              imprime la estimación de costo y sale SIN llamar a la API
 *   --background <b>        auto | opaque | transparent (default opaque; GPT Image 2 transparency is preview;
 *                           transparent exige png o webp)
 *   --model <m>             gpt-image-2.6-flare | gpt-image-2.6-sunburst
 *                           gpt-image-2.5-flare (default) | gpt-image-2.5-sunburst (+ snapshots -2026-09-08)
 *                           gpt-image-2 (+ -2026-04-21) | gpt-image-1.5 | gpt-image-1-mini (apagados 2026-12-01)
 *   --count <n>             Imágenes por prompt (default 1). OJO: son N pedidos separados y se pagan N veces
 *   --timeout <ms>          Per-image timeout (default 280000; gpt-image-2 high can exceed 125s)
 *   --open                  Open the result(s) in the default viewer (macOS `open`)
 *   --help                  Show this help
 */

const DEFAULT_OUT_DIR = join(process.cwd(), 'public', 'images', 'generated')

const CONCEPTS_DIR = join(process.cwd(), '.captures', 'concepts')

interface CliArgs {
  prompt?: string
  promptFile?: string
  batch?: string
  image?: string[]
  inputFidelity?: OpenAIImageInputFidelity
  mask?: string
  out?: string
  outDir?: string
  concept?: string
  task?: string
  size: OpenAIImageSize
  quality: OpenAIImageQuality
  background: OpenAIImageBackground
  format?: OpenAIImageOutputFormat
  model: OpenAIImageModel
  count: number
  timeoutMs: number
  open: boolean
  help: boolean
  openaiKey?: string
  complexity?: OpenAIImageComplexity
  markup?: string
  svgModel: string
  svgEffort: OpenAIImageSvgReasoningEffort
  frames?: number
  frameMs?: number
  compression?: number
  moderation?: OpenAIImageModeration
  estimateOnly: boolean
}

const HELP = `Greenhouse AI image CLI — OpenAI GPT Image (2.6 + 2.5 families + gpt-image-2)

  pnpm ai:image --prompt "<text>" [--out <path>] [--size 1536x1024] [--quality high]
                [--background auto|opaque|transparent] [--format png|jpeg|webp|gif|svg] [--model gpt-image-2.5-flare] [--count 1]
                # --model gpt-image-2.5-sunburst|gpt-image-2.6-flare|gpt-image-2.6-sunburst|gpt-image-2 (generación anterior)
                # --quality xhigh|max (2.5 y 2.6) · --complexity low|medium|high (sólo 2.6)
                [--compression 0-100] [--moderation auto|low] [--estimate] [--timeout 280000] [--open]
  pnpm ai:image --model gpt-image-2.6-flare --format svg --prompt "<icono plano>" --out icono.svg
                [--svg-model gpt-5.5] [--svg-effort low]          # SVG nativo (sólo 2.6, sólo generar)
  pnpm ai:image --model gpt-image-2.6-flare --format gif --size 640x640 [--frames 9] [--frame-ms 200]
                --prompt "<loop>" --out loop.gif                  # GIF animado (sólo 2.6; también con --image)
  pnpm ai:image --model gpt-image-2.6-flare --image base.png --markup marcas.png --prompt "<qué hacer>"
                                                                  # edición guiada por marcas (2.5 y 2.6)
  pnpm ai:image --prompt-file <path> ...
  pnpm ai:image --batch <json> [--out <dir>]   # [{ "filename": "a.png", "prompt": "…" }, …]; --out = directorio
  pnpm ai:image --concept <loop> --batch <json> [--task TASK-###]   # conceptos del design-loop
  pnpm ai:image --image <ref.png> --prompt "<delta>" --out <out.png>   # EDIT image-to-image (consistencia)
  pnpm ai:image --image <base.png> --mask <mask.png> --prompt "<qué va en la zona>" --out <out.png>
                                        # INPAINTING: sólo se reemplaza la zona transparente de la máscara

Edit mode (--image):
  Edita la imagen de referencia en vez de generar desde cero (editOpenAIImage). Preserva
  identidad/estilo/logo de la referencia; el prompt cambia SOLO el delta. --image es repetible.
  --input-fidelity low|high ajusta cuán estricta es la preservación. Sólo lo aceptan:
  ${openAIImageModelsWith('inputFidelity').join(', ')}. Con otro modelo el CLI aborta antes de gastar;
  en la familia 2.5 la preservación se pide en el prompt.

Concept mode:
  --concept <loop>   Rutea a .captures/concepts/<loop>/ (gitignored, trazable, protegido
                     del GC) y escribe manifest.json. Para product-design-loop. Prioridad
                     sobre --out-dir. Aparece en \`pnpm fe:capture:index\` por loop.
  --task <id>        Tag de work-item (TASK-###/ISSUE-###) registrado en el manifest.

¿2.5 o 2.6? (medido 2026-11-05; cifras y fuente en la guía de selección de modelos §5.1)
  Generar o editar raster    → 2.5 (Flare explora, Sunburst termina). 2.6 cobra 4,2× en low y 3,3× en medium
                               a la misma tarifa; en high/xhigh/max cuesta igual que 2.5.
  Pieza final en high o más  → 2.5 o 2.6 al mismo costo: compara las dos en la toma real antes de elegir.
  Vector SVG                 → 2.6 (--format svg). El modelo autor (--svg-model) se cobra aparte.
  GIF animado corto          → 2.6 (--format gif). Cada cuadro mide --size; la hoja de cuadros debe caber en
                               3840 de borde y en 8,3 MP: 9 cuadros de 1024² no caben, 640² sí; 2 de 816² sí.
  Edición guiada por marcas  → --markup con 2.5 o 2.6 (no se combina con --mask).
  Editar con máscara         → pnpm ai:inpaint image (recompone y verifica). Sunburst 2.5 y 2.6 con máscara dan
                               panel negro (el pipeline los hace editar sin ella); Flare 2.5 y 2.6, bien.
  Identidad de personas      → 2.5 Sunburst (canon de fotografía de marca) hasta un canario de identidad en 2.6.
  --complexity low NO abarató (mismos tokens, medido); úsalo por calidad, no por precio.

Defaults: model gpt-image-2.5-flare · size 1536x1024 · quality high · background opaque · out-dir public/images/generated
Clave OpenAI:
  --openai-key <perfil>  Paga con el secreto greenhouse-openai-api-key-<perfil> (p. ej. personal)
                         en vez de la canónica. También vale OPENAI_API_KEY_PROFILE=<perfil> en el
                         entorno o en .env.local. "default" = canónica. Si el perfil no resuelve, falla.

Requires OPENAI_API_KEY_SECRET_REF (or OPENAI_API_KEY) — resolved server-side, never printed.`

// Editar una imagen sin declarar `--size` devolvía el default horizontal (1536x1024) y CAMBIABA la
// relación de aspecto en silencio: un plate 4:5 volvía apaisado. Medido por la sesión peer el
// 2026-09-21. Al editar, el tamaño de la base es lo que uno espera, así que se hereda y se avisa.
let sizeExplicito = false

// El default `opaque` es de los raster. En SVG y GIF sólo viaja si se pidió: OpenAI devolvió el SVG transparente y el
// GIF opaco sin el parámetro (2026-11-05), y forzar `opaque` en un vector es una decisión que nadie tomó.
let backgroundExplicito = false

const isVectorOrAnimated = (format: OpenAIImageOutputFormat) => format === 'svg' || format === 'gif'

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = {
    size: '1536x1024',
    quality: 'high',
    background: 'opaque',
    // Default del CLI desde el 2026-11-05 (decisión del operador): 2.5 Flare. gpt-image-2 sigue disponible con --model;
    // el default del RUNTIME (`OPENAI_IMAGE_MODEL`, src/lib/ai/openai-image.ts) no cambia con esto.
    model: 'gpt-image-2.5-flare',
    count: 1,
    timeoutMs: 280_000,
    open: false,
    help: false,
    // Verificado el 2026-11-05: gpt-5.5 con esfuerzo low escribió un SVG limpio (4 paths) por ~1.800 tokens.
    svgModel: 'gpt-5.5',
    svgEffort: 'low',
    estimateOnly: false
  }

  const integer = (flag: string, raw: string | undefined): number => {
    const value = Number(raw)

    if (raw === undefined || !Number.isInteger(value)) throw new Error(`${flag} exige un número entero (recibido: ${raw}).`)

    return value
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    const next = () => argv[(i += 1)]

    switch (token) {
      case '--prompt':
        args.prompt = next()
        break
      case '--prompt-file':
        args.promptFile = next()
        break
      case '--batch':
        args.batch = next()
        break

      case '--image': {
        const path = next()

        ;(args.image ??= []).push(path)
        break
      }

      case '--mask':
        args.mask = next()
        break

      case '--input-fidelity': {
        const value = next()

        if (!isOpenAIImageInputFidelity(value)) {
          throw new Error(`--input-fidelity "${value}" is not valid. Valid values: ${OPENAI_IMAGE_INPUT_FIDELITIES.join(' | ')}.`)
        }

        args.inputFidelity = value
        break
      }

      case '--out':
        args.out = next()
        break
      case '--out-dir':
        args.outDir = next()
        break
      case '--concept':
        args.concept = next()
        break
      case '--task':
        args.task = next()
        break
      case '--size':
        args.size = next() as OpenAIImageSize
        sizeExplicito = true
        break

      case '--quality': {
        const value = next()

        if (!isOpenAIImageQuality(value)) {
          throw new Error(
            `--quality "${value}" is not valid. Valid qualities: ${OPENAI_IMAGE_QUALITIES.join(' | ')}. ` +
              'Note that "xhigh" and "max" only exist on the GPT Image 2.5 family.'
          )
        }

        args.quality = value
        break
      }

      case '--background': {
        const value = next()

        if (!isOpenAIImageBackground(value)) {
          throw new Error(`--background "${value}" no es válido. Opciones: ${OPENAI_IMAGE_BACKGROUNDS.join(' | ')}.`)
        }

        args.background = value
        backgroundExplicito = true
        break
      }

      case '--format': {
        const value = next()

        if (!isOpenAIImageOutputFormat(value)) {
          throw new Error(`--format "${value}" no es válido. Opciones: ${OPENAI_IMAGE_OUTPUT_FORMATS.join(' | ')} (gif y svg sólo GPT Image 2.6).`)
        }

        args.format = value
        break
      }

      case '--complexity': {
        const value = next()

        if (!isOpenAIImageComplexity(value)) {
          throw new Error(`--complexity "${value}" no es válido. Opciones: ${OPENAI_IMAGE_COMPLEXITIES.join(' | ')}.`)
        }

        args.complexity = value
        break
      }

      case '--moderation': {
        const value = next()

        if (!isOpenAIImageModeration(value)) {
          throw new Error(`--moderation "${value}" no es válido. Opciones: ${OPENAI_IMAGE_MODERATIONS.join(' | ')}.`)
        }

        args.moderation = value
        break
      }

      case '--svg-effort': {
        const value = next()

        if (!isOpenAIImageSvgReasoningEffort(value)) {
          throw new Error(`--svg-effort "${value}" no es válido. Opciones: ${OPENAI_IMAGE_SVG_REASONING_EFFORTS.join(' | ')}.`)
        }

        args.svgEffort = value
        break
      }

      case '--svg-model':
        args.svgModel = next()
        break
      case '--markup':
        args.markup = next()
        break
      case '--frames':
        args.frames = integer('--frames', next())
        break
      case '--frame-ms':
        args.frameMs = integer('--frame-ms', next())
        break
      case '--compression':
        args.compression = integer('--compression', next())
        break
      case '--estimate':
        args.estimateOnly = true
        break

      case '--model': {
        const value = next()

        if (!isOpenAIImageModel(value)) {
          throw new Error(`--model "${value}" is not valid. Valid models: ${OPENAI_IMAGE_MODEL_IDS.join(' | ')}.`)
        }

        args.model = value
        break
      }

      case '--count':
        args.count = Math.max(1, Number(next()) || 1)
        break
      case '--timeout':
        args.timeoutMs = Math.max(10_000, Number(next()) || 280_000)
        break
      case '--open':
        args.open = true
        break
      case '--openai-key':
        args.openaiKey = next()
        break
      case '--help':
      case '-h':
        args.help = true
        break
      default:
        throw new Error(`Unknown argument: ${token}`)
    }
  }

  return args
}

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'image'

const resolvePath = (p: string): string => (isAbsolute(p) ? p : join(process.cwd(), p))

const resolveActor = (): string => {
  if (process.env.GITHUB_ACTOR) return `gh:${process.env.GITHUB_ACTOR}`
  if (process.env.USER) return `user:${process.env.USER}`

  return 'unknown'
}

interface ConceptManifestItem {
  file: string
  prompt: string
}

/**
 * Escribe/mergea `.captures/concepts/<loop>/manifest.json` para que el índice GVC
 * (`pnpm fe:capture:index`) ubique el loop, su work-item y los prompts. Mergea por
 * filename (regenerar un concepto pisa su entrada, no duplica). Best-effort.
 */
const writeConceptManifest = async (loopDir: string, args: CliArgs, items: GenItem[]): Promise<void> => {
  try {
    const manifestPath = join(loopDir, 'manifest.json')
    const fresh: ConceptManifestItem[] = items.map(it => ({ file: basename(it.filePath), prompt: it.prompt }))

    let merged = fresh

    try {
      const prev = JSON.parse(await readFile(manifestPath, 'utf8')) as { items?: ConceptManifestItem[] }
      const byFile = new Map<string, ConceptManifestItem>((prev.items ?? []).map(i => [i.file, i]))

      for (const i of fresh) byFile.set(i.file, i)
      merged = [...byFile.values()]
    } catch {
      // sin manifest previo — se crea nuevo.
    }

    const manifest = {
      kind: 'concept' as const,
      loop: args.concept,
      task: args.task ?? null,
      model: args.model,
      generatedAt: new Date().toISOString(),
      actor: resolveActor(),
      items: merged
    }

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  } catch {
    // nunca romper la generación por el manifest.
  }
}

const openInViewer = (filePath: string) => {
  if (process.platform !== 'darwin') return
  spawn('open', [filePath], { stdio: 'ignore', detached: true }).unref()
}

interface GenItem {
  prompt: string
  filePath: string
}

const EXTENSION_BY_FORMAT: Record<OpenAIImageOutputFormat, string> = {
  png: '.png',
  jpeg: '.jpg',
  webp: '.webp',
  gif: '.gif',
  svg: '.svg'
}

/** Formato de salida: --format o, si no, la extensión de la ruta (.jpg/.jpeg, .webp, .gif, .svg); png por defecto. */
const resolveOutputFormat = (args: CliArgs, filePath: string): OpenAIImageOutputFormat => {
  if (args.format) return args.format

  const lower = filePath.toLowerCase()

  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpeg'
  if (lower.endsWith('.webp')) return 'webp'
  if (lower.endsWith('.gif')) return 'gif'
  if (lower.endsWith('.svg')) return 'svg'

  return 'png'
}

/** Ruta con la extensión del formato real, sin duplicar si ya coincide. */
const withFormatExtension = (filePath: string, format: OpenAIImageOutputFormat): string => {
  const extension = EXTENSION_BY_FORMAT[format]
  const matches = format === 'jpeg' ? /\.jpe?g$/i.test(filePath) : filePath.toLowerCase().endsWith(extension)

  return matches ? filePath : filePath.replace(/\.(png|jpe?g|webp|gif|svg)$/i, '') + extension
}

/** Opciones nuevas del pedido, armadas una sola vez desde los flags para la validación previa y para cada pieza. */
const requestOptions = (args: CliArgs, format: OpenAIImageOutputFormat) => ({
  ...(args.complexity ? { complexity: args.complexity } : {}),
  ...(args.compression !== undefined ? { outputCompression: args.compression } : {}),
  ...(args.moderation ? { moderation: args.moderation } : {}),
  ...(format === 'gif' && (args.frames !== undefined || args.frameMs !== undefined)
    ? { gif: { ...(args.frames !== undefined ? { frameCount: args.frames } : {}), ...(args.frameMs !== undefined ? { frameDurationMs: args.frameMs } : {}) } }
    : {})
})

const requestBackground = (args: CliArgs, format: OpenAIImageOutputFormat) =>
  isVectorOrAnimated(format) && !backgroundExplicito ? undefined : args.background

const generateOne = async (item: GenItem, args: CliArgs): Promise<void> => {
  await mkdir(dirname(item.filePath), { recursive: true })

  const format = resolveOutputFormat(args, item.filePath)
  const basePath = withFormatExtension(item.filePath, format)

  for (let n = 0; n < args.count; n += 1) {
    const target = args.count > 1 ? basePath.replace(/(\.[a-z]+)$/i, `-${n + 1}$1`) : basePath

    const editing = Boolean(args.image?.length)

    process.stdout.write(`→ ${target.replace(process.cwd(), '.')}${editing ? ' (edit)' : ''} …\n`)

    const background = requestBackground(args, format)
    const options = requestOptions(args, format)

    if (editing && format === 'svg') throw new Error('SVG sólo existe al generar: quita --image o usa otro --format.')

    const result = editing
      ? await editOpenAIImage({
          prompt: item.prompt,
          image: args.image!.map(p => ({ path: resolvePath(p) })),
          model: args.model,
          size: args.size,
          quality: args.quality,
          background,
          format: format as Exclude<OpenAIImageOutputFormat, 'svg'>,
          numberOfImages: 1,
          timeoutMs: args.timeoutMs,
          ...options,
          ...(args.mask ? { mask: { path: resolvePath(args.mask) } } : {}),
          ...(args.markup ? { markup: { path: resolvePath(args.markup) } } : {}),
          ...(args.inputFidelity ? { inputFidelity: args.inputFidelity } : {})
        })
      : await generateOpenAIImage({
          prompt: item.prompt,
          model: args.model,
          size: args.size,
          quality: args.quality,
          background,
          format,
          numberOfImages: 1,
          timeoutMs: args.timeoutMs,
          ...options,
          ...(format === 'svg' ? { svg: { model: args.svgModel, reasoningEffort: args.svgEffort } } : {})
        })

    const buffer = Buffer.from(result.imageBytesBase64, 'base64')

    await writeFile(target, buffer)

    const fallback = result.modelFallbackReason ? ` (fallback: ${result.requestedModel} → ${result.model}: ${result.modelFallbackReason})` : ''
    const extras = [format !== 'png' ? format : null, args.complexity ? `complexity ${args.complexity}` : null].filter(Boolean)

    process.stdout.write(
      `  ✓ ${Math.round(buffer.length / 1024)}KB · ${result.model} · ${result.size} · ${result.quality}${extras.length ? ` · ${extras.join(' · ')}` : ''}${fallback} · clave ${result.keyProfile}\n`
    )

    // El SVG lo escribe un modelo de texto y se cobra a SU tarifa, aparte del raster de referencia.
    if (result.svgUsage) {
      const { model: svgModel, input_tokens: svgIn, output_tokens: svgOut, reasoning_tokens: svgReasoning } = result.svgUsage

      process.stdout.write(`    svg_usage: ${svgModel ?? args.svgModel} · in ${svgIn ?? 0} · out ${svgOut ?? 0} · reasoning ${svgReasoning ?? 0} (tarifa de ese modelo)\n`)
    }

    // `usage` es la medida real; la estimación previa (fórmula oficial) se imprime antes de gastar en main().
    if (result.usage) {
      const { input_tokens: inputTokens, output_tokens: outputTokens } = result.usage
      const imageIn = result.usage.input_tokens_details?.image_tokens ?? 0
      const textIn = result.usage.input_tokens_details?.text_tokens ?? 0

      process.stdout.write(
        `    usage: in ${inputTokens} (img ${imageIn} · txt ${textIn}) · out ${outputTokens} · total ${result.usage.total_tokens}\n`
      )
    }

    if (args.open) openInViewer(target)
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.help || (!args.prompt && !args.promptFile && !args.batch)) {
    process.stdout.write(`${HELP}\n`)
    process.exit(args.help ? 0 : 1)
  }

  // El flag gana sobre el entorno; el resolver canónico lo lee de OPENAI_API_KEY_PROFILE.
  if (args.openaiKey) process.env.OPENAI_API_KEY_PROFILE = args.openaiKey

  // La combinación model × quality se valida acá y no por pieza: dentro del loop, un --count 5 repetiría
  // el mismo error cinco veces y ya habría creado directorios de salida.
  assertOpenAIImageModelAvailable(args.model)
  assertOpenAIImageQualitySupported({ model: args.model, quality: args.quality })

  // Formato pedido para toda la corrida: --format o la extensión de --out (en lote, --format o png).
  const plannedFormat = resolveOutputFormat(args, args.out && !args.batch ? args.out : '')

  if ((args.frames !== undefined || args.frameMs !== undefined) && plannedFormat !== 'gif') {
    throw new Error('--frames y --frame-ms sólo aplican con --format gif (o --out *.gif).')
  }

  if (args.markup && !args.image?.length) throw new Error('--markup requiere --image: las marcas se dibujan sobre la imagen base.')

  // Fuente única de validación (la misma que aplica el helper): complexity, svg, gif, markup, compresión, moderación.
  assertOpenAIImageOptionsSupported({
    model: args.model,
    operation: args.image?.length ? 'edit' : 'generate',
    format: plannedFormat,
    background: requestBackground(args, plannedFormat),
    hasMask: Boolean(args.mask),
    hasMarkup: Boolean(args.markup),
    ...requestOptions(args, plannedFormat),
    ...(plannedFormat === 'svg' ? { svg: { model: args.svgModel, reasoningEffort: args.svgEffort } } : {})
  })

  if (plannedFormat === 'gif' && args.frames !== undefined && args.frames > OPENAI_IMAGE_GIF_FRAME_RANGE.referenceMax) {
    console.error(
      `  ⚠ --frames ${args.frames}: la guía de OpenAI admite hasta ${OPENAI_IMAGE_GIF_FRAME_RANGE.max} y la referencia del endpoint hasta ${OPENAI_IMAGE_GIF_FRAME_RANGE.referenceMax} (contradicción oficial). Si responde 400, baja los cuadros o el --size.`
    )
  }

  // Antes se descartaba en silencio con la familia 2.5: el pedido salía sin el parámetro y quien lo pidió creía
  // que la fidelidad estaba aplicada. Ahora aborta antes de gastar.
  if (args.inputFidelity && !args.image?.length) {
    throw new Error('--input-fidelity sólo aplica en modo edición (--image).')
  }

  assertOpenAIImageInputFidelitySupported({ model: args.model, inputFidelity: args.inputFidelity })

  if (!sizeExplicito && args.image?.length) {
    const base = sharp(args.image[0])
    const meta = await base.metadata()

    if (meta.width && meta.height) {
      const heredado = `${meta.width}x${meta.height}` as OpenAIImageSize

      try {
        assertOpenAIImageSizeSupported({ model: args.model, size: heredado })
        console.error(`  ⚠ editando sin --size: se hereda ${heredado} de la imagen base (el default habría sido ${args.size} y habría cambiado la relación de aspecto).`)
        args.size = heredado
      } catch {
        console.error(`  ⚠ editando sin --size y la base mide ${meta.width}x${meta.height}, que el modelo no acepta: se usa ${args.size}. La relación de aspecto VA A CAMBIAR — pasa --size explícito.`)
      }
    }
  }

  assertOpenAIImageSizeSupported({ model: args.model, size: args.size, format: plannedFormat })

  if (args.background === 'transparent' && args.format === 'jpeg') {
    throw new Error('--background transparent exige --format png o webp: JPEG no tiene canal alfa.')
  }

  // Una máscara sin imagen base no tiene a qué aplicarse: /v1/images/edits exige la imagen, y sin este
  // guardarraíl el request saldría como una generación desde cero, ignorando la máscara en silencio.
  if (args.mask && !args.image?.length) {
    throw new Error('--mask requires --image: the mask marks the area to edit on a base image.')
  }

  // GPT Image redibuja la imagen entera aunque reciba la máscara (medido 2026-09-17: delta máximo 221/255 en la zona
  // protegida). Este comando no recompone ni verifica; el pipeline que sí lo hace es `pnpm ai:inpaint image` (TASK-1965).
  if (args.mask) {
    console.error('  ⚠ --mask indica dónde editar, pero este comando NO recompone ni verifica la zona protegida. Para una pieza final usa pnpm ai:inpaint image (garantiza delta 0 fuera de la máscara).')
  }

  // --concept <loop> rutea a la taxonomía de conceptos de GVC (gitignored, trazable,
  // protegida del garbage collector). Tiene prioridad sobre --out-dir.
  const conceptLoop = args.concept ? slugify(args.concept) : null

  const outDir = resolveOutputDir({
    batch: Boolean(args.batch),
    out: args.out,
    outDir: args.outDir,
    conceptDir: conceptLoop ? join(CONCEPTS_DIR, conceptLoop) : null,
    defaultDir: DEFAULT_OUT_DIR,
    resolvePath
  })

  const items: GenItem[] = []

  if (args.batch) {
    const raw = await readFile(resolvePath(args.batch), 'utf8')
    const parsed = JSON.parse(raw) as { filename?: string; prompt?: string }[]

    if (!Array.isArray(parsed)) throw new Error('--batch must be a JSON array of { filename, prompt }')

    parsed.forEach((entry, idx) => {
      if (!entry.prompt) throw new Error(`--batch entry ${idx} missing "prompt"`)
      const filename = entry.filename ?? `${slugify(entry.prompt)}.png`

      // Con extensión conocida se respeta (y `withFormatExtension` la alinea al formato real); sin ella, .png.
      const hasKnownExtension = /\.(png|jpe?g|webp|gif|svg)$/i.test(filename)

      items.push({ prompt: entry.prompt, filePath: join(outDir, hasKnownExtension ? filename : `${filename}.png`) })
    })
  } else {
    const prompt = args.promptFile ? (await readFile(resolvePath(args.promptFile), 'utf8')).trim() : args.prompt

    if (!prompt) throw new Error('Empty prompt')
    const ts = Math.floor(Date.now() / 1000)
    const filePath = args.out ? resolvePath(args.out) : join(outDir, `${slugify(prompt)}-${ts}.png`)

    items.push({ prompt, filePath })
  }

  // Estimación ANTES de gastar (sólo salida; texto, referencias, máscara y markup suman). 2.5/2 con la fórmula oficial;
  // 2.6 con el factor medido sobre 2.5 (gasta más en low/medium a la misma tarifa).
  const totalRequests = items.length * args.count
  const estimateInput = { model: args.model, quality: args.quality, size: args.size, format: plannedFormat }
  const perImageUsd = estimateOpenAIImageOutputUsd(estimateInput)
  const perImageTokens = estimateOpenAIImageOutputTokens(estimateInput)
  const isGpt26 = args.model.startsWith('gpt-image-2.6')

  if (args.count > 1) {
    process.stdout.write(`  ⚠ --count ${args.count}: son ${args.count} pedidos separados por prompt y se paga cada uno\n`)
  }

  if (perImageUsd === null) {
    const why =
      plannedFormat === 'gif'
        ? 'la hoja de cuadros del GIF no sigue la fórmula (medido: 2 cuadros de 816² = 987 tokens; 9 de 640² = 1.529)'
        : 'auto o modelo sin grilla publicada'

    process.stdout.write(`  $ costo: sin estimación para ${args.model} · ${args.quality} · ${args.size} (${why})\n`)
  } else {
    const basis = isGpt26 ? 'factor 2.6 medido sobre 2.5' : 'fórmula oficial'
    const svgNote = plannedFormat === 'svg' ? `; el SVG suma los tokens de ${args.svgModel} a su tarifa` : ''

    process.stdout.write(
      `  $ costo estimado ≈ USD ${(perImageUsd * totalRequests).toFixed(3)} (${totalRequests} × ${perImageTokens} tokens de salida × USD 30/1M, ${basis}; la entrada suma aparte${svgNote})\n`
    )
  }

  if (isGpt26 && (args.quality === 'low' || args.quality === 'medium')) {
    const twin = args.model.replace('2.6', '2.5') as OpenAIImageModel
    const twinUsd = estimateOpenAIImageOutputUsd({ ...estimateInput, model: twin })

    if (twinUsd !== null && !isVectorOrAnimated(plannedFormat)) {
      process.stdout.write(`  ⚠ ${args.model} en ${args.quality} cuesta ~${((perImageUsd ?? 0) / twinUsd).toFixed(1)}× ${twin} (≈ USD ${twinUsd.toFixed(3)}/imagen): para explorar, 2.5 rinde más.\n`)
    }
  }

  if (args.estimateOnly) {
    process.stdout.write('  ↳ --estimate: no se llamó a la API.\n')

    return
  }

  for (const item of items) {
    try {
      await generateOne(item, args)
    } catch (err) {
      process.stdout.write(`  ✗ ${item.filePath.replace(process.cwd(), '.')} FAILED: ${(err as Error)?.message ?? err}\n`)
    }
  }

  if (conceptLoop) {
    await writeConceptManifest(outDir, args, items)
    process.stdout.write(`  ✎ concepto '${conceptLoop}' → .captures/concepts/${conceptLoop}/ (manifest.json actualizado)\n`)
  }

  process.stdout.write('done\n')
}

main().catch(err => {
  console.error('FATAL:', (err as Error)?.message ?? err)
  process.exit(1)
})
