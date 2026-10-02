/**
 * Numeración de Glitch contra lo PUBLICADO (decisión 2026-09-28, sesión autorizada por el operador).
 *
 * La fuente de verdad del número de la edición semanal es el registro de ediciones publicadas del blog
 * (`efeoncepro.com/glitch/`, categoría Glitch de WordPress, term 183): cada edición sale como un post titulado
 * «Glitch #N: …» (también «GLITCH #02: …»). El último número publicado dice cuál es la próxima; el sistema gráfico no
 * decide la serie. El Glitch Flash no lleva número y no cuenta (su título es «Glitch Flash: …»).
 *
 * - `parseGlitchEditionTitle` y `summarizePublishedGlitchEditions` son puras (los tests usan fixtures, sin red).
 * - `fetchPublishedGlitchEditions` consulta la API REST pública de WordPress (sólo posts publicados, sin credenciales)
 *   con timeout y paginación; si no responde, falla con `published-editions-unavailable` (nunca inventa un número).
 * - `checkGlitchEditionNumber` compara el número de un manifiesto con lo publicado: repetir uno ya publicado es
 *   `edition-number-already-published`; saltarse números es sólo un aviso.
 *
 * Consumidores: `pnpm glitch:editions` (imprime el último y el próximo) y `pnpm glitch:compose --check-published`.
 */

import { z } from 'zod'

import { GlitchPieceError, type GlitchIssue } from './types'

/** Categoría «Glitch» del blog de Efeonce (WordPress term 183; también su categoría primaria de Yoast). */
export const GLITCH_BLOG_CATEGORY_ID = 183

/** Endpoint público de posts de WordPress del sitio de Efeonce. */
export const GLITCH_PUBLISHED_EDITIONS_URL = 'https://efeoncepro.com/wp-json/wp/v2/posts'

const DEFAULT_TIMEOUT_MS = 10_000
const PER_PAGE = 100
const MAX_PAGES = 20

/** «Glitch #17: …», «GLITCH #02: …». Un Flash («Glitch Flash: …») u otro post de la categoría no calza. */
const EDITION_TITLE = /^\s*glitch\s*#\s*(\d{1,4})(?!\d)/i

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', num: '#' }

/** WordPress entrega `title.rendered` con entidades HTML (`&#8211;`, `&#035;`, `&amp;`). */
const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1] === 'x' || entity[1] === 'X' ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10)

      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
    }

    return NAMED_ENTITIES[entity.toLowerCase()] ?? whole
  })

/** El número de edición de un título del blog, o `null` si el post no es una edición semanal numerada. */
export const parseGlitchEditionTitle = (title: string): number | null => {
  const match = EDITION_TITLE.exec(decodeEntities(title).replace(/<[^>]*>/g, ''))

  if (!match) return null

  const number = Number.parseInt(match[1], 10)

  return number > 0 ? number : null
}

/** Lo que devuelve la API con `_fields=id,title,date,link`. */
const wpPostSchema = z
  .object({
    id: z.number().int(),
    date: z.string(),
    link: z.string(),
    title: z.object({ rendered: z.string() }).passthrough()
  })
  .passthrough()

export interface GlitchPublishedEdition {
  number: number
  postId: number
  /** Título ya decodificado. */
  title: string
  /** Fecha del post (hora del sitio, sin zona). */
  date: string
  link: string
}

export interface GlitchPublishedEditions {
  /** URL consultada (primera página), o `fixture` en pruebas. */
  source: string
  /** Posts de la categoría leídos. */
  posts: number
  /** Ediciones numeradas, de la más reciente (número mayor) a la más antigua. */
  editions: GlitchPublishedEdition[]
  /** Posts de la categoría que no son una edición numerada (el Flash, notas sueltas). */
  ignored: { postId: number; title: string }[]
  /** Números que aparecen en más de un post publicado (un error del blog que alguien debe mirar). */
  duplicates: number[]
  /** El último número publicado, o `null` si todavía no hay ninguno. */
  lastNumber: number | null
  /** La próxima edición semanal esperada (`lastNumber + 1`), o `null` si no hay ninguna publicada. */
  nextNumber: number | null
}

const unavailable = (message: string, detail?: string): GlitchPieceError =>
  new GlitchPieceError(message, 'published-editions-unavailable', detail ? [{ code: 'published-editions-unavailable', message: detail }] : [])

