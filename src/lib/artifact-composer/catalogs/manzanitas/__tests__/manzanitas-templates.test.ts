import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { manzanitasCatalogDir } from '..'

const registry = JSON.parse(fs.readFileSync(path.join(manzanitasCatalogDir, 'registry.json'), 'utf8')) as {
  templates: { name: string; prototype: string; slotsRef: string; pieces: string[] }[]
}

const tokens = JSON.parse(fs.readFileSync(path.join(manzanitasCatalogDir, 'manzanitas-tokens.json'), 'utf8')) as {
  pieces: Record<string, { swipe?: { y: number } }>
  closeCopy: { pieces: string[]; maxChars: { question: number; answer: number; sub: number } }
}

const read = (file: string) => fs.readFileSync(path.join(manzanitasCatalogDir, file), 'utf8')
const html = Object.fromEntries(registry.templates.map((t) => [t.name, read(t.prototype)]))
const sources = [...registry.templates.map((t) => t.prototype), 'manzanitas.css']

type SlotContract = {
  slots: Record<
    string,
    {
      type: string
      required?: boolean
      consumer?: string
      constraints?: { maxCharacters?: number; overflow?: string }
      shape?: Record<string, { type: string; resolver?: string; maxCharacters?: number }>
    }
  >
}

describe('manzanitas templates — values come from manzanitasRegister, never literals', () => {
  it('every registered template exists with its slots contract', () => {
    for (const t of registry.templates) {
      expect(fs.existsSync(path.join(manzanitasCatalogDir, t.prototype)), t.prototype).toBe(true)
      expect((JSON.parse(read(t.slotsRef)) as { template: string }).template, t.slotsRef).toBe(t.name)
    }
  })

  it('no HEX, rgb(), literal font family, animation or Glitch element in templates and the mould', () => {
    for (const file of sources) {
      const src = read(file)

      expect(src.match(/#[0-9a-f]{3,8}\b/gi) ?? [], `${file}: HEX`).toEqual([])
      expect(src, `${file}: rgb()`).not.toMatch(/rgba?\(/i)
      expect(src, `${file}: familia literal`).not.toMatch(/['"](Poppins|Bricolage Grotesque|Guttery|Geist)['"]/)
      expect(src, `${file}: animación`).not.toMatch(/transition|animation|@keyframes/)
      expect(src, `${file}: Glitch`).not.toMatch(/glitch-|\bgx-|guttery/i)
      expect(src, `${file}: cabecera de Glitch`).not.toMatch(/EDICIÓN #/)
    }
  })

  it('every text slot rejects overflow and declares its maximum', () => {
    for (const t of registry.templates) {
      const contract = JSON.parse(read(t.slotsRef)) as SlotContract

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

  it('the slogan only closes: it lives in the three closes and always below the logo', () => {
    for (const [name, src] of Object.entries(html)) {
      const hasSlogan = src.includes('data-slot="slogan"')

      expect(hasSlogan, name).toBe(['BackCover', 'StoryClose', 'YoutubeClose'].includes(name))

      if (hasSlogan) {
        // Operador, 2026-09-29: el eslogan es un gráfico que acompaña la marca, en bloque y DEBAJO del logo.
        expect(src.indexOf('mcm-lockup__logo'), name).toBeGreaterThan(-1)
        expect(src.indexOf('mcm-lockup__logo'), name).toBeLessThan(src.indexOf('data-slot="slogan"'))
      }
    }
  })

  it('«Desliza» only where the piece carries it, and the answer leaves it room where they share a line', () => {
    for (const t of registry.templates) {
      const withSwipe = t.pieces.some((p) => tokens.pieces[p].swipe)

      expect(html[t.name].includes('data-mcm-swipe'), t.name).toBe(withSwipe)
    }

    for (const name of ['CoverPizarra', 'StepPizarra', 'DataApples', 'ChartVoice', 'InteriorLente']) {
      expect(html[name], name).toContain('mcm-voice--beside-swipe')
      expect(html[name], name).toMatch(/--mcm-voice-left: [0-9.]+px/)
    }
  })

  it('the close copy varies with the context, its length does not: the close slots carry the token limits', () => {
    // Operador, 2026-09-29: el texto del cierre nunca queda fijo; lo que se normaliza es su extensión (closeCopy.maxChars).
    const byPiece = Object.fromEntries(registry.templates.flatMap((t) => t.pieces.map((p) => [p, t])))
    const max = tokens.closeCopy.maxChars

    for (const piece of tokens.closeCopy.pieces) {
      const contract = JSON.parse(read(byPiece[piece].slotsRef)) as SlotContract

      expect(contract.slots.voice.shape?.question.maxCharacters, piece).toBe(max.question)
      expect(contract.slots.voice.shape?.answer.maxCharacters, piece).toBe(max.answer)
      expect(contract.slots.sub.constraints?.maxCharacters, piece).toBe(max.sub)
    }
  })

  // La clase sólo SEÑALA la regla; quien la verifica es el render: `manzanitas-fit.test.ts` mide con `measureSlideFit`
  // (el detector con el que `composeArtifact` falla cerrado) que una pregunta de dos líneas se lee como recorte.
  it('where fixed content sits under the voice, the question goes in one line (fails closed if longer)', () => {
    for (const name of ['ChartVoice', 'InteriorLente', 'StepPizarra', 'DenseConcept', 'DenseComparison', 'DenseSteps', 'PodcastCover']) {
      expect(html[name], name).toContain('mcm-q mcm-q--one-line')
    }
  })
})
