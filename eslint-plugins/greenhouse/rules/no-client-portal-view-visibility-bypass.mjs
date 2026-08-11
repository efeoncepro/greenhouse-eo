/**
 * TASK-1685 Slice 2 — La visibilidad de una vista `cliente.*` se decide en UN solo lugar.
 *
 * `ISSUE-148` midió lo que pasa cuando no: el menú preguntaba por el ROL
 * (`authorizedViews`, derivado de `role_view_assignments`) y el page guard preguntaba por el
 * MÓDULO contratado. Ninguna de las dos mitades podía observar a la otra, así que el defecto
 * —36 enlaces que el menú ofrecía y la puerta negaba, sobre 8 de 8 usuarios cliente— vivió
 * meses sin que nadie lo notara. No lo atrapaba ningún type check ni ningún test, porque cada
 * lado era internamente correcto.
 *
 * Esta regla impide que la segunda fuente vuelva: preguntar por un viewCode `cliente.*` a
 * través del carril de rol es reintroducir exactamente el patrón que la task cerró.
 *
 * ## Qué detecta
 *
 * Un viewCode literal que empiece con `cliente.` pasado a cualquiera de los helpers del
 * carril de rol: `canSeeView`, `canSeeAnyView`, `hasAuthorizedViewCode`,
 * `hasAnyAuthorizedViewCode`, o un `authorizedViews.includes(...)` directo.
 *
 * ## Qué NO detecta, a propósito
 *
 * - viewCodes de otros routeGroups (`mi_ficha.*`, `gestion.*`, …). El carril de rol sigue
 *   siendo el correcto para el portal interno; esta decisión es sólo del portal cliente.
 * - viewCodes que no son literales. Una variable no se puede clasificar estáticamente, y
 *   perseguirla produciría falsos positivos sobre código legítimo. La señal
 *   `identity.client_portal.menu_gate_divergence` cubre esa mitad en runtime — defensa en
 *   capas, no una capa pretendiendo ser todas.
 *
 * ## Cómo se arregla
 *
 * En el servidor: `canOpenClientPortalView` de
 * `@/lib/client-portal/visibility/resolve-client-portal-visibility`.
 * En el cliente: el hook `useClientPortalViewVisibility` de
 * `@/lib/client-portal/visibility/client-portal-visibility-context`.
 *
 * Escape hatch: `// client-portal-visibility-allowed: <razón>` adyacente. Existe para código
 * que genuinamente audita el carril de rol (los propios readers de governance), no para
 * destrabar un consumer.
 */

const ROLE_RAIL_HELPERS = new Set([
  'canSeeView',
  'canSeeAnyView',
  'hasAuthorizedViewCode',
  'hasAnyAuthorizedViewCode'
])

const CLIENT_VIEW_PREFIX = 'cliente.'

const MESSAGE =
  'Visibilidad de una vista `cliente.*` decidida por el carril de ROL. El rol no gobierna vistas del portal cliente (TASK-1685, decisión (a′)): el módulo contratado autoriza y un `revoke` per-persona excluye. Usa `canOpenClientPortalView` (servidor) o `useClientPortalViewVisibility` (cliente). Reintroducir el carril de rol acá es el defecto que ISSUE-148 midió en 36 enlaces muertos.'

/** El módulo dueño del primitive puede hablar de lo que quiera: es la fuente. */
const isOwnerModule = filename => filename.replace(/\\/g, '/').includes('/lib/client-portal/visibility/')

const MARKER = /client-portal-visibility-allowed:/i

/**
 * Busca el marker en el nodo y en sus ancestros hasta la sentencia contenedora.
 *
 * Mirar sólo el nodo sería una trampa: en `const x = helper({ … })` el token anterior a la
 * llamada es el `=`, así que un comentario escrito arriba de la sentencia —que es donde
 * cualquiera lo escribe— no se vería, y el escape hatch parecería roto.
 */
