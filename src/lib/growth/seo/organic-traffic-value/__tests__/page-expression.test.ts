import { describe, expect, it } from 'vitest'

import { isPathInContentScope } from '../../content-scope/contracts'
import { organicValuePageExpression } from '../collect'

/**
 * La expresión que se envía a Search Console (RE2) y el matcher del alcance (`isPathInContentScope`) son la misma
 * regla en dos lenguajes. Este test ejercita las DOS sobre las mismas URLs y exige el mismo veredicto: no compara el
 * texto de la expresión. RE2 no tiene lookarounds ni backreferences; la expresión usa sólo alternancia, clases y
 * cuantificadores, que JS evalúa igual. La prueba en vivo contra Google es la corrida real del operador
 * (`scripts/seo/organic-traffic-value.ts --content-scope`), que además falla si Google devuelve una página fuera.
 */
const rules = [
  { kind: 'prefix' as const, path: '/articulos' },
  { kind: 'prefix' as const, path: '/inspiracion' },
  { kind: 'exact' as const, path: '/pintura-y-barniz-para-madera-como-elegir' }
]

const urls = [
  'https://berel.com/articulos',
  'https://berel.com/articulos/',
  'https://berel.com/articulos/color-berel-2027',
  'https://berel.com/articulos/color-berel-2027?utm=x',
  'https://berel.com/articulos?x=1',
  'https://berel.com/articulosx',
  'https://berel.com/articulos-viejos/a',
  'https://berel.com/inspiracion/exteriores#top',
  'https://berel.com/pintura-y-barniz-para-madera-como-elegir',
  'https://berel.com/pintura-y-barniz-para-madera-como-elegir/',
  'https://berel.com/pintura-y-barniz-para-madera-como-elegir/otra',
  'https://berel.com/pintura-y-barniz-para-madera-como-elegir-2',
  'https://berel.com/productos/vinilica',
  'https://berel.com/',
  'https://www.berel.com/articulos/a'
]

describe('organicValuePageExpression ≡ isPathInContentScope', () => {
  it('gives the same verdict for every URL of a domain property', () => {
    const expression = new RegExp(organicValuePageExpression('berel.com', rules, { includeSubdomains: true }))

    for (const url of urls) expect([url, expression.test(url)]).toEqual([url, isPathInContentScope(url, rules)])
  })

  it('pins the exact host of a URL property', () => {
    const expression = new RegExp(organicValuePageExpression('berel.com', rules))

    expect(expression.test('https://berel.com/articulos/a')).toBe(true)
    expect(expression.test('https://www.berel.com/articulos/a')).toBe(false)
    expect(expression.test('https://berel.com.evil.io/articulos/a')).toBe(false)
  })

  it('without a scope keeps the whole host, as before', () => {
    expect(organicValuePageExpression('blog.skyairline.com')).toBe('^https?://blog\\.skyairline\\.com/')
  })
})
