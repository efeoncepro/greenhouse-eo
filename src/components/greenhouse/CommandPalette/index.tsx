'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { useRouter, usePathname } from 'next/navigation'
import { Command } from 'cmdk'
import { Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription } from '@radix-ui/react-dialog'

import { GOVERNANCE_SECTIONS, VIEW_REGISTRY, type GovernanceSection } from '@/lib/admin/view-access-catalog'

import './styles.css'

/**
 * TASK-696 — Smart Home v2 Command Palette.
 *
 * Adapts the Vuexy `NavSearch` (cmdk + Radix Dialog) to Greenhouse:
 * data source is `VIEW_REGISTRY` (Spanish labels, real route paths),
 * audience filtering happens in the caller via the `routes` prop.
 * Keyboard shortcut: `⌘K` / `Ctrl+K`. Esc to close.
 */

export interface PaletteRoute {
  viewCode: string
  label: string
  description?: string
  routePath: string
  section: GovernanceSection
  icon?: string
  shortcut?: string
}

export interface PaletteAction {
  actionId: string
  label: string
  description?: string
  icon?: string
  shortcut?: string
  onSelect: () => void
}

export interface CommandPaletteProps {
  /**
   * Optional override: if not provided, defaults to the full
   * `VIEW_REGISTRY`. Callers should pass the audience-filtered list
   * (e.g. from the entitlements bridge) for a role-aware experience.
   */
  routes?: PaletteRoute[]
  actions?: PaletteAction[]
  recentItems?: PaletteRoute[]
  triggerLabel?: string
  showTrigger?: boolean
}

const DEFAULT_ICON_FOR_SECTION: Record<GovernanceSection, string> = {
  gestion: 'tabler-building',
  equipo: 'tabler-users-group',
  finanzas: 'tabler-report-money',
  ia: 'tabler-sparkles',
  administracion: 'tabler-shield-lock',
  mi_ficha: 'tabler-user-circle',
  cliente: 'tabler-folders'
}

const sectionLabel = (section: GovernanceSection): string =>
  GOVERNANCE_SECTIONS.find(entry => entry.key === section)?.label ?? section

const buildDefaultRoutes = (): PaletteRoute[] =>
  VIEW_REGISTRY.map(entry => ({
    viewCode: entry.viewCode,
    label: entry.label,
    description: entry.description,
    routePath: entry.routePath,
    section: entry.section,
    icon: DEFAULT_ICON_FOR_SECTION[entry.section]
  }))

const groupRoutesBySection = (routes: PaletteRoute[]): Array<{ section: GovernanceSection; items: PaletteRoute[] }> => {
  const map = new Map<GovernanceSection, PaletteRoute[]>()

  for (const route of routes) {
    const existing = map.get(route.section)

    if (existing) existing.push(route)
    else map.set(route.section, [route])
  }

  return Array.from(map.entries()).map(([section, items]) => ({ section, items }))
}

const Footer = () => (
  <div className='gh-cmdk-footer'>
    <div className='gh-cmdk-footer-group'>
      <kbd>
        <i className='tabler-arrow-up' style={{ fontSize: 12 }} />
      </kbd>
      <kbd>
        <i className='tabler-arrow-down' style={{ fontSize: 12 }} />
      </kbd>
      <span>navegar</span>
    </div>
    <div className='gh-cmdk-footer-group'>
      <kbd>
        <i className='tabler-corner-down-left' style={{ fontSize: 12 }} />
      </kbd>
      <span>abrir</span>
    </div>
    <div className='gh-cmdk-footer-group'>
      <kbd>esc</kbd>
      <span>cerrar</span>
    </div>
  </div>
)

interface PaletteItemProps {
  children: ReactNode
  shortcut?: string
  value: string
  routePath: string
  currentPath: string
  onSelect: () => void
}

const PaletteItem = ({ children, shortcut, value, routePath, currentPath, onSelect }: PaletteItemProps) => (
  <Command.Item value={value} onSelect={onSelect} data-active={currentPath === routePath ? 'true' : undefined}>
    {children}
    {shortcut ? (
      <div className='gh-cmdk-shortcuts'>
        {shortcut.split(' ').map(key => (
          <kbd key={key}>{key}</kbd>
        ))}
      </div>
    ) : null}
  </Command.Item>
)

