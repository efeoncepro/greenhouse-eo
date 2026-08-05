import { describe, expect, it } from 'vitest'

import {
  availableNexaInteractionModes,
  coerceNexaInteractionMode,
  defaultNexaInteractionMode,
  isNexaInteractionMode
} from './interaction-mode'

const LANE_ON = { laneEnabled: true }
const LANE_OFF = { laneEnabled: false }

describe('isNexaInteractionMode', () => {
  it('acepta los 2 modos válidos y rechaza el resto', () => {
    expect(isNexaInteractionMode('expandible')).toBe(true)
    expect(isNexaInteractionMode('lane')).toBe(true)
    expect(isNexaInteractionMode('floating')).toBe(false)
    expect(isNexaInteractionMode(null)).toBe(false)
    expect(isNexaInteractionMode(undefined)).toBe(false)
  })

  it('rechaza el modo retirado `dock` (era el panel efímero pre-TASK-1078)', () => {
    expect(isNexaInteractionMode('dock')).toBe(false)
  })
})

describe('defaultNexaInteractionMode', () => {
  it('el panel ampliable es el piso incondicional', () => {
    expect(defaultNexaInteractionMode()).toBe('expandible')
  })
})

describe('coerceNexaInteractionMode — gating default-safe', () => {
  it('NULL / valor inválido → default', () => {
    expect(coerceNexaInteractionMode(null, LANE_ON)).toBe('expandible')
    expect(coerceNexaInteractionMode(undefined, LANE_OFF)).toBe('expandible')
    expect(coerceNexaInteractionMode('floating', LANE_ON)).toBe('expandible')
  })

  it('`dock` persistido (modo retirado) degrada a expandible, nunca rompe', () => {
    expect(coerceNexaInteractionMode('dock', LANE_ON)).toBe('expandible')
    expect(coerceNexaInteractionMode('dock', LANE_OFF)).toBe('expandible')
  })

  it('expandible siempre se respeta (ya no depende de flag)', () => {
    expect(coerceNexaInteractionMode('expandible', LANE_ON)).toBe('expandible')
    expect(coerceNexaInteractionMode('expandible', LANE_OFF)).toBe('expandible')
  })

  it('lane degrada al default si su flag está OFF (default-safe)', () => {
    expect(coerceNexaInteractionMode('lane', LANE_ON)).toBe('lane')
    expect(coerceNexaInteractionMode('lane', LANE_OFF)).toBe('expandible')
  })
})

describe('availableNexaInteractionModes — solo ofrece lo disponible', () => {
  it('expandible siempre disponible', () => {
    expect(availableNexaInteractionModes(LANE_OFF)).toEqual(['expandible'])
  })

  it('agrega lane cuando su flag está ON', () => {
    expect(availableNexaInteractionModes(LANE_ON)).toEqual(['expandible', 'lane'])
  })

  it('nunca ofrece el modo retirado `dock`', () => {
    expect(availableNexaInteractionModes(LANE_ON)).not.toContain('dock')
    expect(availableNexaInteractionModes(LANE_OFF)).not.toContain('dock')
  })
})
