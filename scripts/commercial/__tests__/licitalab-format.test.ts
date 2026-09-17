import { describe, expect, it } from 'vitest'

import { formatDocuments, formatDocumentSearch, formatLicitalabResult } from '../licitalab-format'

describe('formato de pnpm licitalab', () => {
  it('documentos: marca los no consultables y explica la marca', () => {
    const text = formatDocuments({
      code: '2427-73-LE26',
      oppTypeLabel: 'Licitación',
      total: 2,
      documents: [
        { name: 'Bases.pdf', size: 1483760, supported: true },
        { name: 'Oferta.xlsx', size: 72196, supported: false }
      ]
    })

    expect(text).toContain('2427-73-LE26 · Licitación · 2 documentos')
    expect(text).toContain('✓ Bases.pdf  (1.4 MB)')
    expect(text).toContain('✗ Oferta.xlsx  (71 KB)')
    expect(text).toContain('no se puede consultar con ask-docs')
  })

  it('ask-docs: ordena por score, respeta top-k aunque el servidor devuelva más y cita archivo/página', () => {
    const text = formatDocumentSearch(
      {
        code: 'X',
        query: 'garantías',
        status: 'ok',
        chunks: [
          { text: 'baja', filename: 'a.pdf', pageNumber: 1, score: 0.2 },
          { text: 'alta   con\nespacios', filename: 'b.pdf', pageNumber: 4, score: 0.9 },
          { text: 'media', filename: 'c.pdf', pageNumber: 2, score: 0.5 }
        ]
      },
      2
    )

    expect(text).toContain('[1] b.pdf · p. 4 · score 0.90')
    expect(text).toContain('alta con espacios')
    expect(text).toContain('[2] c.pdf · p. 2')
    expect(text).not.toContain('a.pdf')
  })

  it('ask-docs: indexing avisa que no hay texto todavía', () => {
    const text = formatDocumentSearch({ code: 'X', query: 'q', status: 'indexing' })

    expect(text).toContain('status=indexing')
    expect(text).toContain('Reintenta en 30–60 s')
  })

  it('una forma desconocida cae a JSON en vez de ocultar datos', () => {
    expect(formatLicitalabResult('documents', { algo: 1 })).toBe(JSON.stringify({ algo: 1 }, null, 2))
    expect(formatLicitalabResult('support', { answer: 'Respuesta' })).toBe('Respuesta')
  })
})
