import { minimatch } from 'minimatch'

import type { CloudSentryIncident } from '@/lib/cloud/contracts'
import type { ReliabilityModuleKey } from '@/types/reliability'

import { RELIABILITY_REGISTRY } from './registry'

/**
 * TASK-634 — Sentry Incident → Module correlator.
 *
 * Reglas declarativas, rules-first y deterministas. Reusa los globs
 * `filesOwned` declarados en `RELIABILITY_REGISTRY` (TASK-633) como fuente
 * primaria de verdad para path matching, y agrega `MODULE_TITLE_HINTS`
 * (substrings case-insensitive) como segunda señal.
 *
 * Flujo:
 *  1) Si `incident.location` matchea un glob de `filesOwned` → ese módulo gana.
 *     Si matchea N módulos, desempata con `MODULE_PRIORITY` (mayor gana).
 *  2) Si no hay match por path, intenta match por title. Igual orden de
 *     priority.
 *  3) Si nada matchea → 'cloud' como fallback (incidente uncorrelated).
 *
 * Notas:
 *  - LLM tiebreaker queda como follow-up (Slice 4 del spec). V1 es solo
 *    rules-first determinista — el adapter que consume este resultado debe
 *    poder reproducir la misma decisión sin estado externo.
 *  - El correlador NO consulta Sentry. Solo opera sobre el `CloudSentryIncident`
 *    que ya viene del reader oficial `getCloudSentryIncidents`.
 */

/**
 * Title hints (substrings lowercase). Cada substring se evalúa con
 * `String.prototype.includes` contra `incident.title.toLowerCase()`.
 *
 * Mantener corto y preciso: cada hint cuesta `cloud` cuando coincide por
 * accidente. Privilegiar términos específicos del dominio (no genéricos
 * como "error" o "failed").
 */
const MODULE_TITLE_HINTS: Record<ReliabilityModuleKey, string[]> = {
  finance: [
    'finance',
    'quote',
    'quotation',
    'expense',
    'income',
    'pricing-engine',
    'nubox',
    'reconciliation'
  ],
  'integrations.notion': ['notion', 'notion-bq-sync', 'delivery_tasks', 'notion_ops'],
  'integrations.teams': ['teams_notification', 'teams-bot', 'bot framework', 'graph chat', 'graph channel'],
  cloud: ['cloud sql', 'bigquery', 'sentry', 'vercel cron', 'cloud run', 'gcp'],
  delivery: ['ico-engine', 'ico_engine', 'sprint', 'delivery_tasks', 'reactive worker', 'agency operations'],
  home: ['home block', 'home snapshot', 'home pulse', 'home today', 'home insights', 'home recents'],
  // TASK-729: hints para incidents de payroll. La keyword `payroll` se mueve a
  // este módulo (antes vivía bajo `finance` por proximidad de dominio); con el
  // domain tag canónico `domain=payroll` el fallback por keyword solo se usa
  // cuando llega un incident sin tag (Sentry legacy).
  payroll: [
    'payroll',
    'compensation',
    'previred',
    'nomina',
    'liquidacion'
  ],
  // TASK-773 — sync infrastructure (outbox publisher + reactive consumer +
  // projection refresh). Keywords específicos del event bus.
  sync: [
    'outbox',
    'reactive',
    'projection refresh',
    'projection_refresh_queue',
    'event bus'
  ],
  // TASK-784 — identity & access (auth + person legal profile + SCIM).
  identity: [
    'auth',
    'identity',
    'rut',
    'scim',
    'magic-link',
    'azure ad',
    'next-auth',
    'reveal_sensitive'
  ],
  // TASK-813 — commercial engagement instance sync (HubSpot p_services 0-162).
  commercial: [
    'hubspot p_services',
    'p_services',
    'service_engagement',
    'hubspot-services',
    'service sync',
    'commercial.service'
  ],
  // TASK-848 — production release control plane (release_manifests, GH workflow blockers).
  // Hints conservadores; la mayoria de incidents de release caen al subsystem
  // 'cloud' por defecto. Estos hints disparan cuando el incident es claramente
  // del control plane production.
  platform: [
    'release_manifest',
    'production release',
    'production-release',
    'release control plane',
    'platform.release',
    'workflow stale approval',
    'concurrency deadlock'
  ]
}

