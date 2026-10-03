import 'server-only'

import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'

import { config as loadEnv } from 'dotenv'

import { IMAGE_ADAPTER_IDS, resolveImageAdapter } from './adapters'
import type { ProviderMaskMode } from './adapters/types'
import { resolveVideoEngine, VIDEO_ENGINE_IDS } from './adapters/video-fal'
import type { CropMode } from './crop'
import { assertFfmpeg } from './ffmpeg'
import { MASK_CONVENTIONS, type MaskConvention } from './mask'
import { runImageInpaint } from './pipeline-image'
import { runVideoInpaint, type VideoStrategy } from './pipeline-video'
import { localDate } from './run-io'

loadEnv({ path: join(process.cwd(), '.env.local') })

const HELP = `pnpm ai:inpaint image — edita una zona y garantiza que el resto quede idéntico (TASK-1965)

  pnpm ai:inpaint image --image base.png --mask mask.png --prompt "<qué va en la zona>" [opciones]

La máscara se arma con pnpm ai:mask (blanco = editable). El comando recorta la zona con contexto, genera, vuelve a
pegar SÓLO lo que la máscara abre y relee el archivo escrito: si la zona protegida cambió un solo byte, sale con
código 2. Todo queda en <run>/inpaint/<id>/ con manifest.json; repetir la misma entrada no vuelve a pagar.

Entrada:
  --image <img>              Imagen base (obligatorio)
  --mask <png>               Máscara; --convention white-editable (default) | alpha-transparent-editable
  --sketch <png>             Boceto sobre la foto, como el Markup de ChatGPT: overlay con fondo transparente o la foto
                             con trazos encima. Viaja como imagen 2 (guía de posición); sin --mask, la máscara se deriva
                             del trazo (+ --sketch-margin px, default 40)
  --reference <img>          Referencia del objeto a incorporar (repetible): «Place the X from image N into image 1»
  --grow-mask auto|off       Con máscara derivada del boceto: crece hasta cubrir el objeto que el modelo dibujó
                             (auto, default; evita cortar lo que se sale del trazo). Una --mask explícita nunca crece
  --prompt <texto> | --prompt-file <txt>

Proveedor:
  --adapter <id>             ${IMAGE_ADAPTER_IDS.join(' | ')} (default openai)
  --model <id>               Default del adaptador (openai: gpt-image-2.5-flare, el verificado con máscara).
                             ★ gpt-image-2.5-sunburst es el MÁS POTENTE (las piezas de mayor impacto): úsalo para la
                             pieza final. Con máscara devuelve un panel negro, así que el comando lo hace editar sin
                             máscara, le manda la zona marcada como guía y recompone; revisa el aviso de reencuadre
  --quality <q>              openai: low | medium (default) | high | xhigh | max
  --seed <n>                 Sólo adaptadores que la acepten
  --provider-mask auto|on|off  Si la máscara viaja al proveedor (openai). auto: Sunburst edita sin máscara —con
                             máscara devuelve un panel negro— y el pipeline recompone; los demás, con máscara
  --guide auto|off           Guía de zona en magenta (imagen 2) cuando la máscara no viaja; auto por defecto
  --color-match auto|on|off  Corrige el desplazamiento de color de la salida en un anillo alrededor de la zona antes de
                             recomponer (evita el halo). auto: sólo cuando la máscara no viajó (Sunburst)
  --count <n>                Candidatos (1–8); cada uno es un pedido pagado; con más de uno, contact-sheet.png

Control:
  --crop auto|on|off         Recorte con contexto (default auto: si la zona ocupa < 25 %)
  --run <dir>                Carpeta de la pieza (default ai-generations/<fecha>_inpaint)
  --dry-run                  Máscara, recorte, payload y costo SIN llamar al proveedor
  --force                    Regenera aunque la misma entrada ya exista
  --max-usd <n> / --yes      Tope de confirmación (default USD 1; env AI_COST_CONFIRM_USD)
  --allow-brand              El prompt nombra marca/logo y la edición sólo toca el contexto
  --allow-full               Acepta una máscara 100 % editable
`

