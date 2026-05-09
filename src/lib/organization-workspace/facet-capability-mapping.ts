import type { AccountFacetName } from '@/types/account-complete-360'
import type { EntitlementCapabilityKey } from '@/config/entitlements-catalog'

/**
 * TASK-611 — Mapping canónico facet (Account 360) → capability key (entitlements catalog).
 *
 * Single source of truth para resolver "puede el subject ver este facet?". El projection
 * helper consume este mapping para hacer la verificación granular.
 *
 * Spec: docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md §4.4.
 *
 * Si emerge un facet nuevo en `AccountFacetName`, este mapping debe extenderse antes de
 * mergear (compile-time `Record<...>` enforce totality).
 */
export const FACET_TO_CAPABILITY_KEY = {
  identity: 'organization.identity',
  spaces: 'organization.spaces',
  team: 'organization.team',
  economics: 'organization.economics',
  delivery: 'organization.delivery',
  finance: 'organization.finance',
  crm: 'organization.crm',
  services: 'organization.services',
  staffAug: 'organization.staff_aug'
} as const satisfies Record<AccountFacetName, EntitlementCapabilityKey>

export type OrganizationFacet = AccountFacetName

export const ORGANIZATION_FACETS: readonly OrganizationFacet[] = [
  'identity',
  'spaces',
  'team',
  'economics',
  'delivery',
  'finance',
  'crm',
  'services',
  'staffAug'
] as const

/**
 * Capabilities sensitivas asociadas a facets que tienen "tier 2" de acceso (PII, financial details).
 * Patron TASK-784 (`person.legal_profile.reveal_sensitive`): el capability_key encodea la semantica
 * "sensitive" porque `read_sensitive` no es accion canonica del catalog.
 */
export const FACET_TO_SENSITIVE_CAPABILITY_KEY: Partial<Record<OrganizationFacet, EntitlementCapabilityKey>> = {
  identity: 'organization.identity_sensitive',
  finance: 'organization.finance_sensitive'
} as const
