// MUI Imports
import Button from '@mui/material/Button'

// Type Imports
import type { ChildrenType } from '@core/types'

// Layout Imports
import LayoutWrapper from '@layouts/LayoutWrapper'
import VerticalLayout from '@layouts/VerticalLayout'
import HorizontalLayout from '@layouts/HorizontalLayout'

// Component Imports
import Providers from '@components/Providers'
import Navigation from '@components/layout/vertical/Navigation'
import Header from '@components/layout/horizontal/Header'
import Navbar from '@components/layout/vertical/Navbar'
import VerticalFooter from '@components/layout/vertical/Footer'
import HorizontalFooter from '@components/layout/horizontal/Footer'
import ScrollToTop from '@core/components/scroll-to-top'
import NexaFloatingButton from '@/components/greenhouse/NexaFloatingButton'
import NexaLaneContentHost from '@/components/greenhouse/NexaLaneContentHost'
import { NexaContextProvider } from '@/lib/nexa/nexa-page-context'
import { NexaInteractionModeProvider } from '@/lib/nexa/nexa-interaction-mode-context'
import { resolveNexaInteractionModeForUser } from '@/lib/nexa/interaction-mode.server'
import RecentsTracker from '@/components/greenhouse/RecentsTracker'
import ChunkRecoveryClear from '@/components/ChunkRecoveryClear'
import { AdaptiveSidecarShellProvider, ShellFloatingActionDock } from '@/components/greenhouse/primitives'

// Util Imports
import { getMode, getSystemMode } from '@core/utils/serverHelpers'

// Lib Imports
import { requireServerSession } from '@/lib/auth/require-server-session'
import { resolveAvatarUrl } from '@/lib/person-360/resolve-avatar'
import { composeNavItemsFromModules } from '@/lib/client-portal/composition/menu-builder'
import type { ClientNavItem } from '@/lib/client-portal/composition/menu-builder-shape'
import { resolveClientPortalModulesForOrganization } from '@/lib/client-portal/readers/native/module-resolver'
import { ClientPortalVisibilityProvider } from '@/lib/client-portal/visibility/client-portal-visibility-context'
import type { ClientPortalViewVisibilityInputs } from '@/lib/client-portal/visibility/client-portal-view-visibility'
import { resolveClientPortalVisibilityInputs } from '@/lib/client-portal/visibility/resolve-client-portal-visibility'
import { captureWithDomain } from '@/lib/observability/capture'

// El layout depende de cookies/headers via NextAuth — siempre dynamic.
// Evita que Next intente prerender bajo (dashboard) y emita warnings
// "Dynamic server usage" durante build.
export const dynamic = 'force-dynamic'

