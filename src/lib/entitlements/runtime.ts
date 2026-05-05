import { ENTITLEMENT_CAPABILITY_MAP, type EntitlementAction, type EntitlementCapabilityKey, type EntitlementScope, type GreenhouseEntitlementModule } from '@/config/entitlements-catalog'
import { ROLE_CODES } from '@/config/role-codes'
import type { TenantEntitlement, TenantEntitlementSource, TenantEntitlements, TenantEntitlementSubject, HomeAudienceKey } from '@/lib/entitlements/types'
import { resolvePortalHomePolicy } from '@/lib/tenant/resolve-portal-home-path'

const UNIQUE_SEPARATOR = '::'

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : []

const normalizeSubject = (subject: TenantEntitlementSubject): TenantEntitlementSubject => ({
  ...subject,
  roleCodes: normalizeStringArray(subject.roleCodes),
  routeGroups: normalizeStringArray(subject.routeGroups),
  authorizedViews: normalizeStringArray(subject.authorizedViews),
  projectScopes: normalizeStringArray(subject.projectScopes),
  campaignScopes: normalizeStringArray(subject.campaignScopes),
  businessLines: normalizeStringArray(subject.businessLines),
  serviceModules: normalizeStringArray(subject.serviceModules)
})

const hasRole = (subject: TenantEntitlementSubject, roleCode: string) => subject.roleCodes.includes(roleCode)
const hasRouteGroup = (subject: TenantEntitlementSubject, routeGroup: string) => subject.routeGroups.includes(routeGroup)
const hasAuthorizedView = (subject: TenantEntitlementSubject, viewCode: string) => subject.authorizedViews.includes(viewCode)

const addEntitlement = (
  registry: Map<string, TenantEntitlement>,
  entitlement: TenantEntitlement
) => {
  const key = [entitlement.capability, entitlement.action, entitlement.scope].join(UNIQUE_SEPARATOR)

  if (!registry.has(key)) {
    registry.set(key, entitlement)
  }
}

const inferAudience = (subject: TenantEntitlementSubject): HomeAudienceKey => {
  if (hasRole(subject, ROLE_CODES.EFEONCE_ADMIN) || hasRouteGroup(subject, 'admin')) {
    return 'admin'
  }

  if (subject.tenantType === 'client' || hasRouteGroup(subject, 'client')) {
    return 'client'
  }

  const isPureFinance =
    hasRouteGroup(subject, 'finance') &&
    !hasRouteGroup(subject, 'hr') &&
    !hasRouteGroup(subject, 'internal') &&
    !hasRouteGroup(subject, 'my')

  if (isPureFinance) {
    return 'finance'
  }

  const isPureHr =
    hasRouteGroup(subject, 'hr') &&
    !hasRouteGroup(subject, 'finance') &&
    !hasRouteGroup(subject, 'internal') &&
    !hasRouteGroup(subject, 'my')

  if (isPureHr) {
    return 'hr'
  }

  const isPureCollaborator =
    hasRole(subject, ROLE_CODES.COLLABORATOR) &&
    !hasRole(subject, ROLE_CODES.EFEONCE_ADMIN) &&
    !hasRouteGroup(subject, 'hr') &&
    !hasRouteGroup(subject, 'finance') &&
    !hasRouteGroup(subject, 'internal') &&
    hasRouteGroup(subject, 'my')

  if (isPureCollaborator) {
    return 'collaborator'
  }

  return 'internal'
}

