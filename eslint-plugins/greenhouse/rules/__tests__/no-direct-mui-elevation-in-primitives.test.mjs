// TASK-1051 — tests for greenhouse/no-direct-mui-elevation-in-primitives
//
// Validates the semantic-elevation boundary in Greenhouse primitives:
//   - `elevation={n}` n>=1  → flagged
//   - `theme.shadows[n]` / `t.shadows[n]` → flagged
//   - `elevation={0}` + `theme.greenhouseElevation.<role>` → allowed
//   - non-primitive surfaces + tests → not governed

import { RuleTester } from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../no-direct-mui-elevation-in-primitives.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } }
  }
})

const PRIMITIVE = '/repo/src/components/greenhouse/primitives/Sample.tsx'

ruleTester.run('greenhouse/no-direct-mui-elevation-in-primitives', rule, {
  valid: [
    {
      code: 'const x = <Paper elevation={0} />',
      filename: PRIMITIVE,
      name: 'elevation={0} is the canonical no-MUI-shadow form'
    },
    {
      code: 'const sx = (theme) => ({ boxShadow: theme.greenhouseElevation.floating.boxShadow })',
      filename: PRIMITIVE,
      name: 'semantic role token is allowed'
    },
    {
      code: 'const sx = (theme) => ({ borderColor: theme.greenhouseElevation.raised.borderColor })',
      filename: PRIMITIVE,
      name: 'raised role token is allowed'
    },
    // Not governed: non-primitive surfaces may use the MUI scale (legacy/compat)
    {
      code: 'const sx = (theme) => ({ boxShadow: theme.shadows[6] })',
      filename: '/repo/src/views/greenhouse/finance/SomeView.tsx',
      name: 'view surface is not governed by this rule'
    },
    {
      code: 'const x = <Paper elevation={6} />',
      filename: '/repo/src/@core/components/customizer/index.tsx',
      name: 'Vuexy @core is legacy/allowed'
    },
    // Not governed: the primitive test files themselves
    {
      code: 'const sx = (theme) => ({ boxShadow: theme.shadows[6] })',
      filename: '/repo/src/components/greenhouse/primitives/__tests__/Sample.test.tsx',
      name: 'primitive tests are exempt'
    }
  ],
  invalid: [
    {
      code: 'const x = <Paper elevation={6} />',
      filename: PRIMITIVE,
      errors: 1,
      name: 'elevation={6} in a primitive is flagged'
    },
    {
      code: 'const x = <Paper elevation={1} />',
      filename: PRIMITIVE,
      errors: 1,
      name: 'elevation={1} in a primitive is flagged'
    },
    {
      code: 'const sx = (theme) => ({ boxShadow: theme.shadows[6] })',
      filename: PRIMITIVE,
      errors: 1,
      name: 'theme.shadows[6] in a primitive is flagged'
    },
    {
      code: 'const sx = (t) => ({ boxShadow: t.shadows[2] })',
      filename: PRIMITIVE,
      errors: 1,
      name: 't.shadows[2] in a primitive is flagged'
    }
  ]
})