interface ImageCliArgs {
  image?: string
  mask?: string
  sketch?: string
  sketchMargin?: number
  references: string[]
  convention: MaskConvention
  prompt?: string
  promptFile?: string
  adapter?: string
  model?: string
  quality?: string
  seed?: number
  providerMask?: ProviderMaskMode
  colorMatch?: 'auto' | 'on' | 'off'
  guide?: 'auto' | 'off'
  growMask?: 'auto' | 'off'
  count: number
  crop: CropMode
  run?: string
  dryRun: boolean
  force: boolean
  maxUsd?: number
  yes: boolean
  allowBrand: boolean
  allowFull: boolean
  help: boolean
}

const resolvePath = (path: string) => (isAbsolute(path) ? path : join(process.cwd(), path))

const toNumber = (raw: string, flag: string, integer = false): number => {
  const value = Number(raw)

  if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) throw new Error(`${flag} espera un número${integer ? ' entero' : ''}.`)

  return value
}

export const parseImageArgs = (argv: string[]): ImageCliArgs => {
  const args: ImageCliArgs = { references: [], convention: 'white-editable', count: 1, crop: 'auto', dryRun: false, force: false, yes: false, allowBrand: false, allowFull: false, help: false }

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]

    const next = () => {
      const value = argv[i + 1]

      if (value === undefined || value.startsWith('--')) throw new Error(`${flag} necesita un valor.`)
      i += 1

      return value
    }

    switch (flag) {
      case '--': break
      case '--image': args.image = next(); break
      case '--mask': args.mask = next(); break
      case '--sketch': args.sketch = next(); break
      case '--sketch-margin': args.sketchMargin = toNumber(next(), flag, true); break
      case '--reference': args.references.push(next()); break

      case '--convention': {
        const value = next()

        if (!(MASK_CONVENTIONS as readonly string[]).includes(value)) throw new Error(`--convention espera ${MASK_CONVENTIONS.join(' | ')}.`)
        args.convention = value as MaskConvention
        break
      }

      case '--prompt': args.prompt = next(); break
      case '--prompt-file': args.promptFile = next(); break
      case '--adapter': args.adapter = next(); break
      case '--model': args.model = next(); break
      case '--quality': args.quality = next(); break
      case '--seed': args.seed = toNumber(next(), flag, true); break
      case '--count': args.count = toNumber(next(), flag, true); break

      case '--grow-mask': {
        const value = next()

        if (!['auto', 'off'].includes(value)) throw new Error('--grow-mask espera auto | off.')
        args.growMask = value as 'auto' | 'off'
        break
      }

      case '--guide': {
        const value = next()

        if (!['auto', 'off'].includes(value)) throw new Error('--guide espera auto | off.')
        args.guide = value as 'auto' | 'off'
        break
      }

      case '--color-match': {
        const value = next()

        if (!['auto', 'on', 'off'].includes(value)) throw new Error('--color-match espera auto | on | off.')
        args.colorMatch = value as 'auto' | 'on' | 'off'
        break
      }

      case '--provider-mask': {
        const value = next()

        if (!['auto', 'on', 'off'].includes(value)) throw new Error('--provider-mask espera auto | on | off.')
        args.providerMask = value as ProviderMaskMode
        break
      }


      case '--crop': {
        const value = next()

        if (!['auto', 'on', 'off'].includes(value)) throw new Error('--crop espera auto | on | off.')
        args.crop = value as CropMode
        break
      }

      case '--run': args.run = next(); break
      case '--dry-run': args.dryRun = true; break
      case '--force': args.force = true; break
      case '--max-usd': args.maxUsd = toNumber(next(), flag); break
      case '--yes': args.yes = true; break
      case '--allow-brand': args.allowBrand = true; break
      case '--allow-full': args.allowFull = true; break
      case '--help':
      case '-h': args.help = true; break
      default: throw new Error(`Flag desconocida: ${flag}. Ver pnpm ai:inpaint image --help.`)
    }
  }

  return args
}

