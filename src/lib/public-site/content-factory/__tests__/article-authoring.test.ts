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
        {
          kind: 'paragraph',
          text: 'En diciembre de 2025 era una apuesta. Seis meses después es infraestructura confirmada.'
        },
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
      blocks: [
        { kind: 'paragraph', text: 'Un agente opera con dos capacidades: lo que puede alcanzar y lo que sabe hacer.' }
      ]
    },
    {
      heading: 'MCP: las manos del agente',
      level: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'El Model Context Protocol da acceso a herramientas externas: manos para tocar el mundo.'
        }
      ]
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
      blocks: [
        {
          kind: 'paragraph',
          text: 'Lo que ningún repositorio público puede tener es el conocimiento tácito de tu organización.'
        }
      ]
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
          blocks: [
            { kind: 'image', mediaId: 249787, url: 'https://efeoncepro.com/wp-content/uploads/x.png', alt: 'grafico' }
          ]
        },
        ...kungFuSpec.sections.slice(1)
      ]
    })

    const postContent = withImage.draft.kind === 'gutenberg_post' ? withImage.draft.postContent : ''

    expect(postContent).toContain('wp:image {"id":249787')
    expect(postContent).toContain('class="wp-image-249787"')
  })

  it('renders governed image captions as semantic figcaptions', () => {
    const withCaption = authorGutenbergDraft({
      ...kungFuSpec,
      sections: [
        {
          heading: 'Con evidencia visual explicada',
          level: 2,
          blocks: [
            {
              kind: 'image',
              mediaId: 249787,
              url: 'https://efeoncepro.com/wp-content/uploads/x.png',
              alt: 'grafico',
              caption: [{ text: 'La selección ', strong: true }, { text: 'ocurre antes de escalar.' }],
              linkDestination: 'media'
            }
          ]
        },
        ...kungFuSpec.sections.slice(1)
      ]
    })

    const postContent = withCaption.draft.kind === 'gutenberg_post' ? withCaption.draft.postContent : ''

    expect(postContent).toContain(
      '<figcaption class="wp-element-caption"><strong>La selección </strong>ocurre antes de escalar.</figcaption>'
    )
    expect(postContent).toContain('"linkDestination":"media"')
    expect(postContent).toContain('<a href="https://efeoncepro.com/wp-content/uploads/x.png"><img')
  })

  it('renders a semantic native Gutenberg table with governed rich text', () => {
    const withTable = authorGutenbergDraft({
      ...kungFuSpec,
      sections: [
        {
          heading: 'Con métricas emparejadas',
          level: 2,
          blocks: [
            {
              kind: 'table',
              headers: ['Dimensión', 'Velocidad', 'Calidad'],
              rows: [
                [
                  [{ text: 'Producción', strong: true }],
                  'Tiempo hasta mercado',
                  [{ text: 'Aprobación', href: 'https://efeoncepro.com/creative/' }]
                ]
              ],
              caption: 'Cada métrica de volumen necesita una contramétrica de criterio.'
            }
          ]
        },
        ...kungFuSpec.sections
      ]
    })

    const postContent = withTable.draft.kind === 'gutenberg_post' ? withTable.draft.postContent : ''
    const validation = validateGeneratedGutenbergDraft(withTable)

    expect(postContent).toContain('<!-- wp:table -->')
    expect(postContent).toContain('<th scope="col">Dimensión</th>')
    expect(postContent).toContain('<td><strong>Producción</strong></td>')
    expect(postContent).toContain('<a href="https://efeoncepro.com/creative/">Aprobación</a>')
    expect(postContent).toContain('<figcaption class="wp-element-caption">Cada métrica')
    expect(withTable.draft.kind === 'gutenberg_post' && withTable.draft.observedBlocks).toContain('core/table')
    expect(validation.status).toBe('pass')
  })

  it('rejects malformed tables before Gutenberg markup is assembled', () => {
    expect(() =>
      authorGutenbergDraft({
        ...kungFuSpec,
        sections: [
          {
            heading: 'Tabla incompleta',
            level: 2,
            blocks: [
              {
                kind: 'table',
                headers: ['Dimensión', 'Métrica'],
                rows: [['Velocidad']]
              }
            ]
          }
        ]
      })
    ).toThrow('content_factory_article_table_column_count_mismatch')
  })

  it('renders safe inline links without opening a raw HTML escape hatch', () => {
    const withCitation = authorGutenbergDraft({
      ...kungFuSpec,
      sections: [
        {
          heading: 'Con evidencia enlazada',
          level: 2,
          blocks: [
            {
              kind: 'paragraph',
              text: [
                { text: 'La fuente primaria está en ' },
                { text: 'Science Advances', href: 'https://doi.org/10.1126/sciadv.adn5290' },
                { text: '.' }
              ]
            }
          ]
        },
        ...kungFuSpec.sections.slice(1)
      ]
    })

    const postContent = withCitation.draft.kind === 'gutenberg_post' ? withCitation.draft.postContent : ''

    expect(postContent).toContain('<a href="https://doi.org/10.1126/sciadv.adn5290">Science Advances</a>')
  })

  it('renders semantic strong emphasis in intro, paragraphs, lists and linked text', () => {
    const withEmphasis = authorGutenbergDraft({
      ...kungFuSpec,
      intro: [[{ text: 'La decisión importa.', strong: true }]],
      sections: [
        {
          heading: 'Con énfasis editorial',
          level: 2,
          blocks: [
            {
              kind: 'paragraph',
              text: [
                { text: 'Primero, ' },
                { text: 'la tesis', strong: true },
                { text: '. Después, ' },
                {
                  text: 'la evidencia',
                  href: 'https://doi.org/10.1126/sciadv.adn5290',
                  strong: true
                },
                { text: '.' }
              ]
            },
            {
              kind: 'list',
              items: [[{ text: 'Decisión.', strong: true }, { text: ' Una persona conserva la autoridad.' }]]
            }
          ]
        },
        ...kungFuSpec.sections.slice(1)
      ]
    })

    const postContent = withEmphasis.draft.kind === 'gutenberg_post' ? withEmphasis.draft.postContent : ''

    expect(postContent).toContain('<p><strong>La decisión importa.</strong></p>')
    expect(postContent).toContain('Primero, <strong>la tesis</strong>.')
    expect(postContent).toContain('<a href="https://doi.org/10.1126/sciadv.adn5290"><strong>la evidencia</strong></a>')
    expect(postContent).toContain('<li><strong>Decisión.</strong> Una persona conserva la autoridad.</li>')
  })

  it('rejects unsafe inline-link protocols', () => {
    expect(() =>
      authorGutenbergDraft({
        ...kungFuSpec,
        sections: [
          {
            heading: 'Con un enlace inseguro',
            level: 2,
            blocks: [
              {
                kind: 'paragraph',
                text: [{ text: 'No abrir', href: 'javascript:alert(1)' }]
              }
            ]
          }
        ]
      })
    ).toThrow('content_factory_article_link_protocol_invalid:javascript:')
  })

  it('renders a governed inline link in the closing CTA', () => {
    const withLinkedCta = authorGutenbergDraft({
      ...kungFuSpec,
      cta: {
        text: [
          { text: '¿Quieres aterrizarlo? ' },
          { text: 'Conversemos.', href: 'https://efeoncepro.com/contacto/?utm_source=editorial' }
        ]
      }
    })

    const postContent = withLinkedCta.draft.kind === 'gutenberg_post' ? withLinkedCta.draft.postContent : ''

    expect(postContent).toContain('<a href="https://efeoncepro.com/contacto/?utm_source=editorial">Conversemos.</a>')
  })

  it('rejects an empty spec', () => {
    expect(() => authorGutenbergDraft({ ...kungFuSpec, sections: [] })).toThrow(
      'content_factory_article_sections_required'
    )
  })
})
