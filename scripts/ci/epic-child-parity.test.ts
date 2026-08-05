import { describe, expect, it } from 'vitest'

import { lintOperationalArtifacts, parseDeclaredEpic } from './ops-artifact-lint.mjs'

/**
 * Guardrail del gate `epic-child-parity` (ver docs/epics/AEO_PROGRAM_STATUS.md § Delta 2026-08-05 (b)).
 *
 * El campo `Epic:` de una task y el `## Child Tasks` de su epic son dos escrituras que nada
 * reconcilia. Cuando divergen, el epic reporta un avance que no es el suyo: EPIC-020 decía
 * "12/13 childs complete" con 25 tasks declarándose suyas fuera de la lista.
 */
describe('parseDeclaredEpic', () => {
  it('extrae el epic declarado con y sin backticks', () => {
    expect(parseDeclaredEpic('- Epic: `EPIC-020`\n')).toBe('EPIC-020')
    expect(parseDeclaredEpic('- Epic: EPIC-007\n')).toBe('EPIC-007')
  })

  it('ignora los sentinels que significan "sin epic"', () => {
    expect(parseDeclaredEpic('- Epic: `none`\n')).toBeNull()
    expect(parseDeclaredEpic('- Epic: `optional`\n')).toBeNull()
    expect(parseDeclaredEpic('# Task sin campo Epic\n')).toBeNull()
  })

  it('tolera comentarios en la misma línea', () => {
    expect(parseDeclaredEpic('- Epic: `EPIC-029` (pendiente de confirmar)\n')).toBe('EPIC-029')
  })

  it('lee solo la primera declaración, no menciones del cuerpo', () => {
    expect(parseDeclaredEpic('- Epic: `EPIC-040`\n\nDepende de EPIC-020 y EPIC-035.\n')).toBe('EPIC-040')
  })
})

describe('epic-child-parity contra el repo real', () => {
  const parityFindingsFor = (item: string) => {
    const result = lintOperationalArtifacts({
      repoRoot: process.cwd(),
      options: { kind: 'epic', format: 'json', strict: false, changed: false, active: false, strictChildParity: false, item }
    })

    return [...result.errors, ...result.warnings].filter((f: { rule: string }) => f.rule === 'epic-child-parity')
  }

  // Estos tres se reconciliaron el 2026-08-05 y deben quedarse limpios: si una task nueva
  // declara uno de ellos sin entrar a su `## Child Tasks`, este test la caza.
  it.each(['EPIC-020', 'EPIC-021', 'EPIC-040'])('%s no tiene childs declaradas fuera de su lista', item => {
    expect(parityFindingsFor(item)).toEqual([])
  })

  it('detecta el drift cuando existe', () => {
    // EPIC-028 arrastra ~89 childs sin listar; el gate debe verlas, no callarlas.
    expect(parityFindingsFor('EPIC-028').length).toBeGreaterThan(0)
  })
})
