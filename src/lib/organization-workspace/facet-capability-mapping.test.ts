import { describe, expect, it } from 'vitest'

import { ENTITLEMENT_CAPABILITY_MAP, ENTITLEMENT_MODULES } from '@/config/entitlements-catalog'
import { ACCOUNT_FACET_NAMES } from '@/types/account-complete-360'
import {
  FACET_TO_CAPABILITY_KEY,
  FACET_TO_SENSITIVE_CAPABILITY_KEY,
  ORGANIZATION_FACETS
} from './facet-capability-mapping'
import { FACET_TO_VIEW_CODE } from './facet-view-mapping'

describe('TASK-611 — capability + view mappings', () => {
  it('declares organization module in ENTITLEMENT_MODULES', () => {
    expect(ENTITLEMENT_MODULES).toContain('organization')
  })

  it('declares 11 organization.* capabilities in catalog', () => {
    const organizationKeys = Object.keys(ENTITLEMENT_CAPABILITY_MAP).filter(key => key.startsWith('organization.'))

    expect(organizationKeys.sort()).toEqual([
      'organization.crm',
      'organization.delivery',
      'organization.economics',
      'organization.finance',
      'organization.finance_sensitive',
      'organization.identity',
      'organization.identity_sensitive',
      'organization.services',
      'organization.spaces',
      'organization.staff_aug',
      'organization.team'
    ])
  })

  it('FACET_TO_CAPABILITY_KEY is total over the 9 canonical AccountFacetName values', () => {
    for (const facet of ACCOUNT_FACET_NAMES) {
      const capabilityKey = FACET_TO_CAPABILITY_KEY[facet]

      expect(capabilityKey, `facet ${facet} must map to a capability`).toBeDefined()
      expect(ENTITLEMENT_CAPABILITY_MAP[capabilityKey], `capability ${capabilityKey} must exist in catalog`).toBeDefined()
    }
  })

  it('ORGANIZATION_FACETS lists exactly the canonical 9', () => {
    expect([...ORGANIZATION_FACETS].sort()).toEqual([...ACCOUNT_FACET_NAMES].sort())
  })

  it('FACET_TO_VIEW_CODE is total over the 9 canonical AccountFacetName values', () => {
    for (const facet of ACCOUNT_FACET_NAMES) {
      expect(FACET_TO_VIEW_CODE[facet], `facet ${facet} must map to a viewCode`).toBeTruthy()
    }
  })

  it('sensitive capabilities reference existing catalog entries', () => {
    for (const [, sensitiveKey] of Object.entries(FACET_TO_SENSITIVE_CAPABILITY_KEY)) {
      if (sensitiveKey) {
        expect(ENTITLEMENT_CAPABILITY_MAP[sensitiveKey], `sensitive capability ${sensitiveKey} must exist`).toBeDefined()
      }
    }
  })

  it('every organization.* capability has at least one valid action and module=organization', () => {
    const organizationCapabilities = Object.values(ENTITLEMENT_CAPABILITY_MAP).filter(
      capability => capability.module === 'organization'
    )

    // 11 originales TASK-611 (Organization Workspace projection facets) + 3 nuevas
    // TASK-872 (scim.eligibility_override.create / .delete + scim.backfill.execute) +
    // 5 nuevas TASK-877 (identity.reconciliation.{read, approve, reject, reassign, run})
    // = 19 total. Pin actualizado 2026-05-14 al detectar regression preexistente
    // (TASK-877 ship con módulo='organization' para las identity.reconciliation.*
    // sin actualizar este test → CI failing en cada commit posterior).
    expect(organizationCapabilities).toHaveLength(19)

    for (const capability of organizationCapabilities) {
      expect(capability.actions.length, `${capability.key} must have at least one action`).toBeGreaterThan(0)
      expect(capability.defaultScope, `${capability.key} must have a defaultScope`).toBeTruthy()
    }
  })
})
