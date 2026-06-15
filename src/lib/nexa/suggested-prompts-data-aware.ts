import 'server-only'

import { GH_NEXA } from '@/lib/copy/nexa'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  OrganizationWorkspaceCompactSignalsNotFoundError,
  readOrganizationWorkspaceCompactSignalsSafely
} from '@/lib/organization-workspace/compact-signals'
import type { OrganizationWorkspaceCompactSignals } from '@/lib/organization-workspace/compact-signals-types'
import type { EntrypointContext } from '@/lib/organization-workspace/projection-types'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import {
  NEXA_SUGGESTED_PROMPTS_CONTRACT_VERSION,
  type NexaSuggestedPrompt,
  type NexaSuggestedPromptHint,
  type NexaSuggestedPromptsPayload
} from './suggested-prompts-contract'
import type { NexaPromptContextKey } from './suggested-prompts'

// TASK-1087 — Composer SERVER-ONLY de prompts sugeridos DATA-AWARE (Tier 2). Reusa el reader
// canónico `readOrganizationWorkspaceCompactSignalsSafely` (ya compuesto, degradación-honesta,
// subject-gated/anti-oracle vía workspace projection visibleFacets) y mapea sus señales reales
// (anomalías / pendientes / KPIs en rojo) a "ganchos" de prompt. NUNCA recompone readers sueltos
// ni recomputa inline. NUNCA echa montos crudos / PII al texto — solo categoría + nombre de la
// entidad (que el usuario ya ve) + `entityRef` (id) para que Nexa resuelva el detalle con sus tools.
//
// El CONTRATO (tipos + versión) vive en `suggested-prompts-contract.ts` (puro, cliente+servidor)
// para que el hook del panel lo consuma sin arrastrar este módulo server-only al bundle.

export interface ResolveDataAwareSuggestedPromptsInput {
  subject: TenantEntitlementSubject
  context: NexaPromptContextKey
  entityId?: string | null
  entityName?: string | null
  entrypointContext?: EntrypointContext
}

const DATA_AWARE_COPY = GH_NEXA.floating.data_aware_prompts
const GENERIC_ENTITY = 'este cliente'

// Tope de prompts data-aware (la grilla del empty hero muestra hasta 4).
const MAX_DATA_AWARE_PROMPTS = 4

// TASK-1139 — Cache in-memory corto (espejo de la projection cache). Solo cachea resultados
// `data_aware` (los caros: re-leen account360/finance/projects). NO cachea `template_fallback`
// (es barato + evita pegar fallback stale tras un flip del flag). Keyed por subject (anti-oracle)
// + context + entity + entrypoint. TTL 30s: las señales no cambian por segundo.
const DATA_AWARE_CACHE_TTL_MS = 30_000

const dataAwareCache = new Map<string, { payload: NexaSuggestedPromptsPayload; expiresAt: number }>()

const buildCacheKey = (subjectUserId: string, context: NexaPromptContextKey, entityId: string, entrypoint: EntrypointContext): string =>
  `${subjectUserId}:${context}:${entityId}:${entrypoint}`

/** Test helper — limpia el cache in-memory del composer. */
export const __clearDataAwareSuggestedPromptsCache = (): void => dataAwareCache.clear()

const fillEntity = (template: string, entity: string): string => template.replace(/\{entity\}/g, entity)

/**
 * Mapper PURO (sin IO): compact-signals → prompts de "gancho". Allowlist categórica — NUNCA
 * lee `driver.value` ni `signal.body` (pueden traer montos). El orden es por valor operativo
 * (bloqueo > anomalía > pendiente > riesgo > genérico); deduplica por texto y corta a 4.
 *
 * Anti-oracle: el reader ya filtra drivers/signals/nextActions por `visibleFacets` del subject,
 * así que una señal de un facet no visible nunca llega acá → nunca origina un prompt.
 */
