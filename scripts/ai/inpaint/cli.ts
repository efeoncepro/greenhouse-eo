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
import { runBackground } from './background'
import { runErase } from './erase'
import type { ExpandAnchor } from './expand'
import { EXPAND_DEFAULT_ADAPTER, runExpand } from './expand-run'
import { runMove } from './move'
import { runPlace } from './place'
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
  --zone-resolution <px>     Pasada de detalle: genera la zona recortada a ese lado largo (512–4096) y la devuelve
                             a su lugar (rehacer manos, una textura, un detalle). Activa el recorte
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
  layersJson?: string
  layerSelectors: string[]
  fill?: 'plate' | 'model'
  grow?: number
  to?: string
  canvas?: { width: number; height: number }
  scale?: number
  anchor?: ExpandAnchor
  prefill?: 'mirror' | 'neutral'
  blend?: number
  edge?: number
  zoneResolution?: number
  dx?: number
  dy?: number
  harmonize?: 'auto' | 'off'
  shadow?: 'auto' | 'off'
  from?: string
  at?: { x: number; y: number }
  width?: number
  finish?: 'halo' | 'element' | 'off'
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
  const args: ImageCliArgs = { layerSelectors: [], references: [], convention: 'white-editable', count: 1, crop: 'auto', dryRun: false, force: false, yes: false, allowBrand: false, allowFull: false, help: false }

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
      case '--layers': args.layersJson = next(); break
      case '--layer': args.layerSelectors.push(next()); break
      case '--grow': args.grow = toNumber(next(), flag, true); break
      case '--to': args.to = next(); break

      case '--canvas': {
        const match = /^(\d+)x(\d+)$/.exec(next())

        if (!match) throw new Error('--canvas espera ANCHOxALTO (p. ej. 2048x1072).')
        args.canvas = { width: Number(match[1]), height: Number(match[2]) }
        break
      }

      case '--scale': args.scale = toNumber(next(), flag); break
      case '--blend': args.blend = toNumber(next(), flag, true); break
      case '--edge': args.edge = toNumber(next(), flag, true); break
      case '--dx': args.dx = toNumber(next(), flag, true); break
      case '--dy': args.dy = toNumber(next(), flag, true); break

      case '--harmonize': {
        const value = next()

        if (!['auto', 'off'].includes(value)) throw new Error('--harmonize espera auto | off.')
        args.harmonize = value as 'auto' | 'off'
        break
      }

      case '--from': args.from = next(); break

      case '--at': {
        const [x, y] = next().split(',').map(Number)

        if (![x, y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) throw new Error('--at espera x,y en fracciones 0–1 (ej. 0.3,0.6).')
        args.at = { x, y }
        break
      }

      case '--width': args.width = toNumber(next(), flag); break

      case '--finish': {
        const value = next()

        if (!['halo', 'element', 'off'].includes(value)) throw new Error('--finish espera halo | element | off.')
        args.finish = value as 'halo' | 'element' | 'off'
        break
      }

      case '--shadow': {
        const value = next()

        if (!['auto', 'off'].includes(value)) throw new Error('--shadow espera auto | off.')
        args.shadow = value as 'auto' | 'off'
        break
      }

      case '--zone-resolution': args.zoneResolution = toNumber(next(), flag, true); break

      case '--anchor': {
        const value = next()

        if (!['center', 'left', 'right', 'top', 'bottom'].includes(value)) throw new Error('--anchor espera center | left | right | top | bottom.')
        args.anchor = value as ExpandAnchor
        break
      }

      case '--prefill': {
        const value = next()

        if (!['mirror', 'neutral'].includes(value)) throw new Error('--prefill espera mirror | neutral.')
        args.prefill = value as 'mirror' | 'neutral'
        break
      }


      case '--fill': {
        const value = next()

        if (!['plate', 'model'].includes(value)) throw new Error('--fill espera plate | model.')
        args.fill = value as 'plate' | 'model'
        break
      }

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
    zoneResolution: args.zoneResolution,
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

const ERASE_HELP = `pnpm ai:inpaint erase — borra un objeto y deja el resto idéntico (TASK-1973)

  pnpm ai:inpaint erase --image foto.png --layers <layers.json> --layer "mug"      # clean plate, sin gasto
  pnpm ai:inpaint erase --image foto.png --mask mascara.png --fill model          # un modelo reconstruye el fondo

Zona: --mask (explícita, nunca se altera) o --layers + --layer (repetible; se agranda --grow px, default 16, para
llevarse el borde). Con capas, --shadow auto (default) suma la sombra proyectada del objeto, medida contra el clean
plate y conectada al objeto; off la deja. Relleno: --fill plate (default con --layers: la base de Layerize con las
demás capas recompuestas, así la mesa sigue siendo mesa) o model (default con
--mask; --adapter/--model/--quality como en image). Después de verificar la zona protegida mide si el objeto
sigue ahí; si en ningún candidato cambió, sale con código 3 (revisar). Un logo o una marca no se borra con IA.
Control: --prompt (default: quitar el objeto y su sombra y reconstruir lo de atrás), --count, --run, --dry-run,
--force, --max-usd/--yes, --allow-brand.
`

const runEraseCli = async (argv: string[]): Promise<number> => {
  const args = parseImageArgs(argv)

  if (args.help) {
    process.stdout.write(ERASE_HELP)

    return 0
  }

  if (!args.image) throw new Error('--image es obligatorio. Ver pnpm ai:inpaint erase --help.')

  const prompt = args.promptFile ? (await readFile(resolvePath(args.promptFile), 'utf8')).trim() : args.prompt?.trim()

  const result = await runErase({
    imagePath: resolvePath(args.image),
    maskPath: args.mask ? resolvePath(args.mask) : undefined,
    maskConvention: args.convention,
    layersJson: args.layersJson ? resolvePath(args.layersJson) : undefined,
    layerSelectors: args.layerSelectors,
    fill: args.fill,
    growPx: args.grow,
    shadow: args.shadow,
    modelAdapter: args.fill === 'plate' || (!args.fill && args.layersJson) ? undefined : resolveImageAdapter(args.adapter),
    model: args.model,
    quality: args.quality,
    prompt: prompt || undefined,
    count: args.count,
    runRoot: resolvePath(args.run ?? join('ai-generations', `${localDate()}_inpaint`)),
    dryRun: args.dryRun,
    force: args.force,
    maxUsd: args.maxUsd,
    yes: args.yes,
    allowBrand: args.allowBrand
  })

  process.stdout.write(`  ✎ ${join(result.runDir, 'manifest.json').replace(process.cwd(), '.')}\n`)

  if (result.exitCode === 3) {
    const residue = result.erasure.length > 0 && result.erasure.every(report => report.residueSuspected)

    process.stderr.write(
      residue
        ? '  ⚠ REVISAR (código 3): en ningún candidato quedó el fondo (el objeto sigue ahí o el modelo dibujó otro).\n'
        : '  ⚠ REVISAR (código 3): todos los candidatos quedaron sospechosos (reencuadre o panel plano): mira el aviso de arriba.\n'
    )
  }

  return result.exitCode
}

const EXPAND_HELP = `pnpm ai:inpaint expand — lleva una escena a otro formato sin regenerarla (TASK-1973)

  pnpm ai:inpaint expand --image escena-4x5.png --to 9:16 --prompt "<qué hay alrededor>" [opciones]
  pnpm ai:inpaint expand --image escena-1x1.png --canvas 2048x1072 --scale 0.8 --anchor right --prompt "..."

Agranda el lienzo, ubica la escena y deja editable sólo el área nueva más una franja de fundido sobre el borde que da
a ella; la escena queda en delta 0 (verificado). El área nueva se rellena antes con espejo de los bordes (--prefill
mirror, default; neutral = su color medio): un relleno sólido invita al modelo a inventar un panel.

Modelo: Flux Fill (fal:flux-pro-fill) por defecto, ≈ USD 0,05 por megapixel. Es un modelo de relleno puro: sale al
tamaño de la entrada y continúa la escena. GPT Image NO sirve para expandir (canario 2026-10-03): Flare achica la
escena (escala 0,88–0,90) y Sunburst copia el relleno en espejo como contenido; los dos dejan costura.

  --to 4:5|9:16|1:1|1.91:1|16:9|3:4|2:3|3:2   Formato destino (el lienzo crece en un solo eje)
  --canvas WxH               Lienzo explícito (en vez de --to)
  --scale <0,3–1>            Achica la escena dentro del lienzo (zoom out; la escena se re-muestrea)
  --anchor center|left|right|top|bottom       Dónde se apoya la escena (default center)
  --blend <px>               Franja de fundido sobre la escena (default 24; 80–140 si el borde corta objetos)
  --adapter / --model / --quality / --provider-mask / --count / --run / --dry-run / --force / --max-usd / --yes
`

const runExpandCli = async (argv: string[]): Promise<number> => {
  const args = parseImageArgs(argv)

  if (args.help) {
    process.stdout.write(EXPAND_HELP)

    return 0
  }

  if (!args.image) throw new Error('--image es obligatorio. Ver pnpm ai:inpaint expand --help.')
  if (!args.to && !args.canvas) throw new Error('Indica --to <formato> o --canvas WxH.')

  const prompt = args.promptFile ? (await readFile(resolvePath(args.promptFile), 'utf8')).trim() : args.prompt?.trim()

  if (!prompt) throw new Error('Falta --prompt: describe qué hay alrededor de la escena.')

  const result = await runExpand({
    imagePath: resolvePath(args.image),
    to: args.to,
    canvas: args.canvas,
    scale: args.scale,
    anchor: args.anchor,
    fill: args.prefill,
    blend: args.blend,
    prompt,
    adapter: resolveImageAdapter(args.adapter ?? (args.model?.startsWith('gpt-image') ? 'openai' : EXPAND_DEFAULT_ADAPTER)),
    model: args.model,
    quality: args.quality,
    providerMask: args.providerMask,
    count: args.count,
    runRoot: resolvePath(args.run ?? join('ai-generations', `${localDate()}_inpaint`)),
    dryRun: args.dryRun,
    force: args.force,
    maxUsd: args.maxUsd,
    yes: args.yes,
    allowBrand: args.allowBrand
  })

  process.stdout.write(`  ✎ ${join(result.runDir, 'manifest.json').replace(process.cwd(), '.')}\n`)

  return result.exitCode
}

const BACKGROUND_HELP = `pnpm ai:inpaint background — cambia el fondo y deja el sujeto intacto (TASK-1973)

  pnpm ai:inpaint background --image foto.png --prompt "<fondo nuevo>"                         # sujeto por matting local
  pnpm ai:inpaint background --image foto.png --layers <layers.json> --layer "person" --prompt "..."

El sujeto queda en delta 0 (verificado); el fondo es el inverso del sujeto. --edge <px> (default 3) es la franja del
borde que el modelo rehace contra el fondo nuevo: el comando reporta su costura; míralo al 100 % (pelo, transparencias).
Personas reales del equipo: sigue las reglas de identidad de brand-photography (no injertar caras).
  --adapter / --model / --quality / --provider-mask / --count / --run / --dry-run / --force / --max-usd / --yes
`

const runBackgroundCli = async (argv: string[]): Promise<number> => {
  const args = parseImageArgs(argv)

  if (args.help) {
    process.stdout.write(BACKGROUND_HELP)

    return 0
  }

  if (!args.image) throw new Error('--image es obligatorio. Ver pnpm ai:inpaint background --help.')

  const prompt = args.promptFile ? (await readFile(resolvePath(args.promptFile), 'utf8')).trim() : args.prompt?.trim()

  if (!prompt) throw new Error('Falta --prompt: describe el fondo nuevo.')

  const result = await runBackground({
    imagePath: resolvePath(args.image),
    layersJson: args.layersJson ? resolvePath(args.layersJson) : undefined,
    layerSelectors: args.layerSelectors,
    edgePx: args.edge,
    prompt,
    adapter: resolveImageAdapter(args.adapter),
    model: args.model,
    quality: args.quality,
    providerMask: args.providerMask,
    count: args.count,
    runRoot: resolvePath(args.run ?? join('ai-generations', `${localDate()}_inpaint`)),
    dryRun: args.dryRun,
    force: args.force,
    maxUsd: args.maxUsd,
    yes: args.yes,
    allowBrand: args.allowBrand
  })

  process.stdout.write(`  ✎ ${join(result.runDir, 'manifest.json').replace(process.cwd(), '.')}\n`)

  return result.exitCode
}

const MOVE_HELP = `pnpm ai:inpaint move — mueve o escala un elemento usando sus capas (TASK-1973)

  pnpm ai:inpaint move --image foto.png --layers <layers.json> --layer "notebook" --dx -300 --dy 40 [--scale 0.9]

1) el hueco —con la sombra proyectada del elemento, salvo --shadow off— se rellena con el clean plate sin ese
elemento (corregido de color); 2) el elemento se recorta de la imagen ORIGINAL con
el alfa de su capa y se pega en la posición nueva (escala alrededor de su centro); 3) --harmonize auto (default) hace
una pasada SÓLO de sombra de contacto y reflejo en un halo alrededor (con --adapter/--model; off = sin IA ni gasto).
Verifica que todo lo que no es hueco, elemento ni halo quede idéntico a la original. Un logo no se mueve con IA.
`

const runMoveCli = async (argv: string[]): Promise<number> => {
  const args = parseImageArgs(argv)

  if (args.help) {
    process.stdout.write(MOVE_HELP)

    return 0
  }

  if (!args.image || !args.layersJson || !args.layerSelectors.length) throw new Error('--image, --layers y --layer son obligatorios. Ver pnpm ai:inpaint move --help.')

  const result = await runMove({
    imagePath: resolvePath(args.image),
    layersJson: resolvePath(args.layersJson),
    layerSelectors: args.layerSelectors,
    dx: args.dx,
    dy: args.dy,
    scale: args.scale,
    harmonize: args.harmonize,
    shadow: args.shadow,
    adapter: args.harmonize === 'off' ? undefined : resolveImageAdapter(args.adapter),
    model: args.model,
    quality: args.quality,
    providerMask: args.providerMask,
    runRoot: resolvePath(args.run ?? join('ai-generations', `${localDate()}_inpaint`)),
    dryRun: args.dryRun,
    force: args.force,
    maxUsd: args.maxUsd,
    yes: args.yes,
    allowBrand: args.allowBrand
  })

  return result.exitCode
}

const PLACE_HELP = `pnpm ai:inpaint place — incorpora un elemento separado con ai:layers en OTRA imagen (TASK-1973)

  pnpm ai:inpaint place --image destino.png --from origen.png --layers <layers.json> --layer "mug" --at 0.3,0.62 [--width 0.12]

1) el elemento se recorta de la imagen de ORIGEN con el alfa de su capa (nunca los píxeles regenerados de la capa);
2) se pega en el destino con su centro en --at (fracciones x,y) y el ancho --width (fracción del ancho del destino;
default: el mismo tamaño en píxeles); 3) el modelo lo termina: --finish halo (default: sólo sombra de contacto,
reflejo y borde alrededor) · element (además relumina el elemento para que tome la luz de la escena: su forma puede
variar, míralo al 100 %) · off (sin IA ni gasto). Verifica que el destino quede idéntico fuera de lo pegado y de su
acabado. Modelo: --adapter/--model/--quality como en image. Un logo o una marca no se incorpora con IA.
`

const runPlaceCli = async (argv: string[]): Promise<number> => {
  const args = parseImageArgs(argv)

  if (args.help) {
    process.stdout.write(PLACE_HELP)

    return 0
  }

  if (!args.image || !args.from || !args.layersJson || !args.layerSelectors.length || !args.at) {
    throw new Error('--image, --from, --layers, --layer y --at son obligatorios. Ver pnpm ai:inpaint place --help.')
  }

  const prompt = args.promptFile ? (await readFile(resolvePath(args.promptFile), 'utf8')).trim() : args.prompt?.trim()

  const result = await runPlace({
    imagePath: resolvePath(args.image),
    sourceImagePath: resolvePath(args.from),
    layersJson: resolvePath(args.layersJson),
    layerSelectors: args.layerSelectors,
    at: args.at,
    width: args.width,
    finish: args.finish,
    adapter: args.finish === 'off' ? undefined : resolveImageAdapter(args.adapter),
    model: args.model,
    quality: args.quality,
    providerMask: args.providerMask,
    prompt: prompt || undefined,
    runRoot: resolvePath(args.run ?? join('ai-generations', `${localDate()}_inpaint`)),
    dryRun: args.dryRun,
    force: args.force,
    maxUsd: args.maxUsd,
    yes: args.yes,
    allowBrand: args.allowBrand
  })

  return result.exitCode
}

const main = async () => {
  const [command, ...rest] = process.argv.slice(2).filter(arg => arg !== '--')

  if (command === 'image') return runImage(rest)
  if (command === 'erase') return runEraseCli(rest)
  if (command === 'expand') return runExpandCli(rest)
  if (command === 'background') return runBackgroundCli(rest)
  if (command === 'move') return runMoveCli(rest)
  if (command === 'place') return runPlaceCli(rest)
  if (command === 'video') return runVideo(rest)

  process.stdout.write(`Uso: pnpm ai:inpaint image|erase|expand|background|move|place|video … (--help en cada uno)\n\n${HELP}`)

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
