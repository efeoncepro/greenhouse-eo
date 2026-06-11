#!/usr/bin/env tsx
/**
 * Regenera el índice navegable de .captures/ (index.json + INDEX.md).
 *
 * Uso:
 *   pnpm fe:capture:index            # regenera y resume en consola
 *   pnpm fe:capture:index --json     # imprime el modelo JSON a stdout
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { writeCaptureIndex } from './lib/capture-index'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const CAPTURES_DIR = resolve(SCRIPT_DIR, '../..', '.captures')

const main = (): void => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { json: { type: 'boolean', default: false } }
  })

  const model = writeCaptureIndex(CAPTURES_DIR)

  if (!model) {
    console.log('No .captures/ dir yet — nada que indexar.')

    return
  }

  if (values.json) {
    console.log(JSON.stringify(model, null, 2))

    return
  }

  console.log(
    `✓ Índice regenerado: ${model.totalScenarios} superficies · ${model.totalRuns} corridas · ${model.activeScenarios} iterando ahora (<${model.activeWindowHours}h)`
  )
  console.log('  → .captures/INDEX.md (operador) · .captures/index.json (agentes)')

  if (model.activeScenarios > 0) {
    console.log('')
    console.log('🔴 Iterando ahora:')

    for (const s of model.scenarios.filter(item => item.active)) {
      console.log(`   ${s.scenario}  (${s.runCount} corridas)  → .captures/${s.evidence.dir}`)
    }
  }
}

main()
