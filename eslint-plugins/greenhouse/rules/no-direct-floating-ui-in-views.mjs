// TASK-1033 — greenhouse/no-direct-floating-ui-in-views
//
// Enforces the Greenhouse Floating Surface adoption rule: product views and
// components MUST NOT import the positioning engine `@floating-ui/*` directly.
// They consume the canonical primitive `GreenhouseFloatingSurface` from
// `@/components/greenhouse/primitives` instead.
//
// Why: Floating UI is an engine, not a design system. Direct imports in product
// surfaces fragment placement defaults, focus handling, dismissal, role and test
// hooks. The platform owns ONE governed primitive family for anchored contextual
// UI (popovers, menus, rich tooltips, evidence peeks, inline editors, validation
// bubbles, command previews).
//
// Governed surfaces (rule active): src/views/**, src/app/**, src/components/**.
//
// Allowed (rule inactive — these legitimately own/wrap the engine):
//   - src/components/greenhouse/primitives/**   (the primitive family itself,
//     incl. GreenhouseFloatingSurface, TotalsLadder, GreenhouseFieldProvenancePeek)
//   - src/@menu/**, src/@core/**, src/@layout/** (legacy Vuexy menu infra using
//     FloatingTree — these live outside views/app/components, so they never match)
//   - test / spec files
//   - this rule file + its tests
//
// Mode `error` from commit-1: zero violations in governed surfaces today (the
// two pilot consumers were migrated to the primitive in TASK-1033; all remaining
// @floating-ui importers are primitives or Vuexy infra).
//
// Pattern source: no-cross-domain-import-from-client-portal.mjs (TASK-822) —
// also an import-boundary rule with path-scoped activation + 3 import shapes.
//
// ADR: docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md
// Spec: docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md (Delta 2026-06-06).

const GOVERNED_SURFACE_REGEX = /[/\\]src[/\\](views|app|components)[/\\]/

const PRIMITIVES_REGEX = /[/\\]src[/\\]components[/\\]greenhouse[/\\]primitives[/\\]/

const FLOATING_UI_REGEX = /^@floating-ui\//

const isGovernedSurfaceFile = filename => {
  // Skip test fixtures + the rule's own tests
  if (/[/\\]__tests__[/\\]/.test(filename)) return false
  if (/\.test\.(t|j)sx?$/.test(filename)) return false
  if (/\.spec\.(t|j)sx?$/.test(filename)) return false

  // Primitives own the engine — exempt
  if (PRIMITIVES_REGEX.test(filename)) return false

  return GOVERNED_SURFACE_REGEX.test(filename)
}

const isFloatingUiImport = source => typeof source === 'string' && FLOATING_UI_REGEX.test(source)

const HELPER_HINT = `
Product views and components do NOT import @floating-ui/* directly. Consume the
canonical primitive instead:

  import { GreenhouseFloatingSurface } from '@/components/greenhouse/primitives'

  <GreenhouseFloatingSurface
    variant='evidencePeek'   // richTooltip | actionMenu | evidencePeek
                             // | inlineEditor | validationBubble | commandPreview
    kind='costProvenance'
    anchor={anchorProps => <button {...anchorProps}>Ver</button>}
    content={({ close }) => <Detail onClose={close} />}
  />

The primitive centralizes positioning (autoUpdate + offset + flip + shift),
focus, dismissal, role, motion and GVC hooks. If you need a behaviour that no
variant covers, add a variant to floating-surface-controller — do not wire the
engine ad-hoc in a product surface.

Exempt: the primitives themselves (src/components/greenhouse/primitives/**) and
legacy Vuexy menu infra (src/@menu/**).

ADR: docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md
`.trim()

const buildMessage = source =>
  `Direct import of '${source}' in a product surface violates the Greenhouse Floating Surface adoption rule. ${HELPER_HINT}`

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohibe imports directos de @floating-ui/* en views/app/components; consumir GreenhouseFloatingSurface (TASK-1033).',
      url: 'docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()

    if (!isGovernedSurfaceFile(filename)) return {}

    return {
      // Static ESM: import ... from '@floating-ui/react'
      ImportDeclaration(node) {
        const source = node.source && node.source.value

        if (!isFloatingUiImport(source)) return

        context.report({ node: node.source, message: buildMessage(source) })
      },

      // Dynamic: import('@floating-ui/react')
      ImportExpression(node) {
        if (!node.source || node.source.type !== 'Literal' || typeof node.source.value !== 'string') {
          return
        }

        if (!isFloatingUiImport(node.source.value)) return

        context.report({ node: node.source, message: buildMessage(node.source.value) })
      },

      // CommonJS: require('@floating-ui/react')
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

        if (!isFloatingUiImport(source)) return

        context.report({ node: node.arguments[0], message: buildMessage(source) })
      }
    }
  }
}
