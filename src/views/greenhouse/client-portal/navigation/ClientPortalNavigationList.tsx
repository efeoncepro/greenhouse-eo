'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'

import {
  groupNavItems,
  type ClientNavItem,
  type NavItemGroup
} from '@/lib/client-portal/composition/menu-builder'
import { GH_CLIENT_PORTAL_COMPOSITION } from '@/lib/copy/client-portal'

/**
 * TASK-827 Slice 3 — Client component que renderiza nav items del resolver.
 *
 * Consumido por `<ClientPortalNavigation>` (server) que le pasa items YA
 * procesados (filtered + deduped + sorted). Este componente solo renderiza
 * con Link + active state highlight via `usePathname()`.
 *
 * Anatomía:
 *   - Section header (uppercase letterSpacing) por group
 *   - ListItemButton con Tabler icon + label + tier badge para addons
 *   - Active state: `aria-current='page'` + background highlight
 *
 * Mobile: el VerticalMenu canonical Vuexy (Slice 6) maneja Drawer responsive.
 * Aquí el componente es agnóstico al chrome (standalone usable).
 *
 * Validado por skills greenhouse-dev + greenhouse-ux + greenhouse-ux-writing.
 */

interface ClientPortalNavigationListProps {
  readonly items: readonly ClientNavItem[]
}

const GROUP_LABELS = GH_CLIENT_PORTAL_COMPOSITION.navigationGroups

const ClientPortalNavigationList = ({ items }: ClientPortalNavigationListProps) => {
  const pathname = usePathname()
  const grouped = groupNavItems(items)
  const copy = GH_CLIENT_PORTAL_COMPOSITION.navigation

  // Empty state visible: signal honesto (degradación) — page consumer puede
  // renderizar zero-state component encima si modules.length === 0
  if (items.length === 0) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', textAlign: 'center' }}>
          {copy.emptyMessage}
        </Typography>
      </Box>
    )
  }

  const groupOrder: NavItemGroup[] = ['primary', 'capabilities', 'account']

  return (
    <Box component='nav' aria-label={copy.ariaLabel}>
      {groupOrder.map((group, groupIndex) => {
        const groupItems = grouped[group]

        if (groupItems.length === 0) return null

        return (
          <Box key={group} sx={{ mb: 2 }}>
            {groupIndex > 0 && <Divider sx={{ my: 1.5 }} />}
            <Typography
              variant='caption'
              sx={{
                display: 'block',
                px: 3,
                py: 1,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
                fontSize: '0.7rem'
              }}
            >
              {GROUP_LABELS[group]}
            </Typography>
            <List dense disablePadding>
              {groupItems.map(item => {
                const isActive = pathname === item.route

                return (
                  <ListItemButton
                    key={item.viewCode}
                    component={Link}
                    href={item.route}
                    selected={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    sx={{
                      mx: 1.5,
                      borderRadius: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: theme => theme.palette.action.selected
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <i className={item.icon} style={{ fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        variant: 'body2',
                        sx: { fontWeight: isActive ? 600 : 400 }
                      }}
                    />
                    {item.tier === 'addon' && (
                      <Typography
                        variant='caption'
                        sx={{
                          ml: 1,
                          px: 1,
                          py: 0.25,
                          borderRadius: 0.75,
                          backgroundColor: theme => theme.palette.warning.main,
                          color: 'common.white',
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}
                      >
                        {copy.addonBadge}
                      </Typography>
                    )}
                  </ListItemButton>
                )
              })}
            </List>
          </Box>
        )
      })}
    </Box>
  )
}

export default ClientPortalNavigationList
