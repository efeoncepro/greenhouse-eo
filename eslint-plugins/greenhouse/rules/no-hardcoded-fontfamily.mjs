// TASK-567 — greenhouse/no-hardcoded-fontfamily
//
// Bloquea fontFamily hardcodeada en UI productiva. El contrato tipografico
// canonico vive en src/components/theme/mergedTheme.ts (TASK-566) con dos
// familias activas: Poppins (display, h1-h4) + Geist (todo lo demas). Para
// IDs y montos existen variants semanticos `monoId`, `monoAmount`,
// `kpiValue` que aplican Geist Sans + tabular-nums. El prohibido absoluto
// es 'monospace' literal (el sistema NO usa Geist Mono ni ninguna familia
// monospace).
//
// La regla dispara cuando un Property con key fontFamily aparece dentro de
// un ObjectExpression scopeado a alguno de estos contextos:
//
//   1. JSXAttribute name `sx` o `style` (e.g. <Box sx={{ fontFamily: 'X' }}>)
//   2. CallExpression de `styled(...)` con argumento ObjectExpression
//   3. Argumento del helper `makeStyles`/`createStyles` (Vuexy / MUI v4)
//
// El value de fontFamily se evalua asi:
//
//   - Literal string                                     → SIEMPRE prohibido
//   - TemplateLiteral sin expresiones (template puro)    → SIEMPRE prohibido
//   - TemplateLiteral con interpolacion                  → permitido (dynamic)
//   - Identifier / MemberExpression / CallExpression     → permitido
//
// Mensajes accionables por familia detectada:
//
//   - 'monospace' / 'Menlo' / 'Consolas' / 'Courier'      → variant="monoId"|"monoAmount"
//   - 'Inter'  / var(--font-inter)                        → banned (TASK-566)
//   - 'DM Sans' / var(--font-dm-sans)                     → banned (TASK-566)
//   - 'Geist Mono'                                        → banned (TASK-566)
//   - 'Poppins' / var(--font-poppins)                     → use variant h1-h4
//   - 'Geist' / var(--font-geist)                         → ya es default, eliminar
//   - cualquier otro string                               → usar variant o theme.typography.fontFamily
//
// Spec: docs/tasks/to-do/TASK-567-typography-code-sweep-eslint-rule.md
// Theme contract: docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md §3
// Visual contract: DESIGN.md (raiz)

// CSS-wide values that pass through (browsers resolve them; not a banned family).
const ALLOWLIST_VALUES = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer', ''])

const MONOSPACE_NEEDLES = ['monospace', 'menlo', 'consolas', 'courier', 'sf mono', 'ui-monospace']
const BANNED_INTER = ['inter', '--font-inter']
const BANNED_DM_SANS = ['dm sans', '--font-dm-sans']
const BANNED_GEIST_MONO = ['geist mono']
const POPPINS_NEEDLES = ['poppins', '--font-poppins']
const GEIST_NEEDLES = ['geist', '--font-geist']

const lower = value => (typeof value === 'string' ? value.toLowerCase() : '')

const containsAny = (haystack, needles) => {
  const hay = lower(haystack)

  return needles.some(needle => hay.includes(needle))
}

const classifyLiteral = raw => {
  const value = lower(raw)

  if (containsAny(value, MONOSPACE_NEEDLES)) return 'monospace'
  if (containsAny(value, BANNED_GEIST_MONO)) return 'geistMono'
  if (containsAny(value, BANNED_INTER)) return 'inter'
  if (containsAny(value, BANNED_DM_SANS)) return 'dmSans'
  if (containsAny(value, POPPINS_NEEDLES)) return 'poppins'
  if (containsAny(value, GEIST_NEEDLES)) return 'geist'

  return 'generic'
}

const extractStringValue = node => {
  if (!node) return null

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return { kind: 'literal', value: node.value }
  }

  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    const cooked = node.quasis.map(q => q.value && q.value.cooked).join('')

    return { kind: 'template', value: cooked }
  }

  return null
}

const isFontFamilyKey = property => {
  if (!property || property.type !== 'Property') return false

  const key = property.key

  if (!key) return false

  if (key.type === 'Identifier') return key.name === 'fontFamily'
  if (key.type === 'Literal') return key.value === 'fontFamily'

  return false
}

