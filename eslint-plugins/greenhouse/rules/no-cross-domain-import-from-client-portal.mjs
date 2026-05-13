// TASK-822 Slice 3 — greenhouse/no-cross-domain-import-from-client-portal
//
// Enforces the leaf-of-DAG invariant for `src/lib/client-portal/`:
// producer domains (account-360, agency, ico-engine, commercial, finance,
// delivery, identity, hr) MUST NOT import from `@/lib/client-portal/*` nor
// from relative paths resolving inside `src/lib/client-portal/`.
//
// Why: client_portal is a BFF / Anti-Corruption Layer. It consumes producer
// domains; producer domains never consume it. The inverse direction creates
// silent cycles (e.g. agency → client_portal → agency) that surface months
// later as build instability or hard-to-debug import order issues.
//
// Allowed (no rule violation):
//   - src/lib/client-portal/**  →  @/lib/{account-360,agency,...}     (BFF consumes producer)
//   - src/lib/client-portal/**  →  @/lib/client-portal/**             (internal imports)
//   - src/lib/client-portal/**  →  ./relative-path                    (internal)
//   - src/app/**, src/views/**, src/components/**  →  @/lib/client-portal/**  (consumers OK)
//
// Prohibited (rule reports error):
//   - src/lib/{account-360,agency,ico-engine,commercial,finance,delivery,identity,hr}/**
//     →  @/lib/client-portal/**
//
// Mode `error` from commit-1 because zero legitimate consumers in producer
// domains exist today (verified via grep at TASK-822 Slice 3 commit time).
//
// Override block in eslint.config.mjs:
//   - `src/lib/client-portal/**` (the module imports itself)
//   - this rule file + its tests
//
// Pattern source: no-inline-facet-visibility-check.mjs (TASK-611 Slice 7) —
// also a domain-boundary rule with override block + mode `error` from day 1.
//
// Spec: docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md §3.2.

const PRODUCER_DOMAIN_REGEX =
  /[/\\]src[/\\]lib[/\\](account-360|agency|ico-engine|commercial|finance|delivery|identity|hr)[/\\]/

const CLIENT_PORTAL_IMPORT_REGEXES = [
  // Absolute alias paths: @/lib/client-portal or @/lib/client-portal/<sub>
  /^@\/lib\/client-portal(\/|$)/,
  // Bare module paths (less common but defensive): src/lib/client-portal/...
  /^src\/lib\/client-portal(\/|$)/,
  // Relative paths reaching INTO client-portal from outside it. Conservative
  // pattern: any relative path containing /client-portal/ segment after some
  // ../ traversal. This catches `../client-portal/...`, `../../client-portal/...`,
  // etc. The override block exempts client-portal/** itself so internal
  // relative imports (`./dto`, `../readers`) won't fall here.
  /^(\.\.\/)+client-portal(\/|$)/
]

const isProducerDomainFile = filename => {
  // Skip test fixtures + the rule's own tests
  if (/[/\\]__tests__[/\\]/.test(filename)) return false
  if (/\.test\.(t|j)sx?$/.test(filename)) return false
  if (/\.spec\.(t|j)sx?$/.test(filename)) return false

  return PRODUCER_DOMAIN_REGEX.test(filename)
}

const isClientPortalImport = source => {
  if (typeof source !== 'string') return false

  return CLIENT_PORTAL_IMPORT_REGEXES.some(rx => rx.test(source))
}

const HELPER_HINT = `
client_portal is a Backend-for-Frontend (BFF) / Anti-Corruption Layer for the
'client' route group. It is a LEAF of the domain DAG: it consumes producer
domains, but producer domains MUST NOT consume it.

If you reached for @/lib/client-portal/* from a producer domain, one of these
is true:

  1. The reader you want lives in the wrong folder. Move it to the producer
     domain where the data is owned, then re-export it from
     src/lib/client-portal/readers/curated/ via the BFF.

  2. The caller is in the wrong place. UI / API surfaces under src/app/,
     src/views/, src/components/ may freely import @/lib/client-portal/*.

  3. The composition you want is BFF-only and should live as a native reader
     under src/lib/client-portal/readers/native/. Producer domains still
     never import it.

Spec: docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md §3.2
`.trim()

const buildMessage = source =>
  `Producer domain import of '${source}' violates the client_portal leaf-of-DAG invariant. ${HELPER_HINT}`

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohibe imports de @/lib/client-portal/* desde producer domains. client_portal es hoja del DAG (TASK-822).',
      url: 'docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()

    if (!isProducerDomainFile(filename)) return {}

    return {
      ImportDeclaration(node) {
        const source = node.source && node.source.value

        if (!isClientPortalImport(source)) return

        context.report({
          node: node.source,
          message: buildMessage(source)
        })
      },

      // Cover dynamic `import('@/lib/client-portal/...')` calls
      ImportExpression(node) {
        if (
          !node.source ||
          node.source.type !== 'Literal' ||
          typeof node.source.value !== 'string'
        ) {
          return
        }

        if (!isClientPortalImport(node.source.value)) return

        context.report({
          node: node.source,
          message: buildMessage(node.source.value)
        })
      },

      // Cover CommonJS-style `require('@/lib/client-portal/...')` calls
      // (rare in TS but defense-in-depth)
      CallExpression(node) {
        if (
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'require' ||
          node.arguments.length === 0 ||
          node.arguments[0].type !== 'Literal' ||
          typeof node.arguments[0].value !== 'string'
        ) {
          return
        }

        const source = node.arguments[0].value

        if (!isClientPortalImport(source)) return

        context.report({
          node: node.arguments[0],
          message: buildMessage(source)
        })
      }
    }
  }
}
