/**
 * TASK-1266 — Structural probe · sitemap.xml (Slice 2).
 *
 * Read-only GET de /sitemap.xml. Un sitemap válido ayuda a los crawlers (IA incluidos) a
 * descubrir el contenido completo. Ausencia MEDIDA (404) → score 0; presente pero no-XML →
 * señal parcial; fetch fallido (red/timeout) → null.
 */

import { type Probe, type ProbeContext, type ProbeOutcome } from '../contracts'

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  const res = await ctx.fetcher('/sitemap.xml', { accept: 'application/xml,text/xml' })

  if (res.status === 404) {
    return {
      status: 'succeeded',
      score: 0,
      reason: 'Sin sitemap.xml: los crawlers carecen de un índice de descubrimiento.',
      evidence: { status: 404, present: false }
    }
  }

  if (!res.ok) {
    return {
      status: 'failed',
      score: null,
      reason: 'No se pudo verificar sitemap.xml (sin respuesta utilizable).',
      evidence: { status: res.status },
      errorCode: res.errorCode ?? 'http_error'
    }
  }

  const isIndex = /<sitemapindex\b/i.test(res.body)
  const isUrlset = /<urlset\b/i.test(res.body)

  if (!isIndex && !isUrlset) {
    return {
      status: 'succeeded',
      score: 40,
      reason: 'Existe /sitemap.xml pero su contenido no parece un sitemap XML válido.',
      evidence: { status: res.status, present: true, validXml: false }
    }
  }

  const urlCount = (res.body.match(/<loc\b/gi) ?? []).length

  return {
    status: 'succeeded',
    score: 100,
    reason: isIndex
      ? 'sitemap index presente (descubrimiento de contenido habilitado).'
      : `sitemap.xml válido con ${urlCount} URLs.`,
    evidence: { status: res.status, present: true, validXml: true, isIndex, urlCount }
  }
}

export const sitemapProbe: Probe = {
  kind: 'sitemap',
  axis: 'structural',
  requiresHeadless: false,
  run
}
