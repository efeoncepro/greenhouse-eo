// @vitest-environment jsdom
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import type { ClientNavItem } from '@/lib/client-portal/composition/menu-builder-shape'
import { ClientPortalVisibilityProvider } from '@/lib/client-portal/visibility/client-portal-visibility-context'
import type { ClientPortalViewVisibilityInputs } from '@/lib/client-portal/visibility/client-portal-view-visibility'
import type { VerticalMenuDataType } from '@/types/menuTypes'

/**
 * TASK-1675 — tests de la composición del menú lateral.
 *
 * Lo que se ejercita es la construcción real de `menuData` dentro de
 * `VerticalMenu`: la lista base, el merge aditivo de los ítems de módulo y la
 * agrupación. Lo único que se reemplaza es el chrome de render (los primitives
 * de `@menu`, el scrollbar), que no es lo que está bajo prueba — `GenerateMenu`
 * queda mockeado como grabadora del `menuData` que recibe.
 *
 * El test que importa es el de identidad: con `clientNavItems=[]` el menú debe
 * quedar exactamente como estaba. La rama "cliente" de este componente es en
 * realidad la rama **no-interno**, así que los colaboradores puros caen ahí; un
 * merge que reemplazara la lista en vez de sumarle los dejaría sin menú, y ese
 * fallo no lo atrapa ningún type check.
 */

const useSessionMock = vi.fn()
const recordedMenuData: VerticalMenuDataType[][] = []

vi.mock('next-auth/react', () => ({ useSession: () => useSessionMock() }))
vi.mock('next-intl', () => ({ useLocale: () => 'es' }))
vi.mock('react-perfect-scrollbar', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))
vi.mock('@menu/vertical-menu', () => ({
  Menu: ({ children }: { children: React.ReactNode }) => <nav>{children}</nav>
}))
vi.mock('@menu/hooks/useVerticalNav', () => ({
  default: () => ({
    isBreakpointReached: false,
    transitionDuration: 300,
    isCollapsed: false,
    isHovered: false
  })
}))
vi.mock('@menu/styles/vertical/StyledVerticalNavExpandIcon', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>
}))
vi.mock('@core/styles/vertical/menuItemStyles', () => ({ default: () => ({}) }))
vi.mock('@core/styles/vertical/menuSectionStyles', () => ({ default: () => ({}) }))
vi.mock('@/components/GenerateMenu', () => ({
  GenerateVerticalMenu: ({ menuData }: { menuData: VerticalMenuDataType[] }) => {
    recordedMenuData.push(menuData)

    return null
  }
}))

const VerticalMenu = (await import('./VerticalMenu')).default

/** Aplana el árbol de menú a la lista ordenada de rutas, secciones incluidas. */
const collectHrefs = (menuData: VerticalMenuDataType[]): string[] =>
  menuData.flatMap(entry => {
    const node = entry as { href?: string; children?: VerticalMenuDataType[] }

    return [...(node.href ? [node.href] : []), ...(node.children ? collectHrefs(node.children) : [])]
  })

/** Devuelve los labels de las secciones presentes, en orden. */
const collectSectionLabels = (menuData: VerticalMenuDataType[]): string[] =>
  menuData
    .filter(entry => (entry as { isSection?: boolean }).isSection)
    .map(entry => String((entry as { label?: unknown }).label))

/**
 * TASK-1685 — la visibilidad del portal cliente ya no sale del claim de rol.
 *
 * La lista base se filtra con el primitive (`canSeeClientPortalView`), alimentado por los
 * insumos que `(dashboard)/layout.tsx` resuelve contra PG y transporta por contexto. Por eso
 * los tests tienen que declarar **qué contrató la organización**: sin provider, el fallback
 * cerrado del contexto deja sólo las vistas base, que es la degradación correcta pero no el
 * caso que estos tests ejercitan.
 *
 * La fixture por defecto representa una organización que contrató las superficies primarias
 * —el caso de Sky Airlines— para que el contrato de merge aditivo de `TASK-1675` se siga
 * midiendo sobre un menú poblado.
 */
