import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { ManzanitasPieceError, planManzanitasIntent, sphereGapOf, emphasize } from '..'

const base = { contract: 'efeonce.manzanitas-register', version: '0.2.0', register: 'marketing-con-manzanitas' } as const

type Intent = Parameters<typeof planManzanitasIntent>[0]

const carousel = (slides: unknown[], topicLine = 'engine'): Intent => ({ ...base, channel: 'carousel', topicLine, slides }) as unknown as Intent

const photo = (subject: string) => ({ register: 'cine', lightId: 'sesion-1', subject, alt: `Foto: ${subject}`, path: 'fotos/escena.png' })

const recreo = carousel([
  { piece: 'cover-pizarra', voice: { question: '¿Qué revisa una IA antes de recomendarte?', answer: '5 cosas' }, swipe: true },
  { piece: 'step-pizarra', voice: { question: '¿Qué no puede cambiar?', answer: 'Preservar' }, swipe: true },
  { piece: 'interior-escena', voice: { question: '¿Qué prueba lo que dices?', answer: 'Evidencia' }, photo: photo('Una persona revisa fichas'), swipe: true },
  {
    piece: 'chart-ranking',
    voice: { question: '¿Cuánto más nombran al líder?', answer: '4 veces' },
    chart: {
      rows: [
        { label: 'Líder', value: 46, role: 'leader' },
        { label: 'B', value: 31 },
        { label: 'Tu marca', value: 12, role: 'you' }
      ],
      source: '[FUENTE, AÑO]',
      illustrative: true,
      caption: 'Menciones en respuestas de IA'
    },
    swipe: true
  },
  { piece: 'interior-lente', voice: { question: '¿Probaste más de un camino?', answer: 'Explorar' }, photo: photo('Dos bocetos'), swipe: true },
  { piece: 'chart-measure', voice: { question: '¿En cuántas respuestas de IA aparece tu marca?' }, chart: { value: 38, source: '[FUENTE, AÑO]', illustrative: true }, swipe: true },
  { piece: 'back-cover-a', voice: { question: '¿Te nombra la IA?', answer: 'Pregúntale', sub: 'En los comentarios: cuéntanos si te nombró.' }, slogan: true, conversions: 1 }
])

