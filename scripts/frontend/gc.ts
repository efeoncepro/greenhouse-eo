#!/usr/bin/env tsx
/**
 * Garbage collector para .captures/.
 *
 * Uso:
 *   pnpm fe:capture:gc                         # dry-run (lista qué borraría)
 *   pnpm fe:capture:gc --apply                 # ejecuta el borrado >30d
 *   pnpm fe:capture:gc --apply --days=7        # threshold custom
 *   pnpm fe:capture:gc --max-gb=15 --keep=20   # purga oldest hasta el cap
 */

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '../..')
const CAPTURES_DIR = resolve(REPO_ROOT, '.captures')

const HELP_TEXT = `Greenhouse Visual Capture Garbage Collector

Uso:
  pnpm fe:capture:gc [--apply] [--days=30] [--max-gb=20] [--keep=20]

Opciones:
  --apply       Ejecuta el borrado. Sin este flag siempre es dry-run.
  --days=N      Borra runs más viejos que N días. Default: 30
  --max-gb=N    Si .captures/ supera N GB, borra oldest hasta quedar bajo el cap.
  --keep=N      Protege los N runs más recientes ante purga por tamaño.
  -h, --help    Muestra esta ayuda
`

interface CaptureDir {
  name: string
  path: string
  mtimeMs: number
  sizeBytes: number
}

const bytesToHuman = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`

  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

const parsePositiveNumber = (value: unknown, fallback: number, label: string): number => {
  const parsed = Number(value ?? fallback)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} debe ser un número >= 0. Recibido: ${String(value)}`)
  }

  return parsed
}

const directorySize = (path: string): number => {
  let total = 0

  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const entryPath = resolve(path, entry.name)

    try {
      if (entry.isDirectory()) {
        total += directorySize(entryPath)
      } else if (entry.isFile()) {
        total += statSync(entryPath).size
      }
    } catch {
      // Ignore unreadable entries; GC must be best-effort and non-blocking.
    }
  }

  return total
}

const listCaptureDirs = (): CaptureDir[] =>
  readdirSync(CAPTURES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry => {
      const path = resolve(CAPTURES_DIR, entry.name)

      try {
        const stat = statSync(path)

        return [{ name: entry.name, path, mtimeMs: stat.mtimeMs, sizeBytes: directorySize(path) }]
      } catch {
        return []
      }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)

const main = (): void => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      apply: { type: 'boolean', default: false },
      days: { type: 'string', default: '30' },
      'max-gb': { type: 'string' },
      keep: { type: 'string', default: '0' },
      help: { type: 'boolean', short: 'h', default: false }
    }
  })

  if (values.help === true) {
    console.log(HELP_TEXT)

    return
  }

  if (!existsSync(CAPTURES_DIR)) {
    console.log('No .captures/ dir yet — nada que purgar.')

    return
  }

  const daysThreshold = parsePositiveNumber(values.days, 30, '--days')
  const keep = Math.floor(parsePositiveNumber(values.keep, 0, '--keep'))
  const maxGb = values['max-gb'] === undefined ? null : parsePositiveNumber(values['max-gb'], 0, '--max-gb')
  const maxBytes = maxGb === null ? null : maxGb * 1024 ** 3
  const cutoffMs = Date.now() - daysThreshold * 24 * 60 * 60 * 1000
  const dirs = listCaptureDirs()
  const totalSize = dirs.reduce((acc, dir) => acc + dir.sizeBytes, 0)
  const protectedByRecency = new Set(dirs.slice(0, keep).map(dir => dir.name))
  const purgeMap = new Map<string, { dir: CaptureDir; reasons: string[] }>()

  const addPurge = (dir: CaptureDir, reason: string): void => {
    if (protectedByRecency.has(dir.name)) return

    const existing = purgeMap.get(dir.name)

    if (existing) {
      existing.reasons.push(reason)
    } else {
      purgeMap.set(dir.name, { dir, reasons: [reason] })
    }
  }

  for (const dir of dirs) {
    if (dir.mtimeMs < cutoffMs) addPurge(dir, `older than ${daysThreshold}d`)
  }

  if (maxBytes !== null && totalSize > maxBytes) {
    let retainedSize = totalSize - [...purgeMap.values()].reduce((acc, item) => acc + item.dir.sizeBytes, 0)

    for (const dir of [...dirs].reverse()) {
      if (retainedSize <= maxBytes) break
      if (protectedByRecency.has(dir.name)) continue
      if (purgeMap.has(dir.name)) continue

      addPurge(dir, `size cap ${maxGb}GB`)
      retainedSize -= dir.sizeBytes
    }
  }

  const toPurge = [...purgeMap.values()].sort((a, b) => a.dir.mtimeMs - b.dir.mtimeMs)
  const purgeSize = toPurge.reduce((acc, item) => acc + item.dir.sizeBytes, 0)

  console.log(`.captures/: ${dirs.length} dir(s), ${bytesToHuman(totalSize)} total`)
  if (keep > 0) console.log(`Protected newest: ${keep} dir(s)`)

  if (toPurge.length === 0) {
    console.log(`✓ Nothing to purge. Threshold=${daysThreshold}d${maxGb === null ? '' : `, max=${maxGb}GB`}.`)

    return
  }

  if (values.apply) {
    for (const item of toPurge) {
      rmSync(item.dir.path, { recursive: true, force: true })
    }

    console.log(`✓ Purged ${toPurge.length} capture dir(s), reclaimed ${bytesToHuman(purgeSize)}.`)
  } else {
    console.log(`Dry-run: ${toPurge.length} dir(s) would be purged, reclaiming ${bytesToHuman(purgeSize)}. Use --apply to execute.`)

    for (const item of toPurge.slice(0, 20)) {
      console.log(`  - ${item.dir.name} (${bytesToHuman(item.dir.sizeBytes)}; ${item.reasons.join(', ')})`)
    }

    if (toPurge.length > 20) console.log(`  …and ${toPurge.length - 20} more`)
  }
}

main()