const CONTRACTED_PRIMARY_VIEWS = [
  'cliente.proyectos',
  'cliente.ciclos',
  'cliente.equipo',
  'cliente.reviews',
  'cliente.analytics',
  'cliente.campanas'
]

const visibility = (
  overrides: Partial<ClientPortalViewVisibilityInputs> = {}
): ClientPortalViewVisibilityInputs => ({
  isInternalSession: false,
  moduleViewCodes: CONTRACTED_PRIMARY_VIEWS,
  revokedViewCodes: [],
  ...overrides
})

/**
 * En runtime, `clientNavItems` y `moduleViewCodes` salen del MISMO resolver de módulos, así
 * que un ítem de módulo siempre tiene su viewCode entre los contratados. La fixture por
 * defecto reproduce esa consistencia; los tests que quieren romperla la declaran explícita.
 */
const renderMenu = (
  clientNavItems?: readonly ClientNavItem[],
  visibilityInputs?: ClientPortalViewVisibilityInputs
): VerticalMenuDataType[] => {
  const inputs =
    visibilityInputs ??
    visibility({
      moduleViewCodes: [...CONTRACTED_PRIMARY_VIEWS, ...(clientNavItems ?? []).map(item => item.viewCode)]
    })

  return renderWithInputs(clientNavItems, inputs)
}

const renderWithInputs = (
  clientNavItems: readonly ClientNavItem[] | undefined,
  visibilityInputs: ClientPortalViewVisibilityInputs
): VerticalMenuDataType[] => {
  recordedMenuData.length = 0
  renderWithTheme(
    <ClientPortalVisibilityProvider inputs={visibilityInputs}>
      <VerticalMenu scrollMenu={() => {}} clientNavItems={clientNavItems} />
    </ClientPortalVisibilityProvider>
  )

  return recordedMenuData.at(-1) ?? []
}

const CLIENT_SESSION = {
  data: {
    user: {
      routeGroups: ['client'],
      roleCodes: ['client_executive'],
      authorizedViews: [],
      portalHomePath: '/home',
      organizationId: 'org-berel'
    }
  }
}

const COLLABORATOR_SESSION = {
  data: {
    user: {
      routeGroups: ['my'],
      roleCodes: ['collaborator'],
      authorizedViews: [],
      portalHomePath: '/my'
    }
  }
}

const seoNavItem: ClientNavItem = {
  viewCode: 'cliente.growth_seo_dashboard',
  label: 'SEO',
  route: '/growth/seo',
  icon: 'tabler-chart-arrows-vertical',
  group: 'primary',
  tier: 'addon'
}

