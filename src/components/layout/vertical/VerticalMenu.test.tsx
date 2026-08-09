// @vitest-environment jsdom
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import type { ClientNavItem } from '@/lib/client-portal/composition/menu-builder-shape'
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

const renderMenu = (clientNavItems?: readonly ClientNavItem[]): VerticalMenuDataType[] => {
  recordedMenuData.length = 0
  renderWithTheme(<VerticalMenu scrollMenu={() => {}} clientNavItems={clientNavItems} />)

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
