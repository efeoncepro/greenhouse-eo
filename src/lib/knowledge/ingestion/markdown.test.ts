import { describe, expect, it } from 'vitest'

import {
  checksumMarkdown,
  chunkMarkdown,
  estimateTokens,
  slugifyHeading,
  stripFrontmatter
} from './markdown'

const SAMPLE = `> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Documentación técnica:** [link](x.md)

# Cómo preguntar a Nexa

Escribe tu pregunta en el chat.

## Para qué sirve

Nexa responde con citas.

## Límites

No inventa reglas.

### Detalle

Si no hay fuente, lo dice.
`

describe('stripFrontmatter', () => {
  it('removes the block-quote front-matter header', () => {
    const body = stripFrontmatter(SAMPLE)

    expect(body.startsWith('# Cómo preguntar a Nexa')).toBe(true)
    expect(body).not.toContain('Tipo de documento')
  })

  it('is a no-op when there is no front-matter', () => {
    expect(stripFrontmatter('# Title\n\ncontent')).toBe('# Title\n\ncontent')
  })
})

describe('slugifyHeading', () => {
  it('produces kebab ascii anchors, accent-stripped', () => {
    expect(slugifyHeading('Cómo preguntar a Nexa')).toBe('como-preguntar-a-nexa')
    expect(slugifyHeading('Límites')).toBe('limites')
    expect(slugifyHeading('  ')).toBe('seccion')
  })
})

describe('chunkMarkdown', () => {
  const chunks = chunkMarkdown(SAMPLE)

  it('produces one chunk per heading section', () => {
    // intro under H1 + Para qué sirve + Límites + Detalle
    expect(chunks.length).toBe(4)
  })

  it('builds heading_path with ancestors', () => {
    const detalle = chunks.find(c => c.citationAnchor === 'detalle')

    expect(detalle?.headingPath).toEqual(['Cómo preguntar a Nexa', 'Límites', 'Detalle'])
  })

  it('includes the heading line in the body for citation context', () => {
    const limites = chunks.find(c => c.citationAnchor === 'limites')

    expect(limites?.bodyText.startsWith('## Límites')).toBe(true)
    expect(limites?.bodyText).toContain('No inventa reglas.')
  })

  it('every chunk has a positive token estimate', () => {
    for (const c of chunks) {
      expect(c.tokenEstimate).toBeGreaterThan(0)
    }
  })

  it('disambiguates duplicate anchors', () => {
    const dup = chunkMarkdown('## Notas\n\nuno\n\n## Notas\n\ndos')
    const anchors = dup.map(c => c.citationAnchor)

    expect(anchors).toEqual(['notas', 'notas-2'])
  })

  it('soft-splits long sections by paragraph', () => {
    const longBody = `# T\n\n${'a'.repeat(3000)}\n\n${'b'.repeat(3000)}`
    const split = chunkMarkdown(longBody, { maxChars: 4000 })

    expect(split.length).toBeGreaterThan(1)
    expect(split[0].citationAnchor).toBe('t')
    expect(split[1].citationAnchor).toBe('t-2')
  })
})

describe('checksumMarkdown', () => {
  it('is stable + sensitive to content', () => {
    expect(checksumMarkdown('a')).toBe(checksumMarkdown('a'))
    expect(checksumMarkdown('a')).not.toBe(checksumMarkdown('b'))
    expect(checksumMarkdown('a').startsWith('sha256:')).toBe(true)
  })
})

describe('estimateTokens', () => {
  it('is at least 1', () => {
    expect(estimateTokens('')).toBe(1)
    expect(estimateTokens('abcd')).toBe(1)
  })
})