export const getTenantEntitlements = (rawSubject: TenantEntitlementSubject): TenantEntitlements => {
  const subject = normalizeSubject(rawSubject)
  const entries = new Map<string, TenantEntitlement>()

  addEntitlement(entries, {
    module: 'home',
    capability: 'home.view',
    action: 'read',
    scope: 'own',
    source: 'policy'
  })

  addEntitlement(entries, {
    module: 'home',
    capability: 'home.nexa',
    action: 'read',
    scope: 'own',
    source: 'policy'
  })

  addEntitlement(entries, {
    module: 'home',
    capability: 'home.shortcuts',
    action: 'read',
    scope: 'own',
    source: 'policy'
  })

  if (hasRouteGroup(subject, 'internal') || hasRouteGroup(subject, 'admin')) {
    addEntitlement(entries, {
      module: 'agency',
      capability: 'agency.workspace',
      action: 'read',
      scope: 'tenant',
      source: hasRouteGroup(subject, 'admin') ? 'role' : 'route_group'
    })

    addEntitlement(entries, {
      module: 'agency',
      capability: 'agency.workspace',
      action: 'launch',
      scope: 'tenant',
      source: hasRouteGroup(subject, 'admin') ? 'role' : 'route_group'
    })
  }

  if (hasRouteGroup(subject, 'people') || hasAuthorizedView(subject, 'equipo.personas')) {
    const source: TenantEntitlementSource = hasRouteGroup(subject, 'people') ? 'route_group' : 'authorized_view'

    addEntitlement(entries, {
      module: 'people',
      capability: 'people.directory',
      action: 'read',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'people',
      capability: 'people.directory',
      action: 'launch',
      scope: 'tenant',
      source
    })
  }

  if (hasRouteGroup(subject, 'hr')) {
    addEntitlement(entries, {
      module: 'hr',
      capability: 'hr.workspace',
      action: 'read',
      scope: 'tenant',
      source: 'route_group'
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'hr.workspace',
      action: 'launch',
      scope: 'tenant',
      source: 'route_group'
    })
  }

  if (hasRouteGroup(subject, 'hr') || hasAuthorizedView(subject, 'equipo.permisos')) {
    addEntitlement(entries, {
      module: 'hr',
      capability: 'hr.leave',
      action: 'read',
      scope: 'tenant',
        source: hasRouteGroup(subject, 'hr') ? 'route_group' : 'authorized_view'
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'hr.leave_balance',
      action: 'read',
      scope: 'tenant',
      source: hasRouteGroup(subject, 'hr') ? 'route_group' : 'authorized_view'
    })
  }

  if (hasRouteGroup(subject, 'hr') || hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)) {
    const source: TenantEntitlementSource = hasRouteGroup(subject, 'hr') ? 'route_group' : 'role'

    // TASK-784 — HR puede actualizar/verificar datos legales de personas.
    addEntitlement(entries, {
      module: 'people',
      capability: 'person.legal_profile.read_masked',
      action: 'read',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'person.legal_profile.hr_update',
      action: 'create',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'person.legal_profile.hr_update',
      action: 'update',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'person.legal_profile.verify',
      action: 'approve',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'person.legal_profile.export_snapshot',
      action: 'export',
      scope: 'tenant',
      source
    })

    // TASK-785 — workforce role title governance
    addEntitlement(entries, {
      module: 'hr',
      capability: 'workforce.role_title.update',
      action: 'update',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'workforce.role_title.review_drift',
      action: 'read',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'workforce.role_title.review_drift',
      action: 'approve',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'workforce.assignment_role_override',
      action: 'create',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'workforce.assignment_role_override',
      action: 'update',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'hr.leave_backfill',
      action: 'create',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'hr.leave_adjustment',
      action: 'create',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'hr',
      capability: 'hr.leave_adjustment',
      action: 'update',
      scope: 'tenant',
      source
    })
  }

  if (hasRouteGroup(subject, 'hr') || hasAuthorizedView(subject, 'equipo.organigrama')) {
    addEntitlement(entries, {
      module: 'hr',
      capability: 'hr.org_chart',
      action: 'read',
      scope: 'tenant',
      source: hasRouteGroup(subject, 'hr') ? 'route_group' : 'authorized_view'
    })
  }

  if (hasRouteGroup(subject, 'hr') || hasAuthorizedView(subject, 'equipo.offboarding') || hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)) {
    const source: TenantEntitlementSource = hasRouteGroup(subject, 'hr')
      ? 'route_group'
      : hasAuthorizedView(subject, 'equipo.offboarding')
        ? 'authorized_view'
        : 'role'

    for (const action of ['read', 'create', 'update', 'approve', 'manage'] as const) {
      addEntitlement(entries, {
        module: 'hr',
        capability: 'hr.offboarding_case',
        action,
        scope: 'tenant',
        source
      })

      addEntitlement(entries, {
        module: 'hr',
        capability: 'hr.final_settlement',
        action,
        scope: 'tenant',
        source
      })

      addEntitlement(entries, {
        module: 'hr',
        capability: 'hr.final_settlement_document',
        action,
        scope: 'tenant',
        source
      })
    }
  }

  if (hasRouteGroup(subject, 'hr') || hasAuthorizedView(subject, 'equipo.onboarding') || hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)) {
    const source: TenantEntitlementSource = hasRouteGroup(subject, 'hr')
      ? 'route_group'
      : hasAuthorizedView(subject, 'equipo.onboarding')
        ? 'authorized_view'
        : 'role'

    for (const action of ['read', 'create', 'update', 'manage'] as const) {
      addEntitlement(entries, {
        module: 'hr',
        capability: 'hr.onboarding_template',
        action,
        scope: 'tenant',
        source
      })

      addEntitlement(entries, {
        module: 'hr',
        capability: 'hr.onboarding_instance',
        action,
        scope: 'tenant',
        source
      })
    }
  }

  if (hasRouteGroup(subject, 'finance') || hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)) {
    const source: TenantEntitlementSource = hasRouteGroup(subject, 'finance') ? 'route_group' : 'role'

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.workspace',
      action: 'read',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.workspace',
      action: 'launch',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.payment_instruments.read',
      action: 'read',
      scope: 'tenant',
      source
    })
  }

  if (
    hasRouteGroup(subject, 'finance') ||
    hasRole(subject, ROLE_CODES.FINANCE_ADMIN) ||
    hasRole(subject, ROLE_CODES.EFEONCE_ADMIN) ||
    hasRole(subject, ROLE_CODES.EFEONCE_OPERATIONS)
  ) {
    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.status',
      action: 'read',
      scope: 'tenant',
      source: hasRouteGroup(subject, 'finance') ? 'route_group' : 'role'
    })
  }

  if (hasRole(subject, ROLE_CODES.FINANCE_ADMIN) || hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)) {
    const source: TenantEntitlementSource = 'role'

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.payment_instruments.update',
      action: 'update',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.payment_instruments.manage_defaults',
      action: 'manage',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.payment_instruments.deactivate',
      action: 'update',
      scope: 'tenant',
      source
    })
  }

  if (hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)) {
    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.payment_instruments.reveal_sensitive',
      action: 'read',
      scope: 'tenant',
      source: 'role'
    })
  }

  // TASK-749 — Beneficiary Payment Profiles capabilities.
  // Read: cualquiera con route_group=finance o role finance_admin/finance_analyst/efeonce_admin.
  // Create/Update + Approve: route_group finance o roles finance_admin/efeonce_admin.
  // Reveal sensitive: solo efeonce_admin/finance_admin (mismo gate que payment_instruments).
  if (
    hasRouteGroup(subject, 'finance') ||
    hasRole(subject, ROLE_CODES.FINANCE_ADMIN) ||
    hasRole(subject, ROLE_CODES.FINANCE_ANALYST) ||
    hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)
  ) {
    const source: TenantEntitlementSource = hasRouteGroup(subject, 'finance') ? 'route_group' : 'role'

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.payment_profiles.read',
      action: 'read',
      scope: 'tenant',
      source
    })
  }

  if (
    hasRouteGroup(subject, 'finance') ||
    hasRole(subject, ROLE_CODES.FINANCE_ADMIN) ||
    hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)
  ) {
    const source: TenantEntitlementSource = hasRouteGroup(subject, 'finance') ? 'route_group' : 'role'

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.payment_profiles.create',
      action: 'create',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.payment_profiles.create',
      action: 'update',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.payment_profiles.approve',
      action: 'update',
      scope: 'tenant',
      source
    })
  }

  if (hasRole(subject, ROLE_CODES.FINANCE_ADMIN) || hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)) {
    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.payment_profiles.reveal_sensitive',
      action: 'read',
      scope: 'tenant',
      source: 'role'
    })

    // TASK-759 V2 (759d) — Payslip resend capability. Solo finance_admin/efeonce_admin.
    // El analyst NO puede reenviar (read-only). Cubre el endpoint /resend-payslips
    // y el botón "Reenviar manualmente" en drawers.
    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.payslip.resend',
      action: 'update',
      scope: 'tenant',
      source: 'role'
    })

    // TASK-784 — Reveal sensitive identity document/address. Least privilege.
    addEntitlement(entries, {
      module: 'hr',
      capability: 'person.legal_profile.reveal_sensitive',
      action: 'read',
      scope: 'tenant',
      source: 'role'
    })
  }

  // TASK-722 — Reconciliation workbench capabilities.
  // Read access: cualquier route_group=finance, finance_admin o efeonce_admin
  // pueden listar y abrir el workbench.
  if (
    hasRouteGroup(subject, 'finance') ||
    hasRole(subject, ROLE_CODES.FINANCE_ADMIN) ||
    hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)
  ) {
    const source: TenantEntitlementSource = hasRouteGroup(subject, 'finance') ? 'route_group' : 'role'

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.reconciliation.read',
      action: 'read',
      scope: 'tenant',
      source
    })

    // Mutaciones operativas (match/import/declare_snapshot): finance route_group
    // o finance_admin / efeonce_admin pueden ejecutarlas.
    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.reconciliation.match',
      action: 'create',
      scope: 'space',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.reconciliation.match',
      action: 'update',
      scope: 'space',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.reconciliation.import',
      action: 'create',
      scope: 'space',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.reconciliation.declare_snapshot',
      action: 'create',
      scope: 'space',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.reconciliation.declare_snapshot',
      action: 'update',
      scope: 'space',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.reconciliation.ai_suggestions.read',
      action: 'read',
      scope: 'space',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.reconciliation.ai_suggestions.generate',
      action: 'create',
      scope: 'space',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.reconciliation.ai_suggestions.review',
      action: 'update',
      scope: 'space',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.expense_distribution.ai_suggestions.read',
      action: 'read',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.expense_distribution.ai_suggestions.generate',
      action: 'create',
      scope: 'tenant',
      source
    })

    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.expense_distribution.ai_suggestions.review',
      action: 'update',
      scope: 'tenant',
      source
    })
  }

  // TASK-722 — Cierre de periodo (close): solo finance_admin o efeonce_admin.
  // Es la acción terminal del workbook; route_group=finance solo (sin admin role)
  // puede ejecutar match/import/declare_snapshot pero NO close.
  if (hasRole(subject, ROLE_CODES.FINANCE_ADMIN) || hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)) {
    addEntitlement(entries, {
      module: 'finance',
      capability: 'finance.reconciliation.close',
      action: 'close',
      scope: 'space',
      source: 'role'
    })
  }

  if (hasRouteGroup(subject, 'admin') || hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)) {
    addEntitlement(entries, {
      module: 'admin',
      capability: 'admin.workspace',
      action: 'read',
      scope: 'all',
      source: 'role'
    })

    addEntitlement(entries, {
      module: 'admin',
      capability: 'admin.workspace',
      action: 'launch',
      scope: 'all',
      source: 'role'
    })

    addEntitlement(entries, {
      module: 'admin',
      capability: 'admin.workspace',
      action: 'manage',
      scope: 'all',
      source: 'role'
    })
  }

  if (hasRouteGroup(subject, 'client')) {
    addEntitlement(entries, {
      module: 'client_portal',
      capability: 'client_portal.workspace',
      action: 'read',
      scope: 'space',
      source: 'route_group'
    })

    addEntitlement(entries, {
      module: 'client_portal',
      capability: 'client_portal.workspace',
      action: 'launch',
      scope: 'space',
      source: 'route_group'
    })
  }

  if (hasRouteGroup(subject, 'my') || hasAuthorizedView(subject, 'mi_ficha.onboarding')) {
    const source: TenantEntitlementSource = hasAuthorizedView(subject, 'mi_ficha.onboarding') ? 'authorized_view' : 'route_group'

    addEntitlement(entries, {
      module: 'my_workspace',
      capability: 'my_workspace.workspace',
      action: 'read',
      scope: 'own',
      source
    })

    addEntitlement(entries, {
      module: 'my_workspace',
      capability: 'my_workspace.workspace',
      action: 'launch',
      scope: 'own',
      source
    })

    addEntitlement(entries, {
      module: 'my_workspace',
      capability: 'my.onboarding',
      action: 'read',
      scope: 'own',
      source
    })

    addEntitlement(entries, {
      module: 'my_workspace',
      capability: 'my.onboarding',
      action: 'update',
      scope: 'own',
      source
    })

    // TASK-784 — Self-service de datos legales (documento + direccion).
    addEntitlement(entries, {
      module: 'people',
      capability: 'person.legal_profile.read_masked',
      action: 'read',
      scope: 'own',
      source
    })

    addEntitlement(entries, {
      module: 'my_workspace',
      capability: 'person.legal_profile.self_update',
      action: 'create',
      scope: 'own',
      source
    })

    addEntitlement(entries, {
      module: 'my_workspace',
      capability: 'person.legal_profile.self_update',
      action: 'update',
      scope: 'own',
      source
    })
  }

  if (hasRouteGroup(subject, 'ai_tooling')) {
    addEntitlement(entries, {
      module: 'ai_tooling',
      capability: 'ai_tooling.workspace',
      action: 'read',
      scope: 'tenant',
      source: 'route_group'
    })

    addEntitlement(entries, {
      module: 'ai_tooling',
      capability: 'ai_tooling.workspace',
      action: 'launch',
      scope: 'tenant',
      source: 'route_group'
    })
  }

  // Commercial Party Lifecycle (TASK-535 §9.1). Sales roles not yet modeled —
  // binding limited to admin and finance_admin for now. When TASK-536+ lands
  // the sales role family, extend this block (and do not remove the admin
  // grants: efeonce_admin remains the catch-all for commercial writes).
  if (hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)) {
    addEntitlement(entries, { module: 'commercial', capability: 'commercial.party.create', action: 'create', scope: 'tenant', source: 'role' })
    addEntitlement(entries, { module: 'commercial', capability: 'commercial.party.promote_to_client', action: 'update', scope: 'tenant', source: 'role' })
    addEntitlement(entries, { module: 'commercial', capability: 'commercial.party.churn', action: 'update', scope: 'tenant', source: 'role' })
    addEntitlement(entries, { module: 'commercial', capability: 'commercial.party.override_lifecycle', action: 'update', scope: 'tenant', source: 'role' })
    addEntitlement(entries, { module: 'commercial', capability: 'commercial.deal.create', action: 'create', scope: 'tenant', source: 'role' })
    addEntitlement(entries, { module: 'commercial', capability: 'commercial.quote_to_cash.execute', action: 'approve', scope: 'tenant', source: 'role' })
    addEntitlement(entries, { module: 'commercial', capability: 'commercial.product_catalog.resolve_conflict', action: 'update', scope: 'all', source: 'role' })
  }

  if (hasRole(subject, ROLE_CODES.FINANCE_ADMIN)) {
    addEntitlement(entries, { module: 'commercial', capability: 'commercial.party.promote_to_client', action: 'update', scope: 'tenant', source: 'role' })
    addEntitlement(entries, { module: 'commercial', capability: 'commercial.quote_to_cash.execute', action: 'approve', scope: 'tenant', source: 'role' })
  }

  // ─── TASK-696 Wave 6 — Smart Home strategic blocks (CEO/role-aware) ───
  // Capability bindings authoritative for Home block rendering. Each gate is
  // checked server-side in the composer before the loader runs — payload
  // never leaves the snapshot when the user lacks the capability.

  // home.briefing.daily — every authenticated user gets the AI briefing in
  // their own scope; the narrative content varies by audience inside the
  // loader (CEO vs finance vs hr vs delivery vs collaborator).
  addEntitlement(entries, { module: 'home', capability: 'home.briefing.daily', action: 'read', scope: 'own', source: 'policy' })

  // home.runway — finance + CEO. Organization scope (the whole tenant cash
  // position, not per-team).
  if (hasRole(subject, ROLE_CODES.EFEONCE_ADMIN) || hasRole(subject, ROLE_CODES.FINANCE_ADMIN) || hasRole(subject, ROLE_CODES.FINANCE_ANALYST)) {
    addEntitlement(entries, { module: 'finance', capability: 'home.runway', action: 'read', scope: 'organization', source: 'role' })
  }

  // home.atrisk.spaces — only CEO/admin sees the cross-tenant Top 5 risk list.
  if (hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)) {
    addEntitlement(entries, { module: 'agency', capability: 'home.atrisk.spaces', action: 'read', scope: 'organization', source: 'role' })
  }

  // home.atrisk.invoices — finance roles + CEO.
  if (hasRole(subject, ROLE_CODES.EFEONCE_ADMIN) || hasRole(subject, ROLE_CODES.FINANCE_ADMIN) || hasRole(subject, ROLE_CODES.FINANCE_ANALYST)) {
    addEntitlement(entries, { module: 'finance', capability: 'home.atrisk.invoices', action: 'read', scope: 'organization', source: 'role' })
  }

  // home.atrisk.members — HR roles + CEO. Tenant scope (covers all members
  // of the organization).
  if (hasRole(subject, ROLE_CODES.EFEONCE_ADMIN) || hasRole(subject, ROLE_CODES.HR_MANAGER) || hasRole(subject, ROLE_CODES.HR_PAYROLL)) {
    addEntitlement(entries, { module: 'hr', capability: 'home.atrisk.members', action: 'read', scope: 'tenant', source: 'role' })
  }

  // home.atrisk.projects — delivery / operations roles + CEO. Team scope —
  // operations leads see their teams, CEO sees all (handled by the loader,
  // not by the capability).
  if (
    hasRole(subject, ROLE_CODES.EFEONCE_ADMIN) ||
    hasRole(subject, ROLE_CODES.EFEONCE_OPERATIONS) ||
    hasRole(subject, ROLE_CODES.EFEONCE_ACCOUNT)
  ) {
    addEntitlement(entries, { module: 'agency', capability: 'home.atrisk.projects', action: 'read', scope: 'team', source: 'role' })
  }

  const resolvedEntries = Array.from(entries.values())
  const moduleKeys = Array.from(new Set(resolvedEntries.map(entry => entry.module)))

  const startupPolicyKey = resolvePortalHomePolicy({
    tenantType: subject.tenantType,
    roleCodes: subject.roleCodes,
    routeGroups: subject.routeGroups
  }).key

  return {
    audienceKey: inferAudience(subject),
    startupPolicyKey,
    moduleKeys,
    entries: resolvedEntries
  }
}

const resolveEntitlements = (input: TenantEntitlements | TenantEntitlementSubject) =>
  'entries' in input ? input : getTenantEntitlements(input)

const scopeMatches = (candidate: EntitlementScope, requested?: EntitlementScope) => {
  if (!requested) {
    return true
  }

  if (candidate === requested) {
    return true
  }

  return candidate === 'all'
}

export const hasEntitlement = (
  input: TenantEntitlements | TenantEntitlementSubject,
  capability: EntitlementCapabilityKey,
  action: EntitlementAction,
  scope?: EntitlementScope
) => {
  const entitlements = resolveEntitlements(input)

  return entitlements.entries.some(entry =>
    entry.capability === capability &&
    entry.action === action &&
    scopeMatches(entry.scope, scope)
  )
}

export const can = hasEntitlement

export const canSeeModule = (
  input: TenantEntitlements | TenantEntitlementSubject,
  module: GreenhouseEntitlementModule
) => {
  const entitlements = resolveEntitlements(input)

  return entitlements.moduleKeys.includes(module)
}

export const getCapabilityModuleForEntitlement = (capability: EntitlementCapabilityKey) =>
  ENTITLEMENT_CAPABILITY_MAP[capability].module
