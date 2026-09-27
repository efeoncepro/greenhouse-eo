import { describe, expect, it } from 'vitest'

import { AXIS_GLITCH_ASSETS, AXIS_BRAND_ASSETS } from '@efeoncepro/axis-brand-assets'
import { efeonceGraphicLine, glitchLine } from '@efeoncepro/axis-tokens'
import { AXIS_GLITCH_LINE_CONTRACT, resolveGlitchLineIntent } from '@efeoncepro/axis-ui-contracts'

// TASK-1922: Greenhouse fija la versión de AXIS que publica Glitch (sólo Glitch). Esta prueba confirma que las
// exportaciones existen en los paquetes instalados; los consumidores reales llegan con TASK-1923 y TASK-1924.
describe('AXIS Glitch line packages', () => {
  it('exports the franchise token, isolated from La órbita', () => {
    expect(glitchLine.franchise).toBe('glitch')
    expect(glitchLine.color.ground).toBe(efeonceGraphicLine.color.dark)
    expect(JSON.stringify(efeonceGraphicLine)).not.toContain(glitchLine.color.accent)
  })

  it('exports the candidate contract and resolves an approved piece', () => {
    expect(AXIS_GLITCH_LINE_CONTRACT).toMatchObject({ id: 'efeonce.glitch-line', version: '0.1.0', lifecycle: 'candidate' })

    const resolved = resolveGlitchLineIntent({
      franchise: 'glitch',
      piece: 'contraportada',
      headline: { entry: 'El micrófono', close: 'se cierra.' }
    })

    expect(resolved.status).toBe('resolved')
    expect(resolved.status === 'resolved' && resolved.actionIcons?.rendering).toBe('flat')
    expect(resolveGlitchLineIntent({ franchise: 'efeonce', piece: 'portada-a' }).status).toBe('invalid')
  })

  it('ships the Glitch assets apart from the family', () => {
    expect(AXIS_GLITCH_ASSETS.map(asset => asset.id).sort()).toEqual(['glitch-apple', 'glitch-logo-negative', 'glitch-logo-positive'])
    expect(AXIS_BRAND_ASSETS.some(asset => asset.id.startsWith('glitch'))).toBe(false)
  })
})
