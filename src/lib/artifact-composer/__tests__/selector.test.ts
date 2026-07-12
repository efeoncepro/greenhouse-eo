import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { auditRegistry, selectTemplate, UnknownContentTypeError, type DeckRegistry } from '../selector'

const TEMPLATES_DIR = path.resolve(
  process.cwd(),
  'src/lib/artifact-composer/catalogs/deck-axis'
)

const loadRealRegistry = (): DeckRegistry =>
  JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, 'registry.json'), 'utf8')) as DeckRegistry

describe('deck selector', () => {
  it('el registry real cierra referencialmente (SoT sano)', () => {
    expect(auditRegistry(loadRealRegistry())).toEqual([])
  })

  it('mapea content-type → plantilla de forma determinista', () => {
    const registry = loadRealRegistry()

    expect(selectTemplate(registry, 'cover')).toBe('CoverFull')
    expect(selectTemplate(registry, 'timeline')).toBe('TimelineFull')

    // Determinismo: el mismo input, mil veces, da el mismo output. No hay juicio acá.
    const picks = new Set(Array.from({ length: 50 }, () => selectTemplate(registry, 'pricing')))

    expect(picks.size).toBe(1)
  })

  it('cubre los 25 content-types de la taxonomía', () => {
    const registry = loadRealRegistry()

    for (const contentType of registry.contentTypeTaxonomy) {
      expect(() => selectTemplate(registry, contentType)).not.toThrow()
    }
  })

  it('un content-type desconocido NO cae a una plantilla parecida: revienta', () => {
    const registry = loadRealRegistry()

    // Un fallback silencioso acá es exactamente lo que produce un deck incoherente. Preferimos
    // el throw: significa "falta una plantilla en el catálogo", no "improvisá el layout".
    expect(() => selectTemplate(registry, 'org-chart')).toThrow(UnknownContentTypeError)
  })

  it('el audit detecta un registry corrupto', () => {
    const corrupto: DeckRegistry = {
      version: '0.1',
      canvas: { width: 1920, height: 1080 },
      contentTypeTaxonomy: ['cover'],
      templates: [{ name: 'CoverFull', kind: 'full-bleed', contentTypes: ['cover'], prototype: 'cover-full.html' }],
      selector: { map: { cover: 'PlantillaQueNoExiste' } }
    }

    expect(auditRegistry(corrupto)).toContain(
      'selector.map["cover"] apunta a la plantilla inexistente "PlantillaQueNoExiste"'
    )
  })
})
