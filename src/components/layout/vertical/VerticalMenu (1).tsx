// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useSession } from 'next-auth/react'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, MenuItem, MenuSection } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

import { resolveCapabilityModules } from '@/lib/capabilities/resolve-capabilities'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='tabler-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()

  // Vars
  const { isBreakpointReached, transitionDuration } = verticalNavOptions
  const { data: session } = useSession()
  const isInternalUser = session?.user?.routeGroups?.includes('internal') ?? false
  const isAdminUser = session?.user?.routeGroups?.includes('admin') ?? false
  const dashboardHref = session?.user?.portalHomePath || '/dashboard'

  const capabilityModules = resolveCapabilityModules({
    businessLines: session?.user?.businessLines || [],
    serviceModules: session?.user?.serviceModules || []
  })

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      {/* Incase you also want to scroll NavHeader to scroll with Vertical Menu, remove NavHeader from above and paste it below this comment */}
      {/* Vertical Menu */}
      <Menu
        popoutMenuOffset={{ mainAxis: 23 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='tabler-circle text-xs' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        <MenuSection label='Operacion'>
          <MenuItem href={dashboardHref} icon={<i className='tabler-smart-home' />}>
            Dashboard
          </MenuItem>
          {!isInternalUser ? (
            <>
              <MenuItem href='/proyectos' icon={<i className='tabler-folders' />}>
                Proyectos
              </MenuItem>
              <MenuItem href='/sprints' icon={<i className='tabler-bolt' />}>
                Sprints
              </MenuItem>
            </>
          ) : null}
        </MenuSection>
        {!isInternalUser && capabilityModules.length > 0 ? (
          <MenuSection label='Servicios'>
            {capabilityModules.map(module => (
              <MenuItem key={module.id} href={module.route} icon={<i className={module.icon} />}>
                {module.label}
              </MenuItem>
            ))}
          </MenuSection>
        ) : null}
        {isAdminUser ? (
          <MenuSection label='Admin'>
            <MenuItem href='/admin/tenants' icon={<i className='tabler-building-community' />}>
              Admin Tenants
            </MenuItem>
            <MenuItem href='/admin/users' icon={<i className='tabler-users' />}>
              Admin Users
            </MenuItem>
            <MenuItem href='/admin/roles' icon={<i className='tabler-shield-lock' />}>
              Roles & Permissions
            </MenuItem>
          </MenuSection>
        ) : null}
        {!isInternalUser ? (
          <MenuSection label='Cuenta'>
            <MenuItem href='/settings' icon={<i className='tabler-settings' />}>
              Settings
            </MenuItem>
          </MenuSection>
        ) : null}
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
