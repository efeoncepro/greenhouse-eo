/**
 * TASK-1889 — assets externos al catálogo (`asset-ref:<clave>`): el plan sella la referencia y quien
 * compone entrega los bytes autorizados. Sin bytes, el render falla cerrado.
 */

import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser } from 'playwright'

import { loadRegistry, loadTemplateContract } from '../catalog'
import { fillSlide, launchComposerBrowser, SlotFillError } from '../render'
import { insightsReportCatalog } from '../catalogs/insights-report'
import type { SlideSpec } from '../contracts'

const LOGO_SVG = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56"><rect width="200" height="56" fill="#123456"/></svg>'
).toString('base64')}`

const slide: SlideSpec = {
  slideId: 'cover-light',
  contentType: 'report-cover-light',
  template: 'ReportCoverLightPage',
  slots: {
    editionLabel: 'Informe mensual · Agosto 2026',
    scopeLabel: 'Qué mide este informe',
    scopeLines: ['Entrega creativa'],
    eyebrow: 'Lectura de Efeonce',
    reportTitle: 'Producción y entrega creativa',
    preparedFor: { label: 'Preparado para', logo: 'asset-ref:org-logo:asset-abc', clientName: 'Cliente' },
    confidentialityLine: 'Confidencial · Versión 1 · 2 de septiembre de 2026'
  }
}

describe('assets externos al catálogo', () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await launchComposerBrowser()
  })

  afterAll(async () => {
    await browser.close()
  })

  const fill = async (externalAssets?: Record<string, string>) => {
    const registry = await loadRegistry({ templatesDir: insightsReportCatalog.templatesDir })
    const contract = await loadTemplateContract({ templatesDir: insightsReportCatalog.templatesDir }, registry, 'ReportCoverLightPage')
    const page = await browser.newPage({ viewport: contract.viewport })

    try {
      await fillSlide(page, path.join(insightsReportCatalog.templatesDir, 'report-cover-light.html'), slide, contract, {
        ...insightsReportCatalog,
        externalAssets
      })

      return await page.evaluate(() => document.querySelector('.client-mark img')?.getAttribute('src') ?? null)
    } finally {
      await page.close()
    }
  }

  it('la referencia sellada toma los bytes que entregó quien compone', async () => {
    expect(await fill({ 'org-logo:asset-abc': LOGO_SVG })).toBe(LOGO_SVG)
  }, 60_000)

  it('sin bytes autorizados, el render falla cerrado (nunca un hueco ni un logo ajeno)', async () => {
    await expect(fill()).rejects.toThrow(SlotFillError)
    await expect(fill({ 'org-logo:otro': LOGO_SVG })).rejects.toThrow(/org-logo:asset-abc/)
  }, 60_000)
})
