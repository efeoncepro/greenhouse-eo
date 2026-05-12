// TASK-825 Slice 1 — Client Portal module resolver DTO.
//
// Shape canónico que el resolver `resolveClientPortalModulesForOrganization`
// devuelve. Lo consumen el menú dinámico cliente (TASK-827), el API endpoint
// `GET /api/client-portal/modules` (TASK-825 Slice 3), y los admin endpoints
// (TASK-826) para listing.
//
// Field naming: camelCase TS ↔ snake_case DB. El resolver hace la conversión.
//
// `applicabilityScope` (NO `businessLine`) — TASK-824 V1.4 §5.1 rename para
// reconciliar con `GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1` hard rule
// "no duplicar enum del catalogo".

/**
 * Status canónico de un assignment activo según el resolver V1.0.
 *
 * El resolver filtra por default `IN ('active','pilot')`. Con `includePending`
 * opt-in se agrega `'pending'` (admin UI vista).
 *
 * Otros estados del state machine (`expired`, `churned`, `paused`) NUNCA
 * aparecen en el resolver — son terminales o de pausa explícita que el
 * cliente no debería ver activos.
 */
export type ResolvedAssignmentStatus = 'active' | 'pilot' | 'pending'

/**
 * Fuente canónica de un assignment según el spec V1.4 §5.2.
 *
 * Mirror del CHECK constraint DB `module_assignments.source IN (...)`. Si
 * un value nuevo se agrega al DB, este union debe extenderse en la misma
 * migration (parity test V1.1 candidate).
 */
export type AssignmentSource =
  | 'lifecycle_case_provision'
  | 'commercial_terms_cascade'
  | 'manual_admin'
  | 'self_service_request'
  | 'migration_backfill'
  | 'default_business_line'

/**
 * Módulo del client portal resuelto para una organización.
 *
 * Construido por el resolver canónico JOIN-eando `module_assignments`
 * (asignación per-cliente) con `modules` (catálogo declarativo) y filtrando:
 *
 *   - assignment activo (`effective_to IS NULL`)
 *   - módulo NO deprecated (`m.effective_to IS NULL`)
 *   - status `IN ('active','pilot')` (o + `'pending'` con opt-in)
 *   - pilot NO expirado (`expires_at IS NULL OR expires_at > now()`)
 *
 * Spec V1.4 §6 documenta el contract canónico.
 */
export interface ResolvedClientPortalModule {
  /** ID del assignment (`cpma-{uuid}`). */
  readonly assignmentId: string

  /** Llave estable del módulo en el catálogo (`'creative_hub_globe_v1'`, etc.). */
  readonly moduleKey: string

  /** Estado del assignment (filtrado por resolver). */
  readonly status: ResolvedAssignmentStatus

  /** Origen del assignment (cómo fue creado). */
  readonly source: AssignmentSource

  /**
   * Timestamp ISO 8601 de expiración para pilot/trial; `null` para `active`
   * sin timeout. Resolver excluye assignments con `expires_at < now()`.
   */
  readonly expiresAt: string | null

  /** Label operador-facing del módulo (es-CL). */
  readonly displayLabel: string

  /** Label cliente-facing del módulo (tono cálido). */
  readonly displayLabelClient: string

  /**
   * Categoría de aplicabilidad del módulo (`'globe'`, `'wave'`, `'crm_solutions'`,
   * `'staff_aug'`, `'cross'`).
   *
   * **NO es FK al business_line canónico del 360** — es metavalue del dominio
   * `client_portal` que mezcla dimensiones ortogonales (business_lines reales +
   * `cross` aplicable-a-múltiples + `staff_aug` service_module). Documentado en
   * spec V1.4 §5.1 + glossary §21.
   */
  readonly applicabilityScope: string

  /** Tier comercial (`'standard'`, `'addon'`, `'pilot'`, `'enterprise'`, `'internal'`). */
  readonly tier: string

  /**
   * View codes que este módulo expone al portal cliente. Forward-looking V1.0:
   * algunos values aún no existen en `VIEW_REGISTRY` — TASK-827 los materializa.
   */
  readonly viewCodes: readonly string[]

  /**
   * Capabilities granulares que el módulo declara. Forward-looking V1.0:
   * algunos values aún no existen en `entitlements-catalog` — TASK-826 los
   * materializa.
   */
  readonly capabilities: readonly string[]

  /**
   * Whitelist de dominios productores que alimentan al módulo. Parity test live
   * TS↔DB en `src/lib/client-portal/data-sources/parity.live.test.ts`
   * (TASK-824 Slice 2) verifica drift.
   */
  readonly dataSources: readonly string[]
}