/**
 * Tie-break priority cuando el mismo incidente matchea múltiples módulos.
 * Prefer specialized over generic: `finance`/`integrations.notion`/`delivery`
 * dominan a `cloud` (que es siempre el fallback).
 */
const MODULE_PRIORITY: Record<ReliabilityModuleKey, number> = {
  finance: 30,
  // Payroll prioridad alta: matchea por dominio específico (nómina, previred);
  // cuando un incident toca payroll y finance, payroll gana porque es el módulo
  // operacional dueño del flujo. Si emerge ambigüedad, ajustar > 30.
  payroll: 28,
  'integrations.notion': 25,
  'integrations.teams': 22,
  delivery: 20,
  home: 15,
  // TASK-773 — sync infraestructure: prioridad media-baja. Si un incident
  // matchea ambos `outbox` y `finance`, finance gana (el outbox es el medium,
  // el finance es el dueño del side effect operacional). Sync solo gana
  // cuando el incident es puramente del event bus.
  sync: 10,
  // TASK-784 — identity prioridad alta: si un incident matchea ambos `auth`
  // y `cloud`, identity gana (auth es dueño del flujo).
  identity: 32,
  // TASK-813 — commercial: prioridad media. Cuando un incident HubSpot toca
  // commercial y cloud, commercial gana (es el dueño del side effect).
  // Más bajo que finance porque emergencias finance dominan operacionalmente.
  commercial: 18,
  // TASK-848 — platform release: prioridad mas alta que cloud para que un
  // incident con pattern `release_manifest`/`production-release` ruteee al
  // subsystem Platform Release y NO al fallback cloud genérico. Por debajo
  // de finance/payroll/identity para no robar incidents de dominios duros.
  platform: 8,
  cloud: 1
}

export type IncidentCorrelationSource = 'path' | 'title' | 'fallback'

export interface IncidentCorrelation {
  moduleKey: ReliabilityModuleKey
  source: IncidentCorrelationSource
  matchedPattern: string | null
}

const normalizeLocation = (location: string | null | undefined): string | null => {
  if (!location || typeof location !== 'string') return null

  const trimmed = location.trim()

  if (!trimmed) return null

  // Sentry puede prefijar con "src/lib/...", "/src/lib/...", o "in src/lib/..."
  // Normalizamos a path relativo sin leading slash para que matchee globs como `src/lib/finance/**`.
  return trimmed.replace(/^in\s+/i, '').replace(/^\/+/, '')
}

const matchByPath = (location: string): IncidentCorrelation | null => {
  const matches: IncidentCorrelation[] = []

  for (const definition of RELIABILITY_REGISTRY) {
    for (const glob of definition.filesOwned) {
      if (minimatch(location, glob, { dot: true })) {
        matches.push({
          moduleKey: definition.moduleKey,
          source: 'path',
          matchedPattern: glob
        })
        break
      }
    }
  }

  if (matches.length === 0) return null

  matches.sort((a, b) => MODULE_PRIORITY[b.moduleKey] - MODULE_PRIORITY[a.moduleKey])

  return matches[0]
}

const matchByTitle = (title: string): IncidentCorrelation | null => {
  const lower = title.toLowerCase()
  const matches: IncidentCorrelation[] = []

  for (const moduleKey of Object.keys(MODULE_TITLE_HINTS) as ReliabilityModuleKey[]) {
    for (const hint of MODULE_TITLE_HINTS[moduleKey]) {
      if (lower.includes(hint.toLowerCase())) {
        matches.push({
          moduleKey,
          source: 'title',
          matchedPattern: hint
        })
        break
      }
    }
  }

  if (matches.length === 0) return null

  matches.sort((a, b) => MODULE_PRIORITY[b.moduleKey] - MODULE_PRIORITY[a.moduleKey])

  return matches[0]
}

export const correlateIncident = (incident: CloudSentryIncident): IncidentCorrelation => {
  const location = normalizeLocation(incident.location)

  if (location) {
    const pathMatch = matchByPath(location)

    if (pathMatch) return pathMatch
  }

  const title = typeof incident.title === 'string' ? incident.title : ''

  if (title) {
    const titleMatch = matchByTitle(title)

    if (titleMatch) return titleMatch
  }

  return {
    moduleKey: 'cloud',
    source: 'fallback',
    matchedPattern: null
  }
}