beforeEach(() => {
  useSessionMock.mockReturnValue(CLIENT_SESSION)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('VerticalMenu — merge aditivo de módulos contratados (TASK-1675)', () => {
  it('sin ítems de módulo el menú del cliente queda idéntico al que se renderiza sin la prop', () => {
    const withoutProp = collectHrefs(renderMenu(undefined))
    const withEmptyList = collectHrefs(renderMenu([]))

    expect(withEmptyList).toEqual(withoutProp)
    expect(withEmptyList).toContain('/home')
    expect(withEmptyList).toContain('/campanas')
  })

  it('un colaborador puro conserva su menú completo: los módulos no lo tocan', () => {
    useSessionMock.mockReturnValue(COLLABORATOR_SESSION)

    const baseline = collectHrefs(renderMenu([]))
    const withModules = collectHrefs(renderMenu([seoNavItem]))

    // El colaborador cae en la MISMA rama que el cliente (`!isInternalPortalUser`).
    expect(baseline).toContain('/my')
    expect(baseline).toContain('/my/payment-profile')

    // Sumar un ítem de módulo no puede quitarle nada de lo que ya tenía.
    for (const href of baseline) expect(withModules).toContain(href)
  })

  it('el ítem del módulo aparece en la lista primaria, después de la lista base', () => {
    const hrefs = collectHrefs(renderMenu([seoNavItem]))

    expect(hrefs).toContain('/growth/seo')
    expect(hrefs.indexOf('/growth/seo')).toBeGreaterThan(hrefs.indexOf('/campanas'))
    expect(hrefs.indexOf('/growth/seo')).toBeLessThan(hrefs.indexOf('/updates'))
  })

  it('sin el módulo el ítem no existe: es el aislamiento per-organización', () => {
    expect(collectHrefs(renderMenu([]))).not.toContain('/growth/seo')
  })

  it('un módulo que declara una ruta ya presente no produce un segundo ítem', () => {
    const duplicated: ClientNavItem = {
      viewCode: 'cliente.campanas',
      label: 'Campañas',
      route: '/campanas',
      icon: 'tabler-speakerphone',
      group: 'primary',
      tier: 'standard'
    }

    const hrefs = collectHrefs(renderMenu([duplicated]))

    expect(hrefs.filter(href => href === '/campanas')).toHaveLength(1)
  })

  it('un módulo del grupo capabilities abre la sección "Módulos" aunque no haya capability modules legacy', () => {
    const creativeHub: ClientNavItem = {
      viewCode: 'cliente.creative_hub',
      label: 'Creative Hub',
      route: '/creative-hub',
      icon: 'tabler-palette',
      group: 'capabilities',
      tier: 'addon'
    }

    expect(collectSectionLabels(renderMenu([]))).not.toContain('Módulos')

    const menuData = renderMenu([creativeHub])

    expect(collectSectionLabels(menuData)).toContain('Módulos')
    expect(collectHrefs(menuData)).toContain('/creative-hub')
  })

  it('la rama no-interna nunca renderiza zonas internas (Operación/Administración)', () => {
    const sections = collectSectionLabels(renderMenu([]))

    expect(sections).not.toContain('Operación')
    expect(sections).not.toContain('Administración')
  })

  it('un módulo del grupo account cuelga de "Mi Cuenta", no de la lista primaria', () => {
    const accountItem: ClientNavItem = {
      viewCode: 'cliente.exports',
      label: 'Exports',
      route: '/exports',
      icon: 'tabler-file-export',
      group: 'account',
      tier: 'addon'
    }

    const menuData = renderMenu([accountItem])

    const accountSection = menuData.find(
      entry => (entry as { isSection?: boolean; label?: unknown }).isSection && String((entry as { label?: unknown }).label) === 'Mi Cuenta'
    ) as { children: VerticalMenuDataType[] } | undefined

    expect(collectHrefs(accountSection?.children ?? [])).toContain('/exports')
  })
})

/**
 * TASK-1686 — contrato de audiencias de la rama no-interna.
 *
 * Control de NO-regresión para las audiencias que esta task tiene PROHIBIDO
 * cambiar. La decisión pineada en la spec (auditoría 2026-08-10): my+client
 * conserva su salida VIGENTE byte-a-byte — rail cliente MÁS los bloques
 * `isMyUser` actuales (home `/my` + sección Mi Ficha). El predicado
 * collaborator-puro nunca recorta a un híbrido.
 */
describe('VerticalMenu — el primitive único de visibilidad (TASK-1685)', () => {
  it('una organización SIN módulos no recibe enlaces muertos: el menú deja de prometer lo que la puerta niega', () => {
    // El defecto exacto de ISSUE-148, medido el 2026-08-10: ANAM y Greenhouse Demo no tienen
    // ningún módulo y sus usuarios veían 6 enlaces cada uno que terminaban en
    // `/home?denied=…`. El claim de rol los concedía; la puerta, que lee el módulo, no.
    const hrefs = collectHrefs(renderMenu([], visibility({ moduleViewCodes: [] })))

    for (const dead of ['/proyectos', '/sprints', '/equipo', '/reviews', '/analytics', '/campanas']) {
      expect(hrefs).not.toContain(dead)
    }
  })

  it('sin módulos el cliente conserva su salida y su cuenta: nunca queda sin menú', () => {
    // El modo de fallo inaceptable es el contrario: dejar al cliente encerrado. `/home` es el
    // terminator del guard y las tres vistas base no dependen de nada contratado.
    const hrefs = collectHrefs(renderMenu([], visibility({ moduleViewCodes: [] })))

    expect(hrefs).toContain('/home')
    expect(hrefs).toContain('/updates')
    expect(hrefs).toContain('/notifications')
    expect(hrefs).toContain('/settings')
  })

  it('un `revoke` per-persona cierra el enlace aunque la organización tenga el módulo', () => {
    // La dimensión persona: la organización contrató la superficie, esta persona no la ve.
    const hrefs = collectHrefs(renderMenu([], visibility({ revokedViewCodes: ['cliente.campanas'] })))

    expect(hrefs).not.toContain('/campanas')
    expect(hrefs).toContain('/proyectos')
  })

  it('un `revoke` también cierra el ítem cuando el destino llega por el merge de módulos', () => {
    // Sin esto, revocar ocultaría el ítem de la lista base y dejaría el MISMO destino visible
    // por el merge aditivo: la revocación cerraría la puerta y no el enlace.
    const hrefs = collectHrefs(
      renderMenu([seoNavItem], visibility({
        moduleViewCodes: [...CONTRACTED_PRIMARY_VIEWS, 'cliente.growth_seo_dashboard'],
        revokedViewCodes: ['cliente.growth_seo_dashboard']
      }))
    )

    expect(hrefs).not.toContain('/growth/seo')
  })

  it('un `revoke` NO cierra nada para una sesión interna: el bypass D1 se conserva', () => {
    // Un operador interno alcanza cualquier superficie cliente para soporte legítimo. El
    // override es un instrumento del portal cliente, no una sanción global.
    const hrefs = collectHrefs(
      renderMenu([], { isInternalSession: true, moduleViewCodes: [], revokedViewCodes: ['cliente.campanas'] })
    )

    expect(hrefs).toContain('/campanas')
  })
})

describe('VerticalMenu — contrato de audiencias no-internas (TASK-1686)', () => {
  const MY_CLIENT_SESSION = {
    data: {
      user: {
        routeGroups: ['my', 'client'],
        roleCodes: ['collaborator', 'client_executive'],
        authorizedViews: [],
        portalHomePath: '/home',
        organizationId: 'org-hibrida'
      }
    }
  }

  it('my+client conserva la salida vigente: rail cliente MÁS home /my y sección Mi Ficha', () => {
    useSessionMock.mockReturnValue(MY_CLIENT_SESSION)

    const menuData = renderMenu([])
    const hrefs = collectHrefs(menuData)
    const sections = collectSectionLabels(menuData)

    // Lado cliente (conducta vigente con claims vacíos → fallbacks permisivos)
    expect(hrefs).toContain('/proyectos')
    expect(hrefs).toContain('/campanas')
    expect(sections).toContain('Mi Cuenta')

    // Lado personal (bloques isMyUser actuales)
    expect(hrefs).toContain('/my')
    expect(hrefs).toContain('/my/assignments')
    expect(sections).toContain('Mi Ficha')
  })

  it('client puro (sin routeGroup my) no recibe home /my ni sección Mi Ficha', () => {
    useSessionMock.mockReturnValue(CLIENT_SESSION)

    const menuData = renderMenu([])
    const hrefs = collectHrefs(menuData)

    expect(hrefs).not.toContain('/my')
    expect(collectSectionLabels(menuData)).not.toContain('Mi Ficha')
  })

  const CLIENT_ROUTES = [
    '/proyectos',
    '/sprints',
    '/equipo',
    '/reviews',
    '/analytics',
    '/campanas',
    '/updates',
    '/notifications',
    '/settings'
  ]

  it('colaborador puro con claims VACÍOS: cero rutas y cero secciones cliente (el borde que filtraba por fallback)', () => {
    useSessionMock.mockReturnValue(COLLABORATOR_SESSION)

    const menuData = renderMenu([])
    const hrefs = collectHrefs(menuData)
    const sections = collectSectionLabels(menuData)

    for (const route of CLIENT_ROUTES) expect(hrefs).not.toContain(route)
    expect(sections).not.toContain('Mi Cuenta')
    expect(sections).not.toContain('Módulos')

    // Y conserva su rail personal completo (claims vacíos → fallback permisivo del builder).
    expect(hrefs).toContain('/my')
    expect(hrefs).toContain('/my/assignments')
    expect(hrefs).toContain('/my/payment-profile')
    expect(sections).toContain('Mi Ficha')
  })

  it('colaborador puro con claims reales: solo las hojas personales concedidas, sin heading "Mi Cuenta" vacío', () => {
    useSessionMock.mockReturnValue({
      data: {
        user: {
          routeGroups: ['my'],
          roleCodes: ['collaborator'],
          authorizedViews: ['mi_ficha.mi_inicio', 'mi_ficha.mi_perfil', 'mi_ficha.mi_nomina', 'mi_ficha.mis_permisos'],
          portalHomePath: '/my'
        }
      }
    })

    const menuData = renderMenu([])
    const hrefs = collectHrefs(menuData)
    const sections = collectSectionLabels(menuData)

    expect(hrefs).toContain('/my')
    expect(hrefs).toContain('/my/profile')
    expect(hrefs).toContain('/my/payroll')
    expect(hrefs).toContain('/my/leave')
    expect(hrefs).not.toContain('/my/assignments')

    expect(sections).toContain('Mi Ficha')
    expect(sections).not.toContain('Mi Cuenta')
    expect(sections).not.toContain('Módulos')
  })

  it('colaborador puro ignora módulos cliente inyectados (invariante 3: clientNavItems es del carril client)', () => {
    useSessionMock.mockReturnValue(COLLABORATOR_SESSION)

    const hrefs = collectHrefs(renderMenu([seoNavItem]))

    expect(hrefs).not.toContain('/growth/seo')
  })

  it('colaborador puro con grant de plataforma conserva Knowledge/Design System (fallback cerrado)', () => {
    useSessionMock.mockReturnValue({
      data: {
        user: {
          routeGroups: ['my'],
          roleCodes: ['collaborator'],
          authorizedViews: ['mi_ficha.mi_inicio', 'plataforma.knowledge', 'plataforma.design_system'],
          portalHomePath: '/my'
        }
      }
    })

    const hrefs = collectHrefs(renderMenu([]))

    expect(hrefs).toContain('/knowledge')
    expect(hrefs).toContain('/design-system')
  })
})

/**
 * TASK-1388 — identidad de la rama INTERNA tras el reequilibrio.
 *
 * El contrato: mismas hojas que antes (cero cambios de URL ni de gating),
 * reubicadas en 3 zonas `isSection` (Operación · Administración · Recursos),
 * SIN las hojas personales `/my/*` (rehomed al dropdown del avatar) y sin
 * duplicados (Sample Sprints y Herramientas IA con hogar único).
 */
describe('VerticalMenu — rama interna en 3 zonas (TASK-1388)', () => {
  const INTERNAL_ADMIN_SESSION = {
    data: {
      user: {
        routeGroups: ['internal', 'admin', 'commercial', 'finance', 'hr', 'people', 'ai_tooling', 'my'],
        roleCodes: ['efeonce_admin'],
        authorizedViews: [],
        portalHomePath: '/home',
        memberId: 'member-admin-001'
      }
    }
  }

  beforeEach(() => {
    useSessionMock.mockReturnValue(INTERNAL_ADMIN_SESSION)
  })

  it('el set de hojas del admin interno es exactamente el vigente: sin /my/*, sin duplicados, cero URLs nuevas', () => {
    const hrefs = collectHrefs(renderMenu([]))

    const expected = [
      '/home',
      // Operación → Agencia
      '/agency',
      '/agency/spaces',
      '/agency/economics',
      '/agency/team',
      '/agency/talent-discovery',
      '/agency/staff-augmentation',
      '/agency/delivery',
      '/agency/campaigns',
      '/agency/organizations',
      '/agency/services',
      '/agency/operations',
      // Operación → Comercial (hogar único de Sample Sprints + sección Growth)
      '/finance/intelligence/pipeline',
      '/finance/quotes',
      '/finance/contracts',
      '/finance/master-agreements',
      '/agency/sample-sprints',
      '/finance/products',
      '/growth/aeo',
      '/growth/ctas',
      '/admin/growth/forms',
      '/admin/growth/ai-visibility',
      '/admin/growth/seo',
      // Operación → Finanzas
      '/finance',
      '/finance/income',
      '/finance/expenses',
      '/finance/clients',
      '/finance/suppliers',
      '/finance/cash-in',
      '/finance/cash-out',
      '/finance/payment-orders',
      '/finance/payment-profiles',
      '/finance/bank',
      '/finance/shareholder-account',
      '/finance/cash-position',
      '/finance/purchase-orders',
      '/finance/hes',
      '/finance/reconciliation',
      '/finance/intelligence',
      '/finance/cost-allocations',
      // Operación → Personas
      '/people',
      '/hr/workforce/activation',
      '/hr/payroll',
      '/hr/payroll/projected',
      '/finance/contractor-payments',
      '/hr/team',
      '/hr/approvals',
      '/hr/departments',
      '/hr/contractors',
      '/hr/workforce/contracts',
      '/hr/offboarding',
      '/hr/hierarchy',
      '/hr/org-chart',
      '/hr/leave',
      '/hr/attendance',
      '/hr/goals',
      '/hr/evaluations',
      // Administración → Admin Center
      '/admin',
      '/admin/users',
      '/admin/roles',
      '/admin/views',
      '/admin/accounts',
      '/admin/tenants',
      '/admin/team',
      '/admin/talent-review',
      '/admin/talent-ops',
      '/admin/business-lines',
      '/admin/commercial/parties',
      '/admin/commercial/proposals',
      '/admin/pricing-catalog',
      '/admin/service-slas',
      '/admin/payment-instruments',
      '/admin/operational-calendar',
      '/admin/email-delivery',
      '/admin/emails/preview',
      '/admin/notifications',
      '/admin/ai-tools',
      '/admin/cloud-integrations',
      '/admin/globe/credits',
      '/admin/ops-health',
      '/admin/data-quality/notion-titles',
      '/admin/data-quality/organization-logos'
    ]

    expect([...hrefs].sort()).toEqual([...expected].sort())
  })

  it('las hojas personales /my/* NO viven en el rail interno (rehomed al avatar)', () => {
    const hrefs = collectHrefs(renderMenu([]))

    expect(hrefs.filter(href => href.startsWith('/my'))).toEqual([])
  })

  it('el rail interno se enmarca en zonas: Operación y Administración presentes, sin las secciones legacy', () => {
    const sections = collectSectionLabels(renderMenu([]))

    expect(sections).toContain('Operación')
    expect(sections).toContain('Administración')
    expect(sections).not.toContain('Gestión')
    expect(sections).not.toContain('Personas y HR')
    expect(sections).not.toContain('Mi Ficha')
  })

  it('los duplicados quedaron con hogar único: Sample Sprints y Herramientas IA aparecen una sola vez', () => {
    const hrefs = collectHrefs(renderMenu([]))

    expect(hrefs.filter(href => href === '/agency/sample-sprints')).toHaveLength(1)
    expect(hrefs.filter(href => href === '/admin/ai-tools')).toHaveLength(1)
  })

  it('la zona Recursos aparece cuando el rol tiene los grants de plataforma', () => {
    useSessionMock.mockReturnValue({
      data: {
        user: {
          ...INTERNAL_ADMIN_SESSION.data.user,
          authorizedViews: ['plataforma.knowledge', 'plataforma.design_system']
        }
      }
    })

    const menuData = renderMenu([])
    const sections = collectSectionLabels(menuData)
    const hrefs = collectHrefs(menuData)

    expect(sections).toContain('Recursos')
    expect(hrefs).toContain('/knowledge')
    expect(hrefs).toContain('/design-system')

    // Y una sola vez: el bloque standalone es exclusivo de la rama no-interna.
    expect(hrefs.filter(href => href === '/knowledge')).toHaveLength(1)
  })
})
