import { describe, expect, it } from 'vitest'

import { serializeGutenbergBlockAttributes } from '../gutenberg-blocks'
import {
  GLITCH_DROP_REDUNDANCY_THRESHOLD,
  buildGlitchDropContent,
  findGlitchDropRedundancy,
  renderGlitchDropBlock,
  splitGlitchDropContent
} from '../gutenberg-glitch-drop'
import { parseGutenbergBlockComments } from '../gutenberg-validator'

// Byte-exact block as WordPress serialized it in Glitch Flash 251941 (2026-09-28),
// taken from the pre-dedupe snapshot of post_content.
const REAL_251941_DROP = String.raw`<!-- wp:efeoncepro/glitch-drop {"content":"Durante mucho tiempo la regla fue sencilla: si la tarea importaba, ibas al modelo más grande. Sonnet 5.5 la rompe justo donde más duele, en el trabajo de agentes que escriben código y ejecutan tareas: ahí el modelo del medio no sólo alcanza al grande, lo pasa. Por la mitad del precio.\u003cbr\u003eLa pregunta ya no es «¿cuál es el mejor modelo?», sino «¿para qué tarea necesito de verdad el más caro?»."} /-->`

const REAL_251941_LINES = [
  'Durante mucho tiempo la regla fue sencilla: si la tarea importaba, ibas al modelo más grande. Sonnet 5.5 la rompe justo donde más duele, en el trabajo de agentes que escriben código y ejecutan tareas: ahí el modelo del medio no sólo alcanza al grande, lo pasa. Por la mitad del precio.',
  'La pregunta ya no es «¿cuál es el mejor modelo?», sino «¿para qué tarea necesito de verdad el más caro?».'
]

// The paragraph that followed the drop before the live QA removed the duplicate (251941).
const REDUNDANT_NEXT_PARAGRAPH = String.raw`<p>La pregunta cambia. Ya no es «¿cuál es el mejor modelo?», sino «¿para qué tarea necesito de verdad el más caro?». Es la misma conversación que abrimos con <a href="https://efeoncepro.com/glitch/gpt-5-6-y-chatgpt-work-openai/">GPT-5.6 y ChatGPT Work</a>: no se trata de elegir un modelo, sino de repartir el trabajo entre niveles de inteligencia.</p>`
const DEDUPED_NEXT_PARAGRAPH = String.raw`<p>Es la misma conversación que abrimos con <a href="https://efeoncepro.com/glitch/gpt-5-6-y-chatgpt-work-openai/">GPT-5.6 y ChatGPT Work</a>: no se trata de elegir un modelo, sino de repartir el trabajo entre niveles de inteligencia.</p>`

describe('serializeGutenbergBlockAttributes (WordPress serialize_block_attributes parity)', () => {
  it('escapes -- < > & and double quotes like WordPress and keeps slashes, accents and apostrophes literal', () => {
    expect(serializeGutenbergBlockAttributes({ content: `Tom & "Jerry" -- <br> / ñ 'ok'` })).toBe(
      String.raw`{"content":"Tom \u0026 \u0022Jerry\u0022 \u002d\u002d \u003cbr\u003e / ñ 'ok'"}`
    )
  })

  it('escapes Unicode line terminators like PHP json_encode', () => {
    expect(serializeGutenbergBlockAttributes({ content: 'a\u2028b\u2029c' })).toBe(String.raw`{"content":"a\u2028b\u2029c"}`)
  })
})

