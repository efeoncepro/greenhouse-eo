import { describe, expect, it } from 'vitest'

import { authorGutenbergDraft, type GutenbergArticleBlock, type GutenbergArticleSpec } from '../article-authoring'
import type { ContentFactoryGeneratedDraft } from '../contracts'
import { getGutenbergCapabilityForBlock } from '../gutenberg-capability-registry'
import { EFEONCE_GUTENBERG_BLOCK_PATTERN_ENTRIES } from '../gutenberg-pattern-catalog'
import { listAllowedGeneratedGutenbergBlocks, validateGeneratedGutenbergDraft } from '../gutenberg-validator'

const DROP_LINES = [
  'Durante mucho tiempo la regla fue sencilla: si la tarea importaba, ibas al modelo más grande.',
  'La pregunta ya no es «¿cuál es el mejor modelo?», sino «¿para qué tarea necesito de verdad el más caro?».'
]

const specWith = (blocks: GutenbergArticleBlock[], extra: Partial<GutenbergArticleSpec> = {}): GutenbergArticleSpec => ({
  title: 'Sonnet 5.5: el modelo del medio dejó de ser el plan B',
  excerpt: 'Anthropic lanzó Sonnet 5.5 y cambió la regla de elegir siempre el modelo más grande.',
  seo: {
    title: 'Sonnet 5.5 y el modelo del medio %%sep%% %%sitename%%',
    description: 'Qué anunció Anthropic con Sonnet 5.5, qué cambia en costos y cómo repartir tareas entre niveles de modelo.'
  },
  intro: [
    'Anthropic presentó Sonnet 5.5, la nueva versión de su modelo intermedio, con mejoras claras en trabajo agéntico.',
    'Esta edición de Glitch Flash resume el anuncio y lo que significa para equipos que operan con agentes.'
  ],
  sections: [
    {
      heading: 'Qué anunció Anthropic',
      level: 2,
      blocks: [
        { kind: 'paragraph', text: 'Sonnet 5.5 está disponible en las apps de Claude, en la API y en las nubes principales.' },
        { kind: 'list', items: ['Mejor rendimiento en tareas de código.', 'Precio igual al de la versión anterior.'] }
      ]
    },
    {
      heading: 'El modelo del medio dejó de ser el plan B',
      level: 2,
      blocks
    },
    {
      heading: 'Lo que cambia para tu equipo',
      level: 2,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Conviene revisar qué tareas corren hoy en el modelo más caro y medir si el intermedio las resuelve igual.'
        }
      ]
    }
  ],
  ...extra
})

const gutenberg = (draft: ContentFactoryGeneratedDraft) => {
  if (draft.draft.kind !== 'gutenberg_post') throw new Error('unexpected draft kind')

  return draft.draft
}

const RELATED_PARAGRAPH: GutenbergArticleBlock = {
  kind: 'paragraph',
  text: [
    { text: 'Es la misma conversación que abrimos con ' },
    { text: 'GPT-5.6 y ChatGPT Work', href: 'https://efeoncepro.com/glitch/gpt-5-6-y-chatgpt-work-openai/' },
    { text: ': no se trata de elegir un modelo, sino de repartir el trabajo entre niveles de inteligencia.' }
  ]
}

describe('authorGutenbergDraft — glitchDrop', () => {
  it('emits the dynamic block in place and the draft validates with pass', () => {
    const draft = authorGutenbergDraft(specWith([{ kind: 'glitchDrop', lines: DROP_LINES }, RELATED_PARAGRAPH]))
    const validation = validateGeneratedGutenbergDraft(draft)

    expect(gutenberg(draft).postContent).toContain(
      String.raw`<!-- wp:efeoncepro/glitch-drop {"content":"Durante mucho tiempo la regla fue sencilla: si la tarea importaba, ibas al modelo más grande.\u003cbr\u003eLa pregunta ya no es «¿cuál es el mejor modelo?», sino «¿para qué tarea necesito de verdad el más caro?»."} /-->`
    )
    expect(gutenberg(draft).observedBlocks).toContain('efeoncepro/glitch-drop')
    expect(validation.findings.filter(finding => finding.severity !== 'info')).toEqual([])
    expect(validation.status).toBe('pass')
  })

  it('warns glitch_drop_redundant_with_neighbor when the next paragraph repeats a drop line (251941 case)', () => {
    const draft = authorGutenbergDraft(
      specWith([
        { kind: 'glitchDrop', lines: DROP_LINES },
        {
          kind: 'paragraph',
          text: 'La pregunta cambia. Ya no es «¿cuál es el mejor modelo?», sino «¿para qué tarea necesito de verdad el más caro?». Es la misma conversación de siempre.'
        }
      ])
    )

    const validation = validateGeneratedGutenbergDraft(draft)

    expect(validation.status).toBe('warning')
    expect(validation.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'glitch_drop_redundant_with_neighbor', severity: 'warning' })
      ])
    )
  })

  it('also checks the previous paragraph, skipping the section heading in between', () => {
    const draft = authorGutenbergDraft(
      specWith([
        { kind: 'paragraph', text: 'Durante mucho tiempo la regla fue sencilla: si la tarea importaba, ibas al modelo más grande.' },
        { kind: 'glitchDrop', lines: DROP_LINES }
      ])
    )

    expect(validateGeneratedGutenbergDraft(draft).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'glitch_drop_redundant_with_neighbor',
          message: expect.stringContaining('previous core/paragraph')
        })
      ])
    )
  })

  it('rejects links and markup before any markup is assembled', () => {
    expect(() => authorGutenbergDraft(specWith([{ kind: 'glitchDrop', lines: ['Lee <a href="https://x.cl">esto</a>.'] }]))).toThrow(
      'content_factory_article_glitch_drop_markup_not_allowed:0'
    )
    expect(() => authorGutenbergDraft(specWith([{ kind: 'glitchDrop', lines: [] }]))).toThrow(
      'content_factory_article_glitch_drop_lines_count_invalid'
    )
  })
})

