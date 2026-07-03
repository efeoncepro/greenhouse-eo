import { describe, expect, it } from 'vitest'

import {
  escapeGutenbergHtml,
  renderHeadingBlock,
  renderYoastTableOfContents,
  yoastHeadingAnchor
} from '../gutenberg-blocks'

describe('yoastHeadingAnchor', () => {
  it('matches how Yoast/WordPress slugify headings (accents, punctuation, emoji stripped)', () => {
    expect(yoastHeadingAnchor('¿Qué es Loop Marketing? ♾️')).toBe('h-que-es-loop-marketing')
    expect(yoastHeadingAnchor('Lo que pasó en cuatro meses: de estándar a ecosistema')).toBe(
      'h-lo-que-paso-en-cuatro-meses-de-estandar-a-ecosistema'
    )
    expect(yoastHeadingAnchor('MCP: las manos del agente')).toBe('h-mcp-las-manos-del-agente')
  })
})

describe('renderHeadingBlock', () => {
  it('emits an anchored H2 with the wp-block-heading class and no level attr', () => {
    const block = renderHeadingBlock({ level: 2, text: 'El programa que nadie más puede escribir' })

    expect(block).toContain('<!-- wp:heading -->')
    expect(block).toContain('<h2 class="wp-block-heading" id="h-el-programa-que-nadie-mas-puede-escribir">')
    expect(block).toContain('El programa que nadie más puede escribir')
  })

  it('emits an anchored H3 carrying the level attr', () => {
    const block = renderHeadingBlock({ level: 3, text: 'MCP: las manos del agente' })

    expect(block).toContain('<!-- wp:heading {"level":3} -->')
    expect(block).toContain('<h3 class="wp-block-heading" id="h-mcp-las-manos-del-agente">')
  })

  it('escapes heading text', () => {
    expect(renderHeadingBlock({ level: 2, text: 'Riesgo & control <ahora>' })).toContain(
      'Riesgo &amp; control &lt;ahora&gt;'
    )
  })
})

describe('renderYoastTableOfContents', () => {
  const block = renderYoastTableOfContents([
    { level: 2, text: 'Las dos capas' },
    { level: 3, text: 'MCP: las manos del agente' },
    { level: 3, text: 'Agent Skills: el cerebro entrenado' },
    { level: 2, text: 'El conocimiento tácito' }
  ])

  it('is a populated Yoast TOC block with anchor links', () => {
    expect(block).toContain('<!-- wp:yoast-seo/table-of-contents -->')
    expect(block).toContain('class="wp-block-yoast-seo-table-of-contents yoast-table-of-contents"')
    expect(block).toContain('<a href="#h-las-dos-capas" data-level="2">')
    expect(block).toContain('<a href="#h-el-conocimiento-tacito" data-level="2">')
  })

  it('nests H3s inside their parent H2 sublist', () => {
    expect(block).toContain(
      '<li><a href="#h-las-dos-capas" data-level="2">Las dos capas</a><ul><li><a href="#h-mcp-las-manos-del-agente" data-level="3">'
    )
  })

  it('links resolve to the anchors renderHeadingBlock produces', () => {
    const heading = renderHeadingBlock({ level: 3, text: 'MCP: las manos del agente' })
    const anchor = yoastHeadingAnchor('MCP: las manos del agente')

    expect(heading).toContain(`id="${anchor}"`)
    expect(block).toContain(`href="#${anchor}"`)
  })
})

describe('escapeGutenbergHtml', () => {
  it('escapes the HTML-significant characters', () => {
    expect(escapeGutenbergHtml(`a & b < c > d " e ' f`)).toBe('a &amp; b &lt; c &gt; d &quot; e &#39; f')
  })
})