/** Resume los posts de la categoría Glitch en ediciones publicadas. Pura; falla si la forma de un post no es la de WordPress. */
export const summarizePublishedGlitchEditions = (posts: readonly unknown[], source = 'fixture'): GlitchPublishedEditions => {
  const editions: GlitchPublishedEdition[] = []
  const ignored: GlitchPublishedEditions['ignored'] = []

  posts.forEach((raw, i) => {
    const parsed = wpPostSchema.safeParse(raw)

    if (!parsed.success) throw unavailable('La API del blog devolvió un post con una forma inesperada: no se puede leer la numeración.', `post [${i}]: ${parsed.error.issues[0]?.message ?? 'forma inválida'}`)

    const post = parsed.data
    const title = decodeEntities(post.title.rendered).trim()
    const number = parseGlitchEditionTitle(post.title.rendered)

    if (number === null) ignored.push({ postId: post.id, title })
    else editions.push({ number, postId: post.id, title, date: post.date, link: post.link })
  })

  editions.sort((a, b) => b.number - a.number || b.date.localeCompare(a.date))

  const counts = new Map<number, number>()

  for (const e of editions) counts.set(e.number, (counts.get(e.number) ?? 0) + 1)

  const lastNumber = editions[0]?.number ?? null

  return {
    source,
    posts: posts.length,
    editions,
    ignored,
    duplicates: [...counts].filter(([, n]) => n > 1).map(([number]) => number).sort((a, b) => b - a),
    lastNumber,
    nextNumber: lastNumber === null ? null : lastNumber + 1
  }
}

export interface FetchPublishedGlitchEditionsOptions {
  /** Inyectable en pruebas; por defecto el `fetch` global. */
  fetchImpl?: typeof fetch
  /** Tiempo máximo por página (ms). */
  timeoutMs?: number
  baseUrl?: string
  categoryId?: number
}

const pageUrl = (baseUrl: string, categoryId: number, page: number): string => {
  const url = new URL(baseUrl)

  url.searchParams.set('categories', String(categoryId))
  url.searchParams.set('per_page', String(PER_PAGE))
  url.searchParams.set('page', String(page))
  url.searchParams.set('_fields', 'id,title,date,link')

  return url.toString()
}

/**
 * Lee del blog las ediciones de Glitch publicadas (API REST pública de WordPress, sólo posts publicados). Recorre todas
 * las páginas (`X-WP-TotalPages`). Sin respuesta, con HTTP de error o con un cuerpo que no es la lista de posts, falla con
 * `published-editions-unavailable`.
 */
export const fetchPublishedGlitchEditions = async (options: FetchPublishedGlitchEditionsOptions = {}): Promise<GlitchPublishedEditions> => {
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const baseUrl = options.baseUrl ?? GLITCH_PUBLISHED_EDITIONS_URL
  const categoryId = options.categoryId ?? GLITCH_BLOG_CATEGORY_ID
  const posts: unknown[] = []
  let totalPages = 1

  for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
    const url = pageUrl(baseUrl, categoryId, page)
    let response: Response

    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) })
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')

      throw unavailable(
        timedOut ? `El blog no respondió en ${timeoutMs} ms: no se pudo leer la numeración publicada.` : 'No se pudo consultar el blog: no se pudo leer la numeración publicada.',
        `${url} · ${error instanceof Error ? error.message : String(error)}`
      )
    }

    if (!response.ok) throw unavailable(`El blog respondió HTTP ${response.status}: no se pudo leer la numeración publicada.`, url)

    let body: unknown

    try {
      body = await response.json()
    } catch {
      throw unavailable('El blog no devolvió JSON: no se pudo leer la numeración publicada.', url)
    }

    if (!Array.isArray(body)) throw unavailable('El blog no devolvió una lista de posts: no se pudo leer la numeración publicada.', url)

    posts.push(...body)

    const declared = Number.parseInt(response.headers.get('x-wp-totalpages') ?? '1', 10)

    totalPages = Number.isFinite(declared) && declared > 0 ? declared : 1
  }

  return summarizePublishedGlitchEditions(posts, pageUrl(baseUrl, categoryId, 1))
}

export interface GlitchEditionNumberCheck {
  status: 'ok' | 'already-published' | 'gap' | 'first'
  /** Bloqueante cuando `status === 'already-published'`. */
  issue: GlitchIssue | null
  /** Aviso no bloqueante (salto de números, duplicados en el blog). */
  warnings: string[]
}

/**
 * Compara el número de una edición semanal con lo publicado. Un número ya publicado (o menor que el último) es
 * `edition-number-already-published`; uno que salta números sólo avisa (lo decide el editor, no el composer).
 */
export const checkGlitchEditionNumber = (number: number, published: GlitchPublishedEditions): GlitchEditionNumberCheck => {
  const warnings = published.duplicates.length > 0 ? [`El blog tiene números repetidos: ${published.duplicates.map((n) => `#${n}`).join(', ')}.`] : []

  if (published.lastNumber === null) return { status: 'first', issue: null, warnings }

  const last = published.lastNumber

  if (number <= last) {
    const same = published.editions.find((e) => e.number === number)

    return {
      status: 'already-published',
      issue: {
        code: 'edition-number-already-published',
        path: 'edition.number',
        message: same
          ? `el #${number} ya está publicado («${same.title}», ${same.link}); la próxima semanal es la #${last + 1}`
          : `el #${number} es menor que la última edición publicada (#${last}); la próxima semanal es la #${last + 1}`
      },
      warnings
    }
  }

  if (number > last + 1) {
    return { status: 'gap', issue: null, warnings: [...warnings, `El #${number} salta números: la última publicada es la #${last} y la próxima esperada, la #${last + 1}.`] }
  }

  return { status: 'ok', issue: null, warnings }
}