const runImage = async (argv: string[]): Promise<number> => {
  const args = parseImageArgs(argv)

  if (args.help) {
    process.stdout.write(HELP)

    return 0
  }

  if (!args.image || (!args.mask && !args.sketch)) throw new Error('--image y (--mask o --sketch) son obligatorios. Ver pnpm ai:inpaint image --help.')

  const prompt = args.promptFile ? (await readFile(resolvePath(args.promptFile), 'utf8')).trim() : args.prompt?.trim()

  if (!prompt) throw new Error('Falta --prompt o --prompt-file.')

  const result = await runImageInpaint({
    imagePath: resolvePath(args.image),
    maskPath: args.mask ? resolvePath(args.mask) : undefined,
    sketchPath: args.sketch ? resolvePath(args.sketch) : undefined,
    sketchMargin: args.sketchMargin,
    referencePaths: args.references.map(resolvePath),
    maskConvention: args.convention,
    prompt,
    adapter: resolveImageAdapter(args.adapter),
    model: args.model,
    quality: args.quality,
    seed: args.seed,
    providerMask: args.providerMask,
    colorMatch: args.colorMatch,
    guide: args.guide,
    growMask: args.growMask,
    count: args.count,
    crop: args.crop,
    runRoot: resolvePath(args.run ?? join('ai-generations', `${localDate()}_inpaint`)),
    dryRun: args.dryRun,
    force: args.force,
    maxUsd: args.maxUsd,
    yes: args.yes,
    allowBrand: args.allowBrand,
    allowFull: args.allowFull
  })

  process.stdout.write(`  ✎ ${join(result.runDir, 'manifest.json').replace(process.cwd(), '.')}\n`)

  if (result.exitCode === 2) process.stderr.write('  ✗ al menos un candidato no pasó la verificación de la zona protegida.\n')
  if (result.exitCode === 3) process.stderr.write('  ⚠ REVISAR (código 3): la zona protegida está intacta, pero ningún candidato muestra la edición pedida (panel negro, reencuadre o zona sin cambio).\n')

  return result.exitCode
}

const VIDEO_HELP = `pnpm ai:inpaint video — edita una zona de un clip y deja el resto idéntico cuadro a cuadro (TASK-1965)

  pnpm ai:inpaint video --video clip.mp4 --mask mask.png --prompt "<qué cambia en la zona>" [opciones]

El motor edita por instrucción; el comando normaliza su salida a la resolución, fps y duración del original, mide
cuánto movió el encuadre (aborta sobre --max-drift: recomponer daría ghosting), recompone cada cuadro con la máscara,
verifica la zona protegida en delta 0 sobre la secuencia PNG, mide el parpadeo, codifica y copia el audio original.

Máscara:
  --mask <png>               Fija (cámara quieta), del tamaño del video; --convention como en image
  --mask-keyframes <json>    Por keyframes: { "keyframes": [{ "t": 0, "rect": [x0,y0,x1,y1] }, …], "feather": 16 }

Motor y estrategia:
  --engine <id>              ${VIDEO_ENGINE_IDS.join(' | ')} (default fal:flux3-edit)
  --strategy edit-recompose | first-frame   first-frame edita un cuadro con el pipeline de imagen y lo pasa de
                             referencia al motor (sólo motores que aceptan imágenes)
  --frame-time <s>           Cuadro de referencia para first-frame (default 0)
  --image-adapter / --image-model / --image-quality   Para el cuadro de first-frame

Control: --run, --dry-run, --force, --max-usd/--yes, --allow-brand, --allow-full como en image;
  --max-drift <n>            Deriva media aceptada de la zona protegida (0–255, default 12)
  --keep-frames              Conserva las secuencias PNG (pesan: se borran por defecto)
`

