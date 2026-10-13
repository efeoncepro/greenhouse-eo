import { describe, expect, it } from 'vitest'

import { canonicalContentScopeRules, contentScopeKey, contentScopePathOf, isContentScopeActive, isPathInContentScope, parseSeoContentScopeRules, type SeoContentScopeRuleV1 } from './contracts'
import { contentScopeSqlClause } from './sql'

const BEREL: SeoContentScopeRuleV1[] = [
  { kind: 'prefix', path: '/articulos' },
  { kind: 'prefix', path: '/tutoriales' },
  { kind: 'prefix', path: '/inspiracion' },
  { kind: 'exact', path: '/pintura-y-barniz-para-madera-como-elegir' }
]

describe('TASK-2033 — ruta comparable', () => {
  it.each([
    ['https://berel.com/articulos/como-pintar', '/articulos/como-pintar'],
    ['https://www.berel.com/articulos/', '/articulos'],
    ['http://berel.com/colores?producto=1865', '/colores'],
    ['https://berel.com/tutoriales/x#paso-2', '/tutoriales/x'],
    ['https://berel.com/', ''],
    ['https://berel.com', ''],
    ['/inspiracion/exteriores//', '/inspiracion/exteriores']
  ])('%s → %s', (input, expected) => {
    expect(contentScopePathOf(input)).toBe(expected)
  })
})

describe('TASK-2033 — pertenencia al alcance', () => {
  it.each([
    ['https://berel.com/articulos', true],
    ['https://berel.com/articulos/como-pintar-una-pared', true],
    ['https://www.berel.com/tutoriales/x?utm_source=a', true],
    ['https://berel.com/pintura-y-barniz-para-madera-como-elegir', true],
    ['https://berel.com/pintura-y-barniz-para-madera-como-elegir/', true],
    // Un prefijo NO es un comienzo de texto: otra sección que empieza igual queda fuera.
    ['https://berel.com/articulos-viejos/x', false],
    // Una regla exacta no arrastra a sus hijas.
    ['https://berel.com/pintura-y-barniz-para-madera-como-elegir/otra', false],
    ['https://berel.com/', false],
    ['https://berel.com/productos/arquitectonico', false],
    // Por bytes: la ruta distingue mayúsculas.
    ['https://berel.com/Articulos/x', false]
  ])('%s → %s', (url, expected) => {
    expect(isPathInContentScope(url, BEREL)).toBe(expected)
  })

  it('sin reglas nada pertenece, y el alcance no está activo', () => {
    expect(isPathInContentScope('https://berel.com/articulos', [])).toBe(false)
    expect(isContentScopeActive({ rules: [] })).toBe(false)
    expect(isContentScopeActive(null)).toBe(false)
    expect(isContentScopeActive({ rules: BEREL })).toBe(true)
  })
})

describe('TASK-2033 — validación de reglas', () => {
  it('acepta reglas válidas y las devuelve en orden canónico, sin duplicados', () => {
    const result = parseSeoContentScopeRules([
      { kind: 'prefix', path: '/tutoriales' },
      { kind: 'exact', path: '/guia' },
      { kind: 'prefix', path: '/articulos' },
      { kind: 'prefix', path: '/tutoriales' }
    ])

    expect(result).toEqual({
      ok: true,
      rules: [
        { kind: 'exact', path: '/guia' },
        { kind: 'prefix', path: '/articulos' },
        { kind: 'prefix', path: '/tutoriales' }
      ]
    })
  })

  it('una lista vacía es válida: significa sitio completo', () => {
    expect(parseSeoContentScopeRules([])).toEqual({ ok: true, rules: [] })
  })

  it.each([
    [{ kind: 'prefix', path: 'articulos' }, 'empezar por'],
    [{ kind: 'prefix', path: '/' }, 'sitio completo'],
    [{ kind: 'prefix', path: '/articulos/' }, 'barra final'],
    [{ kind: 'exact', path: '/guia?x=1' }, 'query'],
    [{ kind: 'exact', path: 'https://berel.com/guia' }, 'empezar por'],
    [{ kind: 'regex', path: '/guia' }, 'tipo'],
    [{ kind: 'exact' }, 'falta la ruta'],
    ['/articulos', 'objeto']
  ])('rechaza %j sin corregirla', (rule, fragment) => {
    const result = parseSeoContentScopeRules([rule])

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toContain(fragment)
  })

  it('rechaza más reglas que el máximo y lo que no es una lista', () => {
    expect(parseSeoContentScopeRules(Array.from({ length: 51 }, (_, i) => ({ kind: 'exact', path: `/p${i}` }))).ok).toBe(false)
    expect(parseSeoContentScopeRules({ kind: 'exact', path: '/p' }).ok).toBe(false)
  })
})

describe('TASK-2033 — igualdad de alcances', () => {
  it('el orden y los duplicados no cambian la clave; la etiqueta sí', () => {
    const reordered = [BEREL[2]!, BEREL[0]!, BEREL[3]!, BEREL[1]!, BEREL[0]!]

    expect(contentScopeKey('Contenido', reordered)).toBe(contentScopeKey(' Contenido ', BEREL))
    expect(contentScopeKey('Otro nombre', BEREL)).not.toBe(contentScopeKey('Contenido', BEREL))
    expect(canonicalContentScopeRules(reordered)).toHaveLength(4)
  })
})

describe('TASK-2033 — fragmento SQL', () => {
  it('reparte las reglas en exactas y prefijos y numera sus parámetros desde el índice pedido', () => {
    const { clause, params } = contentScopeSqlClause('page', { rules: BEREL }, 4)

    expect(params).toEqual([['/pintura-y-barniz-para-madera-como-elegir'], ['/articulos', '/tutoriales', '/inspiracion']])
    expect(clause).toContain('$4::text[]')
    expect(clause).toContain('$5::text[]')
    expect(clause).toContain('regexp_replace(page,')
    // Sin LIKE: un % o un _ de una ruta nunca es comodín.
    expect(clause).not.toMatch(/\bLIKE\b/i)
  })

  it('usa la columna del mapa cerrado', () => {
    expect(contentScopeSqlClause('target_url', { rules: BEREL }, 1).clause).toContain('regexp_replace(target_url,')
  })
})
