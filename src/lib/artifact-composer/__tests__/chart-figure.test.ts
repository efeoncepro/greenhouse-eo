import { describe, expect, it } from 'vitest'

import { figurePathEffects } from '../chart-figure'

describe('figurePathEffects', () => {
  it('ignora la geometría vacía para no borrar un trazo SVG ya compuesto', () => {
    expect(figurePathEffects('', 'scatter', 1)).toEqual([])
  })

  it('rechaza contenido que no es geometría SVG numérica', () => {
    expect(figurePathEffects('<circle />', 'scatter', 1)).toBeNull()
  })
})
