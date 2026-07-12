import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  HUMAN_GATE_TRANSITIONS,
  TENDER_STATES,
  TENDER_TRANSITION_MATRIX,
  TERMINAL_TENDER_STATES
} from '../tender-state-machine'

/**
 * TASK-1392 — PARIDAD TS ↔ DB de la state machine del Proposal.
 *
 * La matriz vive DOS veces a propósito (defense in depth): en
 * `tender-state-machine.ts` (guard de aplicación, fail-fast antes de tocar DB) y en
 * `greenhouse_commercial.proposal_state_matrix` (trigger de DB — la última defensa, sembrada por la
 * migración de F0). Dos copias que pueden divergir son una mentira esperando a pasar: este test
 * parsea el seed de la migración y exige igualdad EXACTA de transiciones y gates humanos.
 *
 * Si cambias la matriz: TS + migración nueva (la aplicada NO se edita) + este test — juntos.
 */

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  'migrations/20260712160001023_task-1392-proposal-studio-foundation.sql'
)

interface SeedRow {
  from: string
  to: string
  humanGate: boolean
}

const parseSeedRows = (): SeedRow[] => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8')

  const block = sql.match(
    /INSERT INTO greenhouse_commercial\.proposal_state_matrix[^;]+;/
  )?.[0]

  expect(block, 'el seed de proposal_state_matrix debe existir en la migración').toBeTruthy()

  return [...block!.matchAll(/\('([a-z_]+)',\s*'([a-z_]+)',\s*(true|false)\)/g)].map(match => ({
    from: match[1]!,
    to: match[2]!,
    humanGate: match[3] === 'true'
  }))
}

describe('paridad proposal_state_matrix (DB) ↔ tender-state-machine (TS)', () => {
  const seedRows = parseSeedRows()

  it('las transiciones sembradas en DB son EXACTAMENTE las de la matriz TS', () => {
    const tsTransitions = new Set(
      TENDER_STATES.flatMap(from => TENDER_TRANSITION_MATRIX[from].map(to => `${from}→${to}`))
    )

    const dbTransitions = new Set(seedRows.map(row => `${row.from}→${row.to}`))

    expect([...dbTransitions].sort()).toEqual([...tsTransitions].sort())
  })

  it('los gates humanos sembrados en DB son EXACTAMENTE los de HUMAN_GATE_TRANSITIONS', () => {
    const dbGates = new Set(seedRows.filter(row => row.humanGate).map(row => `${row.from}→${row.to}`))

    expect([...dbGates].sort()).toEqual([...HUMAN_GATE_TRANSITIONS].sort())
  })

  it('el CHECK de estados de la migración contiene los 12 estados TS (y won/lost, nunca awarded)', () => {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8')

    for (const state of TENDER_STATES) {
      expect(sql).toContain(`'${state}'`)
    }

    // El vocabulario congelado en Slice 0: la migración jamás contiene el vocabulario prohibido
    // (los nombres de TABLA viejos y los valores de enum que el Delta prohíbe — el path TS
    // `commercial/tenders/` es legítimo y no cuenta).
    expect(sql).not.toMatch(/'awarded'|'not_awarded'|'manual'|'public_discovery'/)
    expect(sql).not.toMatch(/greenhouse_commercial\.(tenders|tender_state_transitions|tender_assets|tender_requirements)\b/)
  })

  it('los terminales no tienen filas de salida en el seed (no se reabren)', () => {
    for (const terminal of TERMINAL_TENDER_STATES) {
      expect(seedRows.filter(row => row.from === terminal)).toHaveLength(0)
    }
  })
})
