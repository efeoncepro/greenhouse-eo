import { describe, expect, it } from 'vitest'

import {
  activeProcessPredicate,
  isActiveProcess,
  notActiveProcessPredicate,
} from './active-process'

/**
 * TASK-1772 — los cuatro cuadrantes, nombrados como tales.
 *
 * El segundo es el que motiva el módulo entero: existe en la base y ningún consumidor lo cubría.
 */
describe('isActiveProcess — los cuatro cuadrantes', () => {
  it('sin desenlace / sin archivar → SÍ es proceso activo (la persona está en el pipeline)', () => {
    expect(isActiveProcess({ decision: null, archivedAt: null })).toBe(true)
  })

  it('sin desenlace / ARCHIVADA → NO es proceso activo (retirada de la vista sin declarar desenlace)', () => {
    expect(isActiveProcess({ decision: null, archivedAt: '2026-08-22T00:00:00.000Z' })).toBe(false)
  })

  it('con desenlace / sin archivar → NO es proceso activo (el recorrido terminó)', () => {
    expect(isActiveProcess({ decision: 'not_selected', archivedAt: null })).toBe(false)
  })

  it('con desenlace / ARCHIVADA → NO es proceso activo (terminó y además se archivó)', () => {
    expect(isActiveProcess({ decision: 'selected', archivedAt: new Date('2026-08-22') })).toBe(false)
  })
})

describe('isActiveProcess — bordes de ausencia', () => {
  /**
   * Un VM parcial que todavía no expone la columna NO debe convertir a toda su población en
   * archivada: la ausencia de dato es «no archivada», nunca lo contrario.
   */
  it('`undefined` se lee como ausencia, igual que `null`', () => {
    expect(isActiveProcess({ decision: undefined, archivedAt: undefined })).toBe(true)
    expect(isActiveProcess({ decision: undefined, archivedAt: null })).toBe(true)
    expect(isActiveProcess({ decision: null, archivedAt: undefined })).toBe(true)
  })

  it('acepta `Date` además de string ISO — el driver devuelve una u otro según el path', () => {
    expect(isActiveProcess({ decision: null, archivedAt: new Date('2026-08-22') })).toBe(false)
  })
})

describe('activeProcessPredicate — fragmento SQL', () => {
  it('nombra las dos columnas del alias recibido y NINGUNA más', () => {
    expect(activeProcessPredicate('app')).toBe('app.decision IS NULL AND app.archived_at IS NULL')
  })

  it('`stage` NO participa del predicado: con el CHECK aplicado sería repetir `decision IS NULL`', () => {
    expect(activeProcessPredicate('a')).not.toContain('stage')
  })

  it('interpola el alias recibido, sin asumir uno', () => {
    expect(activeProcessPredicate('open_app')).toBe(
      'open_app.decision IS NULL AND open_app.archived_at IS NULL',
    )
  })

  /**
   * Sin los paréntesis, el `NOT` sólo alcanzaría la primera condición y el predicado diría algo
   * distinto de lo que aparenta. Es el motivo de que la negación exista como helper.
   */
  it('la negación envuelve la conjunción ENTERA en paréntesis', () => {
    expect(notActiveProcessPredicate('app')).toBe(
      'NOT (app.decision IS NULL AND app.archived_at IS NULL)',
    )
  })
})

describe('paridad SQL ↔ TS', () => {
  /**
   * Dos implementaciones de la misma regla derivan si nadie las confronta. Este test no ejecuta
   * SQL: confronta que las condiciones NOMBRADAS por el fragmento sean exactamente las que el
   * predicado TS evalúa, y que no aparezca una tercera sin que alguien toque este test.
   */
  it('el fragmento SQL evalúa las mismas dos columnas que el predicado TS', () => {
    const sql = activeProcessPredicate('x')
    const conditions = sql.split(' AND ')

    expect(conditions).toHaveLength(2)
    expect(conditions[0]).toBe('x.decision IS NULL')
    expect(conditions[1]).toBe('x.archived_at IS NULL')
  })
})
