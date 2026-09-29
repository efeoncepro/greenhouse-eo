// Utilidades de las herramientas del workbench (gestionado desde greenhouse-eo).
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const config = () => JSON.parse(readFileSync(path.join(ROOT, 'workbench.config.json'), 'utf8'))

export function sha256File(file) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256')

    createReadStream(file)
      .on('data', d => h.update(d))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject)
  })
}

export function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', ...opts })
}

/** gcloud asíncrono, para paralelizar descargas sin bloquear. */
export function gcloudAsync(args) {
  return new Promise(resolve => {
    const child = spawn('gcloud', [...args, '--quiet'], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''

    child.stderr.on('data', d => (stderr += d))
    child.on('close', code => resolve({ code, stderr }))
  })
}

export async function pool(items, size, worker) {
  const results = []
  let next = 0

  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++

        results[i] = await worker(items[i], i)
      }
    })
  )

  return results
}

/** Resuelve `projects/<cliente>/<slug>` y carga su pieza.json. */
export function loadPieza(arg) {
  if (!arg) throw new Error('Indica la carpeta de la pieza: projects/<cliente>/<slug>')
  const dir = path.resolve(ROOT, arg)
  const rel = path.relative(ROOT, dir).split(path.sep)

  if (rel[0] !== 'projects' || rel.length !== 3) throw new Error(`${arg} no es una carpeta projects/<cliente>/<slug>`)
  const file = path.join(dir, 'pieza.json')

  if (!existsSync(file)) throw new Error(`${arg} no tiene pieza.json. Créala con pnpm pieza:nueva ${rel[1]} ${rel[2]}`)

  return { dir, file, cliente: rel[1], slug: rel[2], pieza: JSON.parse(readFileSync(file, 'utf8')) }
}

export function savePieza(file, pieza) {
  writeFileSync(file, `${JSON.stringify(pieza, null, 2)}\n`)
}

export const fail = message => {
  console.error(`✗ ${message}`)
  process.exit(1)
}
