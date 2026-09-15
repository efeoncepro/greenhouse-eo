import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { listInsightEditionTransitions } from '../edition-state-machine'

/**
 * TASK-1845 — PARIDAD TS ↔ DB de la state machine de InsightEdition (molde TASK-1392).
 * La matriz vive dos veces a propósito (app guard + trigger DB). Este test parsea el seed
 * de la migración foundation y exige igualdad EXACTA de transiciones y gates humanos.
 * Si cambia la matriz: TS + migración NUEVA (la aplicada no se edita) + este test, juntos.
 */

const MIGRATION_PATH = path.resolve(process.cwd(), 'migrations/20260915100154428_task-1845-insights-foundation.sql')

const parseSeedRows = (): Array<{ key: string; humanGate: boolean }> => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8')
  const block = sql.match(/INSERT INTO greenhouse_insights\.insight_edition_state_matrix[^;]+;/)?.[0]

  expect(block, 'el seed de insight_edition_state_matrix debe existir en la migración').toBeTruthy()

  return [...block!.matchAll(/\('([a-z_]+)',\s*'([a-z_]+)',\s*(true|false)\)/g)].map(match => ({
    key: `${match[1]}→${match[2]}`,
    humanGate: match[3] === 'true'
  }))
}

describe('paridad insight_edition_state_matrix (DB) ↔ edition-state-machine (TS)', () => {
  const seed = parseSeedRows()
  const ts = listInsightEditionTransitions().map(row => ({ key: `${row.from}→${row.to}`, humanGate: row.humanGate }))

  it('las transiciones sembradas son EXACTAMENTE las de la matriz TS', () => {
    expect(new Set(seed.map(row => row.key))).toEqual(new Set(ts.map(row => row.key)))
    expect(seed).toHaveLength(ts.length)
  })

  it('los gates humanos coinciden transición por transición', () => {
    const dbGates = new Map(seed.map(row => [row.key, row.humanGate]))

    for (const row of ts) expect(dbGates.get(row.key), row.key).toBe(row.humanGate)
  })

  it('el DO block de la migración exige exactamente ese número de filas', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8')

    expect(sql).toContain(`FROM greenhouse_insights.insight_edition_state_matrix) <> ${ts.length}`)
  })
})
