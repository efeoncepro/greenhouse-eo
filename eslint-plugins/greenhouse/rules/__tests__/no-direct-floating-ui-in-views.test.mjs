// TASK-1033 — tests for greenhouse/no-direct-floating-ui-in-views
//
// Validates Floating Surface adoption enforcement across 3 import shapes:
//   - static ESM `import ... from '@floating-ui/react'`
//   - dynamic `import('@floating-ui/react')`
//   - CommonJS `require('@floating-ui/react')`
//
// Allowed: primitives (src/components/greenhouse/primitives/**), Vuexy menu
// infra (src/@menu/**), tests, and non-governed dirs (src/lib/**).

import { RuleTester } from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../no-direct-floating-ui-in-views.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

ruleTester.run('greenhouse/no-direct-floating-ui-in-views', rule, {
  valid: [
    // ✅ The primitive itself owns the engine
    {
      code: "import { useFloating, FloatingPortal } from '@floating-ui/react'",
      filename: '/repo/src/components/greenhouse/primitives/GreenhouseFloatingSurface.tsx',
      name: 'primitive owns the engine (allowed)'
    },
    // ✅ Other primitives (e.g. field provenance peek) own the engine
    {
      code: "import { useFloating } from '@floating-ui/react'",
      filename: '/repo/src/components/greenhouse/primitives/GreenhouseFieldProvenancePeek.tsx',
      name: 'sibling primitive owns the engine (allowed)'
    },
    // ✅ Legacy Vuexy menu infra (lives outside views/app/components)
    {
      code: "import { FloatingTree } from '@floating-ui/react'",
      filename: '/repo/src/@menu/components/vertical-menu/Menu.tsx',
      name: 'Vuexy menu infra (allowed)'
    },
    // ✅ Product view consuming the primitive (no engine import)
    {
      code: "import { GreenhouseFloatingSurface } from '@/components/greenhouse/primitives'",
      filename: '/repo/src/views/greenhouse/finance/SomeView.tsx',
      name: 'product view consumes the primitive (allowed)'
    },
    // ✅ Non-governed dir (src/lib) importing the engine is out of scope
    {
      code: "import { autoUpdate } from '@floating-ui/dom'",
      filename: '/repo/src/lib/some-helper.ts',
      name: 'src/lib is not a governed product surface (allowed)'
    },
    // ✅ Test files are exempt
    {
      code: "import { useFloating } from '@floating-ui/react'",
      filename: '/repo/src/views/greenhouse/finance/__tests__/SomeView.test.tsx',
      name: 'test file is exempt (allowed)'
    }
  ],
  invalid: [
    // ❌ Static import in a product view
    {
      code: "import { useFloating, FloatingPortal } from '@floating-ui/react'",
      filename: '/repo/src/views/greenhouse/finance/SomeView.tsx',
      name: 'static import in a view (error)',
      errors: 1
    },
    // ❌ Static import in a product component (non-primitive)
    {
      code: "import { offset } from '@floating-ui/dom'",
      filename: '/repo/src/components/greenhouse/pricing/CostProvenancePopover.tsx',
      name: 'static import in a non-primitive component (error)',
      errors: 1
    },
    // ❌ Static import in an app route
    {
      code: "import { useDismiss } from '@floating-ui/react'",
      filename: '/repo/src/app/(dashboard)/admin/page.tsx',
      name: 'static import in an app route (error)',
      errors: 1
    },
    // ❌ Dynamic import in a view
    {
      code: "const m = await import('@floating-ui/react')",
      filename: '/repo/src/views/greenhouse/agency/AgencyView.tsx',
      name: 'dynamic import in a view (error)',
      errors: 1
    },
    // ❌ require() in a component
    {
      code: "const { useFloating } = require('@floating-ui/react')",
      filename: '/repo/src/components/greenhouse/SomeWidget.tsx',
      name: 'require in a component (error)',
      errors: 1
    }
  ]
})
