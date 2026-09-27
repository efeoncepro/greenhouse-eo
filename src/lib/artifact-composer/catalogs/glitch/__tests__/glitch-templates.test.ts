import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { glitchCatalogDir } from '..'

const registry = JSON.parse(fs.readFileSync(path.join(glitchCatalogDir, 'registry.json'), 'utf8')) as {
  templates: { name: string; prototype: string; slotsRef: string; sphere: string }[]
}

const read = (file: string) => fs.readFileSync(path.join(glitchCatalogDir, file), 'utf8')
const sources = [...registry.templates.map((t) => t.prototype), 'glitch.css']

describe('glitch templates — values come from glitchLine, never literals', () => {
  it('every registered template exists with its slots contract', () => {
    for (const t of registry.templates) {
      expect(fs.existsSync(path.join(glitchCatalogDir, t.prototype)), t.prototype).toBe(true)
      expect(JSON.parse(read(t.slotsRef)).template, t.slotsRef).toBe(t.name)
    }
  })

  it('no HEX, rgb(), literal font family, animation or URL bubble in templates and the mould', () => {
    for (const file of sources) {
      const src = read(file)

      expect(src.match(/#[0-9a-f]{3,8}\b/gi) ?? [], `${file}: HEX`).toEqual([])
      expect(src, `${file}: rgb()`).not.toMatch(/rgba?\(/i)
      expect(src, `${file}: familia literal`).not.toMatch(/['"](Poppins|Bricolage Grotesque|Guttery|Geist)['"]/)
      expect(src, `${file}: animación`).not.toMatch(/transition|animation|@keyframes/)
      expect(src, `${file}: burbuja URL`).not.toMatch(/url-bubble/)
    }
  })

  it('every text slot rejects overflow and declares its maximum', () => {
    for (const t of registry.templates) {
      const contract = JSON.parse(read(t.slotsRef)) as { slots: Record<string, { type: string; consumer?: string; constraints?: { maxCharacters?: number; overflow?: string }; shape?: Record<string, { type: string; resolver?: string; maxCharacters?: number }> }> }

      for (const [name, slot] of Object.entries(contract.slots)) {
        if (slot.consumer === 'validation-only') continue

        if (slot.type === 'string' || slot.type === 'rich-string') {
          expect(slot.constraints?.overflow, `${t.name}.${name}`).toBe('reject')
          expect(slot.constraints?.maxCharacters, `${t.name}.${name}`).toBeGreaterThan(0)
        }

        for (const [field, def] of Object.entries(slot.shape ?? {})) {
          if (def.type === 'string' && !def.resolver) expect(def.maxCharacters, `${t.name}.${name}.${field}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('one sphere per piece: the apple appears only where the registry says so, and never with the lens', () => {
    for (const t of registry.templates) {
      const html = read(t.prototype)
      const apples = (html.match(/glitch-apple\.svg|apple-bytes-accent\.svg/g) ?? []).length - (html.match(/data-slot-field="src" src="assets\/glitch-apple\.svg"/g) ?? []).length

      if (t.sphere === 'none') expect(apples, t.name).toBe(0)
      if (t.sphere === 'apple') expect(apples, t.name).toBeGreaterThan(0)
    }
  })
})
