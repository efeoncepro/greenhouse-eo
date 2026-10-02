/**
 * TASK-1928 — la auditoría renderizada de La órbita (D1 y 3×) tiene que DETECTAR, no sólo pasar. El gate visual la
 * corre sobre los probes reales; aquí se prueba contra láminas mínimas que rompen cada regla a propósito.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser } from 'playwright'

import { launchComposerBrowser } from '../../../render'
import { auditGraphicLineRendered } from '../rendered-audit'

const slide = (body: string) =>
  `<!doctype html><html><body style="margin:0"><div style="--gl-accent:#36c8bf;color:#ffffff">${body}</div></body></html>`

describe('auditoría renderizada de La órbita', () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await launchComposerBrowser()
  })

  afterAll(async () => {
    await browser.close()
  })

  const audit = async (html: string, contentTypes: string[]) => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })

    try {
      await page.setContent(html)

      return await auditGraphicLineRendered(page, contentTypes)
    } finally {
      await page.close()
    }
  }

  it('D1: el acento en texto de menos de 24 px es una violación; a 24 px o en blanco, no', async () => {
    const violations = await audit(
      slide(
        '<p style="color:var(--gl-accent);font-size:15px">Recomendado</p>' +
          '<p style="color:var(--gl-accent);font-size:24px">Grande</p>' +
          '<p style="font-size:15px">Blanco</p>'
      ),
      ['deck.section-split']
    )

    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ rule: 'accent-text-min-size' })
    expect(violations[0]!.detail).toContain('Recomendado')
  })

  it('D1 lee el acento que hereda cada nodo, aunque llegue como otra notación del mismo color', async () => {
    const violations = await audit(
      slide('<section style="--gl-accent:rgb(255, 0, 128)"><span style="color:#ff0080;font-size:14px">01 · Diagnóstico</span></section>'),
      []
    )

    expect(violations.map(violation => violation.rule)).toEqual(['accent-text-min-size'])
  })

  it('3×: una respuesta de 2,8× la pregunta falla en una lámina de decisión y no se mide en las demás', async () => {
    const html = slide('<span class="gl-question" style="font-size:40px">¿Cuándo?</span><span class="gl-answer" style="font-size:112px">90 días</span>')

    const decision = await audit(html, ['deck.decision-plan'])

    expect(decision).toEqual([expect.objectContaining({ rule: 'answer-ratio' })])
    expect(decision[0]!.detail).toContain('2.80×')
    expect(await audit(html, ['deck.section-split'])).toEqual([])
  })

  it('3×: a 3× exactos pasa; una lámina de decisión sin pregunta ni respuesta no se puede medir y falla', async () => {
    const ok = slide('<span class="gl-question" style="font-size:40px">¿Cuándo?</span><span class="gl-answer" style="font-size:120px">Ya</span>')

    expect(await audit(ok, ['deck.content-pricing.stage'])).toEqual([])
    expect(await audit(slide('<p>Sin voz</p>'), ['deck.content-clients'])).toEqual([
      expect.objectContaining({ rule: 'answer-ratio' })
    ])
  })
})
