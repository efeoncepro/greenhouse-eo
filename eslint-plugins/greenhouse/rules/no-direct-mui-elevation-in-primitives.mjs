// TASK-1051 — greenhouse/no-direct-mui-elevation-in-primitives
//
// Enforces the Greenhouse semantic elevation boundary (TASK-1049): Greenhouse
// primitives MUST read an elevation ROLE from the theme
// (`theme.greenhouseElevation.<role>`), never a numeric MUI shadow index
// (`Paper elevation={6}` → `theme.shadows[6]`).
//
// Why: the MUI numeric scale is generic infrastructure, not a Greenhouse design
// contract. Picking `elevation={6}` by taste fragments depth across surfaces and
// re-introduces the heavy "2000s" drop shadow the platform retired. The SoT
// `src/components/theme/elevation-tokens.ts` owns the values; agents pick a role
// (`floating`, `raised`, `overlay`, `modal`), not a number.
//
// Governed surface (rule active): src/components/greenhouse/primitives/**.
//
// Detects two patterns:
//   1. `elevation={<n>}` with n >= 1 (JSX attribute). `elevation={0}` is allowed
//      (the canonical "no MUI shadow, depth from the token" form).
//   2. `theme.shadows[...]` / `t.shadows[...]` member access (the numeric scale).
//
// NOT flagged (out of TASK-1051 scope — kept off `error` to avoid breaking
// legitimate Vuexy-compat callsites):
//   - `var(--mui-customShadows-*)` strings and `theme.customShadows.*` (the Vuexy
//     compat layer; chart cards still use it — a future sweep migrates those).
//   - bespoke directional `boxShadow` strings (e.g. the ContextualSidecar
//     `adaptive` lane shadow) — a symmetric role can't express a directional cast.
//
// Allowed (rule inactive): test/spec files + this rule's own tests.
//
// Mode `error` from commit-1: TASK-1051 migrated the 4 prior callsites
// (InlineNumericEditor, ContextChip ×2, MetricTrendCard, ContextualSidecar), so
// the governed surface has zero violations today.
//
// Pattern source: no-direct-gsap-in-views.mjs (TASK-1045) — path-scoped boundary
// rule. ADR: docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md

const PRIMITIVES_SURFACE_REGEX = /[/\\]src[/\\]components[/\\]greenhouse[/\\]primitives[/\\]/

const isGovernedSurfaceFile = filename => {
  if (/[/\\]__tests__[/\\]/.test(filename)) return false
  if (/\.test\.(t|j)sx?$/.test(filename)) return false
  if (/\.spec\.(t|j)sx?$/.test(filename)) return false

  return PRIMITIVES_SURFACE_REGEX.test(filename)
}

const HELPER_HINT = `
Greenhouse primitives read an elevation ROLE from the theme, not a numeric MUI
shadow index. Replace it with the semantic token:

  // before
  <Paper elevation={6} />
  sx={theme => ({ boxShadow: theme.shadows[6] })}

  // after — pick the role by semantics (floating/raised/overlay/modal)
  <Paper elevation={0} sx={theme => ({
    boxShadow: theme.greenhouseElevation.floating.boxShadow,
    border: \`1px solid \${theme.greenhouseElevation.floating.borderColor}\`
  })} />

SoT: src/components/theme/elevation-tokens.ts. If no role fits, extend the SoT
(with DESIGN.md §Elevation + V1 §6 + the drift-guard in the same PR) — do not
reach for a numeric MUI shadow.

ADR: docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md
`.trim()

const ELEVATION_MESSAGE = `\`elevation={n}\` (n>=1) in a Greenhouse primitive uses the generic MUI shadow scale. ${HELPER_HINT}`

const SHADOWS_MESSAGE = `\`theme.shadows[...]\` in a Greenhouse primitive uses the generic MUI numeric shadow scale. ${HELPER_HINT}`

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohibe sombra directa MUI (elevation={n} / theme.shadows[n]) en primitives Greenhouse; consumir theme.greenhouseElevation.<role> (TASK-1049/1051).',
      url: 'docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()

    if (!isGovernedSurfaceFile(filename)) return {}

    return {
      // 1. JSX `elevation={<n>}` with n >= 1
      JSXAttribute(node) {
        if (!node.name || node.name.name !== 'elevation') return
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return

        const expr = node.value.expression

        if (expr && expr.type === 'Literal' && typeof expr.value === 'number' && expr.value >= 1) {
          context.report({ node, message: ELEVATION_MESSAGE })
        }
      },

      // 2. `theme.shadows` / `t.shadows` member access (the numeric scale)
      MemberExpression(node) {
        if (
          !node.computed &&
          node.property &&
          node.property.type === 'Identifier' &&
          node.property.name === 'shadows' &&
          node.object &&
          node.object.type === 'Identifier'
        ) {
          context.report({ node, message: SHADOWS_MESSAGE })
        }
      }
    }
  }
}
