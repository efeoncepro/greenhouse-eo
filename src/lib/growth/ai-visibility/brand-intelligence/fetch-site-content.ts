import 'server-only'

/**
 * TASK-1288 Slice 4 — Growth AI Visibility · Brand Intelligence · readable site content.
 *
 * Fetches the READABLE text of a brand's homepage (+ a best-effort about page) so the
 * grounded read can understand what the brand does. The TASK-1266 site probe is TECHNICAL
 * (robots/JSON-LD/sitemap) and does NOT extract prose — this is the missing piece.
 *
 * Reuses the canonical SSRF-guarded `createProbeFetcher` (read-only GET, same-host,
 * User-Agent, timeout, byte cap). Reading a public site needs no consent (consent is for
 * SENDING). NEVER throws: returns null when nothing readable is available (honest degradation).
 */

import { createProbeFetcher, resolveSubjectSite } from '../probes/safe-fetch'

const MAX_CONTENT_CHARS = 6000
const ABOUT_PATHS = ['/about', '/about-us', '/nosotros', '/quienes-somos', '/sobre-nosotros']

/** Strip scripts/styles/markup → collapsed readable text. Bounded, defensive. */
export const htmlToReadableText = (html: string): string =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()

export interface SiteContentResult {
  /** Readable text, or null when the site could not be read. */
  content: string | null
  /** Paths actually read (provenance). */
  sources: string[]
}

/**
 * Fetch readable content from the brand site. Best-effort: homepage is required; an about
 * page is added when reachable. Returns `{ content: null }` honestly on any failure.
 */
export const fetchSiteContent = async (
  websiteUrl: string | null,
  deps: { fetchImpl?: typeof fetch } = {}
): Promise<SiteContentResult> => {
  const site = resolveSubjectSite(websiteUrl)

  if (!site) return { content: null, sources: [] }

  const fetcher = createProbeFetcher(site.baseUrl, deps)
  const sources: string[] = []
  const chunks: string[] = []

  const home = await fetcher('/', { timeoutMs: 8000 })

  if (home.ok && home.body) {
    const text = htmlToReadableText(home.body)

    if (text.length > 0) {
      chunks.push(text)
      sources.push('/')
    }
  }

  // Best-effort about page (first that responds with readable text). Bounded budget.
  for (const path of ABOUT_PATHS) {
    if (chunks.join(' ').length >= MAX_CONTENT_CHARS) break

    const about = await fetcher(path, { timeoutMs: 6000 })

    if (about.ok && about.body) {
      const text = htmlToReadableText(about.body)

      if (text.length > 80) {
        chunks.push(text)
        sources.push(path)
        break
      }
    }
  }

  if (chunks.length === 0) return { content: null, sources: [] }

  const content = chunks.join('\n\n').slice(0, MAX_CONTENT_CHARS)

  return { content, sources }
}
