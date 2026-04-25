import { createHash } from 'crypto'

import type { ReliabilityModuleSnapshot, ReliabilityOverview } from '@/types/reliability'

import { sanitizePiiText } from './sanitize'

/**
 * TASK-638 — Prompt builder para el AI Observer.
 *
 * Toma un `ReliabilityOverview` (output canónico de
 * `getReliabilityOverview()`) y produce:
 *  1. Un context payload sanitizado (sin PII).
 *  2. Un fingerprint sha256 truncado del estado relevante por módulo,
 *     usado para dedup de observaciones.
 *  3. El system + user prompt para Gemini Flash.
 *
 * El prompt es determinista: input idéntico → output idéntico (modulo el
 * randomness del LLM). El prompt INSISTE en JSON estricto para que el
 * runner pueda parsear sin retries.
 */

export interface AiPromptModuleContext {
  moduleKey: string
  label: string
  domain: string
  status: string
  confidence: string
  summary: string
  signalsBySeverity: Record<string, number>
  topSignals: Array<{
    label: string
    severity: string
    summary: string
    kind: string
  }>
  missingSignalKinds: string[]
}

export interface AiPromptContext {
  generatedAt: string
  totals: ReliabilityOverview['totals']
  modules: AiPromptModuleContext[]
  notes: string[]
  pendingBoundaries: number
}

const TOP_SIGNALS_PER_MODULE = 4

const summarizeModule = (module: ReliabilityModuleSnapshot): AiPromptModuleContext => ({
  moduleKey: module.moduleKey,
  label: module.label,
  domain: module.domain,
  status: module.status,
  confidence: module.confidence,
  summary: sanitizePiiText(module.summary),
  signalsBySeverity: module.signalCounts as unknown as Record<string, number>,
  topSignals: module.signals.slice(0, TOP_SIGNALS_PER_MODULE).map(signal => ({
    label: sanitizePiiText(signal.label),
    severity: signal.severity,
    summary: sanitizePiiText(signal.summary),
    kind: signal.kind
  })),
  missingSignalKinds: module.missingSignalKinds
})

export const buildPromptContext = (overview: ReliabilityOverview): AiPromptContext => ({
  generatedAt: overview.generatedAt,
  totals: overview.totals,
  modules: overview.modules.map(summarizeModule),
  notes: overview.notes.map(sanitizePiiText),
  pendingBoundaries: overview.integrationBoundaries.filter(b => b.status === 'pending').length
})

/**
 * Fingerprint per-module para dedup. Cambia solo cuando severity, confidence
 * o el conteo de fallas/warnings cambian. Incluye el módulo + sus métricas
 * relevantes; NO incluye timestamps (queremos que dos snapshots con misma
 * forma produzcan el mismo fingerprint).
 */
export const fingerprintModule = (module: ReliabilityModuleSnapshot): string => {
  const payload = JSON.stringify({
    moduleKey: module.moduleKey,
    status: module.status,
    confidence: module.confidence,
    counts: {
      ok: module.signalCounts.ok,
      warning: module.signalCounts.warning,
      error: module.signalCounts.error,
      not_configured: module.signalCounts.not_configured,
      awaiting_data: module.signalCounts.awaiting_data,
      unknown: module.signalCounts.unknown
    },
    missing: module.missingSignalKinds.slice().sort()
  })

  return createHash('sha256').update(payload).digest('hex').slice(0, 16)
}

/**
 * Fingerprint del overview agregado (resumen ejecutivo).
 */
export const fingerprintOverview = (overview: ReliabilityOverview): string => {
  const payload = JSON.stringify({
    totals: overview.totals,
    modulesByStatus: overview.modules
      .map(m => ({ key: m.moduleKey, status: m.status, confidence: m.confidence }))
      .sort((a, b) => a.key.localeCompare(b.key))
  })

  return createHash('sha256').update(payload).digest('hex').slice(0, 16)
}

const SYSTEM_PROMPT = `Eres un observer de confiabilidad operativa para Greenhouse EO, el portal de Efeonce Group.

Recibes un snapshot del Reliability Control Plane con módulos críticos (finance, integrations.notion, cloud, delivery), sus señales activas y sus boundaries pendientes.

Tu tarea: producir un resumen ejecutivo + observaciones por módulo.

REGLAS DURAS:
- Output SIEMPRE en JSON estricto siguiendo el schema. Sin texto antes/después.
- En español neutro, conciso, sin jerga corporate. Tono operativo, factual.
- "summary" del overview ≤ 200 chars. "summary" por módulo ≤ 160 chars. "recommendedAction" ≤ 200 chars y solo se llena si hay error/warning concreto.
- Si todos los módulos están en 'ok', el resumen ejecutivo dice eso explícitamente y "modules" queda como array vacío (sin observación por módulo cuando no hay nada que reportar).
- NO inventes datos. Si una señal dice "awaiting_data", reportar eso, no asumir cosas.
- NO prometas acciones que requieran ejecución externa que no está en el contexto. Solo describe lo que ves + sugiere acción concreta auditable.
- Para módulos con confidence=low o unknown, mencionar explícitamente que la señal es parcial.

Schema de output (JSON):
{
  "overviewSummary": string,
  "overviewSeverity": "ok" | "warning" | "error" | "unknown" | "not_configured" | "awaiting_data",
  "modules": [
    {
      "moduleKey": "finance" | "integrations.notion" | "cloud" | "delivery",
      "severity": "ok" | "warning" | "error" | "unknown" | "not_configured" | "awaiting_data",
      "summary": string,
      "recommendedAction": string | null
    }
  ]
}`

export const buildPrompts = (
  overview: ReliabilityOverview
): { systemPrompt: string; userPrompt: string; context: AiPromptContext } => {
  const context = buildPromptContext(overview)

  const userPrompt = `Snapshot Reliability Control Plane (${context.generatedAt}):

Totales: ${context.totals.totalModules} módulos · ${context.totals.healthy} sanos · ${context.totals.warning} en warning · ${context.totals.error} en error · ${context.totals.unknownOrPending} sin señal concreta.
Boundaries pendientes: ${context.pendingBoundaries}.

Módulos:
${context.modules
  .map(
    module =>
      `- ${module.moduleKey} (${module.label} / domain=${module.domain}) :: status=${module.status} confidence=${module.confidence}\n` +
      `  summary: ${module.summary}\n` +
      `  signalsBySeverity: ${JSON.stringify(module.signalsBySeverity)}\n` +
      `  topSignals:\n${module.topSignals
        .map(s => `    · [${s.severity}/${s.kind}] ${s.label}: ${s.summary}`)
        .join('\n')}\n` +
      (module.missingSignalKinds.length > 0
        ? `  missingSignalKinds: ${module.missingSignalKinds.join(', ')}\n`
        : '')
  )
  .join('\n')}

Notes: ${context.notes.length === 0 ? '<none>' : context.notes.join(' | ')}

Genera el JSON según el schema.`

  return { systemPrompt: SYSTEM_PROMPT, userPrompt, context }
}
