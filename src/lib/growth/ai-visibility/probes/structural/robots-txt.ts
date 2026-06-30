/**
 * TASK-1266 — Structural probe · robots.txt acceso de crawlers IA (Slice 2).
 *
 * Read-only GET de /robots.txt. Mide qué crawlers IA pueden acceder al sitio: bloquear
 * GPTBot/PerplexityBot/ClaudeBot/Google-Extended es una causa estructural directa de
 * invisibilidad en answer engines. Ausencia de robots.txt = acceso por defecto (señal
 * BUENA). Fetch fallido (red/timeout) → null (no medido); 404 → medido (allow-all).
 */

import { type Probe, type ProbeContext, type ProbeOutcome } from '../contracts'

/** Crawlers IA AEO-relevantes (training + search + on-demand de los answer engines vigentes). */
export const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider'
] as const

export type AiCrawler = (typeof AI_CRAWLERS)[number]

interface RobotsGroup {
  agents: string[]
  /** Reglas en orden: tipo + path. */
  rules: Array<{ type: 'allow' | 'disallow'; path: string }>
}

/** Parsea robots.txt en grupos (user-agent → reglas). Tolerante a comentarios/espacios. */
const parseRobots = (text: string): RobotsGroup[] => {
  const groups: RobotsGroup[] = []
  let current: RobotsGroup | null = null
  let lastWasAgent = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()

    if (!line) continue

    const sepIndex = line.indexOf(':')

    if (sepIndex === -1) continue

    const field = line.slice(0, sepIndex).trim().toLowerCase()
    const value = line.slice(sepIndex + 1).trim()

    if (field === 'user-agent') {
      // Un nuevo user-agent tras una regla abre grupo nuevo; user-agents consecutivos se agrupan.
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }

      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else if (field === 'allow' || field === 'disallow') {
      if (!current) {
        current = { agents: ['*'], rules: [] }
        groups.push(current)
      }

      current.rules.push({ type: field, path: value })
      lastWasAgent = false
    } else {
      lastWasAgent = false
    }
  }

  return groups
}

/** ¿El bot está bloqueado de la raíz `/`? Grupo específico gana sobre `*`. Allow root gana sobre Disallow root. */
const isBotBlocked = (groups: RobotsGroup[], bot: string): boolean => {
  const botLower = bot.toLowerCase()

  const specific = groups.find(g => g.agents.includes(botLower))
  const wildcard = groups.find(g => g.agents.includes('*'))
  const group = specific ?? wildcard

  if (!group) return false // sin grupo aplicable → permitido

  // Allow explícito de root → permitido. Disallow de root (o todo) → bloqueado.
  const allowsRoot = group.rules.some(r => r.type === 'allow' && (r.path === '/' || r.path === ''))

  if (allowsRoot) return false

  return group.rules.some(r => r.type === 'disallow' && r.path === '/')
}

export interface RobotsEvaluation {
  blocked: string[]
  allowed: string[]
}

/** Evalúa el acceso de los crawlers IA dado el texto de robots.txt. PURO. */
export const evaluateRobotsForAiBots = (
  robotsText: string,
  bots: readonly string[] = AI_CRAWLERS
): RobotsEvaluation => {
  const groups = parseRobots(robotsText)
  const blocked: string[] = []
  const allowed: string[] = []

  for (const bot of bots) {
    if (isBotBlocked(groups, bot)) blocked.push(bot)
    else allowed.push(bot)
  }

  return { blocked, allowed }
}

const run = async (ctx: ProbeContext): Promise<ProbeOutcome> => {
  const res = await ctx.fetcher('/robots.txt', { accept: 'text/plain' })

  // 404 explícito = sin robots.txt = crawlers IA permitidos por defecto (señal medida BUENA).
  if (res.status === 404) {
    return {
      status: 'succeeded',
      score: 100,
      reason: 'Sin robots.txt publicado: los crawlers IA tienen acceso por defecto.',
      evidence: { status: 404, blocked: [], total: AI_CRAWLERS.length }
    }
  }

  // Cualquier otro fallo de fetch (red, timeout, bloqueo, 5xx) → no medible → null.
  if (!res.ok) {
    return {
      status: 'failed',
      score: null,
      reason: 'No se pudo leer robots.txt (sin respuesta utilizable).',
      evidence: { status: res.status },
      errorCode: res.errorCode ?? 'http_error'
    }
  }

  const { blocked, allowed } = evaluateRobotsForAiBots(res.body)
  const total = AI_CRAWLERS.length
  const score = Math.round((allowed.length / total) * 1000) / 10

  return {
    status: 'succeeded',
    score,
    reason:
      blocked.length === 0
        ? 'robots.txt no bloquea a ningún crawler IA evaluado.'
        : `robots.txt bloquea ${blocked.length}/${total} crawlers IA: ${blocked.join(', ')}.`,
    evidence: { status: res.status, blocked, allowedCount: allowed.length, total }
  }
}

export const robotsTxtProbe: Probe = {
  kind: 'robots_txt',
  axis: 'structural',
  requiresHeadless: false,
  run
}
