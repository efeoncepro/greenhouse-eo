import { RuleTester } from 'eslint'

import rule from '../no-inline-facet-visibility-check.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

ruleTester.run('greenhouse/no-inline-facet-visibility-check', rule, {
  valid: [
    {
      code: "import { resolveOrganizationWorkspaceProjection } from '@/lib/organization-workspace/projection'",
      filename: '/repo/src/app/(dashboard)/agency/organizations/[id]/page.tsx',
      name: 'page.tsx imports the canonical projection helper'
    },
    {
      code: "const facets = projection.visibleFacets",
      filename: '/repo/src/components/greenhouse/organization-workspace/OrganizationWorkspaceShell.tsx',
      name: 'shell consumes projection.visibleFacets without inline checks'
    },
    {
      code: "import { hasEntitlement } from '@/lib/entitlements/runtime'\nconst x = hasEntitlement(subject, 'home.atrisk.spaces', 'read')",
      filename: '/repo/src/views/greenhouse/home/HomeView.tsx',
      name: 'non-organization capability check is allowed'
    },
    {
      code: "const key = 'organization.identity'",
      filename: '/repo/src/lib/organization-workspace/projection.ts',
      name: 'canonical projection helper file is excluded from this lint rule via override block'
    }
  ],
  invalid: [
    {
      code: "import { hasEntitlement } from '@/lib/entitlements/runtime'\nconst visible = hasEntitlement(subject, 'organization.finance', 'read')",
      filename: '/repo/src/components/greenhouse/finance-clients/FinanceClientsCard.tsx',
      errors: 2,
      name: 'UI component imports hasEntitlement AND mentions organization.* capability'
    },
    {
      code: "const KEY = 'organization.crm'",
      filename: '/repo/src/views/greenhouse/agency/AgencyDashboard.tsx',
      errors: 1,
      name: 'UI view file references organization.* capability literal'
    },
    {
      code: "const cap = `organization.identity_sensitive`",
      filename: '/repo/src/app/(dashboard)/finance/clients/[id]/page.tsx',
      errors: 1,
      name: 'page.tsx uses organization.* capability key in a template literal'
    }
  ]
})
