// TASK-1119 — greenhouse/no-ad-hoc-layout-morph
//
// Enforces the Composition Shell ownership of the layout-region morph: product
// views and components MUST NOT hand-assign a `view-transition-name` in the
// reserved Composition Shell region namespace `gh-region-*`. The substrate owns
// the region grid + the FLIP morph between compositions; it scopes every region
// name per instance (regionViewTransitionName + useId) so two shells on one page
// never collide. Hand-wiring a `gh-region-*` name re-introduces the singleton
// collision bug class ("morph silencioso": two elements share a name → the View
// Transitions API skips the transition silently = a hard cut, no error).
//
// IMPORTANT — this rule is PRECISE on purpose. It does NOT flag the sanctioned
// TASK-525 same-document shared-element transitions (e.g. `person-avatar-*`,
// `quote-identity-*`, `nexa-moment-*`) — those are per-element identity
// continuity, a different governed pattern, in their own namespaces. Only the
// reserved `gh-region-*` namespace (owned by the substrate) is forbidden. This
// avoids the false-positive noise that a blanket `viewTransitionName` ban would
// create (CLAUDE.md: never patch a heuristic to silence a warning).
//
// Governed surfaces (rule active): src/views/**, src/app/**, src/components/**.
//
// Allowed (rule inactive — these legitimately own the namespace):
//   - src/components/greenhouse/primitives/composition-shell/**  (the substrate
//     itself — the ONLY legitimate assigner of gh-region-* names)
//   - src/components/greenhouse/motion/**  (motion primitive family)
//   - src/views/greenhouse/admin/design-system/**  (the internal Lab specimen)
//   - test / spec files + this rule's own tests
//
// To morph a page-level layout region, consume <CompositionShell> and declare a
// composition — do not hand-wire view-transition-name. For element-identity
// continuity (a card → its detail), use your own stable namespace via the
// TASK-525 startViewTransition helper, NOT gh-region-*.
//
// Mode `warn` (warn-first per TASK-1119); promotes to `error` after a sweep.
// Zero violations in governed surfaces today (only the substrate uses gh-region-*).
//
// Pattern source: no-direct-gsap-in-views.mjs (TASK-1045) — import/usage boundary
// rule with path-scoped activation. Here the "engine" is the reserved namespace.
//
// ADR: docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md

const GOVERNED_SURFACE_REGEX = /[/\\]src[/\\](views|app|components)[/\\]/

const COMPOSITION_SHELL_REGEX = /[/\\]src[/\\]components[/\\]greenhouse[/\\]primitives[/\\]composition-shell[/\\]/
const MOTION_MODULE_REGEX = /[/\\]src[/\\]components[/\\]greenhouse[/\\]motion[/\\]/
const DESIGN_SYSTEM_LAB_REGEX = /[/\\]src[/\\]views[/\\]greenhouse[/\\]admin[/\\]design-system[/\\]/

// Reserved Composition Shell region namespace (base names live in COMPOSITION_SHELL_REGION_META).
const RESERVED_NAMESPACE = 'gh-region-'

const isGovernedSurfaceFile = filename => {
  if (/[/\\]__tests__[/\\]/.test(filename)) return false
  if (/\.test\.(t|j)sx?$/.test(filename)) return false
  if (/\.spec\.(t|j)sx?$/.test(filename)) return false

  // The substrate, the motion family and the internal Lab own / legitimately render gh-region-* names.
  if (COMPOSITION_SHELL_REGEX.test(filename)) return false
  if (MOTION_MODULE_REGEX.test(filename)) return false
  if (DESIGN_SYSTEM_LAB_REGEX.test(filename)) return false

  return GOVERNED_SURFACE_REGEX.test(filename)
}

// True if the node is a `viewTransitionName` / 'view-transition-name' property key.
const isViewTransitionNameKey = key => {
  if (!key) return false
  if (key.type === 'Identifier') return key.name === 'viewTransitionName'
  if (key.type === 'Literal') return key.value === 'view-transition-name' || key.value === 'viewTransitionName'

  return false
}

// True if a statically-analyzable value contains the reserved namespace.
const valueClaimsReservedNamespace = value => {
  if (!value) return false

  if (value.type === 'Literal') {
    return typeof value.value === 'string' && value.value.includes(RESERVED_NAMESPACE)
  }

  // Template literal: `gh-region-lead-${id}` — check the static quasi text.
  if (value.type === 'TemplateLiteral') {
    return value.quasis.some(q => typeof q.value?.raw === 'string' && q.value.raw.includes(RESERVED_NAMESPACE))
  }

  return false
}

const HELPER_HINT = `
The reserved "gh-region-*" view-transition-name namespace is owned by the
Composition Shell. To morph a page-level layout region, consume the substrate:

  import { CompositionShell } from '@/components/greenhouse/primitives'

  <CompositionShell composition='leadPlusContext' regions={{ lead, primary }} />

The substrate scopes region names per instance (regionViewTransitionName + useId),
so the FLIP morph is correct and collision-free. Hand-assigning a gh-region-* name
re-introduces the singleton collision (two elements share a name → the View
Transitions API skips the transition silently).

For element-identity continuity (a card growing into its detail), use your OWN
stable namespace with the TASK-525 startViewTransition helper — not gh-region-*.

ADR: docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md
`.trim()

const MESSAGE = `Hand-assigning a reserved "gh-region-*" view-transition-name in a product surface violates Composition Shell ownership of the layout-region morph. ${HELPER_HINT}`

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohibe hand-wirear un view-transition-name del namespace reservado gh-region-* en views/app/components; consumir <CompositionShell> (TASK-1119).',
      url: 'docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()

    if (!isGovernedSurfaceFile(filename)) return {}

    return {
      Property(node) {
        if (!isViewTransitionNameKey(node.key)) return
        if (!valueClaimsReservedNamespace(node.value)) return

        context.report({ node, message: MESSAGE })
      },

      // JSX attribute form: style={{ viewTransitionName: 'gh-region-...' }} resolves to a Property above,
      // but also catch a direct JSX attribute literal: viewTransitionName="gh-region-..." (rare, defensive).
      JSXAttribute(node) {
        if (!node.name || node.name.type !== 'JSXIdentifier' || node.name.name !== 'viewTransitionName') return

        const value = node.value

        if (value && value.type === 'Literal' && typeof value.value === 'string' && value.value.includes(RESERVED_NAMESPACE)) {
          context.report({ node, message: MESSAGE })
        }
      }
    }
  }
}
