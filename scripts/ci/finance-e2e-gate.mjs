#!/usr/bin/env node
/**
 * TASK-773 Slice 6 — Finance Write-Path E2E Gate
 *
 * Detecta cuando un PR modifica handlers POST/PUT en src/app/api/finance/**\/route.ts
 * sin evidencia de verificación end-to-end. Previene la clase de bugs donde
 * "el endpoint funciona pero el downstream side effect (account_balance,
 * projection, UI display) calla" — root cause del incidente Figma 2026-05-03.
 *
 * Evidencia válida (cualquiera de estas):
 *   1. Algún commit del branch tiene `[downstream-verified: <flow-name>]`
 *      en el message body.
 *   2. Algún archivo `tests/e2e/smoke/finance-*.spec.ts` fue creado o
 *      modificado en el branch.
 *   3. El cambio NO modifica handlers POST/PUT (typo fixes, comentarios,
 *      formatting). El gate respeta refactors no-funcionales.
 *
 * Modes:
 *   - default (warn): emite warning estructurado, NO falla el CI. Sirve para
 *     adopción gradual. Salida exit=0 con stdout informativo.
 *   - --strict: emite error y falla el CI (exit=1). Activar después de un
 *     sprint de adopción.
 *
 * Uso local:
 *   pnpm finance:e2e-gate
 *   pnpm finance:e2e-gate --strict
 *   pnpm finance:e2e-gate --base=develop  (compara contra develop, default)
 *
 * Uso CI: agregar step en .github/workflows/ci.yml que ejecuta
 *   `pnpm finance:e2e-gate` (warn) o `pnpm finance:e2e-gate --strict`.
 *
 * Spec: docs/tasks/in-progress/TASK-773-outbox-publisher-cloud-scheduler-cutover.md
 */

import { execSync } from 'node:child_process'

const ARGS = process.argv.slice(2)
const STRICT_MODE = ARGS.includes('--strict')
const BASE_REF = (ARGS.find((a) => a.startsWith('--base='))?.split('=')[1] ?? 'develop').trim()

const FINANCE_ROUTE_PATTERN = /^src\/app\/api\/finance\/.+\/route\.ts$/
const FINANCE_E2E_PATTERN = /^tests\/e2e\/smoke\/finance-.+\.spec\.ts$/
const DOWNSTREAM_TAG_PATTERN = /\[downstream-verified:\s*[^\]]+\]/i
// POST/PUT/PATCH/DELETE handlers son los que tienen side effects downstream.
const WRITE_HANDLER_PATTERN = /^[\s+-]+export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\s*\(/m

const log = (level, msg) => {
  const prefix = level === 'error' ? '❌ ERROR' : level === 'warn' ? '⚠️  WARN' : 'ℹ️  INFO'

  console.log(`${prefix} [finance-e2e-gate] ${msg}`)
}

const exec = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()

const main = () => {
  // Resolve diff range
  let mergeBase

  try {
    mergeBase = exec(`git merge-base HEAD ${BASE_REF}`)
  } catch {
    log('info', `Cannot resolve merge-base with ${BASE_REF}; comparing against last commit. (Solo aplica en CI con history shallow.)`)
    mergeBase = 'HEAD~1'
  }

  // 1) Files changed
  let changedFiles
  try {
    changedFiles = exec(`git diff --name-only ${mergeBase}...HEAD`).split('\n').filter(Boolean)
  } catch (err) {
    log('info', `git diff failed (${err.message}). Skipping gate (probably first commit).`)
    process.exit(0)
  }

  const financeRoutesChanged = changedFiles.filter((f) => FINANCE_ROUTE_PATTERN.test(f))

  if (financeRoutesChanged.length === 0) {
    log('info', 'No finance route handlers changed. Gate skipped.')
    process.exit(0)
  }

  // 2) For each finance route changed, check if the diff actually adds/modifies
  //    a POST/PUT/PATCH/DELETE handler (not just imports/types/comments).
  const writeHandlersTouched = financeRoutesChanged.filter((file) => {
    try {
      const diff = exec(`git diff ${mergeBase}...HEAD -- ${file}`)

      return WRITE_HANDLER_PATTERN.test(diff)
    } catch {
      return false
    }
  })

  if (writeHandlersTouched.length === 0) {
    log('info', `Finance routes changed (${financeRoutesChanged.length}) but no POST/PUT/PATCH/DELETE handlers touched. Gate skipped (read-only or refactor).`)
    process.exit(0)
  }

  // 3) Look for evidence
  const e2eTestsChanged = changedFiles.filter((f) => FINANCE_E2E_PATTERN.test(f))

  let commitMessages = ''
  try {
    commitMessages = exec(`git log ${mergeBase}..HEAD --format=%B`)
  } catch {
    commitMessages = ''
  }

  const hasDownstreamTag = DOWNSTREAM_TAG_PATTERN.test(commitMessages)

  if (e2eTestsChanged.length > 0 || hasDownstreamTag) {
    log('info', `✓ Finance write-path verified. Touched ${writeHandlersTouched.length} write handler(s); evidence: ${e2eTestsChanged.length} E2E test(s) modified${hasDownstreamTag ? ', [downstream-verified] tag in commits' : ''}.`)
    process.exit(0)
  }

  // 4) Gate trips: emit findings
  const lines = [
    '',
    '═══════════════════════════════════════════════════════════════════',
    'TASK-773 — Finance Write-Path E2E Gate',
    '═══════════════════════════════════════════════════════════════════',
    '',
    `${writeHandlersTouched.length} finance write handler(s) modified without E2E evidence:`,
    ...writeHandlersTouched.map((f) => `  • ${f}`),
    '',
    'Required: at least ONE of these:',
    '  (a) Add or modify a smoke test in tests/e2e/smoke/finance-*.spec.ts',
    '  (b) Add a [downstream-verified: <flow-name>] tag to a commit message',
    '      Example: git commit -m "feat(finance): TASK-XXX [downstream-verified: cash-out-payment]"',
    '',
    'Why: bugs like the Figma 2026-05-03 incident (payment registered but TC',
    'no rebajada) happen when API contract works but downstream side effect',
    '(account_balance, projection, UI display) silently fails. The gate',
    'prevents this regression class.',
    '',
    'Canonical critical Finance flows (verify ANY change to these):',
    '  • Crear supplier → aparece en directorio sin 500',
    '  • Crear expense → aparece en /finance/expenses con sortDate correcto',
    '  • Registrar pago → expense.status=paid + account_balance refleja cargo',
    '                     + cash-out drawer ya no muestra el doc',
    '  • Anular payment → balance vuelve atrás',
    '',
    'Bypass legítimo (refactor sin business logic):',
    '  • Si el cambio es typo, comment, formatting → este gate detecta',
    '    "POST/PUT/PATCH/DELETE handler touched"; si SOLO cambian comments',
    '    o whitespace, considera marcarlo con [downstream-verified: refactor-only].',
    '',
    'Spec: docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md',
    '═══════════════════════════════════════════════════════════════════'
  ]

  const message = lines.join('\n')

  if (STRICT_MODE) {
    log('error', message)
    process.exit(1)
  } else {
    log('warn', message)
    process.exit(0)
  }
}

main()