const runVideo = async (argv: string[]): Promise<number> => {
  const flags: Record<string, string | true> = {}

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]

    if (!flag.startsWith('--')) throw new Error(`Argumento inesperado: ${flag}.`)

    const boolean = ['--dry-run', '--force', '--yes', '--allow-brand', '--allow-full', '--keep-frames', '--help'].includes(flag)

    if (boolean) {
      flags[flag] = true
      continue
    }

    const value = argv[i + 1]

    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} necesita un valor.`)

    flags[flag] = value
    i += 1
  }

  const known = new Set(['--video', '--mask', '--mask-keyframes', '--convention', '--prompt', '--prompt-file', '--engine', '--strategy', '--frame-time', '--image-adapter', '--image-model', '--image-quality', '--run', '--dry-run', '--force', '--max-usd', '--yes', '--allow-brand', '--allow-full', '--max-drift', '--keep-frames', '--help'])

  for (const flag of Object.keys(flags)) if (!known.has(flag)) throw new Error(`Flag desconocida: ${flag}. Ver pnpm ai:inpaint video --help.`)

  if (flags['--help']) {
    process.stdout.write(VIDEO_HELP)

    return 0
  }

  const str = (flag: string) => (typeof flags[flag] === 'string' ? (flags[flag] as string) : undefined)
  const num = (flag: string) => (str(flag) === undefined ? undefined : toNumber(str(flag)!, flag))

  if (!str('--video')) throw new Error('--video es obligatorio.')
  if (Boolean(str('--mask')) === Boolean(str('--mask-keyframes'))) throw new Error('Indica --mask o --mask-keyframes (uno de los dos).')

  const prompt = str('--prompt-file') ? (await readFile(resolvePath(str('--prompt-file')!), 'utf8')).trim() : str('--prompt')?.trim()

  if (!prompt) throw new Error('Falta --prompt o --prompt-file.')

  const strategy = (str('--strategy') ?? 'edit-recompose') as VideoStrategy

  if (!['edit-recompose', 'first-frame'].includes(strategy)) throw new Error('--strategy espera edit-recompose | first-frame.')

  const convention = (str('--convention') ?? 'white-editable') as MaskConvention

  await assertFfmpeg()

  const result = await runVideoInpaint({
    videoPath: resolvePath(str('--video')!),
    mask: str('--mask') ? { kind: 'static', path: resolvePath(str('--mask')!), convention } : { kind: 'keyframes', path: resolvePath(str('--mask-keyframes')!) },
    prompt,
    engine: resolveVideoEngine(str('--engine')),
    strategy,
    frameTime: num('--frame-time'),
    imageAdapter: strategy === 'first-frame' ? resolveImageAdapter(str('--image-adapter')) : undefined,
    imageModel: str('--image-model'),
    imageQuality: str('--image-quality'),
    runRoot: resolvePath(str('--run') ?? join('ai-generations', `${localDate()}_inpaint`)),
    dryRun: Boolean(flags['--dry-run']),
    force: Boolean(flags['--force']),
    maxUsd: num('--max-usd'),
    yes: Boolean(flags['--yes']),
    allowBrand: Boolean(flags['--allow-brand']),
    allowFull: Boolean(flags['--allow-full']),
    maxDrift: num('--max-drift'),
    keepFrames: Boolean(flags['--keep-frames'])
  })

  process.stdout.write(`  ✎ ${join(result.runDir, 'manifest.json').replace(process.cwd(), '.')}\n`)

  return result.exitCode
}

const main = async () => {
  const [command, ...rest] = process.argv.slice(2).filter(arg => arg !== '--')

  if (command === 'image') return runImage(rest)
  if (command === 'video') return runVideo(rest)

  process.stdout.write(`Uso: pnpm ai:inpaint image|video … (--help en cada uno)\n\n${HELP}`)

  return command === '--help' || command === '-h' ? 0 : 1
}

if (process.argv[1]?.endsWith('inpaint/cli.ts')) {
  main().then(
    code => process.exit(code),
    error => {
      console.error('FATAL:', (error as Error)?.message ?? error)
      process.exit(1)
    }
  )
}
