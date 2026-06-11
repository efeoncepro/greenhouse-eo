#!/usr/bin/env tsx
/**
 * Garbage collector para .captures/.
 *
 * Uso:
 *   pnpm fe:capture:gc                         # dry-run (lista qué borraría)
 *   pnpm fe:capture:gc --apply                 # ejecuta el borrado >30d
 *   pnpm fe:capture:gc --apply --days=7        # threshold custom
 *   pnpm fe:capture:gc --max-gb=15 --keep=20   # purga oldest hasta el cap
 *   pnpm fe:capture:gc --per-scenario=1        # conserva la corrida más reciente
 *                                              # por scenario (= la evidencia final),
 *                                              # purga las iteraciones anteriores
 */

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { writeCaptureIndex } from './lib/capture-index'
import { RESERVED_TOP_LEVEL_DIRS, scenarioFromDirName } from './lib/capture-paths'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '../..')
const CAPTURES_DIR = resolve(REPO_ROOT, '.captures')

const HELP_TEXT = `Greenhouse Visual Capture Garbage Collector

Uso:
  pnpm fe:capture:gc [--apply] [--days=30] [--max-gb=20] [--keep=20] [--per-scenario=N] [--grace-days=2]

Opciones:
  --apply          Ejecuta el borrado. Sin este flag siempre es dry-run.
  --days=N         Borra runs más viejos que N días. Default: 30
  --max-gb=N       Si .captures/ supera N GB, borra oldest hasta quedar bajo el cap.
  --keep=N         Protege los N runs más recientes (global) ante toda purga.
  --per-scenario=N Conserva las N corridas más recientes POR scenario (= la evidencia
                   final) y purga las iteraciones anteriores del mismo scenario, sin
                   importar la edad. Es el modo que limpia el ruido de iteración.
  --grace-days=N   Nunca purga runs más nuevos que N días (protege sesiones en curso).
                   Solo aplica al modo --per-scenario. Default: 2
  -h, --help       Muestra esta ayuda

Ejemplos:
  pnpm fe:capture:gc --per-scenario=1            # dry-run: qué iteraciones borraría
  pnpm fe:capture:gc --per-scenario=1 --apply    # conserva 1 evidencia por scenario
  pnpm fe:capture:gc --per-scenario=2 --days=90 --apply   # 2 por scenario + barrido >90d
`

interface CaptureDir {
  name: string
  path: string
  scenario: string
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
    .filter(entry => entry.isDirectory() && !RESERVED_TOP_LEVEL_DIRS.has(entry.name))
    .flatMap(entry => {
      const path = resolve(CAPTURES_DIR, entry.name)

      try {
        const stat = statSync(path)

        return [
          {
            name: entry.name,
            path,
            scenario: scenarioFromDirName(entry.name),
            mtimeMs: stat.mtimeMs,
            sizeBytes: directorySize(path)
          }
        ]
      } catch {
        return []
      }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)

/**
 * Auto-poda por scenario, pensada para llamarse al final de cada captura.
 * Conserva las `keep` corridas más recientes del scenario (= la evidencia
 * vigente) y borra las iteraciones anteriores más viejas que `graceDays`.
 * Best-effort + silencioso: nunca debe romper el flujo de la captura.
 * Devuelve cuántos dirs borró.
 */
export const pruneScenarioRuns = (
  scenario: string,
  keep = 3,
  graceDays = 2,
  capturesDir: string = CAPTURES_DIR
): number => {
  if (!existsSync(capturesDir)) return 0

  const graceCutoffMs = Date.now() - graceDays * 24 * 60 * 60 * 1000
  let removed = 0

  try {
    const runs = readdirSync(capturesDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && scenarioFromDirName(entry.name) === scenario)
      .flatMap(entry => {
        const path = resolve(capturesDir, entry.name)

        try {
          return [{ path, mtimeMs: statSync(path).mtimeMs }]
        } catch {
          return []
        }
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs)

    for (const run of runs.slice(Math.max(keep, 1))) {
      if (run.mtimeMs >= graceCutoffMs) continue

      try {
        rmSync(run.path, { recursive: true, force: true })
        removed += 1
      } catch {
        // best-effort; never block the capture flow on cleanup.
      }
    }
  } catch {
    // best-effort.
  }

  return removed
}

const main = (): void => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      apply: { type: 'boolean', default: false },
      days: { type: 'string', default: '30' },
      'max-gb': { type: 'string' },
      keep: { type: 'string', default: '0' },
      'per-scenario': { type: 'string' },
      'grace-days': { type: 'string', default: '2' },
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

  const perScenario =
    values['per-scenario'] === undefined
      ? null
      : Math.floor(parsePositiveNumber(values['per-scenario'], 1, '--per-scenario'))

  const graceDays = parsePositiveNumber(values['grace-days'], 2, '--grace-days')
  const maxGb = values['max-gb'] === undefined ? null : parsePositiveNumber(values['max-gb'], 0, '--max-gb')
  const maxBytes = maxGb === null ? null : maxGb * 1024 ** 3
  const cutoffMs = Date.now() - daysThreshold * 24 * 60 * 60 * 1000
  const graceCutoffMs = Date.now() - graceDays * 24 * 60 * 60 * 1000
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

  // Per-scenario retention: keep the N newest runs of each scenario (the final
  // evidence) and purge the older same-scenario iterations regardless of age.
  // A `--grace-days` window protects runs from sessions still in progress.
  if (perScenario !== null) {
    const byScenario = new Map<string, CaptureDir[]>()

    for (const dir of dirs) {
      const bucket = byScenario.get(dir.scenario)

      if (bucket) bucket.push(dir)
      else byScenario.set(dir.scenario, [dir])
    }

    for (const runs of byScenario.values()) {
      // dirs already sorted newest-first; protect the first N per scenario.
      for (const dir of runs.slice(perScenario)) {
        if (dir.mtimeMs >= graceCutoffMs) continue

        addPurge(dir, `superseded (kept ${perScenario} newest of '${dir.scenario}')`)
      }
    }
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

    // Mantener la taxonomía consistente con la realidad post-purga.
    writeCaptureIndex(CAPTURES_DIR)
    console.log('✓ Índice regenerado (.captures/INDEX.md, index.json)')
  } else {
    console.log(`Dry-run: ${toPurge.length} dir(s) would be purged, reclaiming ${bytesToHuman(purgeSize)}. Use --apply to execute.`)

    for (const item of toPurge.slice(0, 20)) {
      console.log(`  - ${item.dir.name} (${bytesToHuman(item.dir.sizeBytes)}; ${item.reasons.join(', ')})`)
    }

    if (toPurge.length > 20) console.log(`  …and ${toPurge.length - 20} more`)
  }
}

// Solo corre la CLI cuando se ejecuta directamente (no al importar el helper).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
