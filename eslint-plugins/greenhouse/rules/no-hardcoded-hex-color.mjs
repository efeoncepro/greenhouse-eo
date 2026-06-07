// greenhouse/no-hardcoded-hex-color
//
// Bloquea colores HEX hardcodeados en UI productiva. Cuando se implementa un
// diseño (especialmente desde Figma), el color NO se transcribe crudo: se mapea
// a un token del sistema. Source of truth: `theme.palette.*` / `theme.axis.*` /
// `var(--mui-palette-*)` (AXIS Figma `yyMksCoijfMaIoYplXKZaR` → `axis-tokens.ts`
// / `axis-semantic.ts`). Figma es intención, no valores literales.
//
// Contrato canonico: "Figma Implementation Contract" en CLAUDE.md/AGENTS.md +
// DESIGN.md (raiz) + design-system-governance skill.
//
// La regla dispara cuando un string literal (o template puro sin interpolacion)
// que contiene un color HEX (#rgb / #rgba / #rrggbb / #rrggbbaa) aparece como:
//
//   1. value de un Property en un ObjectExpression (sx/style/styled/makeStyles,
//      incluyendo anidados como InputProps.sx / slotProps.root.sx)
//   2. value de un JSXAttribute (e.g. color='#fff', fill='#0a0a0a')
//
// Atrapa tambien HEX embebido en gradientes / box-shadow / borders compuestos
// (e.g. '0 2px 4px #00000020', 'linear-gradient(#fff, #000)').
//
// Valor evaluado:
//   - Literal string con HEX                          → prohibido
//   - TemplateLiteral sin expresiones, con HEX        → prohibido
//   - TemplateLiteral con interpolacion / Identifier  → permitido (dynamic)
//
// Keys/attrs que NUNCA son color (anchors, ids, svg path) se saltan para evitar
// falsos positivos con anchors tipo href="#abc".
//
// Files que legitimamente usan HEX (theme source, tokens AXIS, emails, PDFs,
// global-error pre-theme, labs internos del design-system, mockups) quedan
// exentos via files glob en eslint.config.mjs.

// Color HEX: # + exactamente 3, 4, 6 u 8 dígitos hex, no seguido de otro hex.
const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/

// Keys / JSX attribute names que nunca portan un color (evita anchors/ids/svg).
const NON_COLOR_KEYS = new Set([
  'href',
  'to',
  'id',
  'name',
  'key',
  'htmlFor',
  'rel',
  'target',
  'src',
  'alt',
  'className',
  'd',
  'points',
  'viewBox',
  'xmlns',
  'content',
  'data-capture',
  'dataCapture'
])

const containsHex = value => typeof value === 'string' && HEX_COLOR_RE.test(value)

const extractStringValue = node => {
  if (!node) return null

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value
  }

  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map(q => q.value && q.value.cooked).join('')
  }

  return null
}

const keyName = property => {
  const key = property.key

  if (!key) return null
  if (key.type === 'Identifier') return key.name
  if (key.type === 'Literal') return String(key.value)

  return null
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hardcoded HEX colors in product UI. Map design colors to theme tokens (theme.palette.* / theme.axis.* / var(--mui-palette-*)) — never transcribe raw hex from Figma.',
      recommended: true
    },
    schema: [],
    messages: {
      hardcodedHex:
        "Color HEX hardcodeado ('{{value}}') prohibido en UI de producto. Mapeá el color a un token del sistema: theme.palette.* / theme.axis.* / var(--mui-palette-*). Figma es intención, no valores literales — nunca transcribas el hex crudo. Ver DESIGN.md + Figma Implementation Contract (CLAUDE.md)."
    }
  },
  create(context) {
    const report = (value, node) => {
      context.report({
        node,
        messageId: 'hardcodedHex',
        data: { value: value.length > 40 ? `${value.slice(0, 37)}...` : value }
      })
    }

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

      const str = extractStringValue(valueNode)

      if (str && containsHex(str)) {
        const match = str.match(HEX_COLOR_RE)

        report(match ? match[0] : str, reportNode || valueNode)
      }
    }

    return {
      Property(node) {
        if (node.type !== 'Property') return

        const name = keyName(node)

        if (name && NON_COLOR_KEYS.has(name)) return

        checkValueExpression(node.value, node.value)
      },

      JSXAttribute(node) {
        const name = node.name && node.name.name

        if (typeof name === 'string' && NON_COLOR_KEYS.has(name)) return

        checkValueExpression(node.value, node.value)
      }
    }
  }
}
