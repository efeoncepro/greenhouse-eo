import { describe, expect, it } from 'vitest'

import {
  availableNexaInteractionModes,
  coerceNexaInteractionMode,
  defaultNexaInteractionMode,
  isNexaInteractionMode
} from './interaction-mode'

const ALL_ON = { expandableEnabled: true, laneEnabled: true }
const EXPANDABLE_ONLY = { expandableEnabled: true, laneEnabled: false }
const ALL_OFF = { expandableEnabled: false, laneEnabled: false }

describe('isNexaInteractionMode', () => {
  it('acepta los 3 modos válidos y rechaza el resto', () => {
    expect(isNexaInteractionMode('dock')).toBe(true)
    expect(isNexaInteractionMode('expandible')).toBe(true)
    expect(isNexaInteractionMode('lane')).toBe(true)
    expect(isNexaInteractionMode('floating')).toBe(false)
    expect(isNexaInteractionMode(null)).toBe(false)
    expect(isNexaInteractionMode(undefined)).toBe(false)
  })
})

describe('defaultNexaInteractionMode — preserva el comportamiento vigente', () => {
  it('con expandible ON → panel B (default actual del flotante)', () => {
    expect(defaultNexaInteractionMode(EXPANDABLE_ONLY)).toBe('expandible')
  })

  it('con expandible OFF → dock compacto', () => {
    expect(defaultNexaInteractionMode(ALL_OFF)).toBe('dock')
  })

  it('nunca devuelve lane por default (opt-in explícito)', () => {
    expect(defaultNexaInteractionMode(ALL_ON)).toBe('expandible')
  })
})

describe('coerceNexaInteractionMode — gating default-safe', () => {
  it('NULL → default (preserva comportamiento)', () => {
    expect(coerceNexaInteractionMode(null, EXPANDABLE_ONLY)).toBe('expandible')
    expect(coerceNexaInteractionMode(undefined, ALL_OFF)).toBe('dock')
  })

  it('valor inválido → default', () => {
    expect(coerceNexaInteractionMode('floating', ALL_ON)).toBe('expandible')
  })

  it('dock siempre se respeta', () => {
    expect(coerceNexaInteractionMode('dock', ALL_ON)).toBe('dock')
    expect(coerceNexaInteractionMode('dock', ALL_OFF)).toBe('dock')
  })

  it('expandible degrada a dock si el flag está OFF', () => {
    expect(coerceNexaInteractionMode('expandible', ALL_ON)).toBe('expandible')
    expect(coerceNexaInteractionMode('expandible', ALL_OFF)).toBe('dock')
  })

  it('lane degrada al default si su flag está OFF (default-safe)', () => {
    expect(coerceNexaInteractionMode('lane', ALL_ON)).toBe('lane')
    expect(coerceNexaInteractionMode('lane', EXPANDABLE_ONLY)).toBe('expandible')
    expect(coerceNexaInteractionMode('lane', ALL_OFF)).toBe('dock')
  })
})

describe('availableNexaInteractionModes — solo ofrece lo disponible', () => {
  it('dock siempre disponible', () => {
    expect(availableNexaInteractionModes(ALL_OFF)).toEqual(['dock'])
  })

  it('agrega expandible/lane según flags', () => {
    expect(availableNexaInteractionModes(EXPANDABLE_ONLY)).toEqual(['dock', 'expandible'])
    expect(availableNexaInteractionModes(ALL_ON)).toEqual(['dock', 'expandible', 'lane'])
  })
})
