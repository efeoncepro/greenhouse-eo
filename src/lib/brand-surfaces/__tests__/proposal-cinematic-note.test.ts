/**
 * La nota del pie de la propuesta cine (TASK-1934). La nota es opcional; sus medidas, no: el renderer resuelve todos los
 * campos del frame, así que una lámina SIN nota (la creativa) tiene que llevar igual `noteLeft`, `noteTop` y `notePx`.
 * Regresión: con las medidas sólo cuando había nota, la propuesta creativa dejó de componer (`gl-css` recibía
 * «undefined»), y ni el gate (su probe llena todos los slots) ni los planes (no renderizan) lo veían.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, type SurfaceIntent } from '../index'

const EXAMPLES = path.join(__dirname, '..', 'examples')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

const document = JSON.parse(fs.readFileSync(path.join(EXAMPLES, 'deck-proposal-document.json'), 'utf8')) as Record<string, unknown> & { pages: Record<string, unknown>[] }
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'proposal-cinematic.slots.json'), 'utf8')) as TemplateContract

/** Una página del documento de ejemplo como intent suelto. */
const pageOf = (eyebrow: string): SurfaceIntent => {
  const page = document.pages.find(p => (p.voice as { eyebrow?: string } | undefined)?.eyebrow === eyebrow)!

  return { contract: document.contract, version: document.version, surface: document.surface, format: document.format, use: document.use, role: 'proposal', theme: 'dark', ...page } as SurfaceIntent
}

const plan = (intent: SurfaceIntent) => {
  const slide = planSurfacePiece(intent, { artifactId: 'prueba' }).plan.slides[0]!
  const slots = slide.slots as Record<string, unknown>

  return { slots, violations: validateSlide({ ...(slide as unknown as SlideSpec), template: 'ProposalCinematic' } as SlideSpec, contract) }
}

describe('la nota del pie de la propuesta cine', () => {
  it('sin nota, el frame lleva igual sus medidas y la lámina no pinta nota', () => {
    const { slots, violations } = plan(pageOf('Servicios creativos'))
    const frame = slots.frame as Record<string, unknown>

    expect(violations).toEqual([])
    expect(slots.note).toBeUndefined()
    expect(frame.noteLeft).toMatch(/^--gl-pc-note-left=\d+px$/)
    expect(frame.noteTop).toMatch(/^--gl-pc-note-top=\d+px$/)
    expect(frame.notePx).toMatch(/^--gl-pc-note-px=\d+px$/)
  })

  it('con nota, la pinta en la reserva de AXIS', () => {
    const { slots, violations } = plan(pageOf('AEO'))

    expect(violations).toEqual([])
    expect(slots.note).toBe('Sin promesas de ranking: medimos y mostramos el avance.')
    expect((slots.frame as Record<string, unknown>).noteTop).toBe('--gl-pc-note-top=1000px')
  })
})
