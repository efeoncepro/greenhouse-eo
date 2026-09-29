/**
 * El layout es el juez (TASK-1939): estas pruebas RENDERIZAN las plantillas y miden con `measureSlideFit`, el mismo
 * detector con el que `composeArtifact` falla cerrado. Lo que prueban es comportamiento, no la forma del CSS:
 *   - una respuesta que no cabe en su línea (o que pisaría el «Desliza») se lee como recorte, nunca parte la esfera;
 *   - en las láminas con contenido fijo bajo la voz, una pregunta de dos líneas se lee como recorte;
 *   - el hook del cierre deja la palabra del eslogan en el acento sólo desde 24 px (regla del 2026-09-29).
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium, type Browser } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { resolveManzanitasRegisterIntent } from '@efeoncepro/axis-ui-contracts'

import type { SlideSpec, TemplateContract } from '../../../contracts'
import { fillSlide, measureSlideFit } from '../../../render'
import { synthesizeProbeSlots } from '../../../synthesize'
import { createManzanitasStillsCatalog, manzanitasCatalogDir } from '..'

const catalog = {
  ...createManzanitasStillsCatalog({ chartPainter: () => '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"></svg>' }),
  externalAssets: {}
}

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

const render = async (file: string, template: string, contentType: string, override: Record<string, unknown>) => {
  const contract = JSON.parse(await fs.readFile(path.join(manzanitasCatalogDir, `${file}.slots.json`), 'utf8')) as TemplateContract
  const slots = { ...(synthesizeProbeSlots(contract) as Record<string, unknown>), ...override }
  const slide = { slideId: `fit-${template}`, contentType, template, slots } as unknown as SlideSpec
  const page = await browser.newPage({ viewport: contract.viewport, deviceScaleFactor: 1 })

  try {
    await fillSlide(page, path.join(manzanitasCatalogDir, `${file}.html`), slide, contract, catalog)

    const clipped = await measureSlideFit(page, contract)
    const sloganInk = await page.evaluate(() => document.querySelector('.mcm-slogan')?.classList.contains('mcm-slogan--ink') ?? null)

    const sloganPx = await page.evaluate(() => {
      const el = document.querySelector('.mcm-slogan')

      return el ? parseFloat(getComputedStyle(el).fontSize) : null
    })

    return { clipped: clipped.map((c) => c.slot), sloganInk, sloganPx }
  } finally {
    await page.close()
  }
}

const theme = (fields: Record<string, string>) => fields

describe('manzanitas — the rendered layout judges the copy', () => {
  const coverTheme = theme({
    line: 'engine',
    tone: 'navy',
    masthead: 'manzanitas-wordmark-negative',
    signature: 'efeonce-logo-negative',
    swipe: 'swipe-rest-navy-engine',
    apple: 'manzanitas-apple-navy-engine',
    sphereGap: '0.03'
  })

  it('cover: a short answer fits beside «Desliza»; one that would reach it is a clip, never a wrapped sphere', async () => {
    const ok = await render('cover-pizarra', 'CoverPizarra', 'mcm.cover.pizarra', { theme: coverTheme, voice: { question: '¿Qué revisa una IA antes de recomendarte?', answer: '5 cosas' } })
    const long = await render('cover-pizarra', 'CoverPizarra', 'mcm.cover.pizarra', { theme: coverTheme, voice: { question: '¿Tu CRM sabe lo que la IA sabe de ti?', answer: 'Todavía no' } })

    expect(ok.clipped).toEqual([])
    expect(long.clipped).toContain('answer')
  }, 60_000)

  it('chart slide: the question goes in one line (a second line would push the answer onto the source)', async () => {
    const chartTheme = theme({ line: 'engine', tone: 'navy', masthead: 'manzanitas-logo-negative-engine', signature: 'efeonce-logo-negative', swipe: 'swipe-rest-navy-engine', sphereGap: '0.03' })
    const ok = await render('chart-voice', 'ChartVoice', 'mcm.chart.per-hundred', { theme: chartTheme, voice: { question: '¿Cuántas búsquedas no dan clic?', answer: '58 de 100' } })
    const long = await render('chart-voice', 'ChartVoice', 'mcm.chart.per-hundred', { theme: chartTheme, voice: { question: '¿Cuántos leads llegan ya informados?', answer: '58 de 100' } })

    expect(ok.clipped).toEqual([])
    expect(long.clipped).toContain('question')
  }, 60_000)

  it('dense concept: an answer longer than its measure is a clip, not a sphere alone on the next line', async () => {
    const denseTheme = theme({ line: 'growth', tone: 'paper', masthead: 'manzanitas-logo-positive-growth', signature: 'efeonce-logo-positive', swipe: 'swipe-rest-paper-growth', sphereGap: '0.03' })
    const long = await render('dense-concept', 'DenseConcept', 'mcm.dense.concept', { theme: denseTheme, voice: { question: '¿Qué cambia con la IA?', answer: 'Quién responde' } })

    expect(long.clipped).toContain('answer')
  }, 60_000)

  it('close: the slogan word takes the accent only from 24 px (logo 400 px: Voice reaches it, Engine does not)', async () => {
    const closeTheme = (line: string) => theme({ line, tone: 'navy', masthead: 'manzanitas-wordmark-negative', signature: 'efeonce-logo-negative', apple: `manzanitas-apple-navy-${line}`, sphereGap: '0.03' })
    const base = { voice: { question: '¿Te nombra la IA?', answer: 'Pregúntale' }, sub: 'En los comentarios: <strong>cuéntanos si te nombró</strong>.' }
    const engine = await render('back-cover', 'BackCover', 'mcm.back.a', { ...base, theme: closeTheme('engine'), slogan: { word: 'Engine' } })
    const voice = await render('back-cover', 'BackCover', 'mcm.back.a', { ...base, theme: closeTheme('voice'), slogan: { word: 'Voice' } })

    expect(engine.clipped).toEqual([])
    expect(engine.sloganInk).toBe(true)
    expect(voice.sloganInk).toBe(false)

    // Paridad con el contrato: el cuerpo que pinta la plantilla es el que resuelve AXIS (manifiesto `slogan.px`).
    const intent = (line: string, word: string) => ({
      register: 'marketing-con-manzanitas' as const,
      channel: 'carousel' as const,
      topicLine: line,
      slides: [{ piece: 'back-cover-a', voice: { question: '¿Te nombra la IA?', answer: 'Pregúntale', sub: `Palabra ${word}` }, slogan: true, conversions: 1 }]
    })

    for (const [line, word, rendered] of [['engine', 'Engine', engine], ['voice', 'Voice', voice]] as const) {
      const resolved = resolveManzanitasRegisterIntent(intent(line, word))

      expect(resolved.status).toBe('resolved')
      if (resolved.status !== 'resolved') continue
      expect(Math.abs((rendered.sloganPx ?? 0) - resolved.slides[0].slogan!.px), line).toBeLessThan(0.05)
      expect(resolved.slides[0].slogan!.wordInAccent, line).toBe(!rendered.sloganInk)
    }
  }, 60_000)
})
