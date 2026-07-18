/**
 * TASK-1339 — Growth CTA engine: arbiter server-side (arch §11).
 *
 * Núcleo PURO de arbitración: recibe candidatos ya compilados (browser-safe) con su
 * política server-only evaluable (targeting + priority) y decide qué se muestra:
 * a lo sumo UN prompt interruptivo + N no-interruptivos. El browser recibe SOLO el
 * resultado resuelto — nunca el candidate set ni la política de prioridad (regla
 * dura §20). El fetch de candidatos vive en el store; la resolución de acción en el
 * action router; acá la decisión.
 */

import {
  type ArbitratedRenderResult,
  type CtaRenderContract,
  ctaPriorityPolicySchema,
  ctaTargetingPolicySchema,
} from './contracts'

/**
 * Matcher de rutas glob-lite V1 (determinista, sin dependencia nueva):
 *  - `/**` matchea todo;
 *  - sufijo `/**` matchea el prefijo y todo lo de abajo (`/blog/**` → `/blog`, `/blog/x/y`);
 *  - `*` como segmento matchea exactamente un segmento (`/blog/*` → `/blog/x`, no `/blog/x/y`);
 *  - sin comodines = match exacto (querystring/hash se ignoran).
 */
export const matchRoutePattern = (pattern: string, route: string): boolean => {
  const cleanRoute = route.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/'
  const cleanPattern = pattern.replace(/\/+$/, '') || '/'

  if (cleanPattern === '/**') return true

  if (cleanPattern.endsWith('/**')) {
    const prefix = cleanPattern.slice(0, -3) || '/'

    return cleanRoute === prefix || cleanRoute.startsWith(`${prefix}/`)
  }

  const patternSegments = cleanPattern.split('/').filter(Boolean)
  const routeSegments = cleanRoute.split('/').filter(Boolean)

  if (patternSegments.length !== routeSegments.length) return false

  return patternSegments.every((segment, index) => segment === '*' || segment === routeSegments[index])
}

/**
 * Elegibilidad de targeting V1: rutas incluidas menos excluidas. Policy ausente o
 * inválida ⇒ NO elegible (fail-closed: una anomalía de datos jamás expone un prompt
 * público; toda versión autorada por command persiste su policy).
 */
export const isRouteEligible = (targetingPolicyJson: unknown, route: string): boolean => {
  const policy = ctaTargetingPolicySchema.safeParse(targetingPolicyJson)

  if (!policy.success) return false

  const included = policy.data.routes.some(pattern => matchRoutePattern(pattern, route))

  if (!included) return false

  return !policy.data.excludeRoutes.some(pattern => matchRoutePattern(pattern, route))
}

/** Score de prioridad; policy inválida ⇒ score mínimo (el CTA no gana colisiones por accidente). */
export const resolvePriorityScore = (priorityPolicyJson: unknown): number => {
  const policy = ctaPriorityPolicySchema.safeParse(priorityPolicyJson ?? {})

  return policy.success ? policy.data.score : 0
}

export interface ArbiterCandidate {
  renderContract: CtaRenderContract
  priorityScore: number
}

/**
 * Decisión final: ordena por score desc (tie-break determinista por slug asc) y
 * corta a 0–1 interruptivo; los no-interruptivos pasan todos, también ordenados.
 */
export const arbitrateCandidates = (candidates: ArbiterCandidate[]): ArbitratedRenderResult => {
  const sorted = [...candidates].sort(
    (a, b) => b.priorityScore - a.priorityScore || a.renderContract.cta.slug.localeCompare(b.renderContract.cta.slug),
  )

  const interruptive = sorted.find(candidate => candidate.renderContract.interruptive) ?? null

  const nonInterruptive = sorted
    .filter(candidate => !candidate.renderContract.interruptive)
    .map(candidate => candidate.renderContract)

  return { interruptive: interruptive?.renderContract ?? null, nonInterruptive }
}
