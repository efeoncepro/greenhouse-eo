export const ENTITLEMENT_MODULES = [
  'home',
  'agency',
  'people',
  'hr',
  'finance',
  'admin',
  'client_portal',
  'my_workspace',
  'ai_tooling',
  'commercial'
] as const

export type GreenhouseEntitlementModule = (typeof ENTITLEMENT_MODULES)[number]

export const ENTITLEMENT_ACTIONS = [
  'read',
  'create',
  'update',
  'delete',
  'approve',
  'close',
  'export',
  'manage',
  'configure',
  'launch'
] as const

export type EntitlementAction = (typeof ENTITLEMENT_ACTIONS)[number]

export const ENTITLEMENT_SCOPES = ['own', 'team', 'space', 'organization', 'tenant', 'all'] as const

export type EntitlementScope = (typeof ENTITLEMENT_SCOPES)[number]

export const ENTITLEMENT_CAPABILITY_CATALOG = [
  {
    key: 'home.view',
    module: 'home',
    actions: ['read'] as const,
    defaultScope: 'own'
  },
  {
    key: 'home.nexa',
    module: 'home',
    actions: ['read'] as const,
    defaultScope: 'own'
  },
  {
    key: 'home.shortcuts',
    module: 'home',
    actions: ['read'] as const,
    defaultScope: 'own'
  },
  {
    key: 'agency.workspace',
    module: 'agency',
    actions: ['read', 'launch'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'people.directory',
    module: 'people',
    actions: ['read', 'launch'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.workspace',
    module: 'hr',
    actions: ['read', 'launch'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.leave',
    module: 'hr',
    actions: ['read', 'approve'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.leave_balance',
    module: 'hr',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.leave_backfill',
    module: 'hr',
    actions: ['create'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.leave_adjustment',
    module: 'hr',
    actions: ['create', 'update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'hr.org_chart',
    module: 'hr',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    // TASK-760 — caso canonico de offboarding laboral/contractual.
    // create=abrir caso; update=review/schedule/block/cancel no terminal;
    // approve=aprobacion HR; manage=ejecucion/cancelacion sensible.
    key: 'hr.offboarding_case',
    module: 'hr',
    actions: ['read', 'create', 'update', 'approve', 'manage'] as const,
    defaultScope: 'tenant'
  },
  {
    // TASK-745 — crear / revertir adjustments de payroll por entry
    key: 'hr.payroll_adjustments',
    module: 'hr',
    actions: ['create', 'update'] as const,
    defaultScope: 'tenant'
  },
  {
    // TASK-745 — aprobar adjustments en estado pending_approval (maker-checker)
    key: 'hr.payroll_adjustments_approval',
    module: 'hr',
    actions: ['approve'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.workspace',
    module: 'finance',
    actions: ['read', 'launch'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.status',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_instruments.read',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_instruments.update',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_instruments.deactivate',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_instruments.manage_defaults',
    module: 'finance',
    actions: ['manage'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_instruments.reveal_sensitive',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  // ── Beneficiary Payment Profiles (TASK-749) ───────────────────────
  {
    key: 'finance.payment_profiles.read',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_profiles.create',
    module: 'finance',
    actions: ['create', 'update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_profiles.approve',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.payment_profiles.reveal_sensitive',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },

  // ── Payslip delivery resend (TASK-759 V2 / 759d) ───────────────────
  // Permite a finance ops re-disparar el envío del recibo a un colaborador,
  // típicamente cuando el path automático falla. force=true bypasses idempotency.
  {
    key: 'finance.payslip.resend',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },

  // ── Payroll → Expense rematerialization (TASK-765 slice 3) ────────
  // Permite a FINANCE_ADMIN / EFEONCE_ADMIN re-disparar la materialización
  // de `expenses` (payroll + social_security) para un período payroll cuando
  // la proyección reactiva `finance_expense_reactive_intake` quedó dead-letter
  // o falló silenciosamente. Idempotente: el materializador skipea filas
  // existentes por (payroll_period_id, member_id, expense_type, source_type).
  {
    key: 'finance.payroll.rematerialize',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  // TASK-765 Slice 8 — Recovery de payment_orders zombie.
  // Permite a FINANCE_ADMIN / EFEONCE_ADMIN reparar ordenes que quedaron
  // `state='paid'` sin downstream completo: asignar `source_account_id`,
  // re-disparar el outbox event para que el proyector reactivo (safety
  // net) cree expense_payment + settlement_leg, y rematerializar
  // account_balances de la cuenta origen. Audit log append-only registra
  // la transicion con reason='recovery_TASK-765'.
  {
    key: 'finance.payment_orders.recover',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  // TASK-766 Slice 5 — Repair de payments con drift CLP.
  // Permite a FINANCE_ADMIN / EFEONCE_ADMIN reparar registros de
  // expense_payments / income_payments con `requires_fx_repair=TRUE`
  // (non-CLP sin amount_clp poblado). El endpoint resuelve el rate
  // histórico al payment_date desde greenhouse_finance.exchange_rates y
  // poblá amount_clp + exchange_rate_at_payment + flips
  // requires_fx_repair=FALSE. Idempotente. Capability granular nueva
  // (least-privilege) para audit fino, no se reusa
  // finance.payroll.rematerialize (dimensiones ortogonales: FX rates
  // históricos vs payroll expenses).
  {
    key: 'finance.payments.repair_clp',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  // TASK-768 — capability granular para reclasificar economic_category de
  // expenses (analitica/operativa, NO toca expense_type fiscal/SII).
  // Reservada FINANCE_ADMIN + EFEONCE_ADMIN. Audit fino + outbox audit
  // event finance.expense.economic_category_changed v1.
  {
    key: 'finance.expenses.reclassify_economic_category',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.income.reclassify_economic_category',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'finance.cash.adopt-external-signal',
    module: 'finance',
    actions: ['create', 'update'] as const,
    defaultScope: 'space'
  },
  {
    key: 'finance.cash.dismiss-external-signal',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'space'
  },
  {
    // TASK-722 — Read access to reconciliation workbench (list + detail).
    key: 'finance.reconciliation.read',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    // TASK-722 — Match/unmatch/exclude statement rows + auto-match.
    key: 'finance.reconciliation.match',
    module: 'finance',
    actions: ['create', 'update'] as const,
    defaultScope: 'space'
  },
  {
    // TASK-722 — Import bank statements into a reconciliation period.
    key: 'finance.reconciliation.import',
    module: 'finance',
    actions: ['create'] as const,
    defaultScope: 'space'
  },
  {
    // TASK-722 — Declare a bank↔Greenhouse snapshot from /finance/bank.
    // Also gates accept/reconcile of drift snapshots.
    key: 'finance.reconciliation.declare_snapshot',
    module: 'finance',
    actions: ['create', 'update'] as const,
    defaultScope: 'space'
  },
  {
    // TASK-722 — Close a reconciled period (terminal state).
    // Restricted: solo finance_admin / efeonce_admin.
    key: 'finance.reconciliation.close',
    module: 'finance',
    actions: ['close'] as const,
    defaultScope: 'space'
  },
  {
    // TASK-723 — Read AI-assisted reconciliation suggestions.
    key: 'finance.reconciliation.ai_suggestions.read',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'space'
  },
  {
    // TASK-723 — Generate/refresh advisory suggestions. Does not grant match writes.
    key: 'finance.reconciliation.ai_suggestions.generate',
    module: 'finance',
    actions: ['create'] as const,
    defaultScope: 'space'
  },
  {
    // TASK-723 — Accept/reject advisory suggestions. Does not apply matches.
    key: 'finance.reconciliation.ai_suggestions.review',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'space'
  },
  {
    // TASK-777 — Read expense distribution review queue and advisory suggestions.
    key: 'finance.expense_distribution.ai_suggestions.read',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    // TASK-777 — Generate advisory-only expense distribution suggestions.
    key: 'finance.expense_distribution.ai_suggestions.generate',
    module: 'finance',
    actions: ['create'] as const,
    defaultScope: 'tenant'
  },
  {
    // TASK-777 — Approve/reject advisory suggestions. Approval creates an auditable ai_approved resolution.
    key: 'finance.expense_distribution.ai_suggestions.review',
    module: 'finance',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'admin.workspace',
    module: 'admin',
    actions: ['read', 'manage', 'launch'] as const,
    defaultScope: 'all'
  },
  {
    key: 'client_portal.workspace',
    module: 'client_portal',
    actions: ['read', 'launch'] as const,
    defaultScope: 'space'
  },
  {
    key: 'my_workspace.workspace',
    module: 'my_workspace',
    actions: ['read', 'launch'] as const,
    defaultScope: 'own'
  },
  {
    key: 'ai_tooling.workspace',
    module: 'ai_tooling',
    actions: ['read', 'launch'] as const,
    defaultScope: 'tenant'
  },

  // Commercial Party Lifecycle (TASK-535 §9.1).
  // Roles `sales` and `sales_lead` are not yet defined in role-codes.ts; the
  // runtime binding starts with `efeonce_admin` + `finance_admin`. When the
  // sales role family lands, extend `getTenantEntitlements()` accordingly.
  {
    key: 'commercial.party.create',
    module: 'commercial',
    actions: ['create'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.party.promote_to_client',
    module: 'commercial',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.party.churn',
    module: 'commercial',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.party.override_lifecycle',
    module: 'commercial',
    actions: ['update'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.deal.create',
    module: 'commercial',
    actions: ['create'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.quote_to_cash.execute',
    module: 'commercial',
    actions: ['approve'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'commercial.product_catalog.resolve_conflict',
    module: 'commercial',
    actions: ['update'] as const,
    defaultScope: 'all'
  },

  // TASK-672 — Platform Health API contract.
  // Declarative catalog entries for the agent/MCP preflight contract.
  // V1 enforcement is route-group-driven (admin lane uses
  // requireAdminTenantContext; ecosystem lane uses runEcosystemReadRoute
  // scope binding). When TASK-658 lands the resource-authorization
  // bridge, runtime checks will read from these keys to gate detail.
  {
    key: 'platform.health.read',
    module: 'admin',
    actions: ['read'] as const,
    defaultScope: 'all'
  },
  {
    key: 'platform.health.detail',
    module: 'admin',
    actions: ['read'] as const,
    defaultScope: 'all'
  },

  // ─── TASK-696 Wave 6 — Smart Home strategic blocks (CEO/role-aware) ───
  // Each capability gates a Home block. The block is hidden server-side when
  // the user lacks the capability — payload never leaves the composer.
  {
    key: 'home.runway',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'organization'
  },
  {
    key: 'home.briefing.daily',
    module: 'home',
    actions: ['read'] as const,
    defaultScope: 'own'
  },
  {
    key: 'home.atrisk.spaces',
    module: 'agency',
    actions: ['read'] as const,
    defaultScope: 'organization'
  },
  {
    key: 'home.atrisk.invoices',
    module: 'finance',
    actions: ['read'] as const,
    defaultScope: 'organization'
  },
  {
    key: 'home.atrisk.members',
    module: 'hr',
    actions: ['read'] as const,
    defaultScope: 'tenant'
  },
  {
    key: 'home.atrisk.projects',
    module: 'agency',
    actions: ['read'] as const,
    defaultScope: 'team'
  }
] as const

export type EntitlementCapabilityDefinition = (typeof ENTITLEMENT_CAPABILITY_CATALOG)[number]
export type EntitlementCapabilityKey = EntitlementCapabilityDefinition['key']

export const ENTITLEMENT_CAPABILITY_MAP = Object.fromEntries(
  ENTITLEMENT_CAPABILITY_CATALOG.map(definition => [definition.key, definition])
) as Record<EntitlementCapabilityKey, EntitlementCapabilityDefinition>
