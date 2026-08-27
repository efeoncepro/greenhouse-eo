/**
 * TASK-1778 — Growth AI Visibility · Política de robots.txt OBEDECIDA por el fetcher propio.
 *
 * Parser mínimo y PURO (sin IO) de robots.txt + predicado `isPathAllowed`. Es el mecanismo
 * que sostiene la promesa de `TASK-1709` ("el carril respeta robots.txt") en el carril del
 * fetcher propio — decidido 2026-08-26, razonamiento en la spec de TASK-1778 §5.
 *
 * Distinto del parser de `structural/robots-txt.ts`: aquél es un INSTRUMENTO DE MEDICIÓN
 * (¿el sitio bloquea a los bots de IA en la raíz?); este es una POLÍTICA DE CONDUCTA
 * (¿NOSOTROS podemos leer esta ruta?). No se fusionan: miden preguntas distintas y el
 * de medición no debe heredar la semántica conservadora de este.
 *
 * Postura de diseño (las trampas que hacen que la regla funcione):
 *  - Se matchea NUESTRO token de UA (`GreenhouseAEOGrader`), con fallback a `*`. JAMÁS
 *    los tokens de los bots de IA que auditamos: un sitio con `User-agent: GPTBot /
 *    Disallow: /` + `User-agent: * / Allow: /` DEBE seguir siendo legible por nosotros —
 *    "bloqueas GPTBot" es el hallazgo, no un muro para el auditor.
 *  - Conservador ante ambigüedad: sin grupo aplicable, sin regla que matchee, o valor
 *    `Disallow:` vacío → PERMITIR. Longest-match gana; en empate gana `Allow` (práctica
 *    estándar de Google/RFC 9309).
 *  - Soporta comodín `*` y ancla final `$` en los paths de las reglas.
 *  - El propio `/robots.txt` NO se gobierna por esta política (exención del fetcher):
 *    no se puede conocer la política sin leerla.
 */

export interface RobotsPolicyRule {
  type: 'allow' | 'disallow'
  path: string
}

export interface RobotsPolicyGroup {
  /** Tokens de user-agent del grupo, lowercase. */
  agents: string[]
  rules: RobotsPolicyRule[]
}

/** Parsea robots.txt en grupos user-agent → reglas. Tolerante a comentarios/espacios/campos ajenos. */
export const parseRobotsPolicy = (text: string): RobotsPolicyGroup[] => {
  const groups: RobotsPolicyGroup[] = []
  let current: RobotsPolicyGroup | null = null
  let lastWasAgent = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()

    if (!line) continue

    const sepIndex = line.indexOf(':')

    if (sepIndex === -1) continue

    const field = line.slice(0, sepIndex).trim().toLowerCase()
    const value = line.slice(sepIndex + 1).trim()

    if (field === 'user-agent') {
      // Un user-agent tras una regla abre grupo nuevo; user-agents consecutivos se agrupan.
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

/**
 * Longitud de match de una regla contra el path, o -1 si no matchea. La especificidad es
 * la longitud del patrón (práctica estándar). `*` matchea cualquier secuencia; `$` ancla
 * el final. Match anclado al inicio del path.
 */
const ruleMatchLength = (rulePath: string, path: string): number => {
  if (rulePath === '') return -1 // `Disallow:` vacío = sin restricción (se ignora)

  const anchored = rulePath.endsWith('$')
  const pattern = anchored ? rulePath.slice(0, -1) : rulePath

  // Escape de regex, preservando `*` como comodín.
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[\\s\\S]*')
  const regex = new RegExp(`^${escaped}${anchored ? '$' : ''}`)

  return regex.test(path) ? rulePath.length : -1
}

/**
 * Selecciona los grupos aplicables a nuestro token: los que nombran el token (match exacto
 * o por prefijo del product token, case-insensitive) si existen; si no, los grupos `*`.
 * NUNCA se consideran los grupos de otros bots (esa es la trampa de diseño: matchearnos
 * contra `GPTBot` nos dejaría fuera de exactamente los sitios cuyo bloqueo es el hallazgo).
 */
const applicableGroups = (groups: RobotsPolicyGroup[], userAgentToken: string): RobotsPolicyGroup[] => {
  const token = userAgentToken.trim().toLowerCase()

  const specific = groups.filter(g =>
    g.agents.some(agent => agent !== '*' && agent.length > 0 && (agent === token || token.startsWith(agent)))
  )

  if (specific.length > 0) return specific

  return groups.filter(g => g.agents.includes('*'))
}

/**
 * ¿Nuestro fetcher puede leer `path` según la política? `userAgentToken` es NUESTRO product
 * token (p.ej. `GreenhouseAEOGrader`), no el de un tercero. Conservador: permitir ante
 * ambigüedad; longest-match gana; empate → Allow.
 */
export const isPathAllowed = (groups: RobotsPolicyGroup[], path: string, userAgentToken: string): boolean => {
  const applicable = applicableGroups(groups, userAgentToken)

  if (applicable.length === 0) return true

  let bestLength = -1
  let bestType: RobotsPolicyRule['type'] = 'allow'

  for (const group of applicable) {
    for (const rule of group.rules) {
      const length = ruleMatchLength(rule.path, path)

      if (length < 0) continue

      if (length > bestLength || (length === bestLength && rule.type === 'allow')) {
        bestLength = length
        bestType = rule.type
      }
    }
  }

  if (bestLength < 0) return true // ninguna regla matchea → permitido

  return bestType === 'allow'
}