const hasOverrideMarker = (sourceCode, node) => {
  let current = node

  while (current) {
    const comments = [...sourceCode.getCommentsBefore(current), ...sourceCode.getCommentsAfter(current)]

    if (comments.some(comment => MARKER.test(comment.value))) return true

    if (
      current.type === 'ExpressionStatement' ||
      current.type === 'VariableDeclaration' ||
      current.type === 'ReturnStatement' ||
      current.type === 'IfStatement' ||
      current.type === 'Property'
    ) {
      return false
    }

    current = current.parent
  }

  return false
}

const isClientViewLiteral = node =>
  node && node.type === 'Literal' && typeof node.value === 'string' && node.value.startsWith(CLIENT_VIEW_PREFIX)

/** `['cliente.a', 'cliente.b']` — la forma que toman los helpers `*Any*`. */
const isClientViewArray = node =>
  node && node.type === 'ArrayExpression' && node.elements.some(element => isClientViewLiteral(element))

/**
 * `{ viewCode: 'cliente.x', … }` / `{ viewCodes: ['cliente.x'], … }` — la forma de objeto de
 * opciones que usan `hasAuthorizedViewCode` y `hasAnyAuthorizedViewCode`.
 *
 * Se evalúa **sólo como argumento de esos helpers**, nunca suelto. Un `viewCode: 'cliente.x'`
 * dentro de un registry, un manifest o una fixture de test es un DATO describiendo una vista,
 * no una decisión de visibilidad — marcarlo produciría decenas de falsos positivos sobre
 * código que no decide nada.
 */
const isClientViewOptionsObject = node =>
  node &&
  node.type === 'ObjectExpression' &&
  node.properties.some(property => {
    if (property.type !== 'Property' || !property.key) return false

    const keyName = property.key.name || property.key.value

    if (keyName !== 'viewCode' && keyName !== 'viewCodes') return false

    return isClientViewLiteral(property.value) || isClientViewArray(property.value)
  })

/** Resuelve el nombre invocado, soportando `obj.helper(...)` y `helper(...)`. */
const resolveCalleeName = callee => {
  if (!callee) return null

  let current = callee

  if (current.type === 'ChainExpression') current = current.expression

  if (current.type === 'Identifier') return current.name

  if (current.type === 'MemberExpression' && current.property && current.property.name) {
    return current.property.name
  }

  return null
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe decidir la visibilidad de una vista `cliente.*` desde el carril de rol (authorizedViews / role_view_assignments). El primitive canónico es `canSeeClientPortalView` (TASK-1685).',
      url: 'docs/tasks/in-progress/TASK-1685-client-portal-single-visibility-primitive.md'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()

    if (isOwnerModule(filename)) return {}

    const sourceCode = context.getSourceCode()

    const report = node => {
      if (hasOverrideMarker(sourceCode, node)) return

      context.report({ node, message: MESSAGE })
    }

    return {
      CallExpression(node) {
        const calleeName = resolveCalleeName(node.callee)

        if (!calleeName) return

        // `canSeeView('cliente.x', …)` y familia.
        if (ROLE_RAIL_HELPERS.has(calleeName)) {
          const hasClientView = node.arguments.some(
            argument =>
              isClientViewLiteral(argument) ||
              isClientViewArray(argument) ||
              isClientViewOptionsObject(argument)
          )

          if (hasClientView) report(node)

          return
        }

        // `authorizedViews.includes('cliente.x')` — el carril de rol sin intermediario.
        if (calleeName !== 'includes') return

        let callee = node.callee

        if (callee.type === 'ChainExpression') callee = callee.expression

        if (callee.type !== 'MemberExpression') return

        let object = callee.object

        if (object && object.type === 'ChainExpression') object = object.expression

        const objectName =
          object && (object.type === 'Identifier' ? object.name : object.property && object.property.name)

        if (objectName !== 'authorizedViews') return

        if (node.arguments.some(argument => isClientViewLiteral(argument))) report(node)
      }
    }
  }
}
