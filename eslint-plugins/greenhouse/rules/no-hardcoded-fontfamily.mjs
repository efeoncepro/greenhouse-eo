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
  // Walk up the AST to determine if the Property is inside an sx/style JSX
  // attribute, a styled(...) call, or a makeStyles/createStyles call. We scope
  // the rule to those contexts so theme override files (mergedTheme,
  // typography.ts) and unrelated object literals (test fixtures, payload
  // builders) do not trigger.
  let current = property.parent

  while (current) {
    if (current.type === 'JSXAttribute') {
      const name = current.name && current.name.name

      return name === 'sx' || name === 'style'
    }

    if (current.type === 'CallExpression') {
      const callee = current.callee

      if (!callee) return false

      // styled('h1')({ fontFamily }) o styled(Box)({ fontFamily })
      if (callee.type === 'Identifier' && callee.name === 'styled') return true

      // styled.h1({ fontFamily })
      if (
        callee.type === 'MemberExpression' &&
        callee.object &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'styled'
      ) {
        return true
      }

      // styled('h1')(...) — when styled('h1') itself returns a function and
      // we are evaluating its invocation argument
      if (
        callee.type === 'CallExpression' &&
        callee.callee &&
        callee.callee.type === 'Identifier' &&
        callee.callee.name === 'styled'
      ) {
        return true
      }

      if (callee.type === 'Identifier' && (callee.name === 'makeStyles' || callee.name === 'createStyles')) {
        return true
      }
    }

    current = current.parent
  }

  return false
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
    return {
      Property(node) {
        if (!isFontFamilyKey(node)) return
        if (!isInsideRelevantContext(node)) return

        const extracted = extractStringValue(node.value)

        if (!extracted) return

        const messageId = classifyLiteral(extracted.value)

        context.report({
          node: node.value,
          messageId
        })
      }
    }
  }
}