describe('authorGutenbergDraft — embed caption, table stripes, buttons', () => {
  it('renders an embed caption as a real figcaption inside the embed figure', () => {
    const draft = authorGutenbergDraft(
      specWith([
        {
          kind: 'embed',
          provider: 'youtube',
          url: 'https://www.youtube.com/watch?v=abc123&t=10s',
          caption: [{ text: 'Fuente: ' }, { text: 'Anthropic', href: 'https://www.anthropic.com/news' }]
        },
        RELATED_PARAGRAPH
      ])
    )

    expect(gutenberg(draft).postContent).toContain(
      [
        String.raw`<!-- wp:embed {"url":"https://www.youtube.com/watch?v=abc123\u0026t=10s","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->`,
        '<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">https://www.youtube.com/watch?v=abc123&amp;t=10s</div><figcaption class="wp-element-caption">Fuente: <a href="https://www.anthropic.com/news">Anthropic</a></figcaption></figure>',
        '<!-- /wp:embed -->'
      ].join('\n')
    )
    expect(validateGeneratedGutenbergDraft(draft).status).toBe('pass')
  })

  it('keeps the uncaptioned embed markup unchanged', () => {
    const draft = authorGutenbergDraft(
      specWith([{ kind: 'embed', provider: 'youtube', url: 'https://www.youtube.com/watch?v=VIDEO_ID' }, RELATED_PARAGRAPH])
    )

    expect(gutenberg(draft).postContent).toContain(
      [
        '<!-- wp:embed {"url":"https://www.youtube.com/watch?v=VIDEO_ID","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->',
        '<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">https://www.youtube.com/watch?v=VIDEO_ID</div></figure>',
        '<!-- /wp:embed -->'
      ].join('\n')
    )
  })

  it.each(['http://www.youtube.com/watch?v=x', 'https://vimeo.com/123', 'javascript:alert(1)', 'no es url'])(
    'rejects embed URL %s',
    url => {
      expect(() => authorGutenbergDraft(specWith([{ kind: 'embed', provider: 'youtube', url }]))).toThrow(
        'content_factory_article_embed_url_invalid'
      )
    }
  )

  it('renders the core stripes table style on the comment and the figure', () => {
    const draft = authorGutenbergDraft(
      specWith([
        {
          kind: 'table',
          style: 'stripes',
          headers: ['Modelo', 'Precio relativo'],
          rows: [
            ['Sonnet 5.5', 'Mitad'],
            ['Opus', 'Base']
          ],
          caption: 'Fuente: anuncio de Anthropic.'
        },
        RELATED_PARAGRAPH
      ])
    )

    expect(gutenberg(draft).postContent).toContain('<!-- wp:table {"className":"is-style-stripes"} -->\n<figure class="wp-block-table is-style-stripes"><table>')
    expect(validateGeneratedGutenbergDraft(draft).status).toBe('pass')
  })

  it('rejects table styles that core does not register', () => {
    expect(() =>
      authorGutenbergDraft(
        specWith([{ kind: 'table', headers: ['A'], rows: [['1']], style: 'zebra' as unknown as 'stripes' }])
      )
    ).toThrow('content_factory_article_table_style_invalid:zebra')
  })

  it('renders governed buttons exactly like the editor stores them (fill = default, outline = core style)', () => {
    const draft = authorGutenbergDraft(
      specWith([
        RELATED_PARAGRAPH,
        {
          kind: 'buttons',
          items: [
            { text: 'Suscríbete a Glitch', href: 'https://efeoncepro.com/glitch/?utm_source=blog&utm_medium=cta' },
            { text: 'Escríbenos', href: 'mailto:hola@efeoncepro.com', variant: 'outline' }
          ]
        }
      ])
    )

    expect(gutenberg(draft).postContent).toContain(
      [
        '<!-- wp:buttons -->',
        '<div class="wp-block-buttons"><!-- wp:button -->',
        '<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://efeoncepro.com/glitch/?utm_source=blog&amp;utm_medium=cta">Suscríbete a Glitch</a></div>',
        '<!-- /wp:button -->',
        '',
        '<!-- wp:button {"className":"is-style-outline"} -->',
        '<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="mailto:hola@efeoncepro.com">Escríbenos</a></div>',
        '<!-- /wp:button --></div>',
        '<!-- /wp:buttons -->'
      ].join('\n')
    )
    expect(gutenberg(draft).observedBlocks).toEqual(expect.arrayContaining(['core/buttons', 'core/button']))

    const validation = validateGeneratedGutenbergDraft(draft)

    expect(validation.findings.filter(finding => finding.severity !== 'info')).toEqual([])
    expect(validation.status).toBe('pass')
  })

  it.each([
    [{ kind: 'buttons', items: [] }, 'content_factory_article_buttons_count_invalid'],
    [
      {
        kind: 'buttons',
        items: [1, 2, 3, 4].map(n => ({ text: `B${n}`, href: 'https://efeoncepro.com/' }))
      },
      'content_factory_article_buttons_count_invalid'
    ],
    [{ kind: 'buttons', items: [{ text: 'X', href: 'javascript:alert(1)' }] }, 'content_factory_article_button_href_protocol_invalid:0'],
    [{ kind: 'buttons', items: [{ text: 'X', href: 'ftp://efeoncepro.com/' }] }, 'content_factory_article_button_href_protocol_invalid:0'],
    [{ kind: 'buttons', items: [{ text: 'X', href: '/relativo' }] }, 'content_factory_article_button_href_invalid:0'],
    [{ kind: 'buttons', items: [{ text: ' ', href: 'https://efeoncepro.com/' }] }, 'content_factory_article_button_text_required:0'],
    [{ kind: 'buttons', items: [{ text: '<b>X</b>', href: 'https://efeoncepro.com/' }] }, 'content_factory_article_button_markup_not_allowed:0'],
    [
      { kind: 'buttons', items: [{ text: 'X', href: 'https://efeoncepro.com/', variant: 'ghost' }] },
      'content_factory_article_button_variant_invalid:0:ghost'
    ]
  ])('rejects ungoverned buttons %#', (block, code) => {
    expect(() => authorGutenbergDraft(specWith([block as unknown as GutenbergArticleBlock]))).toThrow(code)
  })
})