describe('renderGlitchDropBlock', () => {
  it('reproduces the real 251941 drop byte for byte', () => {
    expect(renderGlitchDropBlock(REAL_251941_LINES)).toBe(REAL_251941_DROP)
  })

  it('round-trips: render -> parse -> attrs.content equals the lines joined by <br>', () => {
    const [parsed] = parseGutenbergBlockComments(renderGlitchDropBlock(REAL_251941_LINES))

    expect(parsed).toMatchObject({ blockName: 'efeoncepro/glitch-drop', selfClosing: true, closing: false })
    expect(parsed.attrs).toEqual({ content: REAL_251941_LINES.join('<br>') })
    expect(splitGlitchDropContent(parsed.attrs.content as string)).toEqual(REAL_251941_LINES)

    // The real stored block parses to the same attribute value.
    const [real] = parseGutenbergBlockComments(REAL_251941_DROP)

    expect(real.attrs.content).toBe(parsed.attrs.content)
  })

  it('HTML-escapes text and lets the attribute serializer escape quotes and double dashes', () => {
    const block = renderGlitchDropBlock([`Tom & Jerry dicen "hola" -- y 5 < 7 > 3`, `Segunda línea, sin 'drama'.`])

    expect(block).toBe(
      String.raw`<!-- wp:efeoncepro/glitch-drop {"content":"Tom \u0026amp; Jerry dicen \u0022hola\u0022 \u002d\u002d y 5 \u0026lt; 7 \u0026gt; 3\u003cbr\u003eSegunda línea, sin 'drama'."} /-->`
    )

    const [parsed] = parseGutenbergBlockComments(block)

    expect(parsed.attrs.content).toBe(`Tom &amp; Jerry dicen "hola" -- y 5 &lt; 7 &gt; 3<br>Segunda línea, sin 'drama'.`)
    expect(splitGlitchDropContent(parsed.attrs.content as string)).toEqual([
      `Tom & Jerry dicen "hola" -- y 5 < 7 > 3`,
      `Segunda línea, sin 'drama'.`
    ])
  })

  it('trims each line', () => {
    expect(buildGlitchDropContent(['  Uno.  ', ' Dos. '])).toBe('Uno.<br>Dos.')
  })

  it.each([
    [[], 'content_factory_article_glitch_drop_lines_count_invalid'],
    [['1', '2', '3', '4', '5'], 'content_factory_article_glitch_drop_lines_count_invalid'],
    [['   '], 'content_factory_article_glitch_drop_line_required:0'],
    [['Ok.', 'Mira <a href="https://x.cl">esto</a>'], 'content_factory_article_glitch_drop_markup_not_allowed:1'],
    [['Un <strong>énfasis</strong>'], 'content_factory_article_glitch_drop_markup_not_allowed:0'],
    [['Lee https://efeoncepro.com/glitch/'], 'content_factory_article_glitch_drop_link_not_allowed:0'],
    [['Lee www.efeoncepro.com'], 'content_factory_article_glitch_drop_link_not_allowed:0'],
    [['Dos\nlíneas'], 'content_factory_article_glitch_drop_line_characters_invalid:0'],
    [['Barra \\ invertida'], 'content_factory_article_glitch_drop_line_characters_invalid:0']
  ])('rejects invalid lines %j', (lines, code) => {
    expect(() => renderGlitchDropBlock(lines as string[])).toThrow(code)
  })

  it('accepts a comparison written with spaced angle brackets as plain text', () => {
    expect(buildGlitchDropContent(['Si a < b, gana b.'])).toBe('Si a &lt; b, gana b.')
  })
})

describe('findGlitchDropRedundancy', () => {
  it('flags the real 251941 duplicate against the next paragraph', () => {
    const match = findGlitchDropRedundancy(REAL_251941_LINES, REDUNDANT_NEXT_PARAGRAPH.replace(/<[^>]+>/g, ' '))

    expect(match).not.toBeNull()
    expect(match?.similarity).toBeGreaterThanOrEqual(GLITCH_DROP_REDUNDANCY_THRESHOLD)
    expect(match?.unit).toBe(REAL_251941_LINES[1])
  })

  it('does not flag the corrected paragraph', () => {
    expect(findGlitchDropRedundancy(REAL_251941_LINES, DEDUPED_NEXT_PARAGRAPH.replace(/<[^>]+>/g, ' '))).toBeNull()
  })

  it('catches a repeated clause of 8+ words inside a longer sentence, ignoring accents and punctuation', () => {
    const match = findGlitchDropRedundancy(
      REAL_251941_LINES,
      'Y lo mas importante: el modelo del medio no solo alcanza al grande, lo pasa — dice el benchmark.'
    )

    expect(match).not.toBeNull()
  })

  it('ignores units shorter than four words', () => {
    expect(findGlitchDropRedundancy(['Por eso.', 'Nada más.'], 'Por eso. Nada más.')).toBeNull()
  })
})
