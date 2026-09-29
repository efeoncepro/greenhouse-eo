import { describe, expect, it } from 'vitest'

import { CatalogSemanticError } from '@/lib/artifact-composer'
import { ManzanitasPieceError } from '@/lib/manzanitas-composition'

import { toManzanitasPieceError } from '../errors'
import { paintManzanitasChart } from '../painters'

describe('manzanitas chart painter', () => {
  it('paints a chart from its data and runs the register checks on it', () => {
    const { svg, checks } = paintManzanitasChart({ recipe: 'measure', line: 'engine', surface: 'navy', data: { value: 38, source: '[FUENTE, AÑO]', illustrative: true }, options: { figureLabel: 'te nombran' } })

    expect(svg.startsWith('<svg')).toBe(true)
    expect(checks.length).toBeGreaterThan(0)
    expect(checks.every((c) => c.ok)).toBe(true)
  })

  it('a figure without its source never paints: contract-issues with the contract code', () => {
    let caught: unknown

    try {
      paintManzanitasChart({ recipe: 'measure', line: 'engine', surface: 'navy', data: { value: 38 } })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(ManzanitasPieceError)
    expect((caught as ManzanitasPieceError).code).toBe('contract-issues')
    expect((caught as ManzanitasPieceError).issues[0].code).toMatch(/source/)
  })
})

describe('toManzanitasPieceError', () => {
  it('maps a proposed piece to piece-not-approved and any other catalog rule to contract-issues', () => {
    const runs = (name: string) => [{ name, version: '1.0.0', result: 'fail', violations: ['x'] }]
    const notApproved = toManzanitasPieceError(new CatalogSemanticError(runs('manzanitas.piece-approval') as never))
    const other = toManzanitasPieceError(new CatalogSemanticError(runs('manzanitas.single-line') as never))

    expect(notApproved?.code).toBe('piece-not-approved')
    expect(other?.code).toBe('contract-issues')
    expect(toManzanitasPieceError(new Error('otra cosa'))).toBeNull()
  })
})
