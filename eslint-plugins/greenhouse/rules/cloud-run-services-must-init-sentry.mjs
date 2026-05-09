// TASK-844 Slice 6 — greenhouse/cloud-run-services-must-init-sentry
//
// Bloquea archivos `services/<svc>/server.ts` (entrypoints de Cloud Run Node
// services) que importan `@/lib/**` SIN invocar `initSentryForService(...)`
// desde `services/_shared/sentry-init.ts`.
//
// El contract canónico (TASK-844 Slice 2-4):
//   1. Cada Cloud Run Node service inicializa Sentry como primera ejecución
//      después de imports, con `initSentryForService('<service-name>')`.
//   2. Sin esto, captureWithDomain (207 callsites en src/lib/**) opera ciegas
//      o crashea con `Sentry.captureException is not a function` (root cause
//      ISSUE-074 detectado en hubspot_services_intake projection 2026-05-09).
//
// Pattern fuente: TASK-743 (no-raw-table-without-shell), TASK-766
// (no-untokenized-fx-math), TASK-768 (no-untokenized-expense-type-for-analytics).
// AST vanilla, .mjs, mensaje accionable.
//
// Excepciones explícitas (override block en eslint.config.mjs):
//   - `services/_shared/**` — el helper canónico vive aquí, no necesita
//     auto-importarse.
//   - `services/<svc>/auth.ts`, `services/<svc>/cron-handler-wrapper.ts`,
//     `services/<svc>/<helper>.ts` — sub-modules del service NO son entrypoints;
//     `server.ts` es el único que necesita el init.
//   - Tests `*.test.ts` — exempt; tests no son entrypoints de runtime.
//   - Python services (`services/hubspot_greenhouse_integration/`) — fuera
//     del scope de la rule (.py, no .ts).
//
// Modo `error` desde el primer commit. Cero tolerancia: cada service.ts sin
// init es un blast radius latente (todos los errors capturados desaparecen).
//
// Spec: docs/tasks/in-progress/TASK-844-cross-runtime-observability-sentry-init.md

const SENTRY_INIT_IMPORT = /from\s+['"][./_shared]+\/sentry-init['"]/
const SENTRY_INIT_CALL = /\binitSentryForService\s*\(/
const LIB_IMPORT = /from\s+['"]@\/lib\//

const buildMessage = (filename, hasImport) => {
  const reason = !hasImport
    ? 'falta el import `import { initSentryForService } from \'../_shared/sentry-init\'`'
    : 'falta la invocación `initSentryForService(\'<service-name>\')` después de los imports'

  return (
    `Cloud Run service entrypoint ${filename} importa @/lib/** pero ${reason}. ` +
    'Sin initSentryForService, captureWithDomain opera ciega o crashea (root cause ISSUE-074). ' +
    'Spec: docs/tasks/in-progress/TASK-844-cross-runtime-observability-sentry-init.md'
  )
}

const isCloudRunServiceEntrypoint = (filename) => {
  if (!filename) return false

  // Match: services/<service-name>/server.ts (NOT services/_shared/, NOT subdirs).
  // Allow either forward (Linux/CI) or back slashes (Windows).
  return /[\\/]services[\\/](?!_shared[\\/])[^\\/]+[\\/]server\.ts$/.test(filename)
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Cloud Run Node service entrypoints (services/<svc>/server.ts) que importan @/lib/** deben invocar initSentryForService(name) antes de aceptar HTTP traffic.',
      url: 'docs/tasks/in-progress/TASK-844-cross-runtime-observability-sentry-init.md'
    },
    schema: []
  },

  create(context) {
    const filename = context.filename || context.getFilename?.() || ''

    if (!isCloudRunServiceEntrypoint(filename)) {
      return {}
    }

    let hasSentryInitImport = false
    let hasSentryInitCall = false
    let hasLibImport = false
    let programNode = null

    return {
      Program(node) {
        programNode = node
        const sourceCode = context.sourceCode || context.getSourceCode?.()
        const text = sourceCode.getText(node)

        hasSentryInitImport = SENTRY_INIT_IMPORT.test(text)
        hasSentryInitCall = SENTRY_INIT_CALL.test(text)
        hasLibImport = LIB_IMPORT.test(text)
      },

      'Program:exit'() {
        if (!hasLibImport) return // No @/lib/** imports → no risk
        if (hasSentryInitImport && hasSentryInitCall) return // Compliant

        context.report({
          node: programNode,
          message: buildMessage(filename, hasSentryInitImport)
        })
      }
    }
  }
}
