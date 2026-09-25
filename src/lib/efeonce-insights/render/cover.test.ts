import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'

import { composeArtifact } from '@/lib/artifact-composer'
import { insightsReportCatalog } from '@/lib/artifact-composer/catalogs/insights-report'

import type { EditorialPlanV1, PlanChapterV1 } from '../contracts/plan'
import { channelsOf } from './cover'
import { buildInsightReportPlanInput } from './report-mapper'
import { buildInsightsDeckPlanInput } from './insights-deck-mapper'

const edition = {
  editionId: 'insed-1', reportId: 'insrp-1', organizationId: 'org-1', version: 1, audience: 'client', state: 'issued',
  request: { period: { start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'America/Santiago' } },
  issuedAt: '2026-09-02T12:00:00.000Z'
} as never

const report = { reportId: 'insrp-1', reportCode: 'EO-INS-000014', organizationId: 'org-1', title: 'Visibilidad, respuestas de IA y entrega', status: 'active' } as never
const snapshot = { facts: [], sources: [], rejections: [] } as never

const aeoChapter = {
  chapterId: 'aeo', module: 'aeo', title: 'Motores de respuesta',
  claims: [{ claimId: 'c', text: 'La IA ya conoce la marca.', factIds: [] }],
  charts: [
    {
      specVersion: 'chart_spec_v1', chartId: 'x', family: 'bar_grouped', relation: 'comparison', title: 'Presencia por motor', unit: 'count',
      dimensionLabels: ['a', 'b'], dimensionChannelIds: ['perplexity', null],
      series: [
        { seriesId: 's', label: 'ChatGPT', factIds: ['f1', 'f2'], unit: 'count', channelId: 'chatgpt' },
        { seriesId: 't', label: 'Respuestas de Google', factIds: ['f3', 'f4'], unit: 'count', channelId: 'google_ai_overview' }
      ]
    }
  ],
  tables: [], limits: []
} as unknown as PlanChapterV1

const plan = (over: Partial<EditorialPlanV1>): EditorialPlanV1 =>
  ({ planVersion: 'editorial_plan_v1', locale: 'es-CL', executiveSummary: [], chapters: [{ ...aeoChapter, charts: [] }], actions: [], limits: [], methodology: [], references: [], ...over }) as EditorialPlanV1

describe('portada sellada → plantilla (TASK-1889)', () => {
  it('los canales salen de los gráficos, en orden canónico, con AI Overview colapsado en Google', () => {
    expect(channelsOf([aeoChapter])).toEqual(['google', 'chatgpt', 'perplexity'])
  })

  it('sin portada sellada (plan v1), navy sin logo', () => {
    const cover = buildInsightReportPlanInput({ edition, report, snapshot, plan: plan({}) }).slides[0]!

    expect(cover.contentType).toBe('report-cover')
    expect(cover.slots).not.toHaveProperty('preparedFor')
  })

  it('tema blanco: portada blanca con líneas de alcance, satélites por canal y logo por defecto', () => {
    const cover = buildInsightReportPlanInput({
      edition, report, snapshot,
      plan: plan({ chapters: [aeoChapter], scopeLines: ['Motores de respuesta: si la IA menciona la marca.'], cover: { theme: 'light', source: 'organization', logoAssetId: 'asset-1', logoVariant: 'default' } })
    }).slides[0]!

    expect(cover.contentType).toBe('report-cover-light')
    expect(cover.slots).toMatchObject({
      scopeLines: ['Motores de respuesta: si la IA menciona la marca.'],
      channels: [{ channelId: 'google' }, { channelId: 'chatgpt' }, { channelId: 'perplexity' }],
      preparedFor: { logo: 'asset-ref:org-logo:asset-1' }
    })
  })

  it('tema navy: logo sólo con variante para fondo oscuro; el deck es siempre navy', () => {
    const dark = plan({ cover: { theme: 'dark', source: 'auto', logoAssetId: 'asset-2', logoVariant: 'on_dark' } })
    const light = plan({ cover: { theme: 'light', source: 'auto', logoAssetId: 'asset-3', logoVariant: 'default' } })

    expect(buildInsightReportPlanInput({ edition, report, snapshot, plan: dark }).slides[0]!.slots).toMatchObject({ preparedFor: { logo: 'asset-ref:org-logo:asset-2' } })

    const deckCover = buildInsightsDeckPlanInput({ edition, report, snapshot, plan: light }).slides[0]!

    expect(deckCover.contentType).toBe('insights-cover')
    expect(deckCover.slots).not.toHaveProperty('preparedFor')
  })

  it('compone el PDF real con la portada blanca y el logo que entrega el worker', async () => {
    const input = buildInsightReportPlanInput({
      edition, report, snapshot,
      plan: plan({ chapters: [aeoChapter], scopeLines: ['Motores de respuesta.'], cover: { theme: 'light', source: 'organization', logoAssetId: 'asset-1', logoVariant: 'default' } })
    })

    const logo = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56"><rect width="200" height="56"/></svg>').toString('base64')}`
    const outDir = await mkdtemp(path.join(os.tmpdir(), 'task-1889-cover-'))

    try {
      const result = await composeArtifact(insightsReportCatalog, input as never, outDir, { externalAssets: { 'org-logo:asset-1': logo } })
      const pdf = await PDFDocument.load(await readFile(result.pdfPath!))

      expect(pdf.getPageCount()).toBe(input.slides.length)
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  }, 120_000)
})
