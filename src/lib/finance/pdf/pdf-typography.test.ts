import { describe, expect, it } from 'vitest'

import {
  fontFamilies,
  fontWeights,
  typographyScale
} from '@/components/theme/typography-tokens'

import { getPdfTypography, pdfFamilyName, type PdfTypographyRole } from './pdf-typography'

// TASK-1043 — el adapter PDF DERIVA del SoT: peso + familia (display/text) de
// cada rol salen de `typographyScale`/`fontWeights`/`fontFamilies`, no se
// hardcodean. El tamaño en `pt` es propio del medio (NO se copia del web).

describe('pdfFamilyName — mapeo (intent, peso SoT) → familia registrada', () => {
  it('mapea pesos display a las familias Poppins registradas', () => {
    expect(pdfFamilyName('display', fontWeights.extrabold)).toBe('Poppins ExtraBold')
    expect(pdfFamilyName('display', fontWeights.bold)).toBe('Poppins Bold')
    expect(pdfFamilyName('display', fontWeights.semibold)).toBe('Poppins')
    expect(pdfFamilyName('display', fontWeights.medium)).toBe('Poppins Medium')
  })

  it('mapea pesos text a las familias Geist registradas (incl. 600/800 de TASK-1040)', () => {
    expect(pdfFamilyName('text', fontWeights.extrabold)).toBe('Geist ExtraBold')
    expect(pdfFamilyName('text', fontWeights.bold)).toBe('Geist Bold')
    expect(pdfFamilyName('text', fontWeights.semibold)).toBe('Geist SemiBold')
    expect(pdfFamilyName('text', fontWeights.medium)).toBe('Geist Medium')
    expect(pdfFamilyName('text', fontWeights.regular)).toBe('Geist')
  })
})

describe('getPdfTypography — derivación del SoT', () => {
  const pdf = getPdfTypography()

  it('expone todos los roles canónicos con tamaño pt positivo', () => {
    const roles: PdfTypographyRole[] = [
      'display', 'pageTitle', 'sectionTitle', 'subtitle', 'label', 'body',
      'bodyStrong', 'caption', 'micro', 'overline', 'numericId', 'numericAmount', 'kpiValue'
    ]

    for (const role of roles) {
      expect(pdf[role], role).toBeDefined()
      expect(pdf[role].fontSize, role).toBeGreaterThan(0)
      expect(typeof pdf[role].fontFamily, role).toBe('string')
    }
  })

  it('section-title usa Geist SemiBold porque el SoT lo define text + 600', () => {
    // Si el SoT cambiara el peso de section-title, este assert lo detecta.
    expect(typographyScale.sectionTitle.fontWeight).toBe(fontWeights.semibold)
    expect(typographyScale.sectionTitle.fontFamily).toBe(fontFamilies.text)
    expect(pdf.sectionTitle.fontFamily).toBe('Geist SemiBold')
  })

  it('display usa Poppins ExtraBold porque el SoT lo define display + 800', () => {
    expect(typographyScale.headlineDisplay.fontWeight).toBe(fontWeights.extrabold)
    expect(typographyScale.headlineDisplay.fontFamily).toBe(fontFamilies.display)
    expect(pdf.display.fontFamily).toBe('Poppins ExtraBold')
  })

  it('page-title usa Poppins (SemiBold) porque el SoT lo define display + 600', () => {
    expect(typographyScale.pageTitle.fontWeight).toBe(fontWeights.semibold)
    expect(pdf.pageTitle.fontFamily).toBe('Poppins')
  })

  it('kpi-value usa Geist ExtraBold (text + 800) y numeric-amount Geist Bold (text + 700)', () => {
    expect(pdf.kpiValue.fontFamily).toBe('Geist ExtraBold')
    expect(pdf.numericAmount.fontFamily).toBe('Geist Bold')
  })

  it('body/caption/subtitle usan Geist regular (text + 400)', () => {
    expect(pdf.body.fontFamily).toBe('Geist')
    expect(pdf.caption.fontFamily).toBe('Geist')
    expect(pdf.subtitle.fontFamily).toBe('Geist')
  })

  it('overline aplica letter-spacing de caps escalado al tamaño', () => {
    expect(pdf.overline.letterSpacing).toBeGreaterThan(0)
  })

  it('la jerarquía de tamaños es monótona descendente (display ≥ pageTitle ≥ sectionTitle ≥ body ≥ micro)', () => {
    expect(pdf.display.fontSize).toBeGreaterThanOrEqual(pdf.pageTitle.fontSize)
    expect(pdf.pageTitle.fontSize).toBeGreaterThanOrEqual(pdf.sectionTitle.fontSize)
    expect(pdf.sectionTitle.fontSize).toBeGreaterThanOrEqual(pdf.body.fontSize)
    expect(pdf.body.fontSize).toBeGreaterThanOrEqual(pdf.micro.fontSize)
  })
})
