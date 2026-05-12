// TASK-822 Slice 3 — tests for greenhouse/no-cross-domain-import-from-client-portal
//
// Validates the leaf-of-DAG enforcement across 4 import shapes:
//   - static ESM `import ... from '@/lib/client-portal/...'`
//   - dynamic `import('@/lib/client-portal/...')`
//   - relative paths reaching into client-portal from outside (`../client-portal/...`)
//   - CommonJS `require('@/lib/client-portal/...')`
//
// Override block: client_portal itself, src/app/**, src/views/**,
// src/components/**, tests, and the rule's own files are allowed.

import { RuleTester } from 'eslint'

import rule from '../no-cross-domain-import-from-client-portal.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

ruleTester.run('greenhouse/no-cross-domain-import-from-client-portal', rule, {
  valid: [
    // ✅ client-portal can import producer domains (BFF consumes upstream)
    {
      code: "import { getOrganizationExecutiveSnapshot } from '@/lib/account-360/organization-executive'",
      filename: '/repo/src/lib/client-portal/readers/curated/account-summary.ts',
      name: 'BFF curated re-export imports producer domain (allowed)'
    },
    // ✅ client-portal can import itself
    {
      code: "import type { ClientPortalReaderMeta } from '../../dto/reader-meta'",
      filename: '/repo/src/lib/client-portal/readers/curated/account-summary.ts',
      name: 'client-portal internal relative import (allowed)'
    },
    // ✅ UI surfaces can import client-portal (consumer side)
    {
      code: "import { getClientAccountSummary } from '@/lib/client-portal'",
      filename: '/repo/src/app/(dashboard)/cliente/account/page.tsx',
      name: 'UI consumer imports client-portal (allowed)'
    },
    {
      code: "import { something } from '@/lib/client-portal/readers/curated'",
      filename: '/repo/src/views/greenhouse/cliente/AccountView.tsx',
      name: 'view layer imports client-portal (allowed)'
    },
    {
      code: "import { something } from '@/lib/client-portal'",
      filename: '/repo/src/components/greenhouse/client-portal/AccountCard.tsx',
      name: 'component imports client-portal (allowed)'
    },
    // ✅ API routes can import client-portal
    {
      code: "import { getClientAccountSummary } from '@/lib/client-portal'",
      filename: '/repo/src/app/api/client-portal/account-summary/route.ts',
      name: 'API route imports client-portal (allowed)'
    },
    // ✅ producer domain imports OTHER producer domains (not client-portal — irrelevant)
    {
      code: "import { foo } from '@/lib/finance/income-payments-reader'",
      filename: '/repo/src/lib/agency/agency-queries.ts',
      name: 'producer domain imports another producer domain (irrelevant)'
    },
    // ✅ test files are exempt (override block)
    {
      code: "import { getClientAccountSummary } from '@/lib/client-portal'",
      filename: '/repo/src/lib/agency/agency-queries.test.ts',
      name: 'test files are exempt'
    },
    // ✅ files outside src/lib are not producer-domain files
    {
      code: "import { getClientAccountSummary } from '@/lib/client-portal'",
      filename: '/repo/scripts/some-script.ts',
      name: 'scripts are not producer-domain files (no violation)'
    }
  ],
  invalid: [
    // ❌ account-360 importing client-portal
    {
      code: "import { getCuratedAccountSummary } from '@/lib/client-portal/readers/curated/account-summary'",
      filename: '/repo/src/lib/account-360/organization-executive.ts',
      errors: 1,
      name: 'account-360 imports client-portal (forbidden)'
    },
    // ❌ agency importing client-portal barrel
    {
      code: "import { someMeta } from '@/lib/client-portal'",
      filename: '/repo/src/lib/agency/agency-queries.ts',
      errors: 1,
      name: 'agency imports client-portal barrel (forbidden)'
    },
    // ❌ ico-engine importing client-portal
    {
      code: "import { foo } from '@/lib/client-portal/readers/curated'",
      filename: '/repo/src/lib/ico-engine/read-metrics.ts',
      errors: 1,
      name: 'ico-engine imports client-portal (forbidden)'
    },
    // ❌ commercial importing client-portal
    {
      code: "import * as ClientPortal from '@/lib/client-portal'",
      filename: '/repo/src/lib/commercial/eligible-deals-reader.ts',
      errors: 1,
      name: 'commercial imports client-portal (forbidden)'
    },
    // ❌ finance importing client-portal
    {
      code: "import { type ClientPortalReaderMeta } from '@/lib/client-portal/dto/reader-meta'",
      filename: '/repo/src/lib/finance/expense-payments-reader.ts',
      errors: 1,
      name: 'finance imports client-portal types (forbidden)'
    },
    // ❌ delivery importing client-portal
    {
      code: "import { x } from '@/lib/client-portal'",
      filename: '/repo/src/lib/delivery/task-display.ts',
      errors: 1,
      name: 'delivery imports client-portal (forbidden)'
    },
    // ❌ identity importing client-portal
    {
      code: "import { x } from '@/lib/client-portal'",
      filename: '/repo/src/lib/identity/canonical-person.ts',
      errors: 1,
      name: 'identity imports client-portal (forbidden)'
    },
    // ❌ hr importing client-portal
    {
      code: "import { x } from '@/lib/client-portal'",
      filename: '/repo/src/lib/hr/some-helper.ts',
      errors: 1,
      name: 'hr imports client-portal (forbidden)'
    },
    // ❌ dynamic import from producer domain
    {
      code: "const m = await import('@/lib/client-portal')",
      filename: '/repo/src/lib/agency/agency-queries.ts',
      errors: 1,
      name: 'dynamic import from producer domain (forbidden)'
    },
    // ❌ require() from producer domain
    {
      code: "const { x } = require('@/lib/client-portal')",
      filename: '/repo/src/lib/finance/some-helper.ts',
      errors: 1,
      name: 'require from producer domain (forbidden)'
    },
    // ❌ relative path reaching into client-portal from producer domain
    {
      code: "import { x } from '../client-portal/index'",
      filename: '/repo/src/lib/account-360/some-helper.ts',
      errors: 1,
      name: 'relative ../client-portal/ traversal from producer domain (forbidden)'
    }
  ]
})
