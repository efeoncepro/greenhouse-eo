import { describe, expect, it } from 'vitest'

import { authorGutenbergDraft, type GutenbergArticleSpec } from '../article-authoring'
import { validateGeneratedGutenbergDraft } from '../gutenberg-validator'

// A real, differentiated article authored via the structured spec — the loop that
// replaces hand-written block markup. Mirrors the first live post (250748).
const kungFuSpec: GutenbergArticleSpec = {
  title: '"I Know Kung Fu": Cómo los Agent Skills Están Creando el Momento Matrix de la IA Empresarial',
  excerpt:
    'En cuatro meses, Agent Skills pasó de estándar a ecosistema con 490.000+ skills. Qué significa para cualquier organización cuyo valor está en lo que sabe hacer.',
  seo: {
    title: 'Agent Skills: el momento Matrix de la IA empresarial %%sep%% %%sitename%%',
    description:
      'Agent Skills pasó de estándar a ecosistema en cuatro meses. Qué son los skills propietarios y por qué el conocimiento tácito de tu empresa es tu ventaja.'
  },
  intro: [
    'Hay una escena en Matrix que todo el mundo recuerda. Neo se sienta, le conectan un cable a la nuca, y en diez segundos dice: «I know Kung Fu». No aprendió. Le cargaron el programa.',
    'A junio de 2026 el ecosistema tiene 490.000+ skills publicados, 8 marketplaces y cuatro labs convergiendo en el mismo formato. La escena de Matrix ya ocurrió.'
  ],
  sections: [
    {
      heading: 'Lo que pasó en cuatro meses: de estándar a ecosistema',
      level: 2,
      blocks: [
        { kind: 'paragraph', text: 'En diciembre de 2025 era una apuesta. Seis meses después es infraestructura confirmada.' },
        {
          kind: 'list',
          items: [
            'DIC 2025 — Anthropic publica el estándar abierto.',
            'MAR 2026 — Google DeepMind adopta el formato; 490.000 skills en circulación.'
          ]
        },
        { kind: 'pullquote', text: 'Un skill es a los agentes lo que una app fue al smartphone.' }
      ]
    },
    {
      heading: 'Las dos capas que hacen funcionar a un agente',
      level: 2,
      blocks: [{ kind: 'paragraph', text: 'Un agente opera con dos capacidades: lo que puede alcanzar y lo que sabe hacer.' }]
    },
    {
      heading: 'MCP: las manos del agente',
      level: 3,
      blocks: [{ kind: 'paragraph', text: 'El Model Context Protocol da acceso a herramientas externas: manos para tocar el mundo.' }]
    },
    {
      heading: 'Agent Skills: el cerebro entrenado',
      level: 3,
      blocks: [
        { kind: 'paragraph', text: 'Los skills resuelven el conocimiento procedural: cómo TU empresa hace las cosas.' },
        { kind: 'quote', text: 'MCP da la herramienta; el skill da la expertise para usarla como tu mejor operador.' }
      ]
    },
    {
      heading: 'El conocimiento tácito: lo que ningún skill público puede tener',
      level: 2,
      blocks: [{ kind: 'paragraph', text: 'Lo que ningún repositorio público puede tener es el conocimiento tácito de tu organización.' }]
    }
  ],
  cta: { text: 'El momento Matrix ya pasó. La pregunta ahora es qué programas vale la pena escribir.' }
}

describe('authorGutenbergDraft', () => {
  it('assembles a valid, differentiated draft from a structured spec (validation passes)', () => {
    const draft = authorGutenbergDraft(kungFuSpec)
    const validation = validateGeneratedGutenbergDraft(draft)

    expect(validation.status).toBe('pass')
    expect(validation.findings.some(finding => finding.severity === 'block')).toBe(false)
    expect(validation.findings.some(finding => finding.code === 'blogpost_toc_not_populated')).toBe(false)
    expect(validation.findings.some(finding => finding.code === 'blogpost_toc_headings_unanchored')).toBe(false)
  })

  it('emits a functional TOC and anchored headings by construction', () => {
    const draft = authorGutenbergDraft(kungFuSpec)
    const postContent = draft.draft.kind === 'gutenberg_post' ? draft.draft.postContent : ''

    // Anchors line up between the TOC link and the body heading.
    expect(postContent).toContain(
      '<h2 class="wp-block-heading" id="h-lo-que-paso-en-cuatro-meses-de-estandar-a-ecosistema">'
    )
    expect(postContent).toContain('<a href="#h-lo-que-paso-en-cuatro-meses-de-estandar-a-ecosistema" data-level="2">')
    // H3s nest under their parent H2.
    expect(postContent).toContain('data-level="3">MCP: las manos del agente</a>')
    // Never emits H1 in the body; WordPress owns the title.
    expect(postContent).not.toContain('<h1')
  })

  it('derives a kebab-case slug and declares observed blocks', () => {
    const draft = authorGutenbergDraft(kungFuSpec)

    expect(draft.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(draft.draft.kind === 'gutenberg_post' && draft.draft.observedBlocks).toEqual(
      expect.arrayContaining(['core/heading', 'core/paragraph', 'yoast-seo/table-of-contents'])
    )
  })

  it('does not invent media — an image block only appears when the author provides a real asset', () => {
    const withImage = authorGutenbergDraft({
      ...kungFuSpec,
      sections: [
        {
          heading: 'Con evidencia visual',
          level: 2,
          blocks: [{ kind: 'image', mediaId: 249787, url: 'https://efeoncepro.com/wp-content/uploads/x.png', alt: 'grafico' }]
        },
        ...kungFuSpec.sections.slice(1)
      ]
    })

    const postContent = withImage.draft.kind === 'gutenberg_post' ? withImage.draft.postContent : ''

    expect(postContent).toContain('wp:image {"id":249787')
    expect(postContent).toContain('class="wp-image-249787"')
  })

  it('rejects an empty spec', () => {
    expect(() => authorGutenbergDraft({ ...kungFuSpec, sections: [] })).toThrow(
      'content_factory_article_sections_required'
    )
  })
})
