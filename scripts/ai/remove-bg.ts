import 'server-only'

import { readFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { removeBackground, type Config } from '@imgly/background-removal-node'

import { KEY_BACKGROUND_DEFAULTS } from './key-background-holes'

/**
 * Greenhouse AI image — background remover (canonical step of the reference-edit pipeline).
 *
 * GPT Image edits (`pnpm ai:image --image …`) return an OPAQUE image on a flat studio background.
 * To match transparent-PNG asset families (e.g. the 3D character set in
 * `public/images/illustrations/characters/`), this cuts the background to alpha.
 *
 * Engine: AI **matting** (IMG.LY segmentation, local, free, cross-platform) — produces soft,
 * professional edges (clean hair) instead of the "bitten" edges + white halos of a color-key/flood-fill.
 * A flat-color key can never match a hand-made matte on hair; matting can.
 *
 * Usage:
 *   pnpm ai:image:rmbg <in.png> <out.png> [--model small|medium] [--no-fill-holes] [--key-background [umbral] [minPx]]
 *
 *   --model <m>   Segmentation model. `medium` (default) = best edge quality bundled with this
 *                 package version; `small` = faster/smaller, slightly lower edge quality.
 *                 (`large` is in the type enum but NOT shipped in @imgly/background-removal-node@1.4.5.)
 *   --no-fill-holes  Desactiva el relleno de huecos internos (ver `fill-alpha-holes.ts`). Por defecto se
 *                 rellenan los huecos del sujeto que el matting dejó transparentes (ojos, visores, glifos).
 *   --key-background [umbral] [minPx]  Opt-in. Vacía los huecos que el matting dejó OPACOS mostrando el fondo de
 *                 estudio (objeto claro sobre fondo oscuro: cortes, ventanas). Ver `key-background-holes.ts`.
 *                 Defaults 42 / 30; fondo claro desenfocado o macros: subir minPx (p. ej. 30 / 800).
 *
 * Note: the model is bundled with the package (content-addressed blobs in dist/) — first run has a
 * few seconds of warm-up loading it into the onnxruntime session.
 */

interface Args {
  input: string
  output: string
  model: NonNullable<Config['model']>
  fillHoles: boolean
  keyBackground: { threshold: number; minPixels: number } | null
}

const parseArgs = (argv: string[]): Args => {
  const positional: string[] = []
  const opts: Record<string, string> = {}
  let keyBackground: Args['keyBackground'] = null

  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i]

    if (t === '--no-fill-holes') opts['no-fill-holes'] = 'true'
    else if (t === '--key-background') {
      const values: number[] = []

      while (values.length < 2 && argv[i + 1] !== undefined && /^\d+(\.\d+)?$/.test(argv[i + 1])) values.push(Number(argv[(i += 1)]))

      keyBackground = {
        threshold: values[0] ?? KEY_BACKGROUND_DEFAULTS.threshold,
        minPixels: values[1] ?? KEY_BACKGROUND_DEFAULTS.minPixels
      }
    } else if (t.startsWith('--')) opts[t.slice(2)] = argv[(i += 1)]
    else positional.push(t)
  }

  if (positional.length < 2) {
    throw new Error('Usage: pnpm ai:image:rmbg <in.png> <out.png> [--model small|medium] [--no-fill-holes] [--key-background [umbral] [minPx]]')
  }

  const model = (opts.model ?? 'medium') as Args['model']

  return { input: positional[0], output: positional[1], model, fillHoles: opts['no-fill-holes'] !== 'true', keyBackground }
}

const resolvePath = (p: string): string => (isAbsolute(p) ? p : join(process.cwd(), p))

/**
 * IMG.LY decodes by reading `blob.type` (image/png|jpeg|webp), NOT by sniffing bytes. When handed a
 * raw Uint8Array it wraps it in a typeless Blob → "Unsupported format:". So we hand it a typed Blob.
 */
const mimeFor = (path: string): string => {
  const ext = extname(path).toLowerCase()

  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'

  return 'image/png'
}

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2))

  const inBytes = await readFile(resolvePath(args.input)).catch(() => {
    throw new Error(`Cannot read input image: ${args.input}`)
  })

  const config: Config = {
    model: args.model,
    output: { format: 'image/png', quality: 1 }
  }

  const inputBlob = new Blob([new Uint8Array(inBytes)], { type: mimeFor(args.input) })
  const blob = await removeBackground(inputBlob, config)
  const outBytes = Buffer.from(await blob.arrayBuffer())

  const { writeFile } = await import('node:fs/promises')

  await writeFile(resolvePath(args.output), outBytes)

  let holesNote = ''

  if (args.fillHoles || args.keyBackground) {
    // Proceso aparte: el paquete de matting trae su propio sharp/libvips y dos libvips en un proceso no son seguros.
    const cli = join(dirname(fileURLToPath(import.meta.url)), 'fill-alpha-holes-cli.ts')

    const cliArgs = [cli, resolvePath(args.output), resolvePath(args.input)]

    if (!args.fillHoles) cliArgs.push('--no-fill-holes')
    if (args.keyBackground) cliArgs.push('--key-background', String(args.keyBackground.threshold), String(args.keyBackground.minPixels))

    const run = spawnSync(process.execPath, [...process.execArgv, ...cliArgs], { encoding: 'utf8' })

    if (run.status !== 0) throw new Error(`Post-proceso de huecos falló: ${run.stderr || run.stdout}`)

    const { filledPixels, components, keyed } = JSON.parse(run.stdout.trim().split('\n').pop() ?? '{}') as {
      filledPixels: number
      components: number
      keyed?: { clearedPixels: number; components: number }
    }

    if (args.fillHoles) holesNote += ` · huecos internos rellenados=${filledPixels}px/${components}`
    if (keyed) holesNote += ` · huecos de fondo vaciados=${keyed.clearedPixels}px/${keyed.components}`
  }

  process.stdout.write(`  ✓ ${basename(args.output)} · matting=${args.model}${holesNote} → transparent\n`)
}

main().catch(err => {
  console.error('FATAL:', (err as Error)?.message ?? err)
  process.exit(1)
})
