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
    'payroll',
    'pricing-engine',
    'nubox',
    'reconciliation'
  ],
  'integrations.notion': ['notion', 'notion-bq-sync', 'delivery_tasks', 'notion_ops'],
  'integrations.teams': ['teams_notification', 'teams-bot', 'bot framework', 'graph chat', 'graph channel'],
  cloud: ['cloud sql', 'bigquery', 'sentry', 'vercel cron', 'cloud run', 'gcp'],
  delivery: ['ico-engine', 'ico_engine', 'sprint', 'delivery_tasks', 'reactive worker', 'agency operations'],
  home: ['home block', 'home snapshot', 'home pulse', 'home today', 'home insights', 'home recents']
}

/**
 * Tie-break priority cuando el mismo incidente matchea múltiples módulos.
 * Prefer specialized over generic: `finance`/`integrations.notion`/`delivery`
 * dominan a `cloud` (que es siempre el fallback).
 */
const MODULE_PRIORITY: Record<ReliabilityModuleKey, number> = {
  finance: 30,
  'integrations.notion': 25,
  'integrations.teams': 22,
  delivery: 20,
  home: 15,
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
