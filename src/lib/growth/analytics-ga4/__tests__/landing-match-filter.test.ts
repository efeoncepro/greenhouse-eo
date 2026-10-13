import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { buildGa4LandingMatchFilter } from '../reader'

/**
 * TASK-2033 — reglas de página de entrada → filtro de la Data API de GA4. La dimensión trae la ruta CON su query,
 * así que «la ruta es X» son varias comparaciones; un prefijo es `X/…`, nunca `X…`.
 */
describe('TASK-2033 — filtro de página de entrada de GA4', () => {
  const valuesOf = (filter: ReturnType<typeof buildGa4LandingMatchFilter>) => filter!.orGroup.expressions.map(expression => `${expression.filter.stringFilter.matchType}:${expression.filter.stringFilter.value}`)

  it('sin reglas no hay filtro', () => {
    expect(buildGa4LandingMatchFilter([])).toBeNull()
  })

  it('un prefijo cubre la sección, su query y sus hijas, pero no otra sección que empieza igual', () => {
    const values = valuesOf(buildGa4LandingMatchFilter([{ kind: 'prefix', path: '/articulos' }]))

    expect(values).toEqual(['EXACT:/articulos', 'BEGINS_WITH:/articulos?', 'BEGINS_WITH:/articulos/'])
    // «/articulos-viejos» no empieza por ninguno de los tres valores con su separador.
    expect(values.some(value => '/articulos-viejos/x'.startsWith(value.split(':')[1]!) && value.startsWith('BEGINS_WITH'))).toBe(false)
  })

  it('una ruta exacta cubre sus variantes con barra final y con query, nunca a sus hijas', () => {
    const values = valuesOf(buildGa4LandingMatchFilter([{ kind: 'exact', path: '/guia' }]))

    expect(values).toEqual(['EXACT:/guia', 'BEGINS_WITH:/guia?', 'EXACT:/guia/', 'BEGINS_WITH:/guia/?'])
    expect(values.some(value => value.startsWith('BEGINS_WITH') && '/guia/hija'.startsWith(value.split(':')[1]!))).toBe(false)
  })

  it('todas las comparaciones son sobre la página de entrada y distinguen mayúsculas', () => {
    const filter = buildGa4LandingMatchFilter([{ kind: 'prefix', path: '/a' }, { kind: 'exact', path: '/b' }])!

    expect(filter.orGroup.expressions).toHaveLength(7)
    expect(filter.orGroup.expressions.every(expression => expression.filter.fieldName === 'landingPagePlusQueryString' && expression.filter.stringFilter.caseSensitive === true)).toBe(true)
  })
})
