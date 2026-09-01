// TASK-1693 follow-up — greenhouse/no-opacity-on-text
//
// Bloquea `opacity` literal < 1 en `sx`/`style` sobre elementos que llevan TEXTO.
//
// ═══ Por qué existe ═══
//
// Bajarle opacidad a un texto para "de-enfatizarlo" es la forma más silenciosa de
// romper el contraste: el color declarado sigue siendo el token correcto, así que
// nada en el código se ve mal, y el ratio real cae por debajo del 4.5:1 exigido.
//
// Caso fuente (2026-08-30, TASK-1693): un conteo dentro de un `ToggleButton` se
// pintó con `opacity: 0.75` para atenuarlo. axe lo marcó `color-contrast` SERIOUS
// en los SEIS frames del capture premium: **3.14:1** (foreground `#929099` sobre
// blanco) contra el 4.5:1 requerido. El lint estaba verde: `no-hardcoded-hex-color`
// no aplica (no hay HEX) y `no-fontsize-inline-typography` tampoco (no es tamaño).
// Lo atrapó axe, una capa después, y sólo porque el capture corrió.
//
// La forma canónica de de-enfatizar texto es un token de color con contraste ya
// verificado — `color: 'text.secondary'` / `'text.disabled'` — no una opacidad que
// nadie puede evaluar leyendo el código.
//
// ═══ Alcance, elegido para CERO falsos positivos ═══
//
// El problema de distinguir "texto" de "ícono/decoración" en un `<Box>` arbitrario
// es el mismo que resolvió `no-fontsize-inline-typography` acotándose a
// `<Typography>`. Acá se usan DOS criterios, ambos inequívocos:
//
//   1. El elemento es `<Typography>` / `<CustomTypography>` — siempre texto.
//   2. El elemento tiene hijos `JSXText` con contenido no vacío — o sea, texto
//      literal escrito en el JSX. `<Box sx={{opacity:.5}}>· {n}</Box>` cae acá por
//      el `· `; el caso fuente era exactamente eso.
//
// Queda FUERA a propósito: opacidad sobre íconos (`<i className='tabler-*'>`, sin
// hijos de texto), sobre contenedores puramente decorativos, y sobre elementos cuyo
// único hijo es una expresión (`<Box>{n}</Box>`) — ahí no se puede afirmar que sea
// texto sin adivinar, y una regla que adivina produce ruido y termina desactivada.
//
// Tampoco dispara con valores dinámicos (`opacity: theme => …`, variable,
// interpolación): esos pueden depender de estado y su evaluación es de review.
//
// Escapes legítimos: una transición de entrada/salida que anima opacidad NO debería
// escribirse como valor literal estático en `sx`; si de verdad hace falta, se
// declara con un `eslint-disable-next-line` y la razón al lado.
//
// Contrato: `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` (contraste AA)
// + `DESIGN.md` §Color. Verificador real del invariante: el gate de accesibilidad
// del GVC (`axe` con tags `wcag2aa`/`wcag21aa`). Esta regla NO lo reemplaza: lo
// adelanta al momento de escribir, para los dos casos donde es decidible sin
// renderizar.

const TYPOGRAPHY_NAMES = new Set(['Typography', 'CustomTypography'])

const isOpacityKey = property => {
  if (!property || property.type !== 'Property') return false

  const key = property.key

  if (!key) return false
  if (key.type === 'Identifier') return key.name === 'opacity'
  if (key.type === 'Literal') return key.value === 'opacity'

  return false
}

/** Valor literal de opacidad estrictamente menor a 1 (número o string numérica). */
const isLiteralOpacityBelowOne = node => {
  if (!node) return false

  let raw = null

  if (node.type === 'Literal') raw = node.value
  else if (node.type === 'TemplateLiteral' && node.expressions.length === 0) raw = node.quasis[0]?.value?.cooked

  if (raw === null || raw === undefined) return false

  const numeric = typeof raw === 'number' ? raw : Number.parseFloat(String(raw))

  return Number.isFinite(numeric) && numeric < 1
}

const findLiteralOpacity = objectExpression => {
  if (!objectExpression || objectExpression.type !== 'ObjectExpression') return null

  for (const property of objectExpression.properties) {
    if (isOpacityKey(property) && isLiteralOpacityBelowOne(property.value)) return property
  }

  return null
}

/** `sx={{…}}` y `sx={theme => ({…})}`. */
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

/** ¿El elemento tiene texto LITERAL escrito en el JSX? */
const hasLiteralTextChild = jsxElement => {
  if (!jsxElement || !Array.isArray(jsxElement.children)) return false

  return jsxElement.children.some(child => child.type === 'JSXText' && child.value.trim().length > 0)
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow literal opacity < 1 on text-bearing JSX. De-emphasise text with a contrast-checked color token (text.secondary / text.disabled), never with opacity.',
      recommended: true
    },
    schema: [],
    messages: {
      opacityOnText:
        'Bajarle `opacity` a un texto rompe el contraste en silencio: el token de color sigue siendo el correcto y el ratio real cae bajo 4.5:1 (caso fuente TASK-1693: 3.14:1, axe `color-contrast` serious en 6 frames). Usa un token de color con contraste verificado — `color: "text.secondary"` o `"text.disabled"`. Si la opacidad es de una transición y no de énfasis, decláralo con eslint-disable y la razón.'
    }
  },
  create(context) {
    const report = (jsxElement, openingElement) => {
      const name = openingElement.name && openingElement.name.name
      const isTypography = TYPOGRAPHY_NAMES.has(name)

      if (!isTypography && !hasLiteralTextChild(jsxElement)) return

      for (const attribute of openingElement.attributes) {
        if (attribute.type !== 'JSXAttribute') continue

        const attributeName = attribute.name && attribute.name.name

        if (attributeName !== 'sx' && attributeName !== 'style') continue

        const offending = findLiteralOpacity(resolveObjectExpression(attribute.value))

        if (offending) context.report({ node: offending, messageId: 'opacityOnText' })
      }
    }

    return {
      JSXElement(node) {
        report(node, node.openingElement)
      }
    }
  }
}