const Layout = async (props: ChildrenType) => {
  const { children } = props
  const session = await requireServerSession()

  // Vars
  const direction = 'ltr'
  let mode: Awaited<ReturnType<typeof getMode>> = 'light'
  let systemMode: Awaited<ReturnType<typeof getSystemMode>> = 'light'

  try {
    mode = await getMode()
    systemMode = await getSystemMode()
  } catch (error) {
    console.error('[DashboardLayout] getMode/getSystemMode failed:', error)
  }

  // TASK-1079 — modo de interacción con Nexa (dock A / expandible B / lane C). Resuelto
  // server-side con degradación honesta (default = comportamiento vigente del flotante).
  const nexaInteractionMode = await resolveNexaInteractionModeForUser(session.user.userId)

  // TASK-1388 — el avatar del chrome se resuelve acá (server) con el helper
  // canónico `resolveAvatarUrl` (server-only) y viaja como prop: el cliente
  // nunca compone la URL del proxy de media.
  const chromeAvatarUrl = resolveAvatarUrl(session.user.avatarUrl ?? null, session.user.userId ?? null)

  // TASK-1675 — ítems de menú de los módulos que la organización tiene contratados.
  //
  // Éste es el único punto server con sesión que gobierna el menú, y el resolver
  // (`server-only`, PG) no puede cruzar al cliente: al `VerticalMenu` viaja sólo
  // esta lista como JSON plano.
  //
  // El guard no es una optimización: sin él, cada carga dura de un usuario interno
  // pega a PG por un dato que no va a usar. Y el `try/catch` es estructural, no
  // defensivo — este layout es la raíz de TODO el dashboard, así que un fallo del
  // resolver sin capturar sería la diferencia entre "un cliente no ve un ítem" y
  // "nadie entra al portal". Degrada al menú de siempre, nunca a un menú vacío.
  let clientNavItems: readonly ClientNavItem[] = []

  // TASK-1685 Slice 2 — los insumos del primitive de visibilidad, resueltos UNA vez.
  //
  // Es el punto donde menú y puerta dejan de poder discrepar: los dos evalúan el mismo
  // predicado (`canSeeClientPortalView`) y, desde acá, sobre los mismos insumos. Hasta esta
  // task el menú preguntaba por el ROL (`authorizedViews`) y la página por el MÓDULO, y nadie
  // podía ver la diferencia desde ninguno de los dos lados — 36 enlaces muertos medidos.
  //
  // El default cerrado importa: si el resolver falla, el cliente ve un menú incompleto, no un
  // menú que promete lo que la puerta va a negar.
  let clientPortalVisibility: ClientPortalViewVisibilityInputs = {
    isInternalSession:
      // client-portal-allowed: no es branching por business line — es el bypass D1 del portal,
      // el MISMO discriminador que usa `requireViewCodeAccess` para dejar entrar a un operador
      // interno a una superficie cliente. Derivarlo de otra cosa desalinearía menú y puerta.
      session.user.tenantType === 'efeonce_internal',
    moduleViewCodes: [],
    revokedViewCodes: []
  }

  if (
    // client-portal-allowed: el `tenantType` acá no decide visibilidad — decide si
    // vale la pena consultar al resolver. La visibilidad la resuelve el resolver
    // canónico (TASK-825), que es exactamente lo que este bloque invoca abajo.
    session.user.tenantType === 'client' &&
    session.user.organizationId
  ) {
    try {
      const [modules, visibilityInputs] = await Promise.all([
        resolveClientPortalModulesForOrganization(session.user.organizationId),
        resolveClientPortalVisibilityInputs({
          userId: session.user.userId,
          organizationId: session.user.organizationId,
          isInternalSession: false
        })
      ])

      clientNavItems = composeNavItemsFromModules(modules)
      clientPortalVisibility = visibilityInputs
    } catch (error) {
      captureWithDomain(error, 'client_portal', {
        tags: { source: 'vertical_menu', stage: 'resolver' },
        extra: { organizationId: session.user.organizationId }
      })
    }
  }

  return (
    <Providers direction={direction} session={session}>
      {/* NexaContextProvider envuelve las páginas (que declaran su entidad vía
          NexaContextScope) y el NexaFloatingButton (que la lee) → prompts contextuales
          con el nombre real (Tier 1.5). */}
      <NexaContextProvider>
        <ClientPortalVisibilityProvider inputs={clientPortalVisibility}>
        <NexaInteractionModeProvider initialMode={nexaInteractionMode}>
        <AdaptiveSidecarShellProvider>
          <LayoutWrapper
            systemMode={systemMode}
            verticalLayout={
              <VerticalLayout
                navigation={<Navigation mode={mode} clientNavItems={clientNavItems} />}
                navbar={<Navbar avatarUrl={chromeAvatarUrl} />}
                footer={<VerticalFooter />}
              >
                {/* TASK-1079 — host del modo lane: passthrough byte-idéntico salvo modo lane. */}
                <NexaLaneContentHost>{children}</NexaLaneContentHost>
              </VerticalLayout>
            }
            horizontalLayout={
              <HorizontalLayout header={<Header avatarUrl={chromeAvatarUrl} />} footer={<HorizontalFooter />}>
                <NexaLaneContentHost>{children}</NexaLaneContentHost>
              </HorizontalLayout>
            }
          />
        </AdaptiveSidecarShellProvider>
        <ShellFloatingActionDock>
          <ScrollToTop docked className='mui-fixed'>
            <Button variant='contained' className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'>
              <i className='tabler-arrow-up' />
            </Button>
          </ScrollToTop>
          <NexaFloatingButton docked />
        </ShellFloatingActionDock>
        <RecentsTracker />
        <ChunkRecoveryClear />
        </NexaInteractionModeProvider>
        </ClientPortalVisibilityProvider>
      </NexaContextProvider>
    </Providers>
  )
}

export default Layout
