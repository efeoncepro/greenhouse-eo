/**
 * TASK-1267 — Entity probe · Reddit / UGC presence (Slice 2).
 *
 * Read-only de la búsqueda pública de Reddit (`www.reddit.com/search.json`): ¿la marca
 * tiene presencia/menciones en Reddit? Reddit es una de las fuentes top de citas de los
 * answer engines (especialmente ChatGPT). UN solo request courtesy-UA (no scraping
 * agresivo, respeta ToS/rate-limit); ante 403/429/red → honest degradation.
 *
 * Open Question resuelta (spec §Open Questions): búsqueda pública acotada en vez de la API
 * OAuth oficial — no exige coordinar un secret de Reddit para shippear, y degrada honesto si
 * la búsqueda pública queda bloqueada. OAuth queda como follow-up si la quota lo exige.
 *
 * Desambiguación: la búsqueda por nombre es inherentemente ruidosa (homónimos). Se reporta el
 * conteo total de menciones + cuántas ENLAZAN el dominio del sujeto (señal desambiguada), y la
 * razón flaggea el riesgo de homónimo cuando hay menciones por nombre sin enlaces al dominio.
 *
 * Honest degradation:
 *  - Búsqueda bloqueada/falla (403/429/red/timeout) → `failed`, score null (NO 0: "no medible").
 *  - Búsqueda OK con 0 menciones → `succeeded` score 0 (gap MEDIDO: sin presencia UGC).
 *  - Menciones presentes → score por volumen (con nota de desambiguación).
 */

import { type Probe, type ProbeContext, type ProbeOutcome, NO_ENTITY_CONTEXT_OUTCOME } from '../contracts'
import { hostMatchesDomain, safeJsonParse } from './shared'

interface RedditChild {
  data?: { subreddit?: string; url?: string; permalink?: string; title?: string }
}

interface RedditSearchResponse {
  data?: { children?: RedditChild[] }
}

/** Bucket de score por volumen de menciones (presencia ≠ binario). */
const scoreForMentions = (mentions: number): number => {
  if (mentions === 0) return 0
  if (mentions <= 2) return 30
  if (mentions <= 9) return 60

  return 100
}

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  const entity = ctx.entity

  if (!entity) return NO_ENTITY_CONTEXT_OUTCOME

  const url =
    'https://www.reddit.com/search.json' +
    `?q=${encodeURIComponent(entity.brandName)}` +
    '&limit=25&sort=relevance&type=link&raw_json=1'

  const res = await entity.fetch(url)

  if (!res.ok) {
    return {
      status: 'failed',
      score: null,
      reason: 'No se pudo consultar la búsqueda pública de Reddit (posible rate-limit); señal no medible.',
      evidence: { status: res.status },
      errorCode: res.errorCode ?? 'http_error'
    }
  }

  const children = safeJsonParse<RedditSearchResponse>(res.body)?.data?.children ?? []
  const mentions = children.length

  if (mentions === 0) {
    return {
      status: 'succeeded',
      score: 0,
      reason: 'La marca no tiene menciones en la búsqueda pública de Reddit (sin presencia en una fuente top de citas IA).',
      evidence: { mentions: 0, domainLinkedMentions: 0, subreddits: [] }
    }
  }

  const domainLinkedMentions = children.filter(c => hostMatchesDomain(c.data?.url, entity.domain)).length
  const subreddits = [...new Set(children.map(c => c.data?.subreddit).filter((s): s is string => Boolean(s)))].slice(0, 5)

  const score = scoreForMentions(mentions)

  const homonymCaveat =
    domainLinkedMentions === 0
      ? ' Ninguna enlaza tu dominio: la atribución por nombre puede incluir homónimos.'
      : ` ${domainLinkedMentions} enlaza(n) tu dominio.`

  return {
    status: 'succeeded',
    score,
    reason: `${mentions} mención(es) de la marca en Reddit${subreddits.length ? ` (${subreddits.join(', ')})` : ''}.${homonymCaveat}`,
    evidence: { mentions, domainLinkedMentions, subreddits }
  }
}

export const redditUgcProbe: Probe = {
  kind: 'reddit_ugc',
  axis: 'entity',
  requiresHeadless: false,
  run
}
