// TASK-844 Slice 6 — tests para greenhouse/cloud-run-services-must-init-sentry.
//
// Verifica que la rule:
//   1. Reporta cuando services/<svc>/server.ts importa @/lib/** sin
//      initSentryForService import + call.
//   2. Acepta server.ts compliant (import + call presentes).
//   3. Acepta server.ts que NO importa @/lib/** (no-risk).
//   4. Ignora archivos fuera del scope (services/_shared/, services/<svc>/auth.ts,
//      tests, src/, etc.).
//
// Pattern heredado de no-untokenized-fx-math.test.mjs.

import { RuleTester } from 'eslint'

import rule from '../cloud-run-services-must-init-sentry.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

const COMPLIANT_SERVER = `
import { createServer } from 'node:http'

import { initSentryForService } from '../_shared/sentry-init'
import { processReactiveEvents } from '@/lib/sync/reactive-consumer'

initSentryForService('ops-worker')

const PORT = 8080
`.trim()

const SERVER_NO_LIB_IMPORT = `
import { createServer } from 'node:http'

const PORT = 8080
const server = createServer(() => {})
`.trim()

const SERVER_MISSING_INIT_IMPORT = `
import { createServer } from 'node:http'
import { processReactiveEvents } from '@/lib/sync/reactive-consumer'

const PORT = 8080
`.trim()

const SERVER_IMPORT_NO_CALL = `
import { createServer } from 'node:http'

import { initSentryForService } from '../_shared/sentry-init'
import { processReactiveEvents } from '@/lib/sync/reactive-consumer'

const PORT = 8080
`.trim()

const validCases = [
  {
    code: COMPLIANT_SERVER,
    filename: '/repo/services/ops-worker/server.ts',
    name: 'compliant: import + call presentes'
  },
  {
    code: SERVER_NO_LIB_IMPORT,
    filename: '/repo/services/ops-worker/server.ts',
    name: 'no @/lib/** imports → no risk'
  },
  {
    code: SERVER_MISSING_INIT_IMPORT,
    filename: '/repo/services/_shared/sentry-init.ts',
    name: 'services/_shared/ scope: exempt'
  },
  {
    code: SERVER_MISSING_INIT_IMPORT,
    filename: '/repo/services/ops-worker/auth.ts',
    name: 'sub-module (auth.ts) NOT entrypoint: exempt'
  },
  {
    code: SERVER_MISSING_INIT_IMPORT,
    filename: '/repo/services/ops-worker/cron-handler-wrapper.ts',
    name: 'sub-module (cron-handler-wrapper.ts) NOT entrypoint: exempt'
  },
  {
    code: SERVER_MISSING_INIT_IMPORT,
    filename: '/repo/src/lib/sync/projections/index.ts',
    name: 'src/lib/ scope: not Cloud Run entrypoint, exempt'
  },
  {
    code: SERVER_MISSING_INIT_IMPORT,
    filename: '/repo/services/ops-worker/server.test.ts',
    name: 'tests are NOT runtime entrypoints — exempt (no .test.ts in regex)'
  }
]

const invalidCases = [
  {
    code: SERVER_MISSING_INIT_IMPORT,
    filename: '/repo/services/ops-worker/server.ts',
    name: 'server.ts importa @/lib/** sin import ni call → ERROR',
    errors: [{ message: /falta el import.*sentry-init/ }]
  },
  {
    code: SERVER_IMPORT_NO_CALL,
    filename: '/repo/services/commercial-cost-worker/server.ts',
    name: 'server.ts tiene import pero no la invocación → ERROR',
    errors: [{ message: /falta la invocación/ }]
  },
  {
    code: SERVER_MISSING_INIT_IMPORT,
    filename: '/repo/services/ico-batch/server.ts',
    name: 'ico-batch server.ts sin init → ERROR',
    errors: [{ message: /falta el import.*sentry-init/ }]
  }
]

ruleTester.run('cloud-run-services-must-init-sentry', rule, {
  valid: validCases,
  invalid: invalidCases
})

console.log('✓ cloud-run-services-must-init-sentry tests passed')
