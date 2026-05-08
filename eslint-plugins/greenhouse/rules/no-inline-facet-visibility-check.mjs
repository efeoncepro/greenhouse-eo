// TASK-611 Slice 7 — greenhouse/no-inline-facet-visibility-check
//
// Prohibe que componentes UI (src/components, src/views, src/app) realicen
// checks de visibilidad de facets del Organization Workspace de forma inline.
// La fuente única para "qué facet ve este subject en esta organización es"
// el helper canónico:
//
//   import { resolveOrganizationWorkspaceProjection } from '@/lib/organization-workspace/projection'
//
// El pattern UI canónico: la página/route component invoca el resolver
// server-side y pasa `projection.visibleFacets` y `projection.visibleTabs`
// al shell. El shell renderiza solo lo recibido. Los componentes hijos NO
// vuelven a evaluar capabilities.
//
// Anti-patterns prohibidos:
//   1. Literal capability key `'organization.<facet>'` mencionado en un
//      componente UI fuera de `src/lib/organization-workspace/`. Indica
//      check inline en lugar de consumir la projection.
//   2. Imports de `hasEntitlement`/`can` desde `@/lib/entitlements/runtime`
//      en componentes UI cuando además referencian capabilities `organization.*`.
//      (Permitido para módulos no-organization si necesitan check específico.)
//
// Modo `error` desde el primer commit. Override block para los archivos
// canónicos de la projection en `eslint.config.mjs`.
//
// Pattern source: no-untokenized-fx-math.mjs (TASK-766) — AST vanilla, .mjs,
// mensajes accionables.
//
// Spec: docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md §10

const ORGANIZATION_CAPABILITY_REGEX = /['"`]organization\.[a-z_]+['"`]/

const isUiFile = filename => {
  // Match src/components/, src/views/, src/app/. Skip tests + storybooks.
  if (/[/\\]__tests__[/\\]/.test(filename)) return false
  if (/\.test\.(t|j)sx?$/.test(filename)) return false
  if (/\.spec\.(t|j)sx?$/.test(filename)) return false
  if (/\.stories\.(t|j)sx?$/.test(filename)) return false
  if (/[/\\]mockup[/\\]/.test(filename)) return false

  return /[/\\]src[/\\](components|views|app)[/\\]/.test(filename)
}

const HELPER_HINT = `
Use the canonical projection instead:

  // page.tsx (server component)
  import { resolveOrganizationWorkspaceProjection } from '@/lib/organization-workspace/projection'

  const projection = await resolveOrganizationWorkspaceProjection({
    subject, organizationId, entrypointContext: 'agency'
  })

  return <OrganizationWorkspaceShell projection={projection} ... />

The shell renders projection.visibleFacets / visibleTabs / allowedActions.
Children NEVER re-check capabilities — the projection is the canonical gate.

Spec: docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md §10
`.trim()

const buildMessage = label =>
  `Inline facet visibility check detectado [${label}]. UI components no deben evaluar capabilities organization.* directamente — consumen el contrato de la projection. ${HELPER_HINT}`

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohibe checks inline de capabilities organization.* en componentes UI. Consumir resolveOrganizationWorkspaceProjection.',
      url: 'docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()

    if (!isUiFile(filename)) return {}

    const importNodes = []
    let mentionsOrganizationCapability = false
    const literalCapabilityNodes = []

    return {
      ImportDeclaration(node) {
        const source = node.source && node.source.value

        if (typeof source !== 'string') return

        if (source === '@/lib/entitlements/runtime' || source.endsWith('/entitlements/runtime')) {
          for (const specifier of node.specifiers ?? []) {
            const importedName =
              specifier.type === 'ImportSpecifier'
                ? specifier.imported && specifier.imported.name
                : specifier.type === 'ImportDefaultSpecifier'
                  ? 'default'
                  : null

            if (importedName === 'hasEntitlement' || importedName === 'can') {
              importNodes.push({ node: specifier, label: `import ${importedName} from entitlements runtime` })
            }
          }
        }
      },

      Literal(node) {
        if (typeof node.value !== 'string') return
        if (!ORGANIZATION_CAPABILITY_REGEX.test(`'${node.value}'`)) return

        mentionsOrganizationCapability = true
        literalCapabilityNodes.push({ node, label: `capability key '${node.value}'` })
      },

      TemplateLiteral(node) {
        if (node.quasis.length === 0) return

        const text = node.quasis.map(q => q.value.raw).join('')

        if (!ORGANIZATION_CAPABILITY_REGEX.test(`\`${text}\``)) return

        mentionsOrganizationCapability = true
        literalCapabilityNodes.push({ node, label: `capability key \`${text}\`` })
      },

      'Program:exit'() {
        // Always report literal capability strings — they are the strongest
        // signal of inline intent (organization.* keys should never appear in
        // UI files outside the canonical helper).
        for (const entry of literalCapabilityNodes) {
          context.report({
            node: entry.node,
            message: buildMessage(entry.label)
          })
        }

        // Imports of entitlements runtime are reported ONLY when also paired
        // with an organization.* capability mention. Importing hasEntitlement to
        // check non-organization capabilities (home.*, hr.*, finance.*) is
        // legitimate and not flagged.
        if (mentionsOrganizationCapability) {
          for (const entry of importNodes) {
            context.report({
              node: entry.node,
              message: buildMessage(entry.label)
            })
          }
        }
      }
    }
  }
}
