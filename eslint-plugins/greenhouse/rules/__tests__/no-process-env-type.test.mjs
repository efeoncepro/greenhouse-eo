import { RuleTester } from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../no-process-env-type.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

ruleTester.run('greenhouse/no-process-env-type', rule, {
  valid: [
    {
      code: "import type { EnvSource } from '@/types/env-source'\nexport const enabled = (env: EnvSource = process.env) => env.FLAG === 'true'",
      filename: '/repo/src/lib/growth/forms/flags.ts',
      name: 'injected env typed as EnvSource'
    },
    {
      code: "const env = (vars: Record<string, string> = {}): EnvSource => vars",
      filename: '/repo/src/lib/hiring/notifications/config.test.ts',
      name: 'test helper returning EnvSource without cast'
    },
    {
      code: "spawnSync('node', ['x'], { env: { ...process.env } as NodeJS.ProcessEnv })",
      filename: '/repo/scripts/frontend/lib/auth.ts',
      name: 'outside src/** is not governed'
    }
  ],
  invalid: [
    {
      code: 'export const enabled = (env: NodeJS.ProcessEnv = process.env) => env.FLAG === "true"',
      filename: '/repo/src/lib/growth/forms/flags.ts',
      name: 'parameter typed as NodeJS.ProcessEnv',
      errors: 1
    },
    {
      code: 'export const run = (options: { env?: NodeJS.ProcessEnv } = {}) => options.env',
      filename: '/repo/src/lib/growth/seo/track-keywords.ts',
      name: 'optional env inside an options object',
      errors: 1
    },
    {
      code: 'type ObservabilityEnv = Partial<NodeJS.ProcessEnv>',
      filename: '/repo/src/lib/cloud/observability.ts',
      name: 'type alias wrapping ProcessEnv',
      errors: 1
    },
    {
      code: "expect(isEnabled({ FLAG: 'true' } as NodeJS.ProcessEnv)).toBe(true)",
      filename: '/repo/src/lib/growth/forms/__tests__/flags.test.ts',
      name: 'cast in a test',
      errors: 1
    },
    {
      code: "expect(isEnabled({ FLAG: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true)",
      filename: '/repo/src/lib/growth/seo/__tests__/flags.test.ts',
      name: 'double cast in a test',
      errors: 1
    }
  ]
})
