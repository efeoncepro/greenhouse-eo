import 'server-only'

import { readFile } from 'node:fs/promises'
import { basename, isAbsolute, join } from 'node:path'

import { removeBackground, type Config } from '@imgly/background-removal-node'

/**
 * Greenhouse AI image — background remover (canonical step of the reference-edit pipeline).
 *
 * GPT Image edits (`pnpm ai:image --image …`) return an OPAQUE image on a flat studio background.
 * To match transparent-PNG asset families (e.g. the 3D character set in
 * `public/images/illustrations/characters/`), this cuts the background to alpha.
 *
 * Engine: AI **matting** (IMG.LY `isnet` segmentation, local, free, cross-platform) — produces soft,
 * professional edges (clean hair) instead of the "bitten" edges + white halos of a color-key/flood-fill.
 * A flat-color key can never match a hand-made matte on hair; matting can.
 *
 * Usage:
 *   pnpm ai:image:rmbg <in.png> <out.png> [--model isnet|isnet_fp16|isnet_quint8]
 *
 *   --model <m>   Segmentation model. `isnet` (default) = best quality; `isnet_fp16` / `isnet_quint8`
 *                 = faster/smaller, slightly lower edge quality.
 *
 * Note: first run loads the model (bundled with the package) — a few seconds of warm-up.
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
    throw new Error('Usage: pnpm ai:image:rmbg <in.png> <out.png> [--model isnet|isnet_fp16|isnet_quint8]')
  }

  const model = (opts.model ?? 'isnet') as Args['model']

  return { input: positional[0], output: positional[1], model }
}

const resolvePath = (p: string): string => (isAbsolute(p) ? p : join(process.cwd(), p))

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2))

  const inBytes = await readFile(resolvePath(args.input)).catch(() => {
    throw new Error(`Cannot read input image: ${args.input}`)
  })

  const config: Config = {
    model: args.model,
    output: { format: 'image/png', quality: 1 }
  }

  const blob = await removeBackground(new Uint8Array(inBytes), config)
  const outBytes = Buffer.from(await blob.arrayBuffer())

  const { writeFile } = await import('node:fs/promises')

  await writeFile(resolvePath(args.output), outBytes)
  process.stdout.write(`  ✓ ${basename(args.output)} · matting=${args.model} · ${Math.round(outBytes.length / 1024)}KB → transparent\n`)
}

main().catch(err => {
  console.error('FATAL:', (err as Error)?.message ?? err)
  process.exit(1)
})
