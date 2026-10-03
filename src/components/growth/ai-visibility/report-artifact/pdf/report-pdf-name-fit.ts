import 'server-only'

import { Font } from '@react-pdf/renderer'

export interface ReportPdfNameFitInput {
  text: string
  fontFamily: string
  widthPt: number
  maxHeightPt: number
  maxFontSizePt: number
  minFontSizePt: number
  lineHeight: number
  trackingEm: number
}

export interface ReportPdfNameFit {
  fontSizePt: number
  lineCount: number
  heightPt: number
  maxLineWidthPt: number
  fits: boolean
}

/** Measure the registered static TTF used by the renderer, without character-count heuristics.
 * The caller owns the width/height budget and the canonical type role. Registration must
 * precede this call, just as it precedes rendering. FontSource deduplicates concurrent loads.
 * Greedy space wrapping is conservative against react-pdf's optimal line breaker; the
 * report's shared hyphenation callback keeps each word whole. Explicit line breaks remain.
 * No text is rewritten, clipped or returned in a shortened form.
 */
export const fitReportPdfOrganizationName = async (input: ReportPdfNameFitInput): Promise<ReportPdfNameFit> => {
  const { text, fontFamily, widthPt, maxHeightPt, maxFontSizePt, minFontSizePt, lineHeight, trackingEm } = input

  if (
    !fontFamily ||
    ![widthPt, maxHeightPt, maxFontSizePt, minFontSizePt, lineHeight, trackingEm].every(Number.isFinite) ||
    Math.min(widthPt, maxHeightPt, minFontSizePt, lineHeight) <= 0 ||
    maxFontSizePt < minFontSizePt
  ) {
    throw new Error('ai_visibility_pdf_invalid_name_fit_budget')
  }

  const descriptor = { fontFamily }

  await Font.load(descriptor)

  const font = Font.getFont(descriptor).data

  if (!font) throw new Error('ai_visibility_pdf_name_fit_font_unavailable')

  const widthAt = (value: string, sizePt: number): number => {
    const run = font.layout(value)

    return (run.advanceWidth * sizePt) / font.unitsPerEm + Math.max(0, run.glyphs.length - 1) * trackingEm * sizePt
  }

  const measure = (fontSizePt: number): ReportPdfNameFit => {
    const widths: number[] = []

    for (const paragraph of text.split(/\r\n|\r|\n/u)) {
      let line = ''
      let spaces = ''

      // react-pdf's word wrapping splits on ASCII spaces; NBSP remains within a word.
      for (const token of paragraph.split(/([ ]+)/u).filter(Boolean)) {
        if (/^[ ]+$/u.test(token)) {
          spaces += token
          continue
        }

        const candidate = line ? line + spaces + token : token

        if (line && widthAt(candidate, fontSizePt) > widthPt) {
          widths.push(widthAt(line, fontSizePt))
          line = token
        } else {
          line = candidate
        }

        spaces = ''
      }

      widths.push(widthAt(line, fontSizePt))
    }

    const lineCount = widths.length
    const heightPt = lineCount * fontSizePt * lineHeight
    const maxLineWidthPt = Math.max(...widths)

    return {
      fontSizePt,
      lineCount,
      heightPt,
      maxLineWidthPt,
      fits: heightPt <= maxHeightPt && maxLineWidthPt <= widthPt
    }
  }

  const preferred = measure(maxFontSizePt)

  if (preferred.fits) return preferred

  const minimum = measure(minFontSizePt)

  if (!minimum.fits) return minimum

  let low = minFontSizePt
  let high = maxFontSizePt

  // Sub-millipoint precision is numeric fitting, not a new design scale.
  for (let attempt = 0; attempt < 24; attempt++) {
    const midpoint = (low + high) / 2

    if (measure(midpoint).fits) low = midpoint
    else high = midpoint
  }

  return measure(low)
}
