// TASK-1685 Slice 2 — tests de greenhouse/no-client-portal-view-visibility-bypass
//
// La regla existe para que la segunda fuente de verdad no vuelva. Lo que estos tests
// aseguran es que sea PRECISA: un falso positivo sobre un registry o una fixture haría que
// alguien la apague, y una regla apagada no protege nada. La primera versión marcaba
// cualquier `viewCode: 'cliente.x'` y produjo 44 hallazgos, casi todos datos describiendo
// vistas en vez de decisiones de visibilidad.

import { RuleTester } from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../no-client-portal-view-visibility-bypass.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

const ERROR = 1

ruleTester.run('no-client-portal-view-visibility-bypass', rule, {
  valid: [
    {
      name: 'el primitive canónico no dispara nada',
      filename: '/repo/src/components/layout/vertical/VerticalMenu.tsx',
      code: `const visible = canSeeClientView('cliente.campanas')`
    },
    {
      name: 'el carril de rol sigue siendo correcto para el portal interno',
      filename: '/repo/src/components/layout/vertical/VerticalMenu.tsx',
      code: `const visible = canSeeView('gestion.agencia', true)`
    },
    {
      name: 'un viewCode cliente en un registry es DATO, no una decisión',
      filename: '/repo/src/lib/navigation/route-reachability-manifest.ts',
      code: `export const entry = { viewCode: 'cliente.growth_seo_dashboard', route: '/growth/seo' }`
    },
    {
      name: 'una fixture de test con viewCode cliente tampoco decide nada',
      filename: '/repo/src/lib/client-portal/composition/menu-builder.test.ts',
      code: `const item = { viewCode: 'cliente.campanas', label: 'Campañas', group: 'primary' }`
    },
    {
      name: 'el módulo dueño del primitive puede hablar del carril libremente',
      filename: '/repo/src/lib/client-portal/visibility/client-portal-view-visibility.ts',
      code: `const visible = canSeeView('cliente.campanas', true)`
    },
    {
      name: 'el escape hatch adyacente a la sentencia se respeta',
      filename: '/repo/src/app/(dashboard)/dashboard/page.tsx',
      code: `
        // client-portal-visibility-allowed: el home es el terminator del guard.
        const hasAccess = hasAuthorizedViewCode({ tenant, viewCode: 'cliente.pulse', fallback: true })
      `
    },
    {
      name: 'un viewCode no literal no se persigue: perseguirlo produce falsos positivos',
      filename: '/repo/src/components/layout/vertical/VerticalMenu.tsx',
      code: `const visible = canSeeView(someViewCode, true)`
    }
  ],

  invalid: [
    {
      name: 'canSeeView con una vista cliente literal',
      filename: '/repo/src/components/layout/vertical/VerticalMenu.tsx',
      code: `const visible = canSeeView('cliente.campanas', true)`,
      errors: ERROR
    },
    {
      name: 'canSeeAnyView con un array que contiene una vista cliente',
      filename: '/repo/src/components/layout/vertical/VerticalMenu.tsx',
      code: `const visible = canSeeAnyView(['cliente.proyectos', 'cliente.ciclos'], true)`,
      errors: ERROR
    },
    {
      name: 'hasAuthorizedViewCode con objeto de opciones — la forma del layout que tenía el hueco',
      filename: '/repo/src/app/(dashboard)/proyectos/layout.tsx',
      code: `const hasAccess = hasAuthorizedViewCode({ tenant, viewCode: 'cliente.proyectos', fallback: true })`,
      errors: ERROR
    },
    {
      name: 'hasAnyAuthorizedViewCode con viewCodes cliente',
      filename: '/repo/src/app/(dashboard)/equipo/layout.tsx',
      code: `const hasAccess = hasAnyAuthorizedViewCode({ tenant, viewCodes: ['cliente.equipo'], fallback: true })`,
      errors: ERROR
    },
    {
      name: 'authorizedViews.includes directo — el carril de rol sin intermediario',
      filename: '/repo/src/components/layout/shared/GlobalCommandPalette.tsx',
      code: `const visible = authorizedViews.includes('cliente.analytics')`,
      errors: ERROR
    },
    {
      name: 'session.user.authorizedViews.includes también',
      filename: '/repo/src/views/greenhouse/Something.tsx',
      code: `const visible = session.user.authorizedViews.includes('cliente.reviews')`,
      errors: ERROR
    }
  ]
})

console.log('✓ no-client-portal-view-visibility-bypass')