describe('planManzanitasIntent', () => {
  it('resolves a carousel into the carousel document and the loose stills, with the same slides', () => {
    const plan = planManzanitasIntent(recreo)

    expect(plan.channel).toBe('carousel')
    expect(plan.topicLine).toBe('engine')
    expect(plan.carousel?.catalog).toBe('manzanitas-carousel')
    expect(plan.stills.catalog).toBe('manzanitas-stills')
    expect(plan.carousel?.plan.slides).toEqual(plan.stills.plan.slides)
    expect(plan.stills.plan.slides.map((s) => s.contentType)).toEqual([
      'mcm.cover.pizarra',
      'mcm.step',
      'mcm.interior.escena',
      'mcm.chart.ranking',
      'mcm.interior.lente',
      'mcm.chart.measure',
      'mcm.back.a'
    ])
  })

  it('the author never picks a template, coordinates or colours: the theme comes from the contract', () => {
    const [cover, step] = planManzanitasIntent(recreo).stills.plan.slides as unknown as { template?: string; slots: { theme: Record<string, string> } }[]

    expect(cover.template).toBeUndefined()
    expect(cover.slots.theme).toMatchObject({ line: 'engine', tone: 'navy', swipe: 'swipe-rest-navy-engine', apple: 'manzanitas-apple-navy-engine', signature: 'efeonce-logo-negative' })
    expect(step.slots.theme.tone).toBe('paper')
    expect(step.slots.theme.signature).toBe('efeonce-logo-positive')
  })

  it('numbers the steps across step, scene and lens slides', () => {
    const slides = planManzanitasIntent(recreo).stills.plan.slides as unknown as { contentType: string; slots: Record<string, unknown> }[]

    expect(slides[1].slots.step).toEqual({ numeral: '01', label: 'Paso 1 de 3' })
    expect(slides[2].slots.stepLabel).toBe('Paso 2 de 3')
  })

  it('asks for the photo, the lens and the step orbit as assets; the lens carries the photo placeholder', () => {
    const { assets } = planManzanitasIntent(recreo)

    expect(assets.map((a) => a.kind).sort()).toEqual(['lens', 'orbit', 'photo'])

    const lens = assets.find((a) => a.kind === 'lens')!

    expect(lens.kind === 'lens' && lens.svg.includes(lens.placeholder)).toBe(true)
    expect(lens.kind === 'lens' && /data-axis-part="signature"/.test(lens.svg)).toBe(false)
  })

  it('the chart slot carries recipe, line, surface, data and the labels, never a drawn geometry', () => {
    const chart = JSON.parse((planManzanitasIntent(recreo).stills.plan.slides[3] as unknown as { slots: { chart: string } }).slots.chart)

    expect(chart).toMatchObject({ recipe: 'ranking', line: 'engine', surface: 'paper', options: { caption: 'Menciones en respuestas de IA' } })
    expect(chart.data.rows).toHaveLength(3)
    expect(chart.data.caption).toBeUndefined()
  })

  it('the back cover bolds what follows the lead of the conversation', () => {
    const back = planManzanitasIntent(recreo).stills.plan.slides[6] as unknown as { slots: Record<string, unknown> }

    expect(back.slots.sub).toBe('En los comentarios: <strong>cuéntanos si te nombró.</strong>')
    expect(back.slots.slogan).toEqual({ word: 'Engine' })
  })

  it('fails closed with the contract codes when the intent breaks the register', () => {
    const broken = carousel([{ piece: 'cover-pizarra', voice: { question: '¿Sí?', answer: 'No' }, slogan: true }, { piece: 'back-cover-a', voice: { question: '¿Sí?', answer: 'No', sub: 'En los comentarios: dinos.' }, slogan: true, conversions: 1 }])

    expect(() => planManzanitasIntent(broken)).toThrow(ManzanitasPieceError)

    try {
      planManzanitasIntent(broken)
    } catch (error) {
      expect((error as ManzanitasPieceError).code).toBe('contract-issues')
      expect((error as ManzanitasPieceError).issues.map((i) => i.code)).toContain('slogan-not-allowed')
    }
  })

  it('a photo slide without its file or without alt text fails with photo-missing', () => {
    const noPath = JSON.parse(JSON.stringify(recreo)) as { slides: { photo?: { path?: string } }[] }

    delete noPath.slides[2].photo!.path

    expect(() => planManzanitasIntent(noPath as unknown as Intent)).toThrow(expect.objectContaining({ code: 'photo-missing' }))
  })

  it('the podcast cover takes the episode from the sub, with a line break between episode and guest', () => {
    const plan = planManzanitasIntent({ ...base, channel: 'podcast', topicLine: 'voice', slides: [{ piece: 'podcast-cover', voice: { question: '¿Cómo suena tu marca?', answer: 'Así', sub: 'Ep. 12\nCon **Invitada**' } }] } as unknown as Intent)
    const slide = plan.stills.plan.slides[0] as unknown as { slots: Record<string, unknown> }

    expect(plan.carousel).toBeNull()
    expect(slide.slots.episode).toBe('Ep. 12<br>Con <strong>Invitada</strong>')
  })
})

describe('helpers', () => {
  it('emphasize escapes everything and only lets the author emphasis through', () => {
    expect(emphasize('<b>a</b> **b**')).toBe('&lt;b&gt;a&lt;/b&gt; <strong>b</strong>')
  })

  it('sphereGapOf reads the optical gap of the last letter', () => {
    expect(Number(sphereGapOf('5 cosas'))).toBeGreaterThanOrEqual(-0.1)
    expect(Number(sphereGapOf('5 cosas'))).toBeLessThanOrEqual(0.1)
  })
})

describe('the versioned examples', () => {
  const dir = path.join(process.cwd(), 'src/lib/manzanitas-composition/examples')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.example.json'))

  it('every example resolves with the contract and names photos that exist (synthetic, never a real person)', () => {
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const intent = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as Intent & { example?: boolean }
      const plan = planManzanitasIntent(intent)

      expect(intent.example, file).toBe(true)

      for (const asset of plan.assets) {
        if (asset.kind === 'orbit') continue

        expect(asset.path, file).toMatch(/^fotos\/.+\.svg$/)
        expect(fs.existsSync(path.join(dir, asset.path)), `${file}: ${asset.path}`).toBe(true)
      }
    }
  })
})