export const buildDataAwarePromptsFromCompactSignals = (
  signals: OrganizationWorkspaceCompactSignals,
  entityName: string | null | undefined,
  entityRef: string
): NexaSuggestedPrompt[] => {
  // Sin lectura útil → sin prompts data-aware (el caller cae a Tier 1/1.5).
  if (signals.status === 'unavailable' || signals.status === 'empty') return []

  const entity = (entityName ?? '').trim() || GENERIC_ENTITY
  const out: NexaSuggestedPrompt[] = []

  const push = (templateKey: keyof typeof DATA_AWARE_COPY, hint: NexaSuggestedPromptHint): void => {
    const template = DATA_AWARE_COPY[templateKey]

    if (!template) return

    const text = fillEntity(template, entity)

    if (text && !out.some(prompt => prompt.text === text)) out.push({ text, hint, entityRef })
  }

  const health = signals.health.overallState

  const lifecycleBlocked =
    signals.readiness.some(item => item.id === 'lifecycle.onboarding' && item.state === 'blocked') ||
    signals.recentSignals.some(signal => signal.source === 'client_lifecycle' && signal.severity === 'error')

  // 1. Bloqueo (lo más urgente): distingue bloqueo de onboarding vs. bloqueo de salud genérico.
  if (lifecycleBlocked) {
    push('lifecycle_blocked', 'pending')
  } else if (health === 'blocked' || signals.readiness.some(item => item.state === 'blocked')) {
    push('health_blocked', 'risk')
  }

  // 2. Anomalía de delivery (rojo = error, trabado = warning).
  const deliveryError =
    signals.health.drivers.some(driver => driver.facet === 'delivery' && driver.severity === 'error') ||
    signals.recentSignals.some(signal => signal.facet === 'delivery' && signal.severity === 'error')

  const deliveryWarning = signals.recentSignals.some(signal => signal.facet === 'delivery' && signal.severity === 'warning')

  if (deliveryError) push('anomaly_delivery_error', 'anomaly')
  else if (deliveryWarning) push('anomaly_delivery_warning', 'anomaly')

  // 3. Saldo pendiente (finanzas en watch). El gancho NO lleva el monto — solo la categoría.
  const financeWatch =
    signals.health.drivers.some(driver => driver.facet === 'finance' && driver.severity === 'warning') ||
    signals.recentSignals.some(signal => signal.facet === 'finance' && signal.severity === 'warning')

  if (financeWatch) push('anomaly_finance_warning', 'kpi')

  // 4. Onboarding pendiente (no bloqueado).
  if (signals.readiness.some(item => item.id === 'lifecycle.onboarding' && item.state === 'pending')) {
    push('lifecycle_pending', 'pending')
  }

  // 5. Riesgo general de la cuenta.
  if (health === 'risk') push('health_risk', 'risk')

  // 6. Pendientes accionables por revisar/completar.
  if (signals.nextActions.some(action => action.kind === 'review' || action.kind === 'complete')) {
    push('pending_review', 'pending')
  }

  // 7. Último recurso: la cuenta está en watch pero ninguna categoría específica disparó.
  if (out.length === 0 && health === 'watch') push('generic_watch', 'kpi')

  return out.slice(0, MAX_DATA_AWARE_PROMPTS)
}

/**
 * Orquestador SERVER-ONLY: resuelve los prompts data-aware para una entidad. V1 solo el contexto
 * `client` (org workspace) es genuinamente data-aware — el resto cae a `template_fallback` (Tier
 * 1/1.5) hasta que su página declare un `entityId` + se wiree su reader. Degradación honesta:
 * sin entityId / sin señal / reader degradado / NotFound → `template_fallback` (NUNCA rompe, NUNCA
 * inventa, NUNCA revela existencia de algo que el subject no puede ver).
 */
export const resolveDataAwareSuggestedPrompts = async (
  input: ResolveDataAwareSuggestedPromptsInput
): Promise<NexaSuggestedPromptsPayload> => {
  const templateFallback = (): NexaSuggestedPromptsPayload => ({
    contractVersion: NEXA_SUGGESTED_PROMPTS_CONTRACT_VERSION,
    context: input.context,
    entityName: input.entityName?.trim() || undefined,
    prompts: [],
    source: 'template_fallback'
  })

  // V1: solo `client` con un entityId resuelve señales reales.
  if (input.context !== 'client' || !input.entityId) return templateFallback()

  const entrypoint = input.entrypointContext ?? 'agency'
  const cacheKey = buildCacheKey(input.subject.userId, input.context, input.entityId, entrypoint)

  const cached = dataAwareCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) return cached.payload

  try {
    const signals = await readOrganizationWorkspaceCompactSignalsSafely({
      subject: input.subject,
      organizationId: input.entityId,
      entrypointContext: entrypoint,
      limits: { recentSignals: 8, nextActions: 6 }
    })

    const prompts = buildDataAwarePromptsFromCompactSignals(signals, input.entityName, input.entityId)

    if (prompts.length === 0) return templateFallback()

    const payload: NexaSuggestedPromptsPayload = {
      contractVersion: NEXA_SUGGESTED_PROMPTS_CONTRACT_VERSION,
      context: input.context,
      entityName: input.entityName?.trim() || undefined,
      prompts,
      source: 'data_aware'
    }

    // Solo cachea data_aware (caro). El template_fallback es barato y no se cachea.
    dataAwareCache.set(cacheKey, { payload, expiresAt: Date.now() + DATA_AWARE_CACHE_TTL_MS })

    return payload
  } catch (error) {
    // NotFound = el subject no ve esa entidad → fallback honesto (no revela existencia, anti-oracle).
    if (error instanceof OrganizationWorkspaceCompactSignalsNotFoundError) return templateFallback()

    captureWithDomain(error, 'agency', {
      tags: { source: 'nexa_suggested_prompts_data_aware' },
      extra: { context: input.context, entityId: input.entityId }
    })

    return templateFallback()
  }
}
