import 'server-only'

import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'

import { config as loadEnv } from 'dotenv'

import { IMAGE_ADAPTER_IDS, resolveImageAdapter } from './adapters'
import type { CropMode } from './crop'
import { MASK_CONVENTIONS, type MaskConvention } from './mask'
import { runImageInpaint } from './pipeline-image'
import { localDate } from './run-io'

loadEnv({ path: join(process.cwd(), '.env.local') })

const HELP = `pnpm ai:inpaint image — edita una zona y garantiza que el resto quede idéntico (TASK-1965)

  pnpm ai:inpaint image --image base.png --mask mask.png --prompt "<qué va en la zona>" [opciones]

La máscara se arma con pnpm ai:mask (blanco = editable). El comando recorta la zona con contexto, genera, vuelve a
pegar SÓLO lo que la máscara abre y relee el archivo escrito: si la zona protegida cambió un solo byte, sale con
código 2. Todo queda en <run>/inpaint/<id>/ con manifest.json; repetir la misma entrada no vuelve a pagar.

Entrada:
  --image <img>              Imagen base (obligatorio)
  --mask <png>               Máscara (obligatorio); --convention white-editable (default) | alpha-transparent-editable
  --prompt <texto> | --prompt-file <txt>

Proveedor:
  --adapter <id>             ${IMAGE_ADAPTER_IDS.join(' | ')} (default openai)
  --model <id>               Default del adaptador (openai: gpt-image-2.5-flare; Sunburst con máscara devuelve un panel negro)
  --quality <q>              openai: low | medium (default) | high | xhigh | max
  --seed <n>                 Sólo adaptadores que la acepten
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
  convention: MaskConvention
  prompt?: string
  promptFile?: string
  adapter?: string
  model?: string
  quality?: string
  seed?: number
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
  const args: ImageCliArgs = { convention: 'white-editable', count: 1, crop: 'auto', dryRun: false, force: false, yes: false, allowBrand: false, allowFull: false, help: false }

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

  if (!args.image || !args.mask) throw new Error('--image y --mask son obligatorios. Ver pnpm ai:inpaint image --help.')

  const prompt = args.promptFile ? (await readFile(resolvePath(args.promptFile), 'utf8')).trim() : args.prompt?.trim()

  if (!prompt) throw new Error('Falta --prompt o --prompt-file.')

  const result = await runImageInpaint({
    imagePath: resolvePath(args.image),
    maskPath: resolvePath(args.mask),
    maskConvention: args.convention,
    prompt,
    adapter: resolveImageAdapter(args.adapter),
    model: args.model,
    quality: args.quality,
    seed: args.seed,
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

  return result.exitCode
}

const main = async () => {
  const [command, ...rest] = process.argv.slice(2).filter(arg => arg !== '--')

  if (command === 'image') return runImage(rest)

  process.stdout.write(`Uso: pnpm ai:inpaint image …\n\n${HELP}`)

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
