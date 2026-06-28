/**
 * TASK-1266 — Structural probe · JSON-LD / schema.org structured data (Slice 2).
 *
 * Read-only GET del HTML de la home + parseo estático de `<script type=ld+json>`. La
 * ausencia de structured data es causa estructural de baja `entity_clarity`: los motores
 * no entienden quién es la marca. Ausencia MEDIDA → score 0 (gap real); HTML no accesible
 * (red/timeout/no-200) → null (no medido).
 */

import { type Probe, type ProbeContext, type ProbeOutcome } from '../contracts'
import { extractJsonLdBlocks, flattenJsonLdNodes, jsonLdTypes } from '../html'

/** Tipos de entidad de marca de mayor señal AEO. */
const ENTITY_TYPES = new Set(['organization', 'corporation', 'localbusiness', 'professionalservice', 'person'])
const SITE_TYPES = new Set(['website', 'webpage'])

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  const res = await ctx.fetcher('/')

  if (!res.ok) {
    return {
      status: 'failed',
      score: null,
      reason: 'No se pudo leer el HTML de la home para evaluar structured data.',
      evidence: { status: res.status },
      errorCode: res.errorCode ?? 'http_error'
    }
  }

  const blocks = extractJsonLdBlocks(res.body)
  const nodes = flattenJsonLdNodes(blocks)
  const types = [...new Set(nodes.flatMap(jsonLdTypes))]

  if (nodes.length === 0) {
    return {
      status: 'succeeded',
      score: 0,
      reason: 'La home no publica ningún JSON-LD (schema.org): los motores no tienen entidad estructurada.',
      evidence: { blocks: 0, types: [] }
    }
  }

  const hasEntity = types.some(t => ENTITY_TYPES.has(t))
  const hasSite = types.some(t => SITE_TYPES.has(t))

  // Base por tener JSON-LD válido (40) + entidad de marca (40) + WebSite/WebPage (20).
  const score = Math.min(100, 40 + (hasEntity ? 40 : 0) + (hasSite ? 20 : 0))

  return {
    status: 'succeeded',
    score,
    reason: hasEntity
      ? `JSON-LD presente con entidad de marca (${types.join(', ')}).`
      : `JSON-LD presente pero sin entidad de marca (Organization/LocalBusiness). Tipos: ${types.join(', ') || 'desconocidos'}.`,
    evidence: { blocks: nodes.length, types, hasEntity, hasSite }
  }
}

export const jsonLdProbe: Probe = {
  kind: 'json_ld',
  axis: 'structural',
  requiresHeadless: false,
  run
}
