import { describe, expect, it } from 'vitest'

import { buildCandidateSearchKey, CANDIDATE_SEARCH_KEY_VERSION } from './search-key'

// TASK-1736 Slice 1 — search key derivada/versionada. Nunca fusiona Person por sí sola.

describe('buildCandidateSearchKey (v1)', () => {
  it('casefold + translitera diacríticos latinos + colapsa whitespace', () => {
    expect(buildCandidateSearchKey('María Pérez').value).toBe('maria perez')
    expect(buildCandidateSearchKey('  VALENTINA   Villa ').value).toBe('valentina villa')
    expect(buildCandidateSearchKey('José Ñandú').value).toBe('jose nandu')
  })

  it('mismo key para variantes de casing/whitespace/NFC de la misma persona', () => {
    const composed = buildCandidateSearchKey('Valentina Peña')
    const decomposed = buildCandidateSearchKey('valentina  PEÑA')

    expect(composed.value).toBe(decomposed.value)
    expect(composed.value).toBe('valentina pena')
  })

  it('NO destruye escrituras no latinas (extiende normalizeMatchValue, que las vaciaba)', () => {
    expect(buildCandidateSearchKey('李小龙').value).toBe('李小龙')
    expect(buildCandidateSearchKey('Иван Петров').value).toBe('иван петров')
  })

  it('puntuación → espacio; letras y dígitos Unicode se preservan', () => {
    expect(buildCandidateSearchKey("Conan O'Brien").value).toBe('conan o brien')
    expect(buildCandidateSearchKey('Ana-María').value).toBe('ana maria')
  })

  it('lleva versión explícita v1', () => {
    expect(buildCandidateSearchKey('x y').version).toBe('v1')
    expect(CANDIDATE_SEARCH_KEY_VERSION).toBe('v1')
  })
})
