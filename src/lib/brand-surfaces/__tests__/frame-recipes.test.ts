/**
 * El marco del documento (TASK-1927): las portadas y contraportadas aprobadas del brochure y de la propuesta comercial.
 * Cada referencia aprobada tiene su intent de ejemplo; el plan pasa el contrato de slots de su plantilla y todo lo que
 * pinta sale de AXIS (manifest y tokens) o, en el contacto, de `EFEONCE_CONTACT`.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'
import { EFEONCE_CONTACT } from '@/config/efeonce-brand'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'
import { evidenceHtml } from '../recipes/frame'

const EXAMPLES = path.join(__dirname, '..', 'examples')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

const example = (id: string): SurfaceIntent => JSON.parse(fs.readFileSync(path.join(EXAMPLES, `deck-${id}-intent.json`), 'utf8')) as SurfaceIntent

const registry = JSON.parse(fs.readFileSync(path.join(CATALOG, 'registry.json'), 'utf8')) as {
  selector: { map: Record<string, string> }
  templates: { name: string; slotsRef: string; prototype: string }[]
}

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const template = registry.selector.map[piece.contentType]!
  const entry = registry.templates.find(t => t.name === template)!
  const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, entry.slotsRef), 'utf8')) as TemplateContract
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template } as SlideSpec, contract)

  return { piece, template, violations, slots: slide.slots as Record<string, Record<string, unknown>> }
}

const expectCode = (fn: () => unknown, code: SurfacePieceError['code']) => {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(SurfacePieceError)
    expect((error as SurfacePieceError).code).toBe(code)

    return
  }

  throw new Error(`se esperaba SurfacePieceError ${code}`)
}

const APPROVED: [string, string][] = [
  ['cover-brochure-cine-orbit', 'CoverBrochure'],
  ['cover-brochure-cine-lines', 'CoverBrochure'],
  ['cover-brochure-cine-team', 'CoverBrochure'],
  ['cover-brochure-line-growth', 'CoverBrochure'],
  ['cover-brochure-line-brand', 'CoverBrochure'],
  ['cover-brochure-line-engine', 'CoverBrochure'],
  ['cover-brochure-line-voice', 'CoverBrochure'],
  ['cover-brochure-line-revenue', 'CoverBrochure'],
  ['cover-proposal-orbit', 'CoverProposalOrbit'],
  ['cover-proposal-orbit-sky', 'CoverProposalOrbit'],
  ['cover-proposal-dawn', 'CoverProposalDawn'],
  ['cover-proposal-dawn-sky', 'CoverProposalDawn'],
  ['close-brochure-orbit', 'CloseBrochure'],
  ['close-brochure-horizon', 'CloseBrochurePhoto'],
  ['close-brochure-dawn', 'CloseBrochurePhoto'],
  ['close-proposal-horizon', 'CloseProposal'],
  ['close-proposal-dawn', 'CloseProposal']
]

describe('marco del documento · las referencias aprobadas componen', () => {
  it.each(APPROVED)('%s → %s, sin violaciones de su contrato', (id, template) => {
    const result = plan(example(id))

    expect(result.template).toBe(template)
    expect(result.violations).toEqual([])
  })
})

describe('marco del documento · la columna de voz', () => {
  it('todo cuelga del `top`: logo, eyebrow, pregunta, respuesta y evidencia', () => {
    const { slots } = plan(example('cover-brochure-line-voice'))

    expect(slots.frame).toMatchObject({
      logoTop: '--gl-logo-top=300px',
      logoWidth: '--gl-logo-width=500px',
      eyebrowTop: 490,
      questionTop: 538,
      answerTop: 600,
      answerPx: 124,
      bodyTop: 600 + 118 + 34
    })
  })

  it('sin `column.topPx` usa el valor por defecto del token', () => {
    const intent = example('cover-brochure-line-voice')

    delete (intent as Record<string, unknown>).column

    expect(plan(intent).slots.frame!.logoTop).toBe('--gl-logo-top=220px')
  })

  it('un `top` fuera de la reserva del logo falla cerrado', () => {
    expectCode(() => plan({ ...example('cover-brochure-line-voice'), column: { topPx: 120 } }), 'invalid-intent')
    expectCode(() => plan({ ...example('cover-brochure-line-voice'), column: { topPx: 360 } }), 'invalid-intent')
  })

  it('la respuesta domina a la pregunta al menos 3×', () => {
    for (const [id] of APPROVED.filter(([id]) => !id.startsWith('close-proposal'))) {
      const frame = plan(example(id)).slots.frame!
      const question = Number(String(frame.questionPx).split('=')[1]!.replace('px', ''))

      expect(Number(frame.answerPx) / question, id).toBeGreaterThanOrEqual(3)
    }
  })

  it('la portada por línea lleva el acento de SU línea', () => {
    expect(plan(example('cover-brochure-line-brand')).slots.frame!.line).toBe('brand')
    expect(plan(example('cover-brochure-line-revenue')).slots.frame!.line).toBe('revenue-hubspot')
  })

  it('la portada de brochure no lleva selección: AXIS la rechaza', () => {
    expectCode(() => plan({ ...example('cover-brochure-cine-lines'), selection: { target: 'answer', label: 'Nexa' } }), 'surface-issues')
  })
})

describe('marco del documento · la evidencia', () => {
  it('lleva UNA palabra en negrita: la que marca el autor', () => {
    expect(evidenceHtml('Preparada para **SKY** · Confidencial', 'first-word')).toBe('Preparada para <strong>SKY</strong> · Confidencial')
  })

  it('sin marca, va en negrita la primera palabra', () => {
    expect(evidenceHtml('Cinco líneas de servicio', 'first-word')).toBe('<strong>Cinco</strong> líneas de servicio')
  })

  it('los saltos de línea del autor se conservan y el markup ajeno se escapa', () => {
    expect(evidenceHtml('**Seis** capacidades:\nEstrategia · GTM', 'first-word')).toBe('<strong>Seis</strong> capacidades:<br>Estrategia · GTM')
    expect(evidenceHtml('<script>x</script> hola', 'none')).toBe('&lt;script&gt;x&lt;/script&gt; hola')
  })

  it('dos palabras en negrita fallan', () => {
    expect(() => evidenceHtml('**Una** y **otra**', 'first-word')).toThrow(SurfacePieceError)
  })
})

describe('marco del documento · portada de propuesta', () => {
  it('sin logo del cliente sale el marcador de la plantilla, con la selección sobre su caja', () => {
    const { slots, piece } = plan(example('cover-proposal-orbit'))

    expect(slots.clientPlaceholder).toBe('Logo del cliente')
    expect(slots.clientLogo).toBeUndefined()
    expect(slots.selection).toMatchObject({ label: 'Cliente', targetKind: 'object', variant: 'eight-handles', anchor: 'top-end' })
    expect(slots.frame).toMatchObject({ clientWidth: '--gl-client-width=460px', clientHeight: '--gl-client-height=200px', clientLeft: '--gl-client-left=1170px', clientTop: '--gl-client-top=440px' })
    expect(piece.assets.map(asset => asset.kind)).toEqual(['svg'])
  })

  it('con logo del cliente, su archivo viaja como asset y el marcador no existe', () => {
    const { slots, piece } = plan(example('cover-proposal-orbit-sky'))

    expect(slots.clientPlaceholder).toBeUndefined()
    expect(slots.clientLogo).toMatchObject({ src: 'asset-ref:file:sky-on-dark', alt: 'SKY Airline' })
    expect(piece.assets.find(asset => asset.kind === 'file')).toMatchObject({ path: expect.stringContaining('sky-on-dark.svg') })
  })

  it('un logo de cliente sin texto alternativo falla', () => {
    expectCode(() => plan({ ...example('cover-proposal-orbit-sky'), clientLogo: { path: 'logo.svg' } }), 'invalid-intent')
  })

  it('la órbita gigante se pinta desde los tokens: anillo con brillo, halo y esfera con núcleo claro', () => {
    const layer = plan(example('cover-proposal-orbit')).piece.assets.find(asset => asset.kind === 'svg') as { svg: string }

    expect(layer.svg).toContain('stroke-width="6"')
    expect(layer.svg).toContain('stdDeviation="10"')
    expect(layer.svg).toContain('r="818"')
    expect(layer.svg).toContain('<radialGradient')
    expect((layer.svg.match(/<circle/g) ?? []).length).toBe(4)
  })

  it('`dawn` va en el eje central, con la órbita que sale como el sol', () => {
    const { slots, piece } = plan(example('cover-proposal-dawn'))

    expect(piece.layout).toBe('dawn')
    expect(slots.frame).toMatchObject({ logoTop: '--gl-logo-top=56px', logoWidth: '--gl-logo-width=480px', eyebrowTop: 206, questionTop: 250, answerTop: 306, bubbleTop: '--gl-bubble-top=522px' })
    expect(slots.frame).toMatchObject({ clientWidth: '--gl-client-width=340px', clientHeight: '--gl-client-height=130px' })
  })
})

describe('marco del documento · contraportadas', () => {
  it('el contacto sale de EFEONCE_CONTACT, con la dirección del SSOT', () => {
    const { slots } = plan(example('close-brochure-orbit'))

    expect(slots.contact).toEqual({
      email: EFEONCE_CONTACT.email,
      phoneFirst: EFEONCE_CONTACT.phones[0].display,
      phoneSecond: EFEONCE_CONTACT.phones[1].display,
      address: EFEONCE_CONTACT.addressDisplay
    })
    expect(String(slots.contact!.address)).toContain('of. 1105')
  })

  it('la contraportada de brochure lleva la voz, el eslogan como firma y el cursor del lector sólo sin foto', () => {
    const orbit = plan(example('close-brochure-orbit'))
    const photo = plan(example('close-brochure-horizon'))

    expect(orbit.slots.voice).toMatchObject({ question: '¿Conversamos?', answerLead: 'Cuando', answer: 'quieras' })
    expect(orbit.slots.frame).toMatchObject({ answerPx: 124, sloganPx: '--gl-slogan-px=28px', sloganTop: '--gl-slogan-top=710px', contactTop: '--gl-contact-top=780px' })
    expect(orbit.slots.cta).toEqual({ target: 'answer' })
    expect(photo.slots.cta).toBeUndefined()
    expect(photo.piece.assets.map(asset => asset.kind)).toEqual(['plate'])
  })

  it('la contraportada de propuesta no lleva voz: su mensaje es el eslogan, grande', () => {
    const { slots } = plan(example('close-proposal-horizon'))
    const runs = slots.slogan as unknown as { text: string; style: string }[]

    expect(slots.voice).toBeUndefined()
    expect(slots.frame).toMatchObject({ sloganPx: '--gl-slogan-px=72px', logoTop: '--gl-logo-top=230px', contactTop: '--gl-contact-top=600px' })
    expect(runs.map(run => run.text)).toEqual(['Empower', 'your', 'Growth'])
    expect(runs[2]!.style).toMatch(/^900 italic #/)
    expectCode(() => plan({ ...example('close-proposal-horizon'), voice: { question: '¿Conversamos?', answer: ['Cuando quieras'] } }), 'surface-issues')
  })

  it('el marco está atado a su documento: en el uso contrario lo rechaza AXIS', () => {
    expectCode(() => plan({ ...example('close-brochure-orbit'), use: 'proposal' }), 'surface-issues')
    expectCode(() => plan({ ...example('cover-proposal-orbit'), use: 'brochure' }), 'surface-issues')
  })
})
