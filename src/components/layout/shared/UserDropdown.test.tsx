// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

/**
 * TASK-1686 — contrato de audiencias + semántica del trigger del UserDropdown.
 *
 * El dropdown es UN componente compartido por todas las audiencias; lo que se
 * fija acá es qué proyecta cada una al abrirse (interno = bloque personal;
 * colaborador puro = identidad + Mi Perfil + salir; cliente e híbrido
 * my+client = shortcuts cliente vigentes) y que el trigger sea un control
 * semántico real (botón nombrado, aria-haspopup/expanded/controls, Esc con
 * restore de foco). El Popper usa `disablePortal`, así que el menú abierto
 * renderiza inline en jsdom.
 */

const useSessionMock = vi.fn()
const signOutMock = vi.fn()
const routerPushMock = vi.fn()

vi.mock('next-auth/react', () => ({
  useSession: () => useSessionMock(),
  signOut: (...args: unknown[]) => signOutMock(...args)
}))

vi.mock('next-intl', () => ({ useLocale: () => 'es' }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock })
}))

vi.mock('@core/hooks/useSettings', () => ({
  useSettings: () => ({ settings: { skin: 'default' } })
}))

const UserDropdown = (await import('./UserDropdown')).default

const sessionFor = (user: Record<string, unknown>) => ({ data: { user } })

const INTERNAL_SESSION = sessionFor({
  name: 'Agente Interno',
  email: 'interno@efeonce.com',
  routeGroups: ['internal', 'admin', 'my'],
  roleCodes: ['efeonce_admin'],
  authorizedViews: [],
  portalHomePath: '/home'
})

const PURE_COLLABORATOR_SESSION = sessionFor({
  name: 'Colaboradora Pura',
  email: 'colaboradora@efeonce.com',
  routeGroups: ['my'],
  roleCodes: ['collaborator'],
  authorizedViews: [],
  portalHomePath: '/my'
})

const CLIENT_SESSION = sessionFor({
  name: 'Cliente Ejecutivo',
  email: 'cliente@empresa.com',
  routeGroups: ['client'],
  roleCodes: ['client_executive'],
  authorizedViews: [],
  portalHomePath: '/home',
  organizationId: 'org-cliente'
})

const MY_CLIENT_SESSION = sessionFor({
  name: 'Híbrida MyCliente',
  email: 'hibrida@empresa.com',
  routeGroups: ['my', 'client'],
  roleCodes: ['collaborator', 'client_executive'],
  authorizedViews: [],
  portalHomePath: '/home',
  organizationId: 'org-hibrida'
})

const openDropdown = () => {
  const trigger = screen.getByRole('button', { name: 'Menú de usuario' })

  fireEvent.click(trigger)

  return trigger
}

beforeEach(() => {
  useSessionMock.mockReturnValue(PURE_COLLABORATOR_SESSION)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('UserDropdown — trigger semántico (TASK-1686)', () => {
  it('el trigger es un botón real con nombre, aria-haspopup y aria-expanded/controls al abrir', () => {
    renderWithTheme(<UserDropdown />)

    const trigger = screen.getByRole('button', { name: 'Menú de usuario' })

    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).not.toHaveAttribute('aria-expanded')

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const menu = document.getElementById('gh-user-dropdown-menu')

    expect(menu).not.toBeNull()
    expect(trigger).toHaveAttribute('aria-controls', 'gh-user-dropdown-menu')
  })

  it('Escape cierra el menú y restaura el foco al trigger', () => {
    renderWithTheme(<UserDropdown />)

    const trigger = openDropdown()
    const menu = document.getElementById('gh-user-dropdown-menu')

    expect(menu).not.toBeNull()

    fireEvent.keyDown(menu as HTMLElement, { key: 'Escape' })

    expect(trigger).not.toHaveAttribute('aria-expanded')
    expect(document.activeElement).toBe(trigger)
  })
})

describe('UserDropdown — proyección por audiencia (TASK-1686)', () => {
  it('colaborador puro: identidad + Mi Perfil + salir; cero shortcuts cliente y cero espejo de Mi Ficha', () => {
    renderWithTheme(<UserDropdown />)
    openDropdown()

    expect(screen.getByText('Mi Perfil')).toBeInTheDocument()
    expect(screen.getByText('Salir del Greenhouse')).toBeInTheDocument()

    for (const clientLabel of ['Proyectos', 'Ciclos', 'Novedades']) {
      expect(screen.queryByText(clientLabel)).toBeNull()
    }

    // Sin espejo del rail personal: las hojas viven en su sidebar.
    expect(screen.queryByText('Mis Asignaciones')).toBeNull()
    expect(screen.queryByText('Mi Nómina')).toBeNull()
  })

  it('cliente puro conserva sus shortcuts vigentes', () => {
    useSessionMock.mockReturnValue(CLIENT_SESSION)
    renderWithTheme(<UserDropdown />)
    openDropdown()

    expect(screen.getByText('Proyectos')).toBeInTheDocument()
    expect(screen.getByText('Ciclos')).toBeInTheDocument()
    expect(screen.queryByText('Mi Perfil')).toBeNull()
  })

  it('híbrido my+client conserva la salida cliente vigente (no se le aplica la proyección collaborator)', () => {
    useSessionMock.mockReturnValue(MY_CLIENT_SESSION)
    renderWithTheme(<UserDropdown />)
    openDropdown()

    expect(screen.getByText('Proyectos')).toBeInTheDocument()
    expect(screen.queryByText('Mi Perfil')).toBeNull()
  })

  it('interno conserva su bloque personal (TASK-1388) sin shortcuts cliente', () => {
    useSessionMock.mockReturnValue(INTERNAL_SESSION)
    renderWithTheme(<UserDropdown />)
    openDropdown()

    expect(screen.getByText('Mis Asignaciones')).toBeInTheDocument()
    expect(screen.queryByText('Proyectos')).toBeNull()
  })

  it('colaborador sin grant de perfil: identidad + salir, sin CTA rota', () => {
    useSessionMock.mockReturnValue(
      sessionFor({
        name: 'Colaboradora Restringida',
        email: 'restringida@efeonce.com',
        routeGroups: ['my'],
        roleCodes: ['collaborator'],
        authorizedViews: ['mi_ficha.mi_nomina'],
        portalHomePath: '/my'
      })
    )
    renderWithTheme(<UserDropdown />)
    openDropdown()

    expect(screen.queryByText('Mi Perfil')).toBeNull()
    expect(screen.getByText('Salir del Greenhouse')).toBeInTheDocument()
  })
})
