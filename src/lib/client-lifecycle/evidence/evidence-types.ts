// TASK-1017 — Onboarding checklist item evidence layer (shared types).
//
// NOT server-only — safe in client + server. The UI uses `isAutoDerivableItem`
// to decide whether to show the evidence affordance per checklist item; the
// resolvers/composer that actually read the runtime live in server-only modules.
//
// Mirror del contrato honesto de TASK-1009 (OnboardingCheckStatus): cada ítem
// auto-derivable tiene un estado de evidencia real, NUNCA un falso "pendiente"/
// "listo". `unverifiable` = la fuente está caída (degradación honesta, ≠ pending).

/**
 * Estado de evidencia de un ítem del checklist contra el estado REAL del runtime:
 * - `detected`     → la pieza ya está lista en el sistema (verde).
 * - `pending`      → la pieza todavía no está (la fuente respondió, falta hacerlo).
 * - `unverifiable` → no pudimos verificar (la fuente está caída). NUNCA es `pending`.
 */
export type ItemEvidenceStatus = 'detected' | 'pending' | 'unverifiable'

export interface ItemEvidence {
  itemCode: string
  status: ItemEvidenceStatus
  /** Explicación es-CL (operador-facing), nunca con secrets/IDs crudos sensibles. */
  detail: string
}

export interface OnboardingEvidence {
  caseId: string
  items: ItemEvidence[]
  /** ISO; deterministic timestamp de la corrida de verificación. */
  checkedAt: string
}

/**
 * Ítems del checklist `standard_onboarding_v1` cuyo estado real es queryable en
 * runtime (reuse-first: cada uno reusa un reader/tabla canónica existente).
 *
 * Los ítems declarativos (confirm_legal_documents, declare_engagement_kind,
 * declare_commercial_terms, declare_engagement_phases) NO están acá: no tienen
 * fuente automática y siguen siendo manuales. `verify_notion_flowing` (TASK-1009)
 * ya tiene su propio auto-complete vía el preflight; `provision_notion_workspace`
 * comparte la misma señal (getNotionOnboardingReadiness).
 */
export const AUTO_DERIVABLE_ITEM_CODES = [
  'verify_hubspot_company_synced',
  'assign_team_members',
  'provision_notion_workspace',
  'provision_communication_channels',
  'provision_client_users_access',
  'confirm_billing_setup'
] as const

export type AutoDerivableItemCode = (typeof AUTO_DERIVABLE_ITEM_CODES)[number]

const AUTO_DERIVABLE_SET: ReadonlySet<string> = new Set(AUTO_DERIVABLE_ITEM_CODES)

export const isAutoDerivableItem = (itemCode: string): itemCode is AutoDerivableItemCode =>
  AUTO_DERIVABLE_SET.has(itemCode)
