/**
 * Guardas de los catálogos de «La órbita» (TASK-1919):
 *   - ninguna plantilla ni molde escribe un color, una familia o un peso de marca a mano: todo sale de
 *     `graphic-line-tokens.css` (compilado desde @efeoncepro/axis-tokens) o del font pack;
 *   - la esfera toma el aire óptico de la última letra, igual que `answerSphere` de AXIS;
 *   - los registries sólo declaran recetas con `contentType` `<superficie>.<receta>`.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { graphicLineResolvers, sphereGapEm } from '../resolvers'

const CATALOGS_DIR = path.resolve(__dirname, '../..')
const GL_CATALOGS = ['graphic-line-deck', 'graphic-line-stills', 'graphic-line-overlays']

const handWrittenFiles = (catalog: string): string[] =>
  fs
    .readdirSync(path.join(CATALOGS_DIR, catalog))
    .filter(file => (file.endsWith('.html') && !file.startsWith('_')) || file === 'graphic-line.css')

describe('catálogos de La órbita', () => {
  it('GUARD: ninguna plantilla ni molde trae un HEX, un rgb() o una familia tipográfica escrita a mano', () => {
    const violations: string[] = []

    for (const catalog of GL_CATALOGS) {
      for (const file of handWrittenFiles(catalog)) {
        const source = fs.readFileSync(path.join(CATALOGS_DIR, catalog, file), 'utf8')

        for (const match of source.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d+\s*,/g)) violations.push(`${catalog}/${file}: ${match[0]}`)

        for (const match of source.matchAll(/font-family:\s*['"]?(Poppins|Bricolage|Geist)/gi)) {
          violations.push(`${catalog}/${file}: ${match[0]}`)
        }
      }
    }

    expect(violations, 'el color y la tipografía salen de graphic-line-tokens.css').toEqual([])
  })

  it('GUARD: ninguna plantilla ni molde anima ni escribe duraciones: el movimiento es del pipeline de motion y sus tiempos, de los tokens', () => {
    const violations: string[] = []

    for (const catalog of GL_CATALOGS) {
      for (const file of handWrittenFiles(catalog)) {
        const source = fs.readFileSync(path.join(CATALOGS_DIR, catalog, file), 'utf8')

        for (const match of source.matchAll(/\b(transition|animation)\s*:|@keyframes|\b\d+(\.\d+)?m?s\b(?=\s*[;,)])/g)) {
          violations.push(`${catalog}/${file}: ${match[0]}`)
        }
      }
    }

    expect(violations, 'una plantilla del composer es un cuadro fijo; los tiempos viven en efeonceGraphicLine.motion').toEqual([])
  })

  it('cada registry mapea contentTypes <superficie>.<receta>[.<formato>] a plantillas declaradas', () => {
    for (const catalog of GL_CATALOGS) {
      const registry = JSON.parse(fs.readFileSync(path.join(CATALOGS_DIR, catalog, 'registry.json'), 'utf8')) as {
        contentTypeTaxonomy: string[]
        templates: { name: string; contentTypes: string[] }[]
        selector: { map: Record<string, string> }
      }

      for (const contentType of registry.contentTypeTaxonomy) {
        expect(contentType).toMatch(/^(deck|web|dooh|motion|audiovisual)\.[a-z0-9-]+(\.[a-z0-9-]+)?$/)
        expect(registry.templates.some(t => t.name === registry.selector.map[contentType])).toBe(true)
      }
    }
  })

  it('la esfera cierra la respuesta con el aire de la última letra (tokens de AXIS)', () => {
    const tokens = JSON.parse(
      fs.readFileSync(path.join(CATALOGS_DIR, 'graphic-line-shared', 'graphic-line-tokens.json'), 'utf8')
    ) as { sphere: { defaultGapEm: number; opticalGapEm: Record<string, number> } }

    expect(sphereGapEm('En todas')).toBe(tokens.sphere.opticalGapEm.s)
    expect(sphereGapEm('Visible')).toBe(tokens.sphere.opticalGapEm.e)
    expect(sphereGapEm('Ahora sí')).toBe(tokens.sphere.defaultGapEm)
  })

  it('una línea de servicio desconocida falla cerrada', () => {
    const registry = graphicLineResolvers()

    expect(registry['gl-line']!.build('growth', { item: {}, index: 0, itemCount: 1, slots: {} })).not.toBeNull()
    expect(registry['gl-line']!.build('marketing', { item: {}, index: 0, itemCount: 1, slots: {} })).toBeNull()
    expect(registry['gl-px-answerPx']!.build('-3', { item: {}, index: 0, itemCount: 1, slots: {} })).toBeNull()
  })
})
