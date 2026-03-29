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
  const isMyUser = session?.user?.routeGroups?.includes('my') ?? false
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
      label: <NavLabel label={GH_INTERNAL_NAV.home.label} subtitle={GH_INTERNAL_NAV.home.subtitle} show={showSub} />,
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
        { label: <NavLabel label='Agencia' subtitle='Command Center' show={showSub} />, href: '/agency', icon: 'tabler-building' },
        { label: <NavLabel label='Spaces' subtitle='Clientes y salud operativa' show={showSub} />, href: '/agency/spaces', icon: 'tabler-grid-4x4' },
        { label: <NavLabel label='Economía' subtitle='P&L y rentabilidad' show={showSub} />, href: '/agency/economics', icon: 'tabler-chart-line' },
        { label: <NavLabel label='Equipo' subtitle='Capacidad y dedicación' show={showSub} />, href: '/agency/team', icon: 'tabler-users-group' },
        { label: <NavLabel label='Delivery' subtitle='ICO, sprints y producción' show={showSub} />, href: '/agency/delivery', icon: 'tabler-cpu' },
        { label: <NavLabel label='Campañas' subtitle='Iniciativas cross-space' show={showSub} />, href: '/agency/campaigns', icon: 'tabler-speakerphone' },
        { label: <NavLabel label={GH_AGENCY_NAV.services.label} subtitle={GH_AGENCY_NAV.services.subtitle} show={showSub} />, href: '/agency/services', icon: 'tabler-packages' },
        { label: <NavLabel label='Operaciones' subtitle='Salud del platform' show={showSub} />, href: '/agency/operations', icon: 'tabler-activity' },
        ...(isInternalUser
          ? [
              {
                label: <NavLabel label={GH_INTERNAL_NAV.internalDashboard.label} subtitle={GH_INTERNAL_NAV.internalDashboard.subtitle} show={showSub} />,
                href: '/internal/dashboard',
                icon: 'tabler-layout-dashboard'
              }
            ]
          : []),
        { label: <NavLabel label={GH_AGENCY_NAV.organizations.label} subtitle={GH_AGENCY_NAV.organizations.subtitle} show={showSub} />, href: '/agency/organizations', icon: 'tabler-building-community' }
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
          label: <NavLabel label='Nómina Proyectada' subtitle='Simulación y previsión' show={showSub} />,
          href: '/hr/payroll/projected',
          icon: 'tabler-calculator'
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
      label: GH_INTERNAL_NAV.adminCenter.label,
      icon: 'tabler-shield-lock',
      children: [
        { label: <NavLabel label={GH_INTERNAL_NAV.adminCenter.label} subtitle={GH_INTERNAL_NAV.adminCenter.subtitle} show={showSub} />, href: '/admin' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminTenants.label} subtitle={GH_INTERNAL_NAV.adminTenants.subtitle} show={showSub} />, href: '/admin/tenants' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminUsers.label} subtitle={GH_INTERNAL_NAV.adminUsers.subtitle} show={showSub} />, href: '/admin/users' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminRoles.label} subtitle={GH_INTERNAL_NAV.adminRoles.subtitle} show={showSub} />, href: '/admin/roles' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminTeam.label} subtitle={GH_INTERNAL_NAV.adminTeam.subtitle} show={showSub} />, href: '/admin/team' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminCorreos.label} subtitle={GH_INTERNAL_NAV.adminCorreos.subtitle} show={showSub} />, href: '/admin/email-delivery' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminAiTools.label} subtitle={GH_INTERNAL_NAV.adminAiTools.subtitle} show={showSub} />, href: '/admin/ai-tools' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminCloudIntegrations.label} subtitle={GH_INTERNAL_NAV.adminCloudIntegrations.subtitle} show={showSub} />, href: '/admin/cloud-integrations' },
        { label: <NavLabel label={GH_INTERNAL_NAV.adminOpsHealth.label} subtitle={GH_INTERNAL_NAV.adminOpsHealth.subtitle} show={showSub} />, href: '/admin/ops-health' }
      ]
    })
  }

  // ── Collaborator self-service ("Mi Ficha") ────────────────────────
  if (isMyUser) {
    // If pure collaborator (no internal), show full My sidebar
    // If dual role (internal + my), add as bottom section
    if (!isInternalUser) {
      // Pure collaborator — their primary nav
      menuData.splice(0, 0,
        { label: <NavLabel label='Mi Greenhouse' subtitle='Tu operación personal' show={showSub} />, href: '/my', icon: 'tabler-smart-home' }
      )
    }

    menuData.push(
      { isSection: true, label: 'MI FICHA' } as VerticalMenuDataType,
      { label: <NavLabel label='Mis Asignaciones' subtitle='Clientes y capacidad' show={showSub} />, href: '/my/assignments', icon: 'tabler-users' },
      { label: <NavLabel label='Mi Desempeño' subtitle='Métricas ICO' show={showSub} />, href: '/my/performance', icon: 'tabler-chart-bar' },
      { label: <NavLabel label='Mi Delivery' subtitle='Tareas y proyectos' show={showSub} />, href: '/my/delivery', icon: 'tabler-list-check' },
      { label: <NavLabel label='Mi Perfil' subtitle='Datos personales' show={showSub} />, href: '/my/profile', icon: 'tabler-user-circle' },
      { label: <NavLabel label='Mi Nómina' subtitle='Liquidaciones' show={showSub} />, href: '/my/payroll', icon: 'tabler-receipt' },
      { label: <NavLabel label='Mis Permisos' subtitle='Vacaciones y días' show={showSub} />, href: '/my/leave', icon: 'tabler-calendar-event' },
      { label: <NavLabel label='Mi Organización' subtitle='Directorio y colegas' show={showSub} />, href: '/my/organization', icon: 'tabler-building' }
    )
  }

  // Add "Mi Organización" for client users too (if they have organizationId)
  if (!isInternalUser && !isMyUser && session?.user?.organizationId) {
    menuData.push(
      { label: <NavLabel label='Mi Organización' subtitle='Directorio de colegas' show={showSub} />, href: '/my/organization', icon: 'tabler-building' }
    )
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
