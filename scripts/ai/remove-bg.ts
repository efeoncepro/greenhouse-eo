import 'server-only'

import { readFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, join } from 'node:path'

import { removeBackground, type Config } from '@imgly/background-removal-node'

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
 *   pnpm ai:image:rmbg <in.png> <out.png> [--model small|medium]
 *
 *   --model <m>   Segmentation model. `medium` (default) = best edge quality bundled with this
 *                 package version; `small` = faster/smaller, slightly lower edge quality.
 *                 (`large` is in the type enum but NOT shipped in @imgly/background-removal-node@1.4.5.)
 *
 * Note: the model is bundled with the package (content-addressed blobs in dist/) — first run has a
 * few seconds of warm-up loading it into the onnxruntime session.
 */

interface Args {
  input: string
  output: string
  model: NonNullable<Config['model']>
}

const parseArgs = (argv: string[]): Args => {
  const positional: string[] = []
  const opts: Record<string, string> = {}

  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i]

    if (t.startsWith('--')) opts[t.slice(2)] = argv[(i += 1)]
    else positional.push(t)
  }

  if (positional.length < 2) {
    throw new Error('Usage: pnpm ai:image:rmbg <in.png> <out.png> [--model small|medium]')
  }

  const model = (opts.model ?? 'medium') as Args['model']

  return { input: positional[0], output: positional[1], model }
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
  process.stdout.write(`  ✓ ${basename(args.output)} · matting=${args.model} · ${Math.round(outBytes.length / 1024)}KB → transparent\n`)
}

main().catch(err => {
  console.error('FATAL:', (err as Error)?.message ?? err)
  process.exit(1)
})
