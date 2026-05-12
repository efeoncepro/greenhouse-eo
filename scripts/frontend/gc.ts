#!/usr/bin/env tsx
/**
 * Garbage collector para .captures/ — purga directorios >30 días.
 *
 * Uso:
 *   pnpm fe:capture:gc                # dry-run (lista qué borraría)
 *   pnpm fe:capture:gc --apply        # ejecuta el borrado
 *   pnpm fe:capture:gc --apply --days=7  # threshold custom
 */

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '../..')
const CAPTURES_DIR = resolve(REPO_ROOT, '.captures')

const main = (): void => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      apply: { type: 'boolean', default: false },
      days: { type: 'string', default: '30' }
    }
  })

  if (!existsSync(CAPTURES_DIR)) {
    console.log('No .captures/ dir yet — nada que purgar.')

    return
  }

  const daysThreshold = Number(values.days)
  const cutoffMs = Date.now() - daysThreshold * 24 * 60 * 60 * 1000

  const entries = readdirSync(CAPTURES_DIR, { withFileTypes: true })
  const toPurge: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const path = resolve(CAPTURES_DIR, entry.name)

    try {
      const { mtimeMs } = statSync(path)

      if (mtimeMs < cutoffMs) {
        toPurge.push(entry.name)
      }
    } catch {
      // ignore unreadable entries
    }
  }

  if (toPurge.length === 0) {
    console.log(`✓ Nothing older than ${daysThreshold} days.`)

    return
  }

  if (values.apply) {
    for (const name of toPurge) {
      rmSync(resolve(CAPTURES_DIR, name), { recursive: true, force: true })
    }

    console.log(`✓ Purged ${toPurge.length} capture dir(s) older than ${daysThreshold} days.`)
  } else {
    console.log(`Dry-run: ${toPurge.length} dir(s) would be purged (older than ${daysThreshold}d). Use --apply to execute.`)
    for (const name of toPurge.slice(0, 20)) console.log(`  - ${name}`)
    if (toPurge.length > 20) console.log(`  …and ${toPurge.length - 20} more`)
  }
}

main()
