import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join } from 'node:path'

import sharp from 'sharp'

import {
  assertMaskUsable,
  createMask,
  dilate,
  encodeMaskPng,
  erode,
  feather,
  invert,
  loadMask,
  MASK_CONVENTIONS,
  maskFromAlpha,
  maskFromLuminance,
  maskFromPolygon,
  maskFromRect,
  maskFromSubject,
  maskStats,
  parsePolygon,
  parseRect,
  renderMaskPreview,
  union,
  type CanonicalMask,
  type MaskConvention,
  type MaskStats
} from './mask'
import { loadRgba } from './raw'

const HELP = `pnpm ai:mask — construye, opera e inspecciona máscaras de inpainting (TASK-1965)

Formato canónico de salida: PNG en escala de grises del mismo tamaño que la base, BLANCO = editable.
Cada adaptador de pnpm ai:inpaint lo convierte a la convención de su proveedor; tú no conviertes nada.

Construir:
  pnpm ai:mask --base base.png --rect 0.33,0.42,0.67,0.72 --feather 24 --out mask.png
  pnpm ai:mask --base base.png --polygon "0.1,0.6;0.4,0.55;0.45,0.9;0.12,0.95" --dilate 12 --feather 16 --out mask.png
  pnpm ai:mask --base base.png --from-subject --subject-editable background --out fondo.png
  pnpm ai:mask --base base.png --from-alpha recorte.png --alpha-editable opaque --out mask.png

Inspeccionar (gratis, no escribe nada):
  pnpm ai:mask --inspect mask.png [--convention white-editable|alpha-transparent-editable] [--base base.png]

Fuentes (se unen entre sí; al menos una):
  --rect x0,y0,x1,y1            Rectángulo en fracciones (repetible)
  --polygon "x,y;x,y;x,y"       Polígono en fracciones (repetible)
  --from-alpha <png>            Alfa de una imagen; --alpha-editable transparent (default) | opaque
  --from-luma <img>             Luminancia; --luma-editable light (default) | dark; --threshold 0-255 (default 127)
  --from-subject                Sujeto de la base con matting local (gratis); --subject-editable subject (default) | background
  --from-mask <png>             Máscara existente; --convention white-editable (default) | alpha-transparent-editable

Operaciones (siempre en este orden): --invert → --erode <px> → --dilate <px> → --feather <px>

Salida:
  --out <png>                   Máscara canónica (obligatorio salvo --inspect)
  --preview <png>               Vista previa sobre la base (default: <out>-preview.png)
  --allow-empty / --allow-full  Acepta una máscara 0 % o 100 % editable (por defecto se rechazan)
`

interface MaskCliArgs {
  base?: string
  inspect?: string
  rects: string[]
  polygons: string[]
  fromAlpha?: string
  alphaEditable: 'transparent' | 'opaque'
  fromLuma?: string
  lumaEditable: 'light' | 'dark'
  threshold?: number
  fromSubject: boolean
  subjectEditable: 'subject' | 'background'
  fromMask?: string
  convention: MaskConvention
  invert: boolean
  erode: number
  dilate: number
  feather: number
  out?: string
  preview?: string
  allowEmpty: boolean
  allowFull: boolean
  help: boolean
}

const resolvePath = (path: string) => (isAbsolute(path) ? path : join(process.cwd(), path))

const parseNonNegative = (raw: string | undefined, flag: string): number => {
  const value = Number(raw)

  if (raw === undefined || !Number.isFinite(value) || value < 0) throw new Error(`${flag} espera un número ≥ 0.`)

  return value
}

const pick = <T extends string>(raw: string | undefined, allowed: readonly T[], flag: string): T => {
  if (!raw || !(allowed as readonly string[]).includes(raw)) throw new Error(`${flag} espera ${allowed.join(' | ')}.`)

  return raw as T
}

export const parseMaskArgs = (argv: string[]): MaskCliArgs => {
  const args: MaskCliArgs = {
    rects: [],
    polygons: [],
    alphaEditable: 'transparent',
    lumaEditable: 'light',
    fromSubject: false,
    subjectEditable: 'subject',
    convention: 'white-editable',
    invert: false,
    erode: 0,
    dilate: 0,
    feather: 0,
    allowEmpty: false,
    allowFull: false,
    help: false
  }

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
      case '--base': args.base = next(); break
      case '--inspect': args.inspect = next(); break
      case '--rect': args.rects.push(next()); break
      case '--polygon': args.polygons.push(next()); break
      case '--from-alpha': args.fromAlpha = next(); break
      case '--alpha-editable': args.alphaEditable = pick(next(), ['transparent', 'opaque'] as const, flag); break
      case '--from-luma': args.fromLuma = next(); break
      case '--luma-editable': args.lumaEditable = pick(next(), ['light', 'dark'] as const, flag); break
      case '--threshold': args.threshold = parseNonNegative(next(), flag); break
      case '--from-subject': args.fromSubject = true; break
      case '--subject-editable': args.subjectEditable = pick(next(), ['subject', 'background'] as const, flag); break
      case '--from-mask': args.fromMask = next(); break
      case '--convention': args.convention = pick(next(), MASK_CONVENTIONS, flag); break
      case '--invert': args.invert = true; break
      case '--erode': args.erode = parseNonNegative(next(), flag); break
      case '--dilate': args.dilate = parseNonNegative(next(), flag); break
      case '--feather': args.feather = parseNonNegative(next(), flag); break
      case '--out': args.out = next(); break
      case '--preview': args.preview = next(); break
      case '--allow-empty': args.allowEmpty = true; break
      case '--allow-full': args.allowFull = true; break
      case '--help':
      case '-h': args.help = true; break
      default: throw new Error(`Flag desconocida: ${flag}. Ver pnpm ai:mask --help.`)
    }
  }

  return args
}

