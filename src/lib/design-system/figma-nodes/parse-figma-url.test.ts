import { describe, expect, it } from 'vitest'

import { parseFigmaUrl } from './parse-figma-url'

const AXIS = 'yyMksCoijfMaIoYplXKZaR'

describe('parseFigmaUrl', () => {
  it('parses a standard design URL and normalizes node-id dash → colon', () => {
    expect(parseFigmaUrl(`https://www.figma.com/design/${AXIS}/AXIS?node-id=205-234905`)).toEqual({
      fileKey: AXIS,
      fileName: 'AXIS',
      nodeId: '205:234905'
    })
  })

  it('tolerates a leading "@" + encoded fileName + m=dev (real Figma paste)', () => {
    const url = `@https://www.figma.com/design/${AXIS}/Design-System-%7C-Vuexy-%3E-AXIS?node-id=11669-40645&m=dev`

    expect(parseFigmaUrl(url)).toEqual({
      fileKey: AXIS,
      fileName: 'Design-System-|-Vuexy->-AXIS',
      nodeId: '11669:40645'
    })
  })

  it('tolerates angle-bracket wrapping and surrounding quotes', () => {
    expect(parseFigmaUrl(`<https://www.figma.com/design/${AXIS}/X?node-id=1-2>`)?.nodeId).toBe('1:2')
    expect(parseFigmaUrl(`"https://www.figma.com/design/${AXIS}/X?node-id=1-2"`)?.nodeId).toBe('1:2')
  })

  it('accepts legacy /file/ and branch URLs', () => {
    expect(parseFigmaUrl(`https://www.figma.com/file/${AXIS}/X?node-id=3-4`)?.fileKey).toBe(AXIS)
    expect(parseFigmaUrl(`https://www.figma.com/design/${AXIS}/branch/abc123/X?node-id=5-6`)).toEqual({
      fileKey: AXIS,
      fileName: 'X',
      nodeId: '5:6'
    })
  })

  it('returns null for non-Figma host, missing node-id, or garbage', () => {
    expect(parseFigmaUrl(`https://example.com/design/${AXIS}/X?node-id=1-2`)).toBeNull()
    expect(parseFigmaUrl(`https://www.figma.com/design/${AXIS}/X`)).toBeNull()
    expect(parseFigmaUrl('not a url')).toBeNull()
    expect(parseFigmaUrl('')).toBeNull()
    expect(parseFigmaUrl(null)).toBeNull()
    expect(parseFigmaUrl(undefined)).toBeNull()
  })

  it('rejects a malformed node-id shape', () => {
    expect(parseFigmaUrl(`https://www.figma.com/design/${AXIS}/X?node-id=abc`)).toBeNull()
  })

  it('extracts the URL from Figma "Implement this design" prose + @-mention + newline', () => {
    const pasted = `Implementa este diseño desde Figma.\n@https://www.figma.com/design/${AXIS}/Design-System-%7C-Vuexy-%3E-AXIS?node-id=139-349628&m=dev`

    expect(parseFigmaUrl(pasted)).toEqual({
      fileKey: AXIS,
      fileName: 'Design-System-|-Vuexy->-AXIS',
      nodeId: '139:349628'
    })
  })

  it('extracts the URL when prose follows it and strips trailing sentence punctuation', () => {
    expect(parseFigmaUrl(`Mirá este nodo: https://www.figma.com/design/${AXIS}/X?node-id=7-8.`)?.nodeId).toBe('7:8')
    expect(parseFigmaUrl(`(ref https://www.figma.com/design/${AXIS}/X?node-id=7-8)`)?.nodeId).toBe('7:8')
  })

  it('ignores prose that mentions a non-Figma URL', () => {
    expect(parseFigmaUrl(`ver https://example.com/design/${AXIS}/X?node-id=1-2 acá`)).toBeNull()
  })
})
