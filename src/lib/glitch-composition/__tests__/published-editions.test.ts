import { describe, expect, it, vi } from 'vitest'

import {
  GLITCH_BLOG_CATEGORY_ID,
  GlitchPieceError,
  checkGlitchEditionNumber,
  fetchPublishedGlitchEditions,
  parseGlitchEditionTitle,
  summarizePublishedGlitchEditions
} from '..'

/**
 * Fixture: la categoría Glitch del blog tal como la devolvió la API pública el 2026-09-28
 * (`/wp-json/wp/v2/posts?categories=183&per_page=100&_fields=id,title,date,link`). Sin red en las pruebas.
 */
const POSTS = [
  { id: 251941, date: '2026-09-28T19:16:21', link: 'https://efeoncepro.com/glitch/glitch-flash-claude-sonnet-5-5/', title: { rendered: 'Glitch Flash: Sonnet 5.5 roza a Opus, a mitad de precio' } },
  {
    id: 251605,
    date: '2026-07-28T14:31:44',
    link: 'https://efeoncepro.com/glitch/glitch-17-modelo-commodity-control-escaso/',
    title: { rendered: 'Glitch #17: Agente rompe la jaula, la confianza reordena el frontier, la correa manda' }
  },
  { id: 251563, date: '2026-07-21T09:00:00', link: 'https://efeoncepro.com/glitch/glitch-costo-real-ia-tarea/', title: { rendered: 'Glitch #16: Open-weight que descargas, precio que miente, canal sin dueño' } },
  { id: 251336, date: '2026-07-14T09:00:00', link: 'https://efeoncepro.com/glitch/glitch-15-ia-abundante-barata-global/', title: { rendered: 'Glitch #15: Token barato, criterio caro, y las capas que no controlas.' } },
  { id: 251326, date: '2026-07-10T22:28:58', link: 'https://efeoncepro.com/glitch/gpt-5-6-y-chatgpt-work-openai/', title: { rendered: 'GPT-5.6 y ChatGPT Work: OpenAI ya no está lanzando modelos' } },
  { id: 251068, date: '2026-07-07T09:00:00', link: 'https://efeoncepro.com/glitch/glitch-14-ia-noticias-marketing/', title: { rendered: 'GLITCH #14: El modelo a centavos, el checkout en vivo, el acceso con dueño.' } },
  { id: 249766, date: '2026-03-02T20:40:43', link: 'https://efeoncepro.com/glitch/glitch-02-noticias-ia-marketing-2026-03-03/', title: { rendered: 'GLITCH #02: Tu semana en AI, marketing y tecnología &#8212; sin anestesia' } }
]

const jsonResponse = (body: unknown, init: { status?: number; totalPages?: number } = {}) =>
  new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { 'content-type': 'application/json', 'x-wp-totalpages': String(init.totalPages ?? 1) } })

const codeOf = async (fn: () => Promise<unknown>) => {
  try {
    await fn()
  } catch (error) {
    expect(error).toBeInstanceOf(GlitchPieceError)

    return (error as GlitchPieceError).code
  }

  return null
}

describe('parseGlitchEditionTitle', () => {
  it('lee el número de las ediciones semanales, en cualquier caja y con ceros a la izquierda', () => {
    expect(parseGlitchEditionTitle('Glitch #17: Agente rompe la jaula')).toBe(17)
    expect(parseGlitchEditionTitle('GLITCH #02: Tu semana en AI')).toBe(2)
    expect(parseGlitchEditionTitle('  glitch # 18 — la próxima')).toBe(18)
    expect(parseGlitchEditionTitle('Glitch &#035;19: con entidad')).toBe(19)
  })

  it('no cuenta el Flash ni otras notas de la categoría', () => {
    expect(parseGlitchEditionTitle('Glitch Flash: Sonnet 5.5 roza a Opus')).toBeNull()
    expect(parseGlitchEditionTitle('GPT-5.6 y ChatGPT Work')).toBeNull()
    expect(parseGlitchEditionTitle('Glitch #0: prueba')).toBeNull()
    expect(parseGlitchEditionTitle('Glitch #12345: número imposible')).toBeNull()
  })
})

