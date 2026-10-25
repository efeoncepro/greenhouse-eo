import { describe, expect, it } from 'vitest'

import { authorGutenbergDraft, type GutenbergArticleSpec } from '../article-authoring'
import type { ContentFactoryGeneratedDraft } from '../contracts'
import { getGutenbergCapabilityForBlock } from '../gutenberg-capability-registry'
import { listAllowedGeneratedGutenbergBlocks, validateGeneratedGutenbergDraft } from '../gutenberg-validator'

const SAMPLE = [
  'function esRutValido(valor) {',
  "  const rut = String(valor).toUpperCase().replace(/[^0-9K]/g, '')",
  '  return rut.length > 1 && a < b && c > d && x & y',
  '}'
].join('\n')

const spec = (code: string): GutenbergArticleSpec => ({
  title: 'Formato del RUT chileno',
  excerpt: 'Cómo se escribe un RUT, cómo se calcula su dígito verificador y cómo validarlo.',
  seo: { title: 'Formato del RUT %%sep%% %%sitename%%', description: 'Cómo se escribe y se valida un RUT chileno.' },
  intro: ['El RUT tiene un cuerpo y un dígito verificador.', 'Aquí está cómo validarlo.'],
  sections: [
    { heading: '¿Cuál es el formato del RUT?', level: 2, blocks: [{ kind: 'paragraph', text: 'Cuerpo, guion y dígito.' }, { kind: 'list', items: ['Con puntos.', 'Sin puntos.'] }] },
    { heading: '¿Cómo validarlo con JavaScript?', level: 2, blocks: [{ kind: 'paragraph', text: 'Copia esta función.' }, { kind: 'code', code }] },
    { heading: '¿Cómo validarlo en HubSpot?', level: 2, blocks: [{ kind: 'paragraph', text: 'Depende del editor de formularios.' }] }
  ]
})

const content = (draft: ContentFactoryGeneratedDraft) => {
  if (draft.draft.kind !== 'gutenberg_post') throw new Error('unexpected draft kind')

  return draft.draft.postContent
}

describe('code block (core/code)', () => {
  it('emits a core/code block escaped like the block editor, keeping newlines', () => {
    const html = content(authorGutenbergDraft(spec(SAMPLE)))

    expect(html).toContain('<!-- wp:code -->\n<pre class="wp-block-code"><code>function esRutValido(valor) {\n')
    expect(html).toContain(".replace(/&#91;^0-9K]/g, '')")
    expect(html).toContain('a &lt; b &amp;&amp; c &gt; d &amp;&amp; x &amp; y')
    expect(html).toContain('}</code></pre>\n<!-- /wp:code -->')
    expect(html).not.toContain('[^0-9K]')
  })

  it('normalizes CRLF to LF', () => {
    const html = content(authorGutenbergDraft(spec('a\r\nb\rc')))

    expect(html).toContain('<code>a\nb\nc</code>')
  })

  it('rejects an empty sample', () => {
    expect(() => authorGutenbergDraft(spec('   '))).toThrow('content_factory_article_code_required')
  })

  it('is allowed by the validator, has a capability entry and validates without block findings', () => {
    expect(listAllowedGeneratedGutenbergBlocks()).toContain('core/code')
    expect(getGutenbergCapabilityForBlock('core/code')?.semanticKind).toBe('editorial_code')

    const validation = validateGeneratedGutenbergDraft(authorGutenbergDraft(spec(SAMPLE)))

    expect(validation.status).toBe('pass')
    expect(JSON.stringify(validation.findings)).not.toContain('core/code')
    expect(validation.summary?.uniqueBlocks).toContain('core/code')
  })
})
