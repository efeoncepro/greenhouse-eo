// TASK-1045 — tests for greenhouse/no-direct-gsap-in-views
//
// Validates Motion Primitive boundary enforcement across 3 import shapes:
//   - static ESM `import ... from 'gsap'`
//   - dynamic `import('gsap/ScrollTrigger')`
//   - CommonJS `require('gsap')`
//
// Allowed: the motion module (src/components/greenhouse/motion/**), tests, and
// non-governed dirs (src/lib/**, src/hooks/**).

import { RuleTester } from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../no-direct-gsap-in-views.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

ruleTester.run('greenhouse/no-direct-gsap-in-views', rule, {
  valid: [
    // ✅ The motion primitive family owns the engine
    {
      code: "import { gsap } from 'gsap'",
      filename: '/repo/src/components/greenhouse/motion/core/register.ts',
      name: 'motion core owns the engine (allowed)'
    },
    {
      code: "import { ScrollTrigger } from 'gsap/ScrollTrigger'",
      filename: '/repo/src/components/greenhouse/motion/variants.ts',
      name: 'motion variants own the engine (allowed)'
    },
    {
      code: "import { useGSAP } from '@gsap/react'",
      filename: '/repo/src/components/greenhouse/motion/core/use-greenhouse-gsap.ts',
      name: 'motion hook owns the engine (allowed)'
    },
    // ✅ Product view consuming the primitive (no engine import)
    {
      code: "import { Motion } from '@/components/greenhouse/motion'",
      filename: '/repo/src/views/greenhouse/finance/SomeView.tsx',
      name: 'product view consumes the primitive (allowed)'
    },
    // ✅ Non-governed dir (src/lib) is out of scope
    {
      code: "import { gsap } from 'gsap'",
      filename: '/repo/src/lib/some-helper.ts',
      name: 'src/lib is not a governed product surface (allowed)'
    },
    // ✅ Test files are exempt
    {
      code: "import { gsap } from 'gsap'",
      filename: '/repo/src/views/greenhouse/finance/__tests__/SomeView.test.tsx',
      name: 'test file is exempt (allowed)'
    }
  ],
  invalid: [
    // ❌ Static import in a product view
    {
      code: "import { gsap } from 'gsap'",
      filename: '/repo/src/views/greenhouse/finance/SomeView.tsx',
      name: 'static import in a view (error)',
      errors: 1
    },
    // ❌ @gsap/react in a non-motion component
    {
      code: "import { useGSAP } from '@gsap/react'",
      filename: '/repo/src/components/greenhouse/pricing/SomeWidget.tsx',
      name: 'static @gsap/react import in a non-motion component (error)',
      errors: 1
    },
    // ❌ Static import in an app route
    {
      code: "import { gsap } from 'gsap'",
      filename: '/repo/src/app/(dashboard)/admin/page.tsx',
      name: 'static import in an app route (error)',
      errors: 1
    },
    // ❌ Dynamic plugin import in a view
    {
      code: "const m = await import('gsap/ScrollTrigger')",
      filename: '/repo/src/views/greenhouse/agency/AgencyView.tsx',
      name: 'dynamic plugin import in a view (error)',
      errors: 1
    },
    // ❌ require() in a component
    {
      code: "const { gsap } = require('gsap')",
      filename: '/repo/src/components/greenhouse/SomeWidget.tsx',
      name: 'require in a component (error)',
      errors: 1
    }
  ]
})
