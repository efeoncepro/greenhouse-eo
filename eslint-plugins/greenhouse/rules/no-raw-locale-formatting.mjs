// TASK-429 — greenhouse/no-raw-locale-formatting
//
// Guardrail incremental para que surfaces nuevas no vuelvan a formatear
// moneda, numeros o fechas con Intl/toLocale* directo. La primitive canonica
// vive en src/lib/format y encapsula locale, timezone operacional y fallbacks.

const RAW_INTL_FORMATTERS = new Set(['DateTimeFormat', 'NumberFormat', 'RelativeTimeFormat', 'PluralRules'])
const RAW_TO_LOCALE_METHODS = new Set(['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'])

const FORMAT_HELPER_HINT =
  'Usa helpers canónicos desde src/lib/format (formatCurrency, formatDate, formatDateTime, formatTime, formatNumber, formatPercent, formatISODateKey).'

const getPropertyName = property => {
  if (!property) return null
  if (property.type === 'Identifier') return property.name
  if (property.type === 'Literal' && typeof property.value === 'string') return property.value

  return null
}

const isIntlFormatterConstructor = callee => {
  if (!callee || callee.type !== 'MemberExpression') return false
  if (callee.object.type !== 'Identifier' || callee.object.name !== 'Intl') return false

  return RAW_INTL_FORMATTERS.has(getPropertyName(callee.property))
}

const isRawToLocaleCall = callee => {
  if (!callee || callee.type !== 'MemberExpression') return false

  return RAW_TO_LOCALE_METHODS.has(getPropertyName(callee.property))
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Evita Intl/toLocale* directo en surfaces del portal. Centralizar en src/lib/format (TASK-429).',
      url: 'docs/tasks/in-progress/TASK-429-locale-aware-formatting-utilities.md'
    },
    schema: []
  },

  create(context) {
    return {
      NewExpression(node) {
        if (!isIntlFormatterConstructor(node.callee)) return

        context.report({
          node,
          message: `Formato locale directo detectado (${context.sourceCode.getText(node.callee)}). ${FORMAT_HELPER_HINT}`
        })
      },

      CallExpression(node) {
        if (!isRawToLocaleCall(node.callee)) return

        context.report({
          node,
          message: `Formato toLocale* directo detectado (${getPropertyName(node.callee.property)}). ${FORMAT_HELPER_HINT}`
        })
      }
    }
  }
}