const isInsideRelevantContext = property => {
  // The rule's scope is already constrained by the files glob in
  // eslint.config.mjs (src/views, src/components, src/app). Within that scope,
  // any Property with key fontFamily and a literal banned value is suspect.
  // We allow ALL contexts — JSXAttribute (sx/style), styled(...) calls,
  // makeStyles/createStyles, AND nested patterns like
  //   InputProps={{ sx: { fontFamily: 'monospace' } }}
  //   slotProps={{ root: { sx: { fontFamily: 'monospace' } } }}
  //   ECharts/ApexCharts config objects passed as props.
  //
  // The previous implementation walked the ancestor chain looking for sx/style
  // JSXAttributes, which missed nested `sx` keys inside other JSX props
  // (e.g. MUI TextField InputProps.sx). The simpler rule — "no banned literals
  // in any object literal in product UI code" — is more robust and matches
  // the contract intent: tokens or variants only, never raw font strings.
  //
  // Files that legitimately need raw fontFamily (theme source, emails, PDFs,
  // global-error pre-theme) are excluded via files glob in eslint.config.mjs.
  void property

  return true
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hardcoded fontFamily literals in product UI. Use Typography variants (monoId/monoAmount/kpiValue) or theme references (TASK-566/TASK-567 contract).',
      recommended: true
    },
    schema: [],
    messages: {
      monospace:
        "fontFamily: 'monospace' (or Menlo/Consolas/Courier) is banned in product UI. Use <Typography variant=\"monoId\"> for IDs or variant=\"monoAmount\" for numeric amounts (Geist Sans + tabular-nums). See TASK-567.",
      inter:
        "fontFamily 'Inter' / var(--font-inter) is banned (TASK-566 pivot to Geist). Drop the override; the default theme already applies Geist Sans. See TASK-567.",
      dmSans:
        "fontFamily 'DM Sans' / var(--font-dm-sans) is banned (TASK-566 pivot to Geist). Drop the override; the default theme already applies Geist Sans. See TASK-567.",
      geistMono:
        "fontFamily 'Geist Mono' is banned. Greenhouse explicitly avoids monospace families. Use <Typography variant=\"monoId\"|\"monoAmount\"> with Geist Sans + tabular-nums. See TASK-567.",
      poppins:
        "fontFamily 'Poppins' / var(--font-poppins) should not be hardcoded. Poppins applies automatically via <Typography variant=\"h1\"..\"h4\">. Drop this override. See TASK-567.",
      geist:
        "fontFamily 'Geist' / var(--font-geist) is the default. This override is redundant — drop it and the theme will apply Geist Sans automatically. See TASK-567.",
      generic:
        "Hardcoded fontFamily literals are banned in product UI. Use a Typography variant (monoId/monoAmount/kpiValue/h1-h6/body1-body2) or `theme.typography.fontFamily`. See DESIGN.md and TASK-567."
    }
  },
  create(context) {
    const checkLiteralValue = (valueNode, reportNode) => {
      const extracted = extractStringValue(valueNode)

      if (!extracted) return
      if (ALLOWLIST_VALUES.has(lower(extracted.value).trim())) return

      const messageId = classifyLiteral(extracted.value)

      context.report({
        node: reportNode || valueNode,
        messageId
      })
    }

    // Recursively descend into Conditional/Logical/JSXExpressionContainer values
    // so patterns like `fontFamily: cond ? 'monospace' : undefined` and
    // `fontFamily={cond ? 'monospace' : undefined}` still fire.
    const checkValueExpression = (valueNode, reportNode) => {
      if (!valueNode) return

      if (valueNode.type === 'JSXExpressionContainer') {
        checkValueExpression(valueNode.expression, reportNode)

        return
      }

      if (valueNode.type === 'ConditionalExpression') {
        checkValueExpression(valueNode.consequent, reportNode)
        checkValueExpression(valueNode.alternate, reportNode)

        return
      }

      if (valueNode.type === 'LogicalExpression') {
        checkValueExpression(valueNode.left, reportNode)
        checkValueExpression(valueNode.right, reportNode)

        return
      }

      checkLiteralValue(valueNode, reportNode || valueNode)
    }

    return {
      // Object literal property: { fontFamily: '...' } in sx/style/styled/etc.
      Property(node) {
        if (!isFontFamilyKey(node)) return
        if (!isInsideRelevantContext(node)) return

        checkValueExpression(node.value, node.value)
      },

      // JSX attribute shortcut: <Typography fontFamily='monospace'>
      // MUI Typography exposes fontFamily as a top-level prop equivalent to
      // sx.fontFamily, so the same contract applies.
      JSXAttribute(node) {
        const name = node.name && node.name.name

        if (name !== 'fontFamily') return

        checkValueExpression(node.value, node.value)
      }
    }
  }
}
