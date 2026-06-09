// TASK-1045 — greenhouse/no-direct-gsap-in-views
//
// Enforces the Greenhouse Motion Primitive boundary: product views and
// components MUST NOT import the animation engine `gsap` / `@gsap/react`
// directly. They consume the canonical primitive `<Motion>` or the
// `useGreenhouseGSAP` hook from `@/components/greenhouse/motion` instead.
//
// Why: GSAP is an engine, not a design system. Direct imports in product
// surfaces fragment motion tokens (duration/easing), drop the baked-in
// `prefers-reduced-motion` contract, skip cleanup, and re-implement variants
// ad-hoc. The platform owns ONE governed motion family for the cinematic /
// orchestrated / scroll tier (simple hover/tap/toggle stays in CSS).
//
// Governed surfaces (rule active): src/views/**, src/app/**, src/components/**.
//
// Allowed (rule inactive — these legitimately own/wrap the engine):
//   - src/components/greenhouse/motion/**  (the motion primitive family itself,
//     incl. the portable core, variants and <Motion>)
//   - test / spec files
//   - this rule file + its tests
//
// Lower layers (src/lib/**, src/hooks/**) are out of the governed scope by
// design — same scope as no-direct-floating-ui-in-views.
//
// Mode `error` from commit-1: zero violations in governed surfaces today (the
// only prior gsap importers were the orphan `src/libs/GSAP*.tsx`, retired in
// this task; nothing in views/app/components touches gsap).
//
// Pattern source: no-direct-floating-ui-in-views.mjs (TASK-1033) — also an
// import-boundary rule with path-scoped activation + 3 import shapes.
//
// ADR: docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md

const GOVERNED_SURFACE_REGEX = /[/\\]src[/\\](views|app|components)[/\\]/

const MOTION_MODULE_REGEX = /[/\\]src[/\\]components[/\\]greenhouse[/\\]motion[/\\]/

const GSAP_REGEX = /^(gsap(\/|$)|@gsap(\/|$))/

const isGovernedSurfaceFile = filename => {
  // Skip test fixtures + the rule's own tests
  if (/[/\\]__tests__[/\\]/.test(filename)) return false
  if (/\.test\.(t|j)sx?$/.test(filename)) return false
  if (/\.spec\.(t|j)sx?$/.test(filename)) return false

  // The motion primitive family owns the engine — exempt
  if (MOTION_MODULE_REGEX.test(filename)) return false

  return GOVERNED_SURFACE_REGEX.test(filename)
}

const isGsapImport = source => typeof source === 'string' && GSAP_REGEX.test(source)

const HELPER_HINT = `
Product views and components do NOT import gsap / @gsap/react directly. Consume
the canonical motion primitive instead:

  import { Motion } from '@/components/greenhouse/motion'

  <Motion kind='listMount'>{rows}</Motion>
  <Motion variant='entrance' duration='medium'>{panel}</Motion>

For bespoke imperative sequences use the hook (scope + cleanup +
prefers-reduced-motion are handled for you):

  import { useGreenhouseGSAP } from '@/components/greenhouse/motion'

  useGreenhouseGSAP((ctx) => {
    if (ctx.reduced) return
    ctx.gsap.from('.row', { y: 12, autoAlpha: 0, stagger: 0.06 })
  }, { scope: ref })

The primitive centralizes motion tokens, the reduced-motion contract, cleanup
and plugin registration. If no variant covers your case, add a variant to the
motion module — do not wire gsap ad-hoc in a product surface. Simple
hover/tap/toggle/focus stays in CSS (the theme), not GSAP.

ADR: docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md
`.trim()

const buildMessage = source =>
  `Direct import of '${source}' in a product surface violates the Greenhouse Motion Primitive boundary. ${HELPER_HINT}`

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohibe imports directos de gsap/@gsap en views/app/components; consumir <Motion> o useGreenhouseGSAP (TASK-1045).',
      url: 'docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()

    if (!isGovernedSurfaceFile(filename)) return {}

    return {
      // Static ESM: import ... from 'gsap'
      ImportDeclaration(node) {
        const source = node.source && node.source.value

        if (!isGsapImport(source)) return

        context.report({ node: node.source, message: buildMessage(source) })
      },

      // Dynamic: import('gsap/ScrollTrigger')
      ImportExpression(node) {
        if (!node.source || node.source.type !== 'Literal' || typeof node.source.value !== 'string') {
          return
        }

        if (!isGsapImport(node.source.value)) return

        context.report({ node: node.source, message: buildMessage(node.source.value) })
      },

      // CommonJS: require('gsap')
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

        if (!isGsapImport(source)) return

        context.report({ node: node.arguments[0], message: buildMessage(source) })
      }
    }
  }
}
