import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/**
 * TASK-1679 — Los tres defectos del page guard, cada uno con su test.
 *
 * El guard es difícil de testear porque `redirect()` de Next.js señaliza **lanzando**, que
 * es justamente la causa del defecto 3. Acá se mockea `redirect` con un throw etiquetado,
 * igual que hace Next, para que el test ejercite la misma mecánica que rompía en producción
 * en vez de una aproximación amable.
 */

class RedirectSignal extends Error {
  constructor(readonly target: string) {
    super(`NEXT_REDIRECT:${target}`)
    this.name = 'RedirectSignal'
  }
}

const mockRedirect = vi.fn((target: string) => {
  throw new RedirectSignal(target)
})

const mockRequireServerSession = vi.fn()
const mockCanOpenClientPortalView = vi.fn()
const mockCaptureWithDomain = vi.fn()
const mockResolveOrganizationId = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: (target: string) => mockRedirect(target)
}))

vi.mock('@/lib/auth/require-server-session', () => ({
  requireServerSession: () => mockRequireServerSession()
}))

// TASK-1685 Slice 2 — el guard dejó de consumir la mitad ORGANIZACIÓN
// (`hasViewCodeAccess`) para consumir el primitive completo, que además aplica la dimensión
// PERSONA (`user_view_overrides`) y el bypass interno. El mock sigue al consumer real.
vi.mock('@/lib/client-portal/visibility/resolve-client-portal-visibility', () => ({
  canOpenClientPortalView: (...args: unknown[]) => mockCanOpenClientPortalView(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

vi.mock('./resolve-client-portal-organization-id', () => ({
  resolveClientPortalOrganizationId: (...args: unknown[]) => mockResolveOrganizationId(...args)
}))

const { requireViewCodeAccess } = await import('./require-view-code-access')

const clientSession = {
  user: {
    userId: 'user-client-1',
    tenantType: 'client',
    clientId: 'cli-0863869c',
    organizationId: 'org-32333527'
  }
}

/** Captura el target del redirect, o `null` si el guard no redirigió. */
const captureRedirect = async (viewCode: string): Promise<string | null> => {
  try {
    await requireViewCodeAccess(viewCode)

    return null
  } catch (error) {
    if (error instanceof RedirectSignal) return error.target

    throw error
  }
}

describe('requireViewCodeAccess (TASK-1679)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireServerSession.mockResolvedValue(clientSession)
    mockResolveOrganizationId.mockResolvedValue('org-32333527')
  })

  it('resolves access against the ORGANIZATION id, never the client id (ISSUE-146)', async () => {
    mockCanOpenClientPortalView.mockResolvedValue(true)

    await requireViewCodeAccess('cliente.campanas')

    expect(mockCanOpenClientPortalView).toHaveBeenCalledWith('cliente.campanas', {
      userId: 'user-client-1',
      organizationId: 'org-32333527',
      isInternalSession: false
    })

    // Contrato duro: el valor pasado al primitive tiene que ser del espacio `org-*`. Si
    // alguien vuelve a pasar un clientId (`cli-*`, `hubspot-company-*`,
    // `greenhouse-demo-client`), este assert lo detiene — es la clase de bug de ISSUE-146.
    const [, subject] = mockCanOpenClientPortalView.mock.calls[0] as [string, { organizationId: string }]

    expect(subject.organizationId).toMatch(/^org-/)
    expect(subject.organizationId).not.toBe(clientSession.user.clientId)
  })

  it('reaches the denied path with a public slug instead of the degraded banner (defecto 3)', async () => {
    mockCanOpenClientPortalView.mockResolvedValue(false)

    const target = await captureRedirect('cliente.campanas')

    // Antes el `redirect()` del camino denied vivía DENTRO del try, así que su propio catch
    // lo interceptaba y toda denegación salía como `?error=resolver_unavailable`.
    expect(target).toBe('/home?denied=campanas')
    expect(target).not.toContain('resolver_unavailable')
  })

  it('does NOT report a legitimate denial to Sentry', async () => {
    mockCanOpenClientPortalView.mockResolvedValue(false)

    await captureRedirect('cliente.campanas')

    // Cada denegación legítima se estaba reportando como error del resolver, inflando el
    // dominio `client_portal` con el funcionamiento normal del producto.
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('still degrades honestly when the resolver actually throws', async () => {
    mockCanOpenClientPortalView.mockRejectedValue(new Error('PG down'))

    const target = await captureRedirect('cliente.campanas')

    expect(target).toBe('/home?error=resolver_unavailable')
    expect(mockCaptureWithDomain).toHaveBeenCalledTimes(1)
  })

  it('distinguishes "no organization resolved" from "module not assigned"', async () => {
    mockResolveOrganizationId.mockResolvedValue(null)

    const target = await captureRedirect('cliente.campanas')

    // Son dos estados distintos y el usuario merece saber cuál le pasó: sin organización no
    // hay contra qué evaluar módulos, así que no se puede decir "no tienes este módulo".
    expect(target).toBe('/home?error=organization_unresolved')
    expect(mockCanOpenClientPortalView).not.toHaveBeenCalled()
  })

  it('keeps the internal support bypass without touching the resolver (D1)', async () => {
    mockRequireServerSession.mockResolvedValue({
      user: { userId: 'user-agent-e2e-001', tenantType: 'efeonce_internal', clientId: 'efeonce' }
    })

    await expect(requireViewCodeAccess('cliente.campanas')).resolves.toBeUndefined()

    expect(mockCanOpenClientPortalView).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
