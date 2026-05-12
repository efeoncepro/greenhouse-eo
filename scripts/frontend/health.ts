#!/usr/bin/env tsx
/**
 * Health probe local del helper de captura.
 *
 * Lee .captures/audit.jsonl + computa failure rate, mean duration,
 * last failure. Útil para que un agente o dev valide salud de las
 * capturas antes de invocar un loop intensivo.
 *
 * Uso:
 *   pnpm fe:capture:health             # last 20 runs
 *   pnpm fe:capture:health --last=50   # window custom
 *   pnpm fe:capture:health --json      # machine-readable output
 *
 * V1.2 (futuro): este helper migra a leer de PG cuando CI integre la tabla
 * greenhouse_serving.frontend_capture_runs.
 */

import { parseArgs } from 'node:util'

import { computeReliabilitySignal } from './lib/reliability'

const main = (): void => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      last: { type: 'string', default: '20' },
      json: { type: 'boolean', default: false }
    }
  })

  const signal = computeReliabilitySignal(Number(values.last))

  if (values.json) {
    console.log(JSON.stringify(signal, null, 2))

    return
  }

  const emoji = signal.signal === 'ok' ? '🟢' : signal.signal === 'warning' ? '🟡' : signal.signal === 'error' ? '🔴' : '⚪'

  console.log('')
  console.log(`${emoji}  Frontend capture health (last ${signal.totalRuns} runs)`)
  console.log('')

  if (signal.totalRuns === 0) {
    console.log('  No hay runs registrados. Ejecutá `pnpm fe:capture <scenario>` para empezar.')

    return
  }

  console.log(`  total runs:     ${signal.totalRuns}`)
  console.log(`  failed runs:    ${signal.failedRuns}`)
  console.log(`  failure rate:   ${(signal.failureRate * 100).toFixed(1)}%`)
  console.log(`  mean duration:  ${signal.meanDurationMs}ms`)
  console.log(`  thresholds:     warning ≥${signal.threshold.warning * 100}%, error ≥${signal.threshold.error * 100}%`)

  if (signal.lastFailure) {
    console.log('')
    console.log(`  ⚠️ last failure: ${signal.lastFailure.timestamp}`)
    console.log(`     scenario:    ${signal.lastFailure.scenarioName}`)

    if (signal.lastFailure.error) {
      console.log(`     error:       ${signal.lastFailure.error.slice(0, 100)}`)
    }
  }

  console.log('')

  if (signal.signal === 'error') process.exit(1)
}

main()
