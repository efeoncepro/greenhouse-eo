/**
 * TASK-1083 — Mode <-> capability resolution (pure, client + server safe).
 *
 * El endpoint mapea el modo solicitado a su capability y la chequea con `can()`;
 * el reader recibe el modo ya resuelto. Mantener esta tabla como SSOT del binding
 * modo→capability (Delta B).
 */

import type { EntitlementCapabilityKey } from '@/config/entitlements-catalog'

import type { KnowledgeSearchMode } from './types'

export const KNOWLEDGE_SEARCH_MODES = ['human', 'agentic'] as const

/** Default conservador: `human` (la compuerta agéntica requiere capability propia). */
export const resolveKnowledgeSearchMode = (raw: string | null | undefined): KnowledgeSearchMode =>
  raw === 'agentic' ? 'agentic' : 'human'

/** Capability requerida por modo. `agentic` exige el grant de retrieval agéntico. */
export const requiredCapabilityForKnowledgeSearchMode = (
  mode: KnowledgeSearchMode
): EntitlementCapabilityKey =>
  mode === 'agentic' ? 'knowledge.agentic.retrieve' : 'knowledge.document.read'
