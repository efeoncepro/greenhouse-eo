// @vitest-environment jsdom
import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import { evaluateNavBudget } from '@/lib/navigation/nav-budget'
import type { VerticalMenuDataType } from '@/types/menuTypes'

/**
 * TASK-1389 — gate de presupuesto de navegación del rail INTERNO.
 *
 * Renderiza `VerticalMenu` con la sesión superadmin (la que ve el árbol
 * completo) y evalúa el `menuData` REAL contra el presupuesto del Contrato de
 * Asignación de Superficies. Evaluar el árbol vivo — no un parse estático del
 * fuente — es lo que hace al gate inmune al constructor imperativo.
 *
 * Este archivo corre en `pnpm test` (suite/CI) y es lo que ejecuta
 * `pnpm nav:budget` (scripts/ci/nav-budget-gate.mjs). Si falla: quita o
 * fusiona el grupo excedente, aplana la jerarquía, o justifica el cambio de
 * presupuesto en NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md + nav-budget.ts.
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

const SUPERADMIN_SESSION = {
  data: {
    user: {
      routeGroups: ['internal', 'admin', 'commercial', 'finance', 'hr', 'people', 'ai_tooling', 'my'],
      roleCodes: ['efeonce_admin'],
      // Claims vacíos = fallbacks permisivos → el árbol MÁS GRANDE posible.
      // Si esta proyección máxima respeta el presupuesto, toda proyección lo hace.
      authorizedViews: [],
      portalHomePath: '/home',
      memberId: 'member-budget-001'
    }
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Presupuesto de navegación del rail interno (TASK-1389)', () => {
  it('el árbol real del superadmin respeta el presupuesto: cero violaciones', () => {
    useSessionMock.mockReturnValue(SUPERADMIN_SESSION)
    recordedMenuData.length = 0
    renderWithTheme(<VerticalMenu scrollMenu={() => {}} />)

    const menuData = recordedMenuData.at(-1) ?? []

    expect(menuData.length).toBeGreaterThan(0)

    const violations = evaluateNavBudget(menuData, { homeHref: '/home' })

    // El mensaje del expect ES el reporte del gate: cada violación trae regla,
    // conteo vs tope y ubicación.
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })
})

describe('Evaluador de presupuesto — dientes (TASK-1389)', () => {
  const zone = (label: string, children: VerticalMenuDataType[]): VerticalMenuDataType =>
    ({ isSection: true, label, children }) as VerticalMenuDataType

  const leaf = (href: string): VerticalMenuDataType => ({ label: href, href }) as VerticalMenuDataType

  const group = (label: string, children: VerticalMenuDataType[]): VerticalMenuDataType =>
    ({ label, children }) as VerticalMenuDataType

  const BASE = [leaf('/home'), zone('Operación', [group('Dominio', [leaf('/a')])])]

  it('acepta un árbol mínimo válido', () => {
    expect(evaluateNavBudget(BASE)).toEqual([])
  })

  it('detecta una entrada de primer nivel fuera de zona (que no sea el Home)', () => {
    const violations = evaluateNavBudget([...BASE, leaf('/colgado-directo')])

    expect(violations.map(v => v.rule)).toContain('root_outside_zone')
  })

  it('detecta el exceso de slots de primer nivel', () => {
    const many = zone(
      'Operación',
      Array.from({ length: 9 }, (_, i) => group(`G${i}`, [leaf(`/g${i}`)]))
    )

    const violations = evaluateNavBudget([leaf('/home'), many])
    const slotViolation = violations.find(v => v.rule === 'top_level_slots')

    expect(slotViolation?.measured).toBe(10)
    expect(slotViolation?.budget).toBe(8)
  })

  it('detecta profundidad interactiva > 2 (submenú dentro de sección dentro de dominio)', () => {
    const deep = zone('Operación', [group('Dominio', [group('Sección', [group('Subsección', [leaf('/x')])])])])

    expect(evaluateNavBudget([leaf('/home'), deep]).map(v => v.rule)).toContain('interactive_depth')
  })

  it('detecta una zona isSection anidada', () => {
    const nested = zone('Operación', [group('Dominio', [zone('Zona anidada', [leaf('/x')])])])

    expect(evaluateNavBudget([leaf('/home'), nested]).map(v => v.rule)).toContain('section_not_at_root')
  })

  it('detecta una ruta personal /my/* en el rail (set derivado del builder, no hardcodeado)', () => {
    const withPersonal = [leaf('/home'), zone('Operación', [group('Dominio', [leaf('/my/payroll')])])]

    expect(evaluateNavBudget(withPersonal).map(v => v.rule)).toContain('personal_route_in_rail')
  })
})
