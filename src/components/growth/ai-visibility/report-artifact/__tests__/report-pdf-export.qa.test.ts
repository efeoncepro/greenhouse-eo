/**
 * TASK-1938: opt-in, synthetic PDF export QA; no database, delivery or publication.
 * Needs local Poppler (pdftotext, pdffonts, pdftoppm).
 * AI_VISIBILITY_PDF_QA=1 pnpm exec vitest run --project unit <this file>
 * AI_VISIBILITY_PDF_QA_CASES=es-prospect limits the export set when iterating.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { http, HttpResponse } from 'msw'
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFString } from 'pdf-lib'
import sharp from 'sharp'
import { beforeEach, describe, expect, it } from 'vitest'

import { EFEONCE_SOCIAL_LINKS, EFEONCE_URL_HTTPS } from '@/config/efeonce-brand'
import { server } from '@/mocks/node'

import { SAMPLE_PUBLIC_REPORT } from '../fixtures'
import { modelFromPublicReport, type ReportArtifactModel } from '../model'
import { renderAiVisibilityReportPdf } from '../pdf/render-ai-visibility-report-pdf'
import {
  resolveAiVisibilityReportPdfPresentation,
  type AiVisibilityReportPdfPresentationContext
} from '../pdf/report-pdf-presentation'

const HEADER = { organizationName: 'Globe', reportDate: '19 may 2026', periodLabel: '4 – 19 de mayo de 2026' }
const OUT = resolve(process.cwd(), '.captures/task-1938/after')
const normal = (): ReportArtifactModel => modelFromPublicReport(structuredClone(SAMPLE_PUBLIC_REPORT), 'attachment')
const hash = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex')
const normalized = (text: string): string => text.replace(/\s+/g, ' ').trim()
const selected = process.env.AI_VISIBILITY_PDF_QA_CASES?.split(',')

const cases = [
  'es-prospect',
  'en-prospect',
  'pt-BR-prospect',
  'es-client',
  'en-client',
  'pt-BR-client',
  'es-null',
  'es-zero',
  'es-optimal',
  'es-long'
].filter(id => !selected || selected.includes(id))

function nullModel(): ReportArtifactModel {
  const source = normal()

  source.overallScore = null
  source.overallSeverity = 'sin_dato'
  source.primaryGap = null
  source.recommendations = []
  source.dimensions = source.dimensions.map(dim => ({ ...dim, score: null, severity: 'sin_dato' }))
  source.levels = source.levels.map(level => ({ ...level, score: null, severity: 'sin_dato' }))
  source.citationInsight.ownDomainShare = null
  source.positionSummary = { best: null, average: null, ranked: 0 }
  source.sentimentSummary = { positive: 0, neutral: 0, negative: 0, mixed: 0, evaluated: 0, net: 'sin_dato' }
  source.viewFacts.engineCoverage.providers = source.viewFacts.engineCoverage.providers.map(provider => ({
    ...provider,
    resolved: 0,
    present: 0,
    mentionRate: null,
    status: 'no_response'
  }))

  return source
}

const readLinks = (document: PDFDocument) =>
  document.getPages().flatMap((page, pageIndex) => {
    const annotations = page.node.Annots()

    if (!annotations) return []

    return annotations.asArray().flatMap(reference => {
      const annotation = document.context.lookup(reference, PDFDict)
      const action = annotation.lookupMaybe(PDFName.of('A'), PDFDict)
      const uri = action?.lookup(PDFName.of('URI'))

      if (!(uri instanceof PDFString || uri instanceof PDFHexString)) return []
      const rect = annotation.lookupMaybe(PDFName.of('Rect'), PDFArray)

      expect(rect, 'Link rectangle').toBeDefined()

      return [
        {
          href: uri.decodeText(),
          page: pageIndex + 1,
          rect: rect?.asArray().map(value => document.context.lookup(value, PDFNumber).asNumber()) ?? [],
          width: page.getWidth(),
          height: page.getHeight()
        }
      ]
    })
  })

describe.runIf(process.env.AI_VISIBILITY_PDF_QA === '1')('AI Visibility PDF — real export QA', () => {
  beforeEach(() => {
    // Yoga's embedded WASM URL is not an external request; serve its own bytes.
    server.use(
      http.get(/nullapplication\/octet-stream;base64,/, ({ request }) => {
        const bytes = Buffer.from(request.url.split(',')[1], 'base64')

        return new HttpResponse(Uint8Array.from(bytes).buffer, { headers: { 'Content-Type': 'application/wasm' } })
      })
    )
  })

  it.each(cases)(
    'exports and audits %s',
    async id => {
      const locale = id.startsWith('pt-BR') ? 'pt-BR' : id.startsWith('en') ? 'en' : 'es'
      const client = id.endsWith('client')
      const source = id.endsWith('null') ? nullModel() : normal()
      const header = { ...HEADER }

      if (id.endsWith('zero')) {
        source.overallScore = 0
        source.overallSeverity = 'critico'
        source.dimensions[0] = { ...source.dimensions[0], score: 0, severity: 'critico' }
      }

      if (id.endsWith('optimal')) {
      source.overallScore = 100
      source.overallSeverity = 'optimo'
    }

    if (id.endsWith('long')) {
        header.organizationName =
          'Globe — Organización de ejemplo con un nombre comercial extenso para revisar la composición y continuidad del informe'
        source.primaryGap = source.primaryGap
          ? {
              ...source.primaryGap,
              title: `Hallazgo extenso aprobado para el fixture. ${'La marca necesita citas verificables y consistentes en fuentes de su categoría. '.repeat(6)}FIN HALLAZGO LARGO`
            }
          : null
        source.recommendations = source.recommendations.map((rec, index) => ({
          ...rec,
          action: `${rec.action} ${'Publica evidencia verificable, responsables y fechas de revisión para las preguntas de compra más relevantes. '.repeat(4)}FIN ACCIÓN ${index + 1}`
        }))
        source.disclaimer = `${source.disclaimer} ${'Este fixture contiene texto extenso para comprobar el archivo exportado y su paginación. '.repeat(4)}FIN ALCANCE LARGO`
      }

      const context: AiVisibilityReportPdfPresentationContext = client
        ? {
            audience: 'client',
            audienceSource: 'organization_commercial_facts',
            locale,
            nextReportDate: '2026-06-19',
            clientLogo: {
              data: await sharp(
                Buffer.from(
                  '<svg width="240" height="80" xmlns="http://www.w3.org/2000/svg"><text x="8" y="58" font-size="54" font-family="sans-serif" font-weight="bold">Globe</text></svg>'
                )
              )
                .png()
                .toBuffer(),
              format: 'png',
              onDark: false,
              alt: 'Globe — synthetic test wordmark'
            }
          }
        : { audience: 'prospect', audienceSource: 'public_intake', locale }

      const before = hash(JSON.stringify(source))
      const presentation = resolveAiVisibilityReportPdfPresentation({ model: source, header, context })
      const buffer = await renderAiVisibilityReportPdf({ model: source, header, context })

      await mkdir(OUT, { recursive: true })
      const path = resolve(OUT, `${id}.pdf`)

      await writeFile(path, buffer)
      console.log(`PDF_QA_EXPORT ${path}`)
      const document = await PDFDocument.load(buffer)
      const text = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' })
      const bbox = execFileSync('pdftotext', ['-bbox', path, '-'], { encoding: 'utf8' })
      const fontReport = execFileSync('pdffonts', [path], { encoding: 'utf8' })
      const annotations = readLinks(document)
      const links = annotations.map(annotation => annotation.href)

      const pages = [...bbox.matchAll(/<page width="([\d.-]+)" height="([\d.-]+)">([\s\S]*?)<\/page>/g)].map(
        (page, index) => ({
          page: index + 1,
          width: Number(page[1]),
          height: Number(page[2]),
          words: [
            ...page[3].matchAll(
              /<word xMin="([\d.-]+)" yMin="([\d.-]+)" xMax="([\d.-]+)" yMax="([\d.-]+)">([^<]*)<\/word>/g
            )
          ].map(match => ({
            xMin: Number(match[1]),
            yMin: Number(match[2]),
            xMax: Number(match[3]),
            yMax: Number(match[4]),
            text: match[5]
          }))
        })
      )

      const outsidePage = pages.flatMap(page =>
        page.words
          .filter(
            word =>
              word.xMin < -0.5 || word.yMin < -0.5 || word.xMax > page.width + 0.5 || word.yMax > page.height + 0.5
          )
          .map(word => ({ ...word, page: page.page }))
      )

      const outsideLinks = annotations.filter(
        annotation =>
          annotation.rect.length !== 4 ||
          annotation.rect[0] < -0.5 ||
          annotation.rect[1] < -0.5 ||
          annotation.rect[2] > annotation.width + 0.5 ||
          annotation.rect[3] > annotation.height + 0.5
      )

      await writeFile(resolve(OUT, `${id}.txt`), text)
      await writeFile(resolve(OUT, `${id}.bbox.html`), bbox)
      await writeFile(
        resolve(OUT, `${id}.qa.json`),
        JSON.stringify(
          {
            synthetic: true,
            locale,
            audience: presentation.audience,
            fixture: id,
            bytes: buffer.length,
            pages: document.getPageCount(),
            pageSizes: pages.map(({ page, width, height }) => ({ page, width, height })),
            pdfSha256: hash(buffer),
            modelSha256: before,
            header,
            links,
            outsideLinks,
            outsidePage,
            fonts: fontReport
          },
          null,
          2
        ) + '\n'
      )
      execFileSync('pdftoppm', ['-png', '-r', '96', path, resolve(OUT, `${id}-page`)])

      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-')
      expect(hash(JSON.stringify(source))).toBe(before)
      if (!id.endsWith('long')) expect.soft(document.getPageCount()).toBe(6)
      expect(document.getPageCount()).toBeGreaterThanOrEqual(6)
      expect.soft(outsidePage).toEqual([])
      expect.soft(outsideLinks).toEqual([])

      for (const page of document.getPages()) {
        expect.soft(page.getWidth()).toBeCloseTo(595.28, 1)
        expect.soft(page.getHeight()).toBeCloseTo(841.89, 1)
      }

      const pageTexts = text.split('\f').filter(pageText => pageText.trim())

      expect(normalized(pageTexts[0])).toContain(normalized(presentation.copy.assessmentResult))
      expect(normalized(pageTexts[0])).toContain(normalized(header.organizationName))
      if (presentation.overall.unitLabel)
        expect(normalized(pageTexts[0])).toContain(
          `${presentation.overall.scoreLabel} ${presentation.overall.unitLabel}`
        )

      for (let index = 1; index < pageTexts.length - 1; index++) {
        expect
          .soft(normalized(pageTexts[index]))
          .toContain(`${String(index + 1).padStart(2, '0')} / ${String(document.getPageCount()).padStart(2, '0')}`)
      }

      expect(normalized(text)).toContain(normalized(header.organizationName))
      for (const title of [
        ...(presentation.primaryGap ? [presentation.copy.primaryGap] : []),
        presentation.copy.dimensionsTitle,
        presentation.copy.levelsTitle,
        ...(presentation.benchmark.rows.length ? [presentation.copy.benchmarkTitle] : [])
      ])
        expect(normalized(text)).toContain(normalized(title))
      expect(normalized(text)).toContain(normalized(presentation.closing.answer))
      expect(text).not.toMatch(/INTERNAL|ai_visibility_score_|Confusión de identidad|invisible en Perplexity/)
      expect(fontReport).toContain('AIVisibilityBricolage')
      expect(fontReport).not.toMatch(/Helvetica|Times-Roman/)

      if (client) {
        expect(links).toContain(`mailto:${presentation.closing.owner?.email}`)
        expect(links.some(link => link.includes('utm_campaign=grader-report'))).toBe(false)
        expect(text.replace(/\s+/g, '').toUpperCase()).toContain(
          presentation.copy.preparedFor.replace(/\s+/g, '').toUpperCase()
        )
        expect(normalized(text)).toContain(normalized(presentation.closing.nextReportDateLabel!))
      } else {
        expect(links).toContain(presentation.closing.ctaUrl)
        expect(links).toContain(EFEONCE_URL_HTTPS)
        for (const channel of ['linkedin', 'instagram', 'youtube', 'threads'])
          expect(links).toContain(EFEONCE_SOCIAL_LINKS.find(item => item.channel === channel)?.url)
      }

      if (id.endsWith('null')) expect(normalized(text)).toContain(presentation.copy.noData)
      if (id.endsWith('zero')) expect(normalized(text)).toContain('0')

      if (id.endsWith('long')) {
        expect(normalized(text)).toContain('FIN HALLAZGO LARGO')
        expect(normalized(text)).toContain('FIN ALCANCE LARGO')
        for (let index = 1; index <= source.recommendations.length; index++)
          expect(normalized(text)).toContain(`FIN ACCIÓN ${index}`)
      }
    },
    60000
  )
})
