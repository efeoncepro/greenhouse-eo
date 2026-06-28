/**
 * TASK-1266 — Agentic probe · acciones estructuradas (potentialAction) (Slice 3).
 *
 * Read-only GET del HTML de la home + parseo del JSON-LD buscando `potentialAction` /
 * `SearchAction`: declaran acciones que un agente puede ejecutar (buscar, reservar, ordenar)
 * de forma estructurada. Ausencia MEDIDA (home cargó, sin acciones) → 0; home inaccesible → null.
 */

import { type Probe, type ProbeContext, type ProbeOutcome } from '../contracts'
import { extractJsonLdBlocks, flattenJsonLdNodes, jsonLdTypes } from '../html'

const actionTypesOf = (node: Record<string, unknown>): string[] => {
  const raw = node.potentialAction

  if (!raw) return []

  const actions = Array.isArray(raw) ? raw : [raw]

  return actions
    .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === 'object')
    .flatMap(jsonLdTypes)
}

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  const res = await ctx.fetcher('/')

  if (!res.ok) {
    return {
      status: 'failed',
      score: null,
      reason: 'No se pudo leer el HTML de la home para evaluar acciones estructuradas.',
      evidence: { status: res.status },
      errorCode: res.errorCode ?? 'http_error'
    }
  }

  const nodes = flattenJsonLdNodes(extractJsonLdBlocks(res.body))
  const actionTypes = [...new Set(nodes.flatMap(actionTypesOf))]

  if (actionTypes.length === 0) {
    return {
      status: 'succeeded',
      score: 0,
      reason: 'El JSON-LD no declara potentialAction: los agentes no tienen acciones estructuradas.',
      evidence: { actionTypes: [] }
    }
  }

  const hasSearch = actionTypes.some(t => t === 'searchaction')

  return {
    status: 'succeeded',
    score: hasSearch ? 100 : 70,
    reason: hasSearch
      ? 'JSON-LD declara SearchAction (acción agéntica de búsqueda).'
      : `JSON-LD declara potentialAction (${actionTypes.join(', ')}).`,
    evidence: { actionTypes, hasSearch }
  }
}

export const structuredActionsProbe: Probe = {
  kind: 'structured_actions',
  axis: 'agentic',
  requiresHeadless: false,
  run
}
