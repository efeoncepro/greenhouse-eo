#!/usr/bin/env node
// Guarda de blobs pesados en lo que se va a empujar.
//
// GitHub rechaza archivos de más de 100 MB y, cuando el paquete es grande, corta la conexión con un
// «Connection reset by peer» que no nombra el archivo culpable. Caso fuente (2026-09-25): un commit de
// checkpoint arrastró 91 medios de `ai-generations/` (985 MB, un MKV de 470 MB) y el push de `develop`
// falló dos veces sin explicación. Esta guarda nombra el archivo antes de gastar el envío.
//
// Bloquea: cualquier blob de más de `--max-mb` (50 por defecto, el umbral de advertencia de GitHub) y
// cualquier medio de `ai-generations/` con una extensión que la política no versiona (esos se archivan con
// `pnpm media:archive-ai-generation`). Revisa sólo los commits que el remoto todavía no tiene.
//
// Uso: node scripts/ci/large-blob-gate.mjs [--range <rev-range>] [--max-mb 50]
//   Sin `--range`, lee de stdin las líneas del hook pre-push de git
//   («<ref local> <sha local> <ref remoto> <sha remoto>»); si no hay stdin, usa `@{upstream}..HEAD`.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const ZERO = /^0+$/

// Audio, video y comprimidos: nunca se versionan en `ai-generations/`. Las imágenes quedan fuera de esta
// lista a propósito — el repo versiona algunas referencias chicas con `git add -f` — y las cubre el límite
// de tamaño.
export const POLICY_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'wav', 'aif', 'aiff', 'flac', 'mp3', 'm4a', 'aac', 'ogg', 'zip']

const POLICY_RE = new RegExp(`^ai-generations/.*\\.(${POLICY_EXTENSIONS.join('|')})$`, 'i')

export const findViolations = (blobs, maxBytes) =>
  blobs.flatMap(({ size, path }) => {
    const reasons = []

    if (size > maxBytes) reasons.push(`${(size / 1e6).toFixed(1)} MB (máximo ${(maxBytes / 1e6).toFixed(0)} MB)`)
    if (POLICY_RE.test(path)) reasons.push('medio de ai-generations que no se versiona')

    return reasons.length ? [{ path, size, reasons }] : []
  })

const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

export const rangesFromPrePushInput = input =>
  input
    .split('\n')
    .map(line => line.trim().split(/\s+/))
    .filter(parts => parts.length === 4 && !ZERO.test(parts[1]))
    .map(([, localSha, , remoteSha]) => (ZERO.test(remoteSha) ? [localSha, '--not', '--remotes'] : [`${remoteSha}..${localSha}`]))

const blobsIn = revArgs => {
  const objects = git(['rev-list', '--objects', ...revArgs]).trim()

  if (!objects) return []

  const described = execFileSync('git', ['cat-file', '--batch-check=%(objecttype) %(objectsize) %(rest)'], {
    input: objects,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024
  })

  return described
    .split('\n')
    .filter(line => line.startsWith('blob '))
    .map(line => {
      const [, size, ...rest] = line.split(' ')

      return { size: Number(size), path: rest.join(' ') }
    })
    .filter(blob => blob.path)
}

const main = () => {
  const args = process.argv.slice(2)
  const valueOf = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null)
  const maxBytes = Number(valueOf('--max-mb') ?? 50) * 1e6
  const explicit = valueOf('--range')

  let ranges

  if (explicit) ranges = [[explicit]]
  else {
    let input = ''

    try {
      input = process.stdin.isTTY ? '' : readFileSync(0, 'utf8')
    } catch {
      input = ''
    }

    ranges = input.trim() ? rangesFromPrePushInput(input) : [['@{upstream}..HEAD']]
  }

  const seen = new Map()

  for (const range of ranges) for (const blob of blobsIn(range)) seen.set(`${blob.path}\0${blob.size}`, blob)

  const violations = findViolations([...seen.values()], maxBytes)

  if (!violations.length) {
    console.log(`[large-blob-gate] OK — ${seen.size} blob(s) revisados.`)

    return
  }

  console.error(`[large-blob-gate] ${violations.length} archivo(s) no pueden viajar a GitHub:`)

  for (const v of violations.slice(0, 40)) console.error(`  ✗ ${v.path} — ${v.reasons.join('; ')}`)

  if (violations.length > 40) console.error(`  … y ${violations.length - 40} más`)

  console.error(
    '\nSácalos del commit (siguen en disco) y archívalos con `pnpm media:archive-ai-generation -- --run <corrida> --apply`,\n' +
      'que deja el registro en `artifacts.remote.json`. Si ya están en commits sin empujar, hay que reescribir esos commits.'
  )
  process.exit(1)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