describe('summarizePublishedGlitchEditions', () => {
  it('ordena por número, ignora el Flash y dice cuál es la próxima', () => {
    const summary = summarizePublishedGlitchEditions(POSTS)

    expect(summary.editions.map((e) => e.number)).toEqual([17, 16, 15, 14, 2])
    expect(summary.lastNumber).toBe(17)
    expect(summary.nextNumber).toBe(18)
    expect(summary.ignored.map((p) => p.postId)).toEqual([251941, 251326])
    expect(summary.duplicates).toEqual([])
    expect(summary.editions.at(-1)?.title).toBe('GLITCH #02: Tu semana en AI, marketing y tecnología — sin anestesia')
  })

  it('sin ediciones numeradas no inventa un número', () => {
    expect(summarizePublishedGlitchEditions([POSTS[0]])).toMatchObject({ lastNumber: null, nextNumber: null, editions: [] })
  })

  it('marca los números repetidos y falla ante un post con otra forma', () => {
    expect(summarizePublishedGlitchEditions([...POSTS, { ...POSTS[1], id: 1 }]).duplicates).toEqual([17])
    expect(() => summarizePublishedGlitchEditions([{ id: 'x' }])).toThrow(GlitchPieceError)
  })
})

describe('checkGlitchEditionNumber', () => {
  const published = summarizePublishedGlitchEditions(POSTS)

  it('la próxima (#18) pasa', () => {
    expect(checkGlitchEditionNumber(18, published)).toEqual({ status: 'ok', issue: null, warnings: [] })
  })

  it('un número ya publicado o menor es edition-number-already-published', () => {
    const repeated = checkGlitchEditionNumber(17, published)

    expect(repeated.status).toBe('already-published')
    expect(repeated.issue).toMatchObject({ code: 'edition-number-already-published', path: 'edition.number' })
    expect(repeated.issue?.message).toContain('glitch-17-modelo-commodity-control-escaso')
    expect(repeated.issue?.message).toContain('la próxima semanal es la #18')
    expect(checkGlitchEditionNumber(3, published).issue?.code).toBe('edition-number-already-published')
  })

  it('saltarse números sólo avisa; sin nada publicado, la primera pasa', () => {
    const gap = checkGlitchEditionNumber(20, published)

    expect(gap.status).toBe('gap')
    expect(gap.issue).toBeNull()
    expect(gap.warnings[0]).toContain('la próxima esperada, la #18')
    expect(checkGlitchEditionNumber(1, summarizePublishedGlitchEditions([]))).toMatchObject({ status: 'first', issue: null })
  })
})

describe('fetchPublishedGlitchEditions (fetch inyectado, sin red)', () => {
  it('consulta la categoría Glitch del blog y recorre todas las páginas', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const page = new URL(String(url)).searchParams.get('page')

      return jsonResponse(page === '1' ? POSTS.slice(0, 4) : POSTS.slice(4), { totalPages: 2 })
    })

    const summary = await fetchPublishedGlitchEditions({ fetchImpl: fetchImpl as unknown as typeof fetch })
    const first = new URL(String(fetchImpl.mock.calls[0][0]))

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(first.origin + first.pathname).toBe('https://efeoncepro.com/wp-json/wp/v2/posts')
    expect(first.searchParams.get('categories')).toBe(String(GLITCH_BLOG_CATEGORY_ID))
    expect(first.searchParams.get('_fields')).toBe('id,title,date,link')
    expect(summary).toMatchObject({ posts: POSTS.length, lastNumber: 17, nextNumber: 18 })
  })

  it('falla con published-editions-unavailable ante HTTP de error, cuerpo inesperado o sin respuesta', async () => {
    const as = (impl: () => Promise<Response>) => ({ fetchImpl: vi.fn(impl) as unknown as typeof fetch })

    expect(await codeOf(() => fetchPublishedGlitchEditions(as(async () => jsonResponse({ code: 'rest_error' }, { status: 503 }))))).toBe('published-editions-unavailable')
    expect(await codeOf(() => fetchPublishedGlitchEditions(as(async () => jsonResponse({ posts: [] }))))).toBe('published-editions-unavailable')
    expect(await codeOf(() => fetchPublishedGlitchEditions(as(async () => new Response('<html>', { status: 200 }))))).toBe('published-editions-unavailable')

    const timeout = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })

    expect(await codeOf(() => fetchPublishedGlitchEditions(as(async () => Promise.reject(timeout))))).toBe('published-editions-unavailable')
  })
})