describe('authorGutenbergDraft — full spec with every new kind', () => {
  it('assembles and validates a Glitch-style draft with glitchDrop, captioned embed, striped table and buttons', () => {
    const draft = authorGutenbergDraft(
      specWith(
        [
          { kind: 'glitchDrop', lines: DROP_LINES },
          RELATED_PARAGRAPH,
          {
            kind: 'embed',
            provider: 'youtube',
            url: 'https://www.youtube.com/watch?v=VIDEO_ID',
            caption: [{ text: 'Fuente: ' }, { text: 'Anthropic', href: 'https://www.anthropic.com/news' }]
          },
          {
            kind: 'table',
            style: 'stripes',
            headers: ['Modelo', 'Uso recomendado'],
            rows: [['Sonnet 5.5', 'Agentes y código'], ['Opus', 'Razonamiento extremo']]
          },
          { kind: 'buttons', items: [{ text: 'Suscríbete a Glitch', href: 'https://efeoncepro.com/glitch/' }] }
        ],
        { cta: { text: 'Cada semana, Glitch traduce el ruido de la IA a decisiones de negocio.' } }
      )
    )

    const validation = validateGeneratedGutenbergDraft(draft)

    expect(validation.status).toBe('pass')
    expect(validation.summary?.uniqueBlocks).toEqual(
      expect.arrayContaining(['efeoncepro/glitch-drop', 'core/embed', 'core/table', 'core/buttons', 'core/button'])
    )
  })
})

// Hand-authored markup appended to a valid generated draft: exercises the validator
// on shapes the spec can never emit (refresh drafts of legacy posts, manual edits).
const handDraft = (postContent: string, observedBlocks: string[]): ContentFactoryGeneratedDraft => {
  const base = authorGutenbergDraft(specWith([RELATED_PARAGRAPH]))
  const body = gutenberg(base)

  return {
    ...base,
    draft: {
      kind: 'gutenberg_post',
      postContent: `${body.postContent}\n\n${postContent}`,
      observedBlocks: [...body.observedBlocks, ...observedBlocks]
    }
  }
}

