import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import PerfectScrollbar from 'react-perfect-scrollbar'
import { useSession } from 'next-auth/react'

import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'
import type { VerticalMenuDataType } from '@/types/menuTypes'

import { Menu } from '@menu/vertical-menu'

import useVerticalNav from '@menu/hooks/useVerticalNav'

import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

import { GenerateVerticalMenu } from '@/components/GenerateMenu'
import { GH_AGENCY_NAV, GH_CLIENT_NAV, GH_FINANCE_NAV, GH_HR_NAV, GH_INTERNAL_NAV, GH_PEOPLE_NAV } from '@/config/greenhouse-nomenclature'
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

const NavLabel = ({ label, subtitle, show }: { label: string; subtitle: string; show: boolean }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
    <Typography component='span' sx={{ color: 'inherit', fontSize: 'inherit', fontWeight: 500, lineHeight: 1.2 }}>
      {label}
    </Typography>
    {show ? (
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
  const isHrUser = session?.user?.routeGroups?.includes('hr') ?? false
  const isFinanceUser = session?.user?.routeGroups?.includes('finance') ?? false
  const isPeopleRouteGroup = session?.user?.routeGroups?.includes('people') ?? false
  const isAiToolingUser = session?.user?.routeGroups?.includes('ai_tooling') ?? false
  const isAgencyUser = isInternalUser || isAdminUser
  const roleCodes = session?.user?.roleCodes ?? []

  const canSeePeople =
    isPeopleRouteGroup ||
    roleCodes.includes('efeonce_admin') ||
    roleCodes.includes('efeonce_operations') ||
    roleCodes.includes('hr_payroll')

  const dashboardHref = session?.user?.portalHomePath || '/dashboard'

  const capabilityModules = resolveCapabilityModules({
    businessLines: session?.user?.businessLines || [],
    serviceModules: session?.user?.serviceModules || []
  })

  const showSub = !(isCollapsed && !isHovered)
  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  // Build menu data array based on user roles
  const menuData: VerticalMenuDataType[] = []

  // ── Primary navigation ──────────────────────────────────────────────
  if (isInternalUser) {
    // Flat item — no section wrapper (single item doesn't warrant a section)
    menuData.push({
      label: <NavLabel label={GH_INTERNAL_NAV.internalDashboard.label} subtitle={GH_INTERNAL_NAV.internalDashboard.subtitle} show={showSub} />,
      href: dashboardHref,
      icon: 'tabler-smart-home'
    })
  } else {
    menuData.push(
      {
        label: <NavLabel label={GH_CLIENT_NAV.dashboard.label} subtitle={GH_CLIENT_NAV.dashboard.subtitle} show={showSub} />,
        href: dashboardHref,
        icon: 'tabler-smart-home'
      },
      {
        label: <NavLabel label={GH_CLIENT_NAV.projects.label} subtitle={GH_CLIENT_NAV.projects.subtitle} show={showSub} />,
        href: '/proyectos',
        icon: 'tabler-folders'
      },
      {
        label: <NavLabel label={GH_CLIENT_NAV.sprints.label} subtitle={GH_CLIENT_NAV.sprints.subtitle} show={showSub} />,
        href: '/sprints',
        icon: 'tabler-bolt'
      },
      {
        label: <NavLabel label={GH_CLIENT_NAV.settings.label} subtitle={GH_CLIENT_NAV.settings.subtitle} show={showSub} />,
        href: '/settings',
        icon: 'tabler-settings'
      },
      {
        label: <NavLabel label={GH_CLIENT_NAV.updates.label} subtitle={GH_CLIENT_NAV.updates.subtitle} show={showSub} />,
        href: '/updates',
        icon: 'tabler-bell'
      }
    )
  }

  // ── Módulos (client capability modules) ─────────────────────────────
  if (!isInternalUser && capabilityModules.length > 0) {
    menuData.push({
      isSection: true,
      label: 'Módulos',
      children: capabilityModules.map(module => ({
        label: module.label,
        href: module.route,
        icon: module.icon
      }))
    })
  }

  // ── Gestión (agency) ────────────────────────────────────────────────
  if (isAgencyUser) {
    menuData.push({
      isSection: true,
      label: 'Gestión',
      children: [
        {
          label: <NavLabel label={GH_AGENCY_NAV.workspace.label} subtitle={GH_AGENCY_NAV.workspace.subtitle} show={showSub} />,
          href: '/agency',
          icon: 'tabler-building'
        },
        {
          label: <NavLabel label={GH_AGENCY_NAV.organizations.label} subtitle={GH_AGENCY_NAV.organizations.subtitle} show={showSub} />,
          href: '/agency/organizations',
          icon: 'tabler-building-community'
        },
        {
          label: <NavLabel label={GH_AGENCY_NAV.services.label} subtitle={GH_AGENCY_NAV.services.subtitle} show={showSub} />,
          href: '/agency/services',
          icon: 'tabler-packages'
        }
      ]
    })
  }

  // ── Equipo (people + HR unified) ────────────────────────────────────
  const hasHrAccess = isHrUser || isAdminUser
  const hrItems: VerticalMenuDataType[] = hasHrAccess
    ? [
        {
          label: <NavLabel label={GH_HR_NAV.payroll.label} subtitle={GH_HR_NAV.payroll.subtitle} show={showSub} />,
          href: '/hr/payroll',
          icon: 'tabler-receipt'
        },
        {
          label: <NavLabel label={GH_HR_NAV.departments.label} subtitle={GH_HR_NAV.departments.subtitle} show={showSub} />,
          href: '/hr/departments',
          icon: 'tabler-sitemap'
        },
        {
          label: <NavLabel label={GH_HR_NAV.leave.label} subtitle={GH_HR_NAV.leave.subtitle} show={showSub} />,
          href: '/hr/leave',
          icon: 'tabler-calendar-event'
        },
        {
          label: <NavLabel label={GH_HR_NAV.attendance.label} subtitle={GH_HR_NAV.attendance.subtitle} show={showSub} />,
          href: '/hr/attendance',
          icon: 'tabler-clock-check'
        }
      ]
    : []

  if (canSeePeople && hasHrAccess) {
    // Both people + HR → unified section
    menuData.push({
      isSection: true,
      label: 'Equipo',
      children: [
        {
          label: <NavLabel label={GH_PEOPLE_NAV.people.label} subtitle={GH_PEOPLE_NAV.people.subtitle} show={showSub} />,
          href: '/people',
          icon: 'tabler-users-group'
        },
        ...hrItems
      ]
    })
  } else if (canSeePeople) {
    // Only people, no HR → flat item (avoid single-item section)
    menuData.push({
      label: <NavLabel label={GH_PEOPLE_NAV.people.label} subtitle={GH_PEOPLE_NAV.people.subtitle} show={showSub} />,
      href: '/people',
      icon: 'tabler-users-group'
    })
  } else if (hasHrAccess) {
    // Only HR, no people → section with HR items
    menuData.push({
      isSection: true,
      label: 'Equipo',
      children: hrItems
    })
  }

  // ── Finanzas (submenu — 6 children, collapse reduces noise) ─────────
  if (isFinanceUser || isAdminUser) {
    menuData.push({
      label: 'Finanzas',
      icon: 'tabler-report-money',
      children: [
        { label: <NavLabel label={GH_FINANCE_NAV.dashboard.label} subtitle={GH_FINANCE_NAV.dashboard.subtitle} show={showSub} />, href: '/finance' },
        { label: <NavLabel label={GH_FINANCE_NAV.income.label} subtitle={GH_FINANCE_NAV.income.subtitle} show={showSub} />, href: '/finance/income' },
        { label: <NavLabel label={GH_FINANCE_NAV.expenses.label} subtitle={GH_FINANCE_NAV.expenses.subtitle} show={showSub} />, href: '/finance/expenses' },
        { label: <NavLabel label={GH_FINANCE_NAV.suppliers.label} subtitle={GH_FINANCE_NAV.suppliers.subtitle} show={showSub} />, href: '/finance/suppliers' },
        { label: <NavLabel label={GH_FINANCE_NAV.reconciliation.label} subtitle={GH_FINANCE_NAV.reconciliation.subtitle} show={showSub} />, href: '/finance/reconciliation' },
        { label: <NavLabel label={GH_FINANCE_NAV.intelligence.label} subtitle={GH_FINANCE_NAV.intelligence.subtitle} show={showSub} />, href: '/finance/intelligence' }
      ]
    })
  }

  // ── Herramientas IA (standalone for non-admin ai_tooling users) ─────
  if (isAiToolingUser && !isAdminUser) {
    menuData.push({
      label: <NavLabel label={GH_INTERNAL_NAV.adminAiTools.label} subtitle={GH_INTERNAL_NAV.adminAiTools.subtitle} show={showSub} />,
      href: '/admin/ai-tools',
      icon: 'tabler-robot'
    })
  }

  // ── Administración (submenu — 5 children) ───────────────────────────
  if (isAdminUser) {
    menuData.push({
      label: 'Administración',
      icon: 'tabler-shield-lock',
      children: [
        { label: <NavLabel label={GH_INTERNAL_NAV.adminTenants.label} subtitle={GH_INTERNAL_NAV.adminTenants.subtitle} show={showSub} />, href: '/admin/tenants' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminTeam.label} subtitle={GH_INTERNAL_NAV.adminTeam.subtitle} show={showSub} />, href: '/admin/team' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminUsers.label} subtitle={GH_INTERNAL_NAV.adminUsers.subtitle} show={showSub} />, href: '/admin/users' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminRoles.label} subtitle={GH_INTERNAL_NAV.adminRoles.subtitle} show={showSub} />, href: '/admin/roles' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminAiTools.label} subtitle={GH_INTERNAL_NAV.adminAiTools.subtitle} show={showSub} />, href: '/admin/ai-tools' }
      ]
    })
  }

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
        <GenerateVerticalMenu menuData={menuData} />
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
