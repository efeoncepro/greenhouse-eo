import { describe, expect, it } from 'vitest'

import { CatalogSemanticError } from '@/lib/artifact-composer'
import { GlitchPieceError } from '@/lib/glitch-composition'

import { toGlitchPieceError } from '../errors'

describe('toGlitchPieceError', () => {
  it('una plantilla en PROPUESTA sale como piece-not-approved, con la violación del catálogo', () => {
    const error = toGlitchPieceError(new CatalogSemanticError([{ name: 'glitch.piece-approval', version: '1.0.0', result: 'fail', violations: ['[s1] en PROPUESTA'] }]))

    expect(error?.code).toBe('piece-not-approved')
    expect(error?.issues).toEqual([{ code: 'glitch.piece-approval', message: '[s1] en PROPUESTA' }])
  })

  it('otra regla de edición sale como contract-issues; un error ajeno no se traduce', () => {
    expect(toGlitchPieceError(new CatalogSemanticError([{ name: 'glitch.cover-rotation', version: '1.0.0', result: 'fail', violations: ['repite'] }]))?.code).toBe('contract-issues')
    expect(toGlitchPieceError(new Error('otro'))).toBeNull()
    expect(toGlitchPieceError(new GlitchPieceError('x', 'manifest-invalid'))?.code).toBe('manifest-invalid')
  })
})
