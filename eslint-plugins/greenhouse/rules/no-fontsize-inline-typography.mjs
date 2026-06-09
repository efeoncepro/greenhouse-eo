// TASK-1038 — greenhouse/no-fontsize-inline-typography
//
// Bloquea `fontSize` literal inline en `<Typography>` (sx/style/prop). El
// contrato es: Typography usa SIEMPRE un variant del SoT (h1-h6/body1-2/caption/
// button/overline/monoId/monoAmount/kpiValue/subtitle1-2), NUNCA un tamaño
// inline. Si falta el tamaño, se agrega a `typographyScale`
// (`src/components/theme/typography-tokens.ts`), no inline.
//
// **Por qué scopeado a `<Typography>` (resuelve icon-vs-text):** el audit
// 2026-06-06 encontró ~1.351 `fontSize` inline en src/, pero la MAYORÍA son
// tamaños de ÍCONO (`<i className="tabler-*" style={{ fontSize: 18 }}>`,
// `<Box ...>` con un glyph) — legítimos. Distinguir ícono vs texto en un Box
// arbitrario es ambiguo. Pero `<Typography>` es SIEMPRE texto y NUNCA un ícono,
// así que `fontSize` inline ahí es inequívocamente el anti-patrón. La rule se
// limita a ese caso (cero falsos positivos de íconos). Los Box-con-texto quedan
// fuera de scope (juicio de review).
//
// Solo dispara con valores LITERALES (string '0.85rem' / número / template puro).
// `fontSize: theme => ...` / variable / interpolación = permitido (dinámico).
//
// Modo `warn` (76 archivos legacy al introducir — patrón de no-untokenized-copy
// TASK-265). Promover a `error` tras el sweep de migración.
//
// Excepciones (vía files glob en eslint.config.mjs): theme/, **/mockup/**
// (referencia de tamaños), tests, emails/, finance/pdf/.
//
// Spec: docs/tasks/in-progress/TASK-1038-typography-scale-redesign.md
// Contrato: CLAUDE.md "Typography System" + DESIGN.md §Typography + V1 §3

const TYPOGRAPHY_NAMES = new Set(['Typography', 'CustomTypography'])

const isFontSizeKey = property => {
  if (!property || property.type !== 'Property') return false

  const key = property.key

  if (!key) return false
  if (key.type === 'Identifier') return key.name === 'fontSize'
  if (key.type === 'Literal') return key.value === 'fontSize'

  return false
}

// Literal fontSize value: number, string ('0.85rem'/'14px'), or pure template.
const isLiteralFontSize = node => {
  if (!node) return false
  if (node.type === 'Literal') return typeof node.value === 'string' || typeof node.value === 'number'
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0

  return false
}

// Find a `fontSize` Property with a literal value inside an ObjectExpression.
const findLiteralFontSize = objectExpression => {
  if (!objectExpression || objectExpression.type !== 'ObjectExpression') return null

  for (const property of objectExpression.properties) {
    if (isFontSizeKey(property) && isLiteralFontSize(property.value)) {
      return property
    }
  }

  return null
}

// Resolve the ObjectExpression behind an sx/style attribute value.
// Handles `sx={{...}}` and `sx={theme => ({...})}` (arrow returning object).
const resolveObjectExpression = attributeValue => {
  if (!attributeValue || attributeValue.type !== 'JSXExpressionContainer') return null

  const expression = attributeValue.expression

  if (!expression) return null
  if (expression.type === 'ObjectExpression') return expression

  if (expression.type === 'ArrowFunctionExpression' && expression.body && expression.body.type === 'ObjectExpression') {
    return expression.body
  }

  return null
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow literal fontSize inline on <Typography>. Use a typography variant from the SoT (TASK-1036/1038); if a size is missing, add it to typographyScale.',
      recommended: true
    },
    schema: [],
    messages: {
      inlineFontSize:
        "<Typography> no debe usar fontSize inline — usá un variant del SoT (h4/h5/body1/body2/caption/button/overline/mono*/kpiValue/subtitle1). Si falta el tamaño, agregalo a typographyScale (src/components/theme/typography-tokens.ts). Ver CLAUDE.md 'Typography System'."
    }
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name && node.name.name

        if (!TYPOGRAPHY_NAMES.has(name)) return

        for (const attribute of node.attributes) {
          if (attribute.type !== 'JSXAttribute') continue

          const attributeName = attribute.name && attribute.name.name

          // sx / style objects
          if (attributeName === 'sx' || attributeName === 'style') {
            const objectExpression = resolveObjectExpression(attribute.value)
            const offending = findLiteralFontSize(objectExpression)

            if (offending) {
              context.report({ node: offending, messageId: 'inlineFontSize' })
            }
          }

          // direct prop: <Typography fontSize='0.85rem'>
          if (attributeName === 'fontSize') {
            const value =
              attribute.value && attribute.value.type === 'JSXExpressionContainer'
                ? attribute.value.expression
                : attribute.value

            if (isLiteralFontSize(value)) {
              context.report({ node: attribute, messageId: 'inlineFontSize' })
            }
          }
        }
      }
    }
  }
}
