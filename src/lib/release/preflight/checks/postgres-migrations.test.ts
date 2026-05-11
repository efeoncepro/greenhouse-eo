import { describe, expect, it } from 'vitest'

import { parsePgConnectStatusOutput } from './postgres-migrations'

describe('parsePgConnectStatusOutput', () => {
  it('verdict ok cuando output indica todas aplicadas', () => {
    expect(parsePgConnectStatusOutput('Todas las migraciones aplicadas. 0 pending.\n')).toEqual({
      verdict: 'ok',
      pendingCount: 0
    })
  })

  it('verdict ok con frase en ingles', () => {
    expect(parsePgConnectStatusOutput('All migrations applied successfully.')).toEqual({
      verdict: 'ok',
      pendingCount: 0
    })
  })

  it('verdict ok con output real de node-pg-migrate dry-run sin pendientes', () => {
    expect(parsePgConnectStatusOutput('dry run\nNo migrations to run!\nMigrations complete!\n')).toEqual({
      verdict: 'ok',
      pendingCount: 0
    })
  })

  it('verdict pending cuando hay N pending', () => {
    expect(parsePgConnectStatusOutput('3 migrations pending. Run pnpm pg:connect:migrate.')).toEqual(
      { verdict: 'pending', pendingCount: 3 }
    )
  })

  it('verdict pending con singular', () => {
    expect(parsePgConnectStatusOutput('1 migration pending')).toEqual({
      verdict: 'pending',
      pendingCount: 1
    })
  })

  it('verdict unparsed cuando output no matchea ningun pattern', () => {
    expect(parsePgConnectStatusOutput('gibberish output without recognizable patterns')).toEqual({
      verdict: 'unparsed',
      pendingCount: 0
    })
  })

  it('verdict unparsed cuando string vacio', () => {
    expect(parsePgConnectStatusOutput('')).toEqual({ verdict: 'unparsed', pendingCount: 0 })
  })
})