export const CommandPalette = ({
  routes,
  actions,
  recentItems,
  triggerLabel = 'Buscar ⌘K',
  showTrigger = true
}: CommandPaletteProps) => {
  const router = useRouter()
  const currentPath = usePathname() ?? '/'
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const allRoutes = useMemo(() => routes ?? buildDefaultRoutes(), [routes])

  const groups = useMemo(() => groupRoutesBySection(allRoutes), [allRoutes])

  const showRecents = !search && recentItems && recentItems.length > 0

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(value => !value)
      }
    }

    document.addEventListener('keydown', handler)

    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!open && search) setSearch('')
  }, [open, search])

  const handleNavigate = (routePath: string) => {
    setOpen(false)
    router.push(routePath)
  }

  const handleAction = (action: PaletteAction) => {
    setOpen(false)
    action.onSelect()
  }

  return (
    <>
      {showTrigger ? (
        <button
          type='button'
          className='gh-cmdk-trigger'
          onClick={() => setOpen(true)}
          aria-label='Abrir buscador rápido'
        >
          <i className='tabler-search' />
          <span>{triggerLabel}</span>
        </button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay cmdk-overlay='' />
          <DialogContent cmdk-dialog='' aria-describedby='gh-cmdk-description'>
            <DialogTitle hidden>Greenhouse Command Palette</DialogTitle>
            <DialogDescription id='gh-cmdk-description' hidden>
              Buscar vistas, acciones y atajos en Greenhouse. ⌘K para abrir, esc para cerrar.
            </DialogDescription>
            <Command label='Greenhouse Command Palette' shouldFilter>
              <div className='gh-cmdk-header'>
                <i className='tabler-search' />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder='Buscar vistas, acciones, atajos...'
                  aria-label='Buscar en Greenhouse'
                />
                <kbd>esc</kbd>
              </div>
              <Command.List>
                {showRecents && recentItems ? (
                  <Command.Group heading='Recientes'>
                    {recentItems.map(item => (
                      <PaletteItem
                        key={`recent-${item.viewCode}`}
                        value={`${item.label} ${item.viewCode} reciente`}
                        routePath={item.routePath}
                        currentPath={currentPath}
                        onSelect={() => handleNavigate(item.routePath)}
                      >
                        <i className={item.icon ?? DEFAULT_ICON_FOR_SECTION[item.section]} />
                        <span>{item.label}</span>
                      </PaletteItem>
                    ))}
                  </Command.Group>
                ) : null}
                {actions && actions.length > 0 ? (
                  <Command.Group heading='Acciones'>
                    {actions.map(action => (
                      <PaletteItem
                        key={`action-${action.actionId}`}
                        value={`${action.label} ${action.actionId} accion`}
                        routePath={action.actionId}
                        currentPath={currentPath}
                        shortcut={action.shortcut}
                        onSelect={() => handleAction(action)}
                      >
                        <i className={action.icon ?? 'tabler-sparkles'} />
                        <span>{action.label}</span>
                      </PaletteItem>
                    ))}
                  </Command.Group>
                ) : null}
                {groups.map(group => (
                  <Command.Group key={group.section} heading={sectionLabel(group.section)}>
                    {group.items.map(item => (
                      <PaletteItem
                        key={item.viewCode}
                        value={`${item.label} ${item.viewCode} ${item.description ?? ''}`}
                        routePath={item.routePath}
                        currentPath={currentPath}
                        shortcut={item.shortcut}
                        onSelect={() => handleNavigate(item.routePath)}
                      >
                        <i className={item.icon ?? DEFAULT_ICON_FOR_SECTION[group.section]} />
                        <span>{item.label}</span>
                      </PaletteItem>
                    ))}
                  </Command.Group>
                ))}
                <Command.Empty>
                  <div className='gh-cmdk-empty'>
                    <i className='tabler-search-off' style={{ fontSize: 32 }} />
                    <div>Sin resultados para "{search}"</div>
                  </div>
                </Command.Empty>
              </Command.List>
              <Footer />
            </Command>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  )
}

export default CommandPalette
