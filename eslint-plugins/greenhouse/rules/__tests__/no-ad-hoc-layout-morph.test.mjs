// TASK-1119 — tests for greenhouse/no-ad-hoc-layout-morph
//
// Validates Composition Shell layout-region morph ownership:
//   - flags hand-assigned gh-region-* view-transition-name in governed surfaces
//   - does NOT flag the sanctioned TASK-525 element-identity transitions
//     (person-avatar-*, quote-identity-*, nexa-moment-*) — different namespace
//   - exempts the substrate, the motion module, the Lab, and tests

import { RuleTester } from 'eslint'

import rule from '../no-ad-hoc-layout-morph.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true }
    }
  }
})

const VIEW = '/repo/src/views/greenhouse/finance/SomeView.tsx'

ruleTester.run('greenhouse/no-ad-hoc-layout-morph', rule, {
  valid: [
    // ✅ Sanctioned TASK-525 element-identity transitions — different namespace, NOT flagged
    {
      code: 'const a = <Box sx={{ viewTransitionName: `person-avatar-${id}` }} />',
      filename: VIEW,
      name: 'TASK-525 person identity transition (allowed)'
    },
    {
      code: 'const a = <div style={{ viewTransitionName: "quote-identity-7" }} />',
      filename: VIEW,
      name: 'TASK-525 quote identity transition (allowed)'
    },
    {
      code: 'const vt = { viewTransitionName: `nexa-moment-lead-${vtId}` }',
      filename: VIEW,
      name: 'Nexa moment per-instance name (allowed — not gh-region)'
    },
    // ✅ The substrate itself owns the gh-region-* namespace
    {
      code: 'const vt = { viewTransitionName: `gh-region-lead-${id}` }',
      filename: '/repo/src/components/greenhouse/primitives/composition-shell/CompositionShell.tsx',
      name: 'substrate assigns gh-region-* (allowed)'
    },
    // ✅ The internal Lab specimen renders the substrate names
    {
      code: 'const vt = { viewTransitionName: "gh-region-primary-x" }',
      filename: '/repo/src/views/greenhouse/admin/design-system/composition-shell/CompositionShellLabView.tsx',
      name: 'design-system Lab (allowed)'
    },
    // ✅ Non-governed dir is out of scope
    {
      code: 'const vt = { viewTransitionName: "gh-region-lead-x" }',
      filename: '/repo/src/lib/some-helper.ts',
      name: 'src/lib is not a governed surface (allowed)'
    },
    // ✅ Test files are exempt
    {
      code: 'const vt = { viewTransitionName: "gh-region-lead-x" }',
      filename: '/repo/src/views/greenhouse/finance/__tests__/SomeView.test.tsx',
      name: 'test file is exempt (allowed)'
    }
  ],
  invalid: [
    // ❌ Hardcoded reserved namespace in a view (string literal)
    {
      code: 'const a = <Box sx={{ viewTransitionName: "gh-region-lead" }} />',
      filename: VIEW,
      name: 'hardcoded gh-region-lead literal in a view (error)',
      errors: 1
    },
    // ❌ Template literal with reserved namespace prefix
    {
      code: 'const a = <div style={{ viewTransitionName: `gh-region-primary-${id}` }} />',
      filename: VIEW,
      name: 'template gh-region-primary in a view (error)',
      errors: 1
    },
    // ❌ kebab-case CSS key form
    {
      code: 'const a = { "view-transition-name": "gh-region-aside-2" }',
      filename: '/repo/src/components/greenhouse/foo/Bar.tsx',
      name: 'view-transition-name kebab key in a component (error)',
      errors: 1
    }
  ]
})