export const formatMaskStats = (stats: MaskStats, width: number, height: number): string => {
  const pct = (value: number) => `${((value / stats.total) * 100).toFixed(2)} %`
  const box = stats.bbox ? `${stats.bbox.width}x${stats.bbox.height} en (${stats.bbox.left}, ${stats.bbox.top})` : 'vacía'

  return [
    `  máscara ${width}x${height}`,
    `    editable ${pct(stats.editable)} · borde ${pct(stats.soft)} · protegido ${pct(stats.protected)}`,
    `    caja de la zona tocable: ${box}`
  ].join('\n')
}

/** Une las fuentes pedidas en una máscara del tamaño de la base. */
export const buildMaskFromSources = async (args: MaskCliArgs, width: number, height: number): Promise<CanonicalMask> => {
  const parts: CanonicalMask[] = []

  for (const raw of args.rects) parts.push(maskFromRect(width, height, parseRect(raw)))
  for (const raw of args.polygons) parts.push(maskFromPolygon(width, height, parsePolygon(raw)))
  if (args.fromAlpha) parts.push(await maskFromAlpha(resolvePath(args.fromAlpha), { editable: args.alphaEditable, threshold: args.threshold }))
  if (args.fromLuma) parts.push(await maskFromLuminance(resolvePath(args.fromLuma), { editable: args.lumaEditable, threshold: args.threshold }))
  if (args.fromSubject) parts.push(await maskFromSubject(resolvePath(args.base!), { editable: args.subjectEditable }))
  if (args.fromMask) parts.push(await loadMask(resolvePath(args.fromMask), args.convention))

  if (!parts.length) throw new Error('Indica al menos una fuente: --rect, --polygon, --from-alpha, --from-luma, --from-subject o --from-mask.')

  for (const part of parts) {
    if (part.width !== width || part.height !== height) {
      throw new Error(`Una fuente mide ${part.width}x${part.height} y la base ${width}x${height}: deben medir lo mismo.`)
    }
  }

  return parts.reduce((acc, part) => union(acc, part), createMask(width, height))
}

export const applyMaskOperations = async (mask: CanonicalMask, args: Pick<MaskCliArgs, 'invert' | 'erode' | 'dilate' | 'feather'>) => {
  let result = args.invert ? invert(mask) : mask

  result = erode(result, args.erode)
  result = dilate(result, args.dilate)

  return feather(result, args.feather)
}

const main = async () => {
  const args = parseMaskArgs(process.argv.slice(2))

  if (args.help || process.argv.length <= 2) {
    process.stdout.write(HELP)
    process.exit(args.help ? 0 : 1)
  }

  if (args.inspect) {
    const mask = await loadMask(resolvePath(args.inspect), args.convention)

    process.stdout.write(`${formatMaskStats(maskStats(mask), mask.width, mask.height)}\n`)

    if (args.base) {
      const meta = await sharp(resolvePath(args.base)).metadata()

      if (meta.width !== mask.width || meta.height !== mask.height) {
        throw new Error(`La máscara mide ${mask.width}x${mask.height} y la base ${meta.width}x${meta.height}.`)
      }

      process.stdout.write('  ✓ mide lo mismo que la base\n')
    }

    return
  }

  if (!args.base) throw new Error('--base es obligatorio para construir una máscara (define el tamaño y la vista previa).')
  if (!args.out) throw new Error('--out es obligatorio.')

  const base = await loadRgba(resolvePath(args.base), 'base')
  const mask = await applyMaskOperations(await buildMaskFromSources(args, base.width, base.height), args)
  const stats = assertMaskUsable(mask, { allowEmpty: args.allowEmpty, allowFull: args.allowFull })
  const out = resolvePath(args.out)
  const preview = resolvePath(args.preview ?? args.out.replace(/\.png$/i, '') + '-preview.png')

  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, await encodeMaskPng(mask))
  await mkdir(dirname(preview), { recursive: true })
  await writeFile(preview, await renderMaskPreview(base, mask))

  process.stdout.write(`${formatMaskStats(stats, mask.width, mask.height)}\n`)
  process.stdout.write(`  ✓ ${out.replace(process.cwd(), '.')}\n  ✓ vista previa ${preview.replace(process.cwd(), '.')} (mírala antes de gastar)\n`)
}

if (process.argv[1]?.endsWith('mask-cli.ts')) {
  main().catch(error => {
    console.error('FATAL:', (error as Error)?.message ?? error)
    process.exit(1)
  })
}
