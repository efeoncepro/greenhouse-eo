'use client'

/**
 * TASK-1388 — superficie ⌘K ÚNICA del portal.
 *
 * Consolida las dos palettes que coexistían: `NavSearch` (montada, pero
 * exponía el `VIEW_REGISTRY` completo sin filtrar por audiencia) y
 * `CommandPalette` (TASK-696, dormida, más rica). Base elegida: la segunda
 * — soporta rutas por audiencia, recientes y acciones.
 *
 * Filtro de audiencia (client-side, espejo del contrato del menú TASK-136):
 * la entrada requiere el routeGroup del usuario Y, cuando `authorizedViews`
 * no está vacío, membresía del viewCode. El ⌘K solo NAVEGA — la puerta real
 * de cada página sigue siendo su guard server-side.
 *
 * TASK-1685 Slice 2 — las entradas del routeGroup `client` son la EXCEPCIÓN a
 * ese filtro: no salen del claim de rol sino del primitive de visibilidad, el
 * mismo que consumen el menú y el page guard. El claim de rol no gobierna
 * vistas `cliente.*` (decisión (a′)), así que filtrar por él acá dejaba al ⌘K
 * ofreciendo superficies que la organización no contrató — el mismo defecto
 * que el menú tenía, en la otra superficie de navegación. El resto de los
 * routeGroups (`my`, `internal`, …) conserva el filtro por claim intacto.
 *
 * Recientes: client-side (localStorage), como declara el flow contract de
 * TASK-1388. Se rehidratan mapeando contra la lista YA filtrada, así un
 * viewCode que el rol perdió jamás reaparece por historial.
 */

import { useEffect, useMemo, useState } from 'react'

import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'

import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'
import CommandPalette, { type PaletteAction, type PaletteRoute } from '@/components/greenhouse/CommandPalette'
import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'
import { useClientPortalViewVisibility } from '@/lib/client-portal/visibility/client-portal-visibility-context'
import { GH_MESSAGES } from '@/lib/copy/client-portal'

const RECENTS_STORAGE_KEY = 'gh-cmdk-recents-v1'
const RECENTS_LIMIT = 6

const readStoredRecents = (): string[] => {
  try {
    const raw = window.localStorage.getItem(RECENTS_STORAGE_KEY)

    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)

    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

const persistRecents = (viewCodes: string[]) => {
  try {
    window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(viewCodes))
  } catch {
    // storage lleno/bloqueado: los recientes son un extra, nunca un bloqueo
  }
}

const GlobalCommandPalette = () => {
  const { data: session } = useSession()
  const { settings } = useSettings()
  const { isBreakpointReached } = useVerticalNav()
  const [recentViewCodes, setRecentViewCodes] = useState<string[]>([])

  useEffect(() => {
    setRecentViewCodes(readStoredRecents())
  }, [])

  const routeGroups = session?.user?.routeGroups ?? []
  const authorizedViews = session?.user?.authorizedViews ?? []
  const canSeeClientView = useClientPortalViewVisibility()

  const routes = useMemo<PaletteRoute[]>(
    () =>
      VIEW_REGISTRY.filter(entry => {
        if (!routeGroups.includes(entry.routeGroup)) return false

        // El portal cliente tiene su propio primitive; el claim de rol no lo gobierna.
        if (entry.routeGroup === 'client') return canSeeClientView(entry.viewCode)

        if (authorizedViews.length === 0) return true

        return authorizedViews.includes(entry.viewCode)
      }).map(entry => ({
        viewCode: entry.viewCode,
        label: entry.label,
        description: entry.description,
        routePath: entry.routePath,
        section: entry.section
      })),
    // routeGroups/authorizedViews salen de la sesión; su identidad cambia con ella.
    // `canSeeClientView` viene memoizado sobre los insumos del provider, así que su identidad
    // sólo cambia cuando cambian los módulos o las revocaciones — es una dep estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.user?.routeGroups, session?.user?.authorizedViews, canSeeClientView]
  )

  const recentItems = useMemo<PaletteRoute[]>(
    () =>
      recentViewCodes
        .map(viewCode => routes.find(route => route.viewCode === viewCode))
        .filter((route): route is PaletteRoute => Boolean(route)),
    [recentViewCodes, routes]
  )

  const actions = useMemo<PaletteAction[]>(
    () => [
      {
        actionId: 'logout',
        label: GH_MESSAGES.logout_button,
        icon: 'tabler-logout',
        onSelect: () => {
          void signOut({ callbackUrl: '/login' })
        }
      }
    ],
    []
  )

  const handleNavigate = (route: PaletteRoute) => {
    setRecentViewCodes(previous => {
      const next = [route.viewCode, ...previous.filter(code => code !== route.viewCode)].slice(0, RECENTS_LIMIT)

      persistRecents(next)

      return next
    })
  }

  return (
    <CommandPalette
      routes={routes}
      actions={actions}
      recentItems={recentItems}
      onNavigate={handleNavigate}
      compactTrigger={isBreakpointReached || settings.layout === 'horizontal'}
    />
  )
}

export default GlobalCommandPalette
