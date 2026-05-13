// TASK-827 Slice 7 — greenhouse/no-untokenized-business-line-branching
//
// Detecta branching legacy en surfaces UI (components, views, app) que use
// `session.user.tenantType === 'client'`, `session.user.businessLines`,
// `session.user.serviceModules`, `businessLines.includes(...)`,
// `tenant_capabilities.*` para decidir visibilidad/render.
//
// **Source canónico V1.0**: el resolver del Client Portal
// (`resolveClientPortalModulesForOrganization`, TASK-825) + page guards
// canonical (`requireViewCodeAccess`, TASK-827 Slice 4). UI components
// consumen el output del resolver, NUNCA branchean por business_line
// legacy de session.
//
// **Modo `warn`** durante migración V1.0 (TASK-827 ship). Sweep + promote a
// `error` vive en TASK derivada V1.1 `client-portal-legacy-branching-sweep`
// (declarada en spec Follow-ups, trigger condition: zero drift en producción
// ≥30 días post TASK-829 cierre).
//
// **Override block** en `eslint.config.mjs` exime:
//   - `src/lib/auth/**` (legítimamente necesita tenantType para session routing)
//   - `src/app/api/auth/**`
//   - `src/components/layout/vertical/VerticalMenu.tsx` (D2 + Slice 6 — legacy
//     preservado con migration deferred V1.1)
//   - `tests/**`
//   - Foundation layout files
//
// Override inline marker: `// client-portal-allowed: <reason>` adyacente al
// callsite legítimo (e.g. dentro de auth boundary que NO migra a resolver).
//
// Pattern source: `no-inline-facet-visibility-check.mjs` (TASK-611) + AST
// vanilla. Mensajes accionables apuntando al resolver canónico.
//
// Spec: docs/tasks/in-progress/TASK-827-client-portal-composition-layer-ui.md

const isUiFile = filename => {
  if (/[/\\]__tests__[/\\]/.test(filename)) return false
  if (/\.test\.(t|j)sx?$/.test(filename)) return false
  if (/\.spec\.(t|j)sx?$/.test(filename)) return false
  if (/\.stories\.(t|j)sx?$/.test(filename)) return false
  if (/[/\\]mockup[/\\]/.test(filename)) return false

  // Skip API routes — server-side endpoints donde la lectura de session.user
  // es legítima (auth boundaries, capability checks). El rule cubre solo UI
  // components (server pages + client components + views).
  if (/[/\\]src[/\\]app[/\\]api[/\\]/.test(filename)) return false

  return /[/\\]src[/\\](components|views|app)[/\\]/.test(filename)
}

const HELPER_HINT = `
Use the canonical Client Portal resolver instead:

  // page.tsx (server component) — for page-level gating
  import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'

  export default async function Page() {
    await requireViewCodeAccess('cliente.<viewCode>')
    return <View />
  }

  // server component — for menu/nav composition
  import { resolveClientPortalModulesForOrganization } from '@/lib/client-portal/readers/native/module-resolver'
  import { composeNavItemsFromModules } from '@/lib/client-portal/composition/menu-builder'

  const modules = await resolveClientPortalModulesForOrganization(orgId)
  const items = composeNavItemsFromModules(modules)

The resolver is the single source of truth for "what modules does this client
see". NUNCA branch por businessLines/serviceModules/tenant_capabilities legacy.

Spec: docs/tasks/in-progress/TASK-827-client-portal-composition-layer-ui.md
`.trim()

const buildMessage = pattern =>
  `Branching legacy detectado: ${pattern}. UI components NO deben evaluar visibilidad por business_line/serviceModules legacy — consumen el resolver canónico (TASK-825). ${HELPER_HINT}`

/**
 * Check si el node tiene un override marker `// client-portal-allowed:` en
 * un comment leading o trailing adyacente.
 */
const hasOverrideMarker = (sourceCode, node) => {
  const leadingComments = sourceCode.getCommentsBefore(node)

  for (const comment of leadingComments) {
    if (/client-portal-allowed:/i.test(comment.value)) return true
  }

  const trailingComments = sourceCode.getCommentsAfter(node)

  for (const comment of trailingComments) {
    if (/client-portal-allowed:/i.test(comment.value)) return true
  }

  return false
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detecta branching legacy session.user.{tenantType,businessLines,serviceModules} o tenant_capabilities.* en UI components. Usar resolver canónico TASK-825/827.',
      url: 'docs/tasks/in-progress/TASK-827-client-portal-composition-layer-ui.md'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()

    if (!isUiFile(filename)) return {}

    const sourceCode = context.getSourceCode()

    return {
      // Pattern 1: session.user.tenantType === 'client' (or !==)
      BinaryExpression(node) {
        if (node.operator !== '===' && node.operator !== '!==') return

        const checkSide = side => {
          if (!side) return false

          // Detect MemberExpression: session.user.tenantType (or session?.user?.tenantType)
          let current = side

          // Unwrap optional chaining
          if (current.type === 'ChainExpression') current = current.expression

          if (current.type !== 'MemberExpression') return false

          const propertyName = current.property && current.property.name

          if (propertyName !== 'tenantType') return false

          // Verify the path includes 'user' and 'session'
          let parent = current.object

          if (parent && parent.type === 'ChainExpression') parent = parent.expression

          if (!parent || parent.type !== 'MemberExpression') return false

          if ((parent.property && parent.property.name) !== 'user') return false

          let root = parent.object

          if (root && root.type === 'ChainExpression') root = root.expression

          if (!root || root.type !== 'Identifier' || root.name !== 'session') return false

          return true
        }

        const matchesLeft = checkSide(node.left)
        const matchesRight = checkSide(node.right)

        if (matchesLeft || matchesRight) {
          if (hasOverrideMarker(sourceCode, node)) return

          context.report({
            node,
            message: buildMessage(`session.user.tenantType ${node.operator} '...'`)
          })
        }
      },

      // Pattern 2+3: session.user.businessLines OR session.user.serviceModules access
      MemberExpression(node) {
        const propertyName = node.property && node.property.name

        if (propertyName !== 'businessLines' && propertyName !== 'serviceModules') return

        // Verify parent path: should be session.user.X (or session?.user?.X)
        let parent = node.object

        if (parent && parent.type === 'ChainExpression') parent = parent.expression

        if (!parent || parent.type !== 'MemberExpression') return

        if ((parent.property && parent.property.name) !== 'user') return

        let root = parent.object

        if (root && root.type === 'ChainExpression') root = root.expression

        if (!root || root.type !== 'Identifier' || root.name !== 'session') return

        if (hasOverrideMarker(sourceCode, node)) return

        context.report({
          node,
          message: buildMessage(`session.user.${propertyName}`)
        })
      },

      // Pattern 4: tenant_capabilities.X access (any property)
      Identifier(node) {
        if (node.name !== 'tenant_capabilities') return

        // Only flag when accessed as part of MemberExpression (i.e. tenant_capabilities.X)
        const parent = node.parent

        if (!parent || parent.type !== 'MemberExpression' || parent.object !== node) return

        if (hasOverrideMarker(sourceCode, parent)) return

        context.report({
          node: parent,
          message: buildMessage('tenant_capabilities.* access')
        })
      }
    }
  }
}
