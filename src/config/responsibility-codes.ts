/**
 * Canonical responsibility types and scope types for the Operational Responsibility Registry.
 * Architecture ref: GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md § 4
 */

// ── Responsibility Types ──

export const RESPONSIBILITY_TYPES = [
  'account_lead',
  'delivery_lead',
  'finance_reviewer',
  'approval_delegate',
  'operations_lead'
] as const

export type ResponsibilityType = (typeof RESPONSIBILITY_TYPES)[number]

export const RESPONSIBILITY_TYPE_LABELS: Record<ResponsibilityType, string> = {
  account_lead: 'Líder de Cuenta',
  delivery_lead: 'Líder de Delivery',
  finance_reviewer: 'Revisor Financiero',
  approval_delegate: 'Delegado de Aprobación',
  operations_lead: 'Líder de Operaciones'
}

// ── Scope Types ──

export const SCOPE_TYPES = ['organization', 'space', 'project', 'department'] as const

export type ScopeType = (typeof SCOPE_TYPES)[number]

export const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  organization: 'Organización',
  space: 'Space',
  project: 'Proyecto',
  department: 'Departamento'
}
