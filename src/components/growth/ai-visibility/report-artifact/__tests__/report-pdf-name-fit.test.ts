import { Font } from '@react-pdf/renderer'
import { beforeAll, describe, expect, it } from 'vitest'

import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'

import { fitReportPdfOrganizationName } from '../pdf/report-pdf-name-fit'
import { ReportPdfBrand as B, ReportPdfEditorial as E, ReportPdfFonts as F, px } from '../pdf/report-pdf-tokens'

const role = E.type.editorial.organizationProspect

const budget = {
  fontFamily: F.display(role.weight),
  // Physical A4 is 595.28 pt; canonical cover padding is 64 px on each side.
  widthPt: 595.28 - px(B.cover.paddingPx[1] * 2),
  maxHeightPt: px(E.type.editorial.organizationClient.sizePx * 3),
  maxFontSizePt: px(role.sizePx),
  minFontSizePt: px(E.type.editorial.emphasis.sizePx),
  lineHeight: role.lineHeight,
  trackingEm: role.tracking
}

describe('AI Visibility organization name fitting using the rendered TTF', () => {
  beforeAll(ensurePdfFontsRegistered)

  it('preserves the canonical display size for a short name', async () => {
    const fit = await fitReportPdfOrganizationName({ ...budget, text: 'Globe' })

    expect(fit.fits).toBe(true)
    expect(fit.fontSizePt).toBe(budget.maxFontSizePt)
    expect(fit.lineCount).toBe(1)
  })

  it('fits the long-name export fixture in its measured width and height without truncating it', async () => {
    const text =
      'Globe — Organización de ejemplo con un nombre comercial extenso para revisar la composición y continuidad del informe'

    const input = { ...budget, text }
    const before = { ...input }
    const fit = await fitReportPdfOrganizationName(input)

    expect(input).toEqual(before)
    expect(fit.fits).toBe(true)
    expect(fit.fontSizePt).toBeLessThan(budget.maxFontSizePt)
    expect(fit.fontSizePt).toBeGreaterThanOrEqual(budget.minFontSizePt)
    expect(fit.heightPt).toBeLessThanOrEqual(budget.maxHeightPt)
    expect(fit.maxLineWidthPt).toBeLessThanOrEqual(budget.widthPt)
    expect(fit.lineCount).toBeLessThanOrEqual(3)
  })

  it('measures multibyte names and diacritics from glyph advances', async () => {
    const text = 'São José — Investigación, Innovación y Gestión Internacional'
    const fit = await fitReportPdfOrganizationName({ ...budget, text })

    expect(fit.fits).toBe(true)
    expect(Buffer.byteLength(text, 'utf8')).toBeGreaterThan(text.length)

    const font = Font.getFont({ fontFamily: budget.fontFamily }).data!
    const run = font.layout('São José')
    const short = await fitReportPdfOrganizationName({ ...budget, text: 'São José' })

    const expected =
      (run.advanceWidth * short.fontSizePt) / font.unitsPerEm +
      (run.glyphs.length - 1) * budget.trackingEm * short.fontSizePt

    expect(short.maxLineWidthPt).toBeCloseTo(expected, 8)
  })

  it('distinguishes glyph widths for strings with the same character count', async () => {
    const narrow = await fitReportPdfOrganizationName({ ...budget, widthPt: px(240), text: 'iiiiiiiiiiii' })
    const wide = await fitReportPdfOrganizationName({ ...budget, widthPt: px(240), text: 'WWWWWWWWWWWW' })

    expect(narrow.fits).toBe(true)
    expect(wide.fits).toBe(true)
    expect(narrow.fontSizePt).toBeGreaterThan(wide.fontSizePt)
  })

  it('returns explicit overflow at the minimum instead of clipping an unbreakable name', async () => {
    const fit = await fitReportPdfOrganizationName({ ...budget, text: 'W'.repeat(200) })

    expect(fit.fits).toBe(false)
    expect(fit.fontSizePt).toBe(budget.minFontSizePt)
    expect(fit.maxLineWidthPt).toBeGreaterThan(budget.widthPt)
  })

  it('preserves explicit line breaks and rejects an invalid physical budget', async () => {
    const fit = await fitReportPdfOrganizationName({ ...budget, text: 'Globe\nSão José' })

    expect(fit.lineCount).toBe(2)
    expect(fit.fits).toBe(true)
    await expect(fitReportPdfOrganizationName({ ...budget, text: 'Globe', widthPt: 0 })).rejects.toThrow(
      'ai_visibility_pdf_invalid_name_fit_budget'
    )
  })
})
