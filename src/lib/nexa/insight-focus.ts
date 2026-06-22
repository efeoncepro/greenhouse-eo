import 'server-only'

import {
  buildNexaInsightDrillHref,
  readNexaInsightDrill,
  type NexaInsightDetailSnapshot,
  type NexaInsightDrillSubject
} from '@/lib/ico-engine/ai/nexa-insight-drill-reader'

import type { NexaRuntimeContext } from './nexa-contract'

// ── TASK-1182 — conciencia de superficie del chat (Bridge Slice 2) ───────────
// Cuando el usuario abre el chat desde un insight (`runtimeContext.focusRef`), Nexa pre-resuelve
// ese insight con el reader canónico (subject anti-oracle reusado) e inyecta una nota acotada al
// turno — sin que el usuario tenga que pegar el ID. NUNCA queryea tablas directo; NUNCA amplía
// acceso (el subject del turno + el reader deciden). No resoluble → null (el turno procede sin
// ancla, degradación honesta). SSOT del mapeo runtimeContext→subject (reusado por nexa-tools.ts).

/**
 * Mapea el `NexaRuntimeContext` del turno al subject mínimo que consumen los readers de insight.
 * Single source of truth: tools y servicio derivan el subject por acá (cero divergencia).
 */
export const buildNexaInsightSubject = (tenant: NexaRuntimeContext): NexaInsightDrillSubject => ({
  userId: tenant.userId,
  tenantType: tenant.tenantType,
  roleCodes: tenant.roleCodes,
  routeGroups: tenant.routeGroups,
  memberId: tenant.memberId ?? null
})

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'crítica',
  warning: 'de atención',
  info: 'informativa'
}

const summarizeFocusedInsight = (insight: NexaInsightDetailSnapshot): string => {
  const severity = insight.severity ? `severidad ${SEVERITY_LABEL[insight.severity] ?? insight.severity}` : 'sin severidad'
  const cause = insight.rootCauseNarrative || insight.explanationSummary || 'sin resumen disponible'
  const action = insight.recommendedAction ? ` Acción recomendada: ${insight.recommendedAction}.` : ''

  return `${insight.metricName || 'métrica de delivery'} (${insight.signalType || 'señal'}, ${severity}). ${cause}.${action}`
}

/**
 * Construye la nota de contexto del insight enfocado para appendear al system prompt del turno.
 * Devuelve `null` si no hay `focusRef` resoluble (sin ancla → el turno procede normal). La nota se
 * agrega al NIVEL DEL SERVICIO (no al prompt versionado), porque es contexto runtime per-turno.
 */
export const buildFocusedInsightNote = async (runtimeContext: NexaRuntimeContext): Promise<string | null> => {
  const focusRef = runtimeContext.focusRef

  if (!focusRef || focusRef.kind !== 'nexa_insight' || !focusRef.id) {
    return null
  }

  const result = await readNexaInsightDrill(focusRef.id, buildNexaInsightSubject(runtimeContext))

  // not_found (anti-oracle: id inválido / sin acceso) y degraded → sin ancla, el turno procede.
  if (result.state === 'not_found' || result.state === 'degraded') {
    return null
  }

  const drillHref = buildNexaInsightDrillHref(result.insight.signalId || focusRef.id)

  const stateNote =
    result.state === 'superseded'
      ? ' (Este insight fue superado por un análisis más reciente de la misma señal.)'
      : result.state === 'expired'
        ? ' (La anomalía ya se resolvió; no hay acción pendiente.)'
        : ''

  return [
    'CONTEXTO ENFOCADO (el usuario abrió el chat desde este insight de delivery):',
    `- ${summarizeFocusedInsight(result.insight)}${stateNote}`,
    `- Enlace al detalle: ${drillHref}`,
    'Si la pregunta del usuario es sobre este insight, respóndela con este contexto y ofrece el enlace para profundizar. Si pregunta otra cosa, ignora este contexto. No inventes datos que no estén aquí.'
  ].join('\n')
}
