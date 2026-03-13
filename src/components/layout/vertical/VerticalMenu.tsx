import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import PerfectScrollbar from 'react-perfect-scrollbar'
import { useSession } from 'next-auth/react'

import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

import { Menu, MenuItem, MenuSection } from '@menu/vertical-menu'

import useVerticalNav from '@menu/hooks/useVerticalNav'

import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

import { GH_NAV } from '@/config/greenhouse-nomenclature'
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

const NavigationItemLabel = ({ label, subtitle, showSubtitle }: { label: string; subtitle: string; showSubtitle: boolean }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
    <Typography component='span' sx={{ color: 'inherit', fontSize: 'inherit', fontWeight: 500, lineHeight: 1.2 }}>
      {label}
    </Typography>
    {showSubtitle ? (
      <Typography component='span' variant='caption' sx={{ color: 'rgba(255, 255, 255, 0.56)', lineHeight: 1.2, whiteSpace: 'normal' }}>
        {subtitle}
      </Typography>
    ) : null}
  </Box>
)

const VerticalMenu = ({ scrollMenu }: Props) => {
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()

  const { isBreakpointReached, transitionDuration, isCollapsed, isHovered } = verticalNavOptions
  const { data: session } = useSession()
  const isInternalUser = session?.user?.routeGroups?.includes('internal') ?? false
  const isAdminUser = session?.user?.routeGroups?.includes('admin') ?? false
  const dashboardHref = session?.user?.portalHomePath || '/dashboard'

  const capabilityModules = resolveCapabilityModules({
    businessLines: session?.user?.businessLines || [],
    serviceModules: session?.user?.serviceModules || []
  })

  const showNavSubtitles = !(isCollapsed && !isHovered)
  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
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
      <Menu
        popoutMenuOffset={{ mainAxis: 23 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='tabler-circle text-xs' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        <MenuSection label='Operacion'>
          <MenuItem href={dashboardHref} icon={<i className='tabler-smart-home' />}>
            <NavigationItemLabel
              label={isInternalUser ? 'Dashboard' : GH_NAV.dashboard.label}
              subtitle={GH_NAV.dashboard.subtitle}
              showSubtitle={!isInternalUser && showNavSubtitles}
            />
          </MenuItem>
          {!isInternalUser ? (
            <>
              <MenuItem href='/proyectos' icon={<i className='tabler-folders' />}>
                <NavigationItemLabel
                  label={GH_NAV.projects.label}
                  subtitle={GH_NAV.projects.subtitle}
                  showSubtitle={showNavSubtitles}
                />
              </MenuItem>
              <MenuItem href='/sprints' icon={<i className='tabler-bolt' />}>
                <NavigationItemLabel
                  label={GH_NAV.sprints.label}
                  subtitle={GH_NAV.sprints.subtitle}
                  showSubtitle={showNavSubtitles}
                />
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
              <NavigationItemLabel
                label={GH_NAV.settings.label}
                subtitle={GH_NAV.settings.subtitle}
                showSubtitle={showNavSubtitles}
              />
            </MenuItem>
          </MenuSection>
        ) : null}
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
