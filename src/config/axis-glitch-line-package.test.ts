import { describe, expect, it } from 'vitest'

import { AXIS_GLITCH_ASSETS, AXIS_BRAND_ASSETS } from '@efeoncepro/axis-brand-assets'
import { efeonceGraphicLine, glitchLine } from '@efeoncepro/axis-tokens'
import { AXIS_GLITCH_LINE_CONTRACT, resolveGlitchLineIntent } from '@efeoncepro/axis-ui-contracts'

// TASK-1922: Greenhouse fija la versión de AXIS que publica Glitch (sólo Glitch). Esta prueba confirma que las
// exportaciones existen en los paquetes instalados; los consumidores reales llegan con TASK-1923 y TASK-1924.
// Contrato 0.2.0 (AXIS v0.3.24, 2026-09-28): la edición semanal y el Glitch Flash, sin número ni avance.
describe('AXIS Glitch line packages', () => {
  it('exports the franchise token, isolated from La órbita', () => {
    expect(glitchLine.franchise).toBe('glitch')
    expect(glitchLine.color.ground).toBe(efeonceGraphicLine.color.dark)
    expect(JSON.stringify(efeonceGraphicLine)).not.toContain(glitchLine.color.accent)
  })

  it('exports the candidate contract and resolves an approved piece', () => {
    expect(AXIS_GLITCH_LINE_CONTRACT).toMatchObject({ id: 'efeonce.glitch-line', version: '0.2.0', lifecycle: 'candidate' })

    const resolved = resolveGlitchLineIntent({
      franchise: 'glitch',
      piece: 'contraportada',
      headline: { entry: 'El micrófono', close: 'se cierra.' }
    })

    expect(resolved.status).toBe('resolved')
    expect(resolved.status === 'resolved' && resolved.actionIcons?.rendering).toBe('flat')
    expect(resolveGlitchLineIntent({ franchise: 'efeonce', piece: 'portada-a' }).status).toBe('invalid')
  })

  it('resolves a Glitch Flash without edition number and rejects one that carries it', () => {
    expect(glitchLine.editions.flash).toBeDefined()

    const flash = resolveGlitchLineIntent({
      contract: 'efeonce.glitch-line',
      version: '0.2.0',
      franchise: 'glitch',
      edition: { kind: 'flash' },
      piece: 'flash-portada',
      format: 'linkedin-4x5',
      headline: { entry: 'El modelo del medio', close: 'dejó de ser el plan B.' },
      bytes: [{ box: { x: 0, y: 430, w: 1080, h: 200 }, edge: 'bottom' }],
      faces: []
    })

    expect(flash.status).toBe('resolved')

    const numbered = resolveGlitchLineIntent({
      contract: 'efeonce.glitch-line',
      version: '0.2.0',
      franchise: 'glitch',
      edition: { kind: 'flash', number: 18 },
      piece: 'flash-interior',
      format: 'linkedin-4x5',
      progress: { current: 1, total: 8 },
      headline: { entry: 'Anthropic lanzó', close: 'Claude Sonnet 5.5.' }
    })

    expect(numbered.status).toBe('invalid')
    expect(JSON.stringify(numbered)).toContain('flash-edition-number-not-allowed')
    expect(JSON.stringify(numbered)).toContain('flash-progress-not-allowed')
  })

  it('ships the Glitch assets apart from the family', () => {
    expect(AXIS_GLITCH_ASSETS.map(asset => asset.id).sort()).toEqual(['glitch-apple', 'glitch-logo-negative', 'glitch-logo-positive'])
    expect(AXIS_BRAND_ASSETS.some(asset => asset.id.startsWith('glitch'))).toBe(false)
  })
})
