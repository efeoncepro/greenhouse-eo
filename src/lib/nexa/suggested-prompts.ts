import { GH_NEXA } from '@/lib/copy/nexa'

// TASK-1078 — Prompts sugeridos CONTEXTUALES, Tier 1 (resolver frontend, sin backend).
// Mapea la familia de ruta donde el usuario abre a Nexa → un set curado de prompts.
// Determinístico, cero costo IA, cero datos. El Tier 2 (data-aware, anomalías/pendientes
// reales) y la interpolación del nombre de la entidad ("Cliente · Sky Airline") son
// follow-ups (requieren readers de dominio / que la página declare su contexto).

export type NexaPromptContextKey = 'general' | 'finance' | 'client' | 'payroll' | 'personal'

export interface NexaPromptContext {
  key: NexaPromptContextKey
  label: string
  icon: string
  prompts: string[]
}

/** Tipo de entidad que la página declara (TASK-1087/1141). `organization` (ficha de cliente,
 *  contexto `client`) y `member` (Mi espacio, contexto `personal`) tienen readers data-aware
 *  wireados; el resto cae a Tier 1/1.5 hasta que su página declare entityId + resolver. */
export type NexaPageEntityKind = 'organization' | 'member'

/** Entrypoint del workspace que la página declara (TASK-1139). Determina la visibilidad de
 *  facets en la projection del reader data-aware (agency vs finance). Narrow a propósito —
 *  evita importar `EntrypointContext` (cuyo módulo arrastra deps server-only al bundle cliente). */
export type NexaPageEntrypoint = 'agency' | 'finance'

/**
 * Contexto que una página declara para Nexa (Tier 1.5 + Tier 2). `entityName` interpola el nombre
 * real en los prompts/label (ej. "Cliente · Sky Airline"); `contextKey` puede forzar la familia si
 * la ruta no la resuelve; `entityId`/`entityKind` (TASK-1087) habilitan los prompts DATA-AWARE — el
 * panel consulta el endpoint server-side con ese id. Todos opcionales — sin esto, se resuelve por
 * ruta y se queda en plantillas (Tier 1).
 */
export interface NexaPageContextValue {
  entityName?: string
  contextKey?: NexaPromptContextKey
  entityId?: string
  entityKind?: NexaPageEntityKind
  /** Entrypoint del workspace (TASK-1139) — propaga la visibilidad correcta de facets al composer. */
  entrypoint?: NexaPageEntrypoint
}

const CONTEXTS = GH_NEXA.floating.prompt_contexts

// Fallback genérico para el placeholder `{entity}` cuando la página no declaró el nombre.
const GENERIC_ENTITY = 'este cliente'

const routeContextKey = (path: string): NexaPromptContextKey => {
  // Mi espacio (espacio personal del colaborador) → contexto Personal (TASK-1141).
  if (path.startsWith('/my')) return 'personal'

  // Página de un cliente/organización específico (agency o finance) → contexto Cliente.
  if (/\/(agency|finance)\/(clients|organizations)\/[^/]+/.test(path)) return 'client'

  // Familia Nómina.
  if (path.startsWith('/hr/payroll') || path.startsWith('/hr/nomina') || path.includes('/payroll')) return 'payroll'

  // Familia Finanzas (P&L, gasto, margen, flujo).
  if (path.startsWith('/finance')) return 'finance'

  return 'general'
}

/**
 * Resuelve el contexto de prompts desde la ruta + el contexto declarado por la página.
 * El `contextKey` declarado gana sobre la ruta; el `entityName` interpola `{entity}` en los
 * prompts y agrega "· {nombre}" al label del contexto Cliente.
 */
export const resolveNexaPromptContext = (
  pathname: string | null | undefined,
  pageContext?: NexaPageContextValue | null
): NexaPromptContext => {
  const path = (pathname ?? '').toLowerCase()
  const key = pageContext?.contextKey ?? routeContextKey(path)
  const ctx = CONTEXTS[key] ?? CONTEXTS.general

  const entityName = pageContext?.entityName?.trim()
  const entity = entityName || GENERIC_ENTITY
  const prompts = ctx.prompts.map(prompt => prompt.replace(/\{entity\}/g, entity))
  const label = key === 'client' && entityName ? `${ctx.label} · ${entityName}` : ctx.label

  return { key, label, icon: ctx.icon, prompts }
}