describe('validateGeneratedGutenbergDraft — governed glitch-drop and buttons', () => {
  it('allows efeoncepro/glitch-drop in the governed allowlist', () => {
    expect(listAllowedGeneratedGutenbergBlocks()).toContain('efeoncepro/glitch-drop')
  })

  it.each([
    [String.raw`<!-- wp:efeoncepro/glitch-drop {"content":"Mira \u003ca href=\u0022https://x.cl\u0022\u003eesto\u003c/a\u003e"} /-->`, 'glitch_drop_link_not_allowed'],
    [String.raw`<!-- wp:efeoncepro/glitch-drop {"content":"Un \u003cstrong\u003eénfasis\u003c/strong\u003e"} /-->`, 'glitch_drop_html_not_allowed'],
    [String.raw`<!-- wp:efeoncepro/glitch-drop {"content":""} /-->`, 'glitch_drop_content_missing'],
    [String.raw`<!-- wp:efeoncepro/glitch-drop {"content":"Texto.","tone":"risk"} /-->`, 'glitch_drop_attrs_unsupported'],
    [
      String.raw`<!-- wp:efeoncepro/glitch-drop {"content":"Texto."} -->` + '\n<aside>Texto.</aside>\n<!-- /wp:efeoncepro/glitch-drop -->',
      'glitch_drop_not_self_closing'
    ]
  ])('blocks ungoverned glitch-drop %#', (markup, code) => {
    const validation = validateGeneratedGutenbergDraft(handDraft(markup, ['efeoncepro/glitch-drop']))

    expect(validation.status).toBe('block')
    expect(validation.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code, severity: 'block' })]))
    expect(validation.findings).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unsupported_gutenberg_block' })])
    )
  })

  it('warns on more than four lines', () => {
    const validation = validateGeneratedGutenbergDraft(
      handDraft(String.raw`<!-- wp:efeoncepro/glitch-drop {"content":"Uno.\u003cbr\u003eDos.\u003cbr\u003eTres.\u003cbr\u003eCuatro.\u003cbr\u003eCinco."} /-->`, [
        'efeoncepro/glitch-drop'
      ])
    )

    expect(validation.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'glitch_drop_too_many_lines', severity: 'warning' })])
    )
  })

  it('warns on literal colors, unregistered classes and ungoverned destinations in hand-authored buttons', () => {
    const validation = validateGeneratedGutenbergDraft(
      handDraft(
        [
          '<!-- wp:buttons {"className":"is-style-fill_content"} -->',
          '<div class="wp-block-buttons is-style-fill_content"><!-- wp:button {"backgroundColor":"brand-color"} -->',
          '<div class="wp-block-button"><a class="wp-block-button__link has-brand-color-background-color wp-element-button" href="#contacto">Contacto</a></div>',
          '<!-- /wp:button --></div>',
          '<!-- /wp:buttons -->'
        ].join('\n'),
        ['core/buttons', 'core/button']
      )
    )

    expect(validation.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'button_style_not_governed', severity: 'warning' }),
        expect.objectContaining({ code: 'button_link_not_governed', severity: 'warning' })
      ])
    )
  })
})

describe('registry and catalog know the new block types', () => {
  it('registers glitch-drop and table capabilities', () => {
    expect(getGutenbergCapabilityForBlock('efeoncepro/glitch-drop')).toMatchObject({
      semanticKind: 'editorial_aside',
      semanticOperations: ['refresh_editorial_aside'],
      compilesTo: ['update_attrs']
    })
    expect(getGutenbergCapabilityForBlock('core/table')).toMatchObject({
      semanticKind: 'editorial_table',
      semanticOperations: ['refresh_table_cells']
    })
  })

  it('catalogs glitch-drop, table and buttons with examples', () => {
    const byName = new Map(EFEONCE_GUTENBERG_BLOCK_PATTERN_ENTRIES.map(entry => [entry.blockName, entry]))

    expect(byName.get('efeoncepro/glitch-drop')).toMatchObject({ role: 'editorial_aside', generationPolicy: 'allowed' })
    expect(byName.get('efeoncepro/glitch-drop')?.example).toMatch(/^<!-- wp:efeoncepro\/glitch-drop \{"content":".+"\} \/-->$/)
    expect(byName.get('core/table')?.example).toContain('is-style-stripes')
    expect(byName.get('core/buttons')?.example).toContain('is-style-outline')
  })
})
