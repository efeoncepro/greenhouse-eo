import 'server-only'

import { isAbsolute, join } from 'node:path'

import { config as loadEnv } from 'dotenv'

import { runLayerize } from './adapters/layerize-fal'
import { bboxTag, describeLayers, readLayersDocument } from './layers'
import { parseRect } from './mask'
import { localDate } from './run-io'

loadEnv({ path: join(process.cwd(), '.env.local') })

const HELP = `pnpm ai:layers — separa una imagen en capas con Seedream 5 Pro Layerize (TASK-1973)

  pnpm ai:layers --image foto.png [--run ai-generations/<pieza>] [--dry-run]
  pnpm ai:layers --list <layers.json>

Funciona con cualquier imagen, no sólo con las que generó Seedream. Devuelve la imagen BASE (la escena sin los
elementos: un clean plate) y hasta 16 capas con nombre, descripción, alfa y caja. Úsalas así:
  · máscara de un elemento: pnpm ai:mask --base foto.png --from-layer <layers.json> --layer "mug" --out mascara.png
  · borrar con el clean plate: pnpm ai:inpaint erase --image foto.png --layers <layers.json> --layer "mug"
Las capas son contenido regenerado: sirven de máscara y de clean plate; los píxeles que no se editan salen siempre
de la imagen original.

Opciones:
  --prompt <texto>          Qué elementos separar (opcional; sin él separa los principales)
  --bbox x0,y0,x1,y1        Región a separar en fracciones (repetible; se envía como <bbox> 0–1000)
  --image-size auto|auto_1K|auto_1.5K|auto_2K   Resolución de base y capas (default auto)
  --run <dir>               Carpeta de la pieza (default ai-generations/<fecha>_layers)
  --dry-run                 Cota de costo sin llamar al proveedor
  --force                   Repite aunque la misma imagen ya se haya separado
  --max-usd <n> / --yes     Tope de confirmación sobre la COTA (16 capas + base; default USD 1)
  --list <layers.json>      Lista índice, nombre, caja y cobertura de cada capa (gratis)
`

const resolvePath = (path: string) => (isAbsolute(path) ? path : join(process.cwd(), path))

const main = async (): Promise<number> => {
  const argv = process.argv.slice(2).filter(arg => arg !== '--')
  const flags: Record<string, string | true> = {}
  const bboxes: string[] = []

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]

    if (['--dry-run', '--force', '--yes', '--help', '-h'].includes(flag)) {
      flags[flag] = true
      continue
    }

    const value = argv[i + 1]

    if (!flag.startsWith('--') || value === undefined || value.startsWith('--')) throw new Error(`${flag} necesita un valor. Ver pnpm ai:layers --help.`)
    if (!['--image', '--prompt', '--bbox', '--image-size', '--run', '--max-usd', '--list'].includes(flag)) throw new Error(`Flag desconocida: ${flag}.`)

    if (flag === '--bbox') bboxes.push(value)
    else flags[flag] = value
    i += 1
  }

  if (flags['--help'] || flags['-h'] || !argv.length) {
    process.stdout.write(HELP)

    return flags['--help'] || flags['-h'] ? 0 : 1
  }

  if (typeof flags['--list'] === 'string') {
    const doc = await readLayersDocument(resolvePath(flags['--list']))

    process.stdout.write(`  base ${doc.base.width}x${doc.base.height} (clean plate: ${doc.base.file}) · fuente ${doc.source.width}x${doc.source.height}\n`)

    for (const layer of doc.layers.filter(item => item.box)) {
      const box = layer.box!

      process.stdout.write(
        `  #${layer.index} ${layer.name ?? '(sin nombre)'} · caja ${Math.round(box.left)},${Math.round(box.top)}–${Math.round(box.right)},${Math.round(box.bottom)} · cobertura ${((layer.alphaCoverage ?? 0) * 100).toFixed(0)} %\n` +
          (layer.description ? `      ${layer.description}\n` : '')
      )
    }

    process.stdout.write(`  ${describeLayers(doc) ? '' : '(sin capas separadas)\n'}`)

    return 0
  }

  if (typeof flags['--image'] !== 'string') throw new Error('--image es obligatorio.')

  const sizes = ['auto', 'auto_1K', 'auto_1.5K', 'auto_2K'] as const
  const imageSize = flags['--image-size'] as (typeof sizes)[number] | undefined

  if (imageSize && !sizes.includes(imageSize)) throw new Error(`--image-size espera ${sizes.join(' | ')}.`)

  const promptParts = [typeof flags['--prompt'] === 'string' ? flags['--prompt'] : '', ...bboxes.map(raw => bboxTag(parseRect(raw)))].filter(Boolean)

  const result = await runLayerize({
    imagePath: resolvePath(flags['--image']),
    prompt: promptParts.length ? promptParts.join(' ') : undefined,
    imageSize,
    runRoot: resolvePath(typeof flags['--run'] === 'string' ? flags['--run'] : join('ai-generations', `${localDate()}_layers`)),
    dryRun: Boolean(flags['--dry-run']),
    force: Boolean(flags['--force']),
    maxUsd: typeof flags['--max-usd'] === 'string' ? Number(flags['--max-usd']) : undefined,
    yes: Boolean(flags['--yes'])
  })

  if (result.document) process.stdout.write(`  ✎ ${result.layersJson.replace(process.cwd(), '.')}\n  capas: ${describeLayers(result.document)}\n`)

  return 0
}

if (process.argv[1]?.endsWith('layers-cli.ts')) {
  main().then(
    code => process.exit(code),
    error => {
      console.error('FATAL:', (error as Error)?.message ?? error)
      process.exit(1)
    }
  )
}
