import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import PerfectScrollbar from 'react-perfect-scrollbar'
import { useSession } from 'next-auth/react'
import { useLocale } from 'next-intl'

import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'
import type { VerticalMenuDataType } from '@/types/menuTypes'

import { Menu } from '@menu/vertical-menu'

import useVerticalNav from '@menu/hooks/useVerticalNav'

import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

import { GenerateVerticalMenu } from '@/components/GenerateMenu'
import { getGreenhouseNavigationCopy } from '@/config/greenhouse-navigation-copy'
import { ROLE_CODES } from '@/config/role-codes'
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
  const locale = useLocale()

  const { isBreakpointReached, transitionDuration, isCollapsed, isHovered } = verticalNavOptions
  const { data: session } = useSession()
  const authorizedViews = session?.user?.authorizedViews ?? []
  const isInternalUser = session?.user?.routeGroups?.includes('internal') ?? false
  const isAdminUser = session?.user?.routeGroups?.includes('admin') ?? false
  const isHrUser = session?.user?.routeGroups?.includes('hr') ?? false
  const isFinanceUser = session?.user?.routeGroups?.includes('finance') ?? false
  const isPeopleRouteGroup = session?.user?.routeGroups?.includes('people') ?? false
  const isAiToolingUser = session?.user?.routeGroups?.includes('ai_tooling') ?? false
  const isMyUser = session?.user?.routeGroups?.includes('my') ?? false
  const isAgencyUser = isInternalUser || isAdminUser
  const roleCodes = session?.user?.roleCodes ?? []

  const canSeeBankTreasury =
    roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN) ||
    roleCodes.includes(ROLE_CODES.FINANCE_ADMIN) ||
    roleCodes.includes(ROLE_CODES.FINANCE_ANALYST)

  const dashboardHref = session?.user?.portalHomePath || '/home'

  // TASK-727 — Supervisor scope canonical (derivado de reporting_lines/operational_responsibilities,
  // inyectado en el JWT por auth.ts). Reemplaza la heurística previa basada en `dashboardHref`.
  const supervisorAccess = session?.user?.supervisorAccess ?? null

  const canSupervise =
    Boolean(session?.user?.memberId) && supervisorAccess?.canAccessSupervisorLeave === true

  const canSuperviseOrgChart =
    Boolean(session?.user?.memberId) && supervisorAccess?.canAccessSupervisorPeople === true

  const canSeePeople =
    isPeopleRouteGroup ||
    canSupervise ||
    roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN) ||
    roleCodes.includes(ROLE_CODES.EFEONCE_OPERATIONS) ||
    roleCodes.includes(ROLE_CODES.HR_PAYROLL)

  const canSeeSupervisorOrgChart = canSuperviseOrgChart || authorizedViews.includes('equipo.organigrama')

  const capabilityModules = resolveCapabilityModules({
    businessLines: session?.user?.businessLines || [],
    serviceModules: session?.user?.serviceModules || []
  })

  const canSeeView = (viewCode: string, fallback: boolean) => {
    if (authorizedViews.length === 0) return fallback

    return authorizedViews.includes(viewCode)
  }

  const showSub = !(isCollapsed && !isHovered)
  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  const {
    agency: GH_AGENCY_NAV,
    client: GH_CLIENT_NAV,
    finance: GH_FINANCE_NAV,
    commercial: GH_COMMERCIAL_NAV,
    hr: GH_HR_NAV,
    internal: GH_INTERNAL_NAV,
    my: GH_MY_NAV,
    people: GH_PEOPLE_NAV
  } = getGreenhouseNavigationCopy(locale)

  // Helper to build NavLabel from nomenclature constants
  const nl = (nav: { label: string; subtitle: string }) =>
    <NavLabel label={nav.label} subtitle={nav.subtitle} show={showSub} />

  const menuData: VerticalMenuDataType[] = []

  // ═══════════════════════════════════════════════════════════════════════
  // INTERNAL USERS
  // ═══════════════════════════════════════════════════════════════════════

  if (isInternalUser) {
    // ── Home ──
    menuData.push({
      label: nl(GH_INTERNAL_NAV.home),
      href: dashboardHref,
      icon: 'tabler-smart-home'
    })

    // ── GESTIÓN (section: 3 flat + 2 collapsibles) ──
    if (isAgencyUser) {
      menuData.push({
        isSection: true,
        label: 'Gestión',
        children: [
          { label: nl(GH_AGENCY_NAV.workspace), href: '/agency', icon: 'tabler-building' },
          { label: nl(GH_AGENCY_NAV.spaces), href: '/agency/spaces', icon: 'tabler-grid-4x4' },
          { label: nl(GH_AGENCY_NAV.economics), href: '/agency/economics', icon: 'tabler-chart-line' },

          // Collapsible "Equipo y talento"
          {
            label: nl(GH_AGENCY_NAV.teamAndTalent),
            icon: 'tabler-friends',
            children: [
              { label: nl(GH_AGENCY_NAV.team), href: '/agency/team', icon: 'tabler-friends' },
              { label: nl(GH_AGENCY_NAV.talentDiscovery), href: '/agency/talent-discovery' },
              { label: nl(GH_AGENCY_NAV.staffAugmentation), href: '/agency/staff-augmentation' }
            ].filter(item => {
              if (item.href === '/agency/team') return canSeeView('gestion.equipo', true)
              if (item.href === '/agency/talent-discovery') return canSeeView('gestion.equipo', true)
              if (item.href === '/agency/staff-augmentation') return canSeeView('gestion.staff_augmentation', true)

              return true
            })
          },

          // Collapsible "Operaciones"
          {
            label: nl(GH_AGENCY_NAV.operationsGroup),
            icon: 'tabler-cpu',
            children: [
              { label: nl(GH_AGENCY_NAV.delivery), href: '/agency/delivery' },
              { label: nl(GH_AGENCY_NAV.campaigns), href: '/agency/campaigns' },
              { label: nl(GH_AGENCY_NAV.organizations), href: '/agency/organizations' },
              { label: nl(GH_AGENCY_NAV.services), href: '/agency/services' },
              { label: nl(GH_AGENCY_NAV.operations), href: '/agency/operations' }
            ].filter(item => {
              if (item.href === '/agency/delivery') return canSeeView('gestion.delivery', true)
              if (item.href === '/agency/campaigns') return canSeeView('gestion.campanas', true)
              if (item.href === '/agency/organizations') return canSeeView('gestion.organizaciones', true)
              if (item.href === '/agency/services') return canSeeView('gestion.servicios', true)
              if (item.href === '/agency/operations') return canSeeView('gestion.operaciones', true)

              return true
            })
          }
        ].filter(item => {
          if (item.href === '/agency') return canSeeView('gestion.agencia', true)
          if (item.href === '/agency/spaces') return canSeeView('gestion.spaces', true)
          if (item.href === '/agency/economics') return canSeeView('gestion.economia', true)

          return true
        })
      })
    }

    // ── PERSONAS Y HR (section: 1 flat + 3 collapsibles, conditional) ──
    const hasHrAccess = isHrUser || isAdminUser

    // TASK-727 — `canSeeHrTeamWorkspace` ahora consume `supervisorAccess` canónico desde el JWT
    // en vez de heurística por `dashboardHref` whitelist. Cualquier supervisor con direct reports
    // o delegated authority ve aprobaciones/equipo, independiente de su portalHomePath.
    const canSeeHrTeamWorkspace = Boolean(session?.user?.memberId) && (hasHrAccess || canSupervise)

    const hrItems: VerticalMenuDataType[] = hasHrAccess
      ? [
          // Collapsible "Nómina"
          {
            label: <NavLabel label='Nómina' subtitle='Liquidación y proyección' show={showSub} />,
            icon: 'tabler-receipt',
            children: [
              { label: nl(GH_HR_NAV.payroll), href: '/hr/payroll' },
              { label: nl(GH_HR_NAV.payrollProjected), href: '/hr/payroll/projected' }
            ].filter(item => {
              if (item.href === '/hr/payroll') return canSeeView('equipo.nomina', true)
              if (item.href === '/hr/payroll/projected') return canSeeView('equipo.nomina_proyectada', true)

              return true
            })
          },

          // Collapsible "Supervisión"
          {
            label: <NavLabel label='Supervisión' subtitle='Equipo, aprobaciones y departamentos' show={showSub} />,
            icon: 'tabler-users-group',
            children: [
              { label: nl(GH_HR_NAV.team), href: '/hr/team' },
              { label: nl(GH_HR_NAV.approvals), href: '/hr/approvals' },
              { label: nl(GH_HR_NAV.departments), href: '/hr/departments' },
              { label: nl(GH_HR_NAV.offboarding), href: '/hr/offboarding' }
            ].filter(item => {
              if (item.href === '/hr/team') return canSeeHrTeamWorkspace
              if (item.href === '/hr/approvals') return canSeeHrTeamWorkspace
              if (item.href === '/hr/departments') return canSeeView('equipo.departamentos', true)
              if (item.href === '/hr/offboarding') return canSeeView('equipo.offboarding', true)

              return true
            })
          },

          // Collapsible "Organización"
          {
            label: <NavLabel label='Organización' subtitle='Jerarquía, permisos y asistencia' show={showSub} />,
            icon: 'tabler-sitemap',
            children: [
              { label: nl(GH_HR_NAV.hierarchy), href: '/hr/hierarchy' },
              { label: nl(GH_HR_NAV.orgChart), href: '/hr/org-chart' },
              { label: nl(GH_HR_NAV.leave), href: '/hr/leave' },
              { label: nl(GH_HR_NAV.attendance), href: '/hr/attendance' }
            ].filter(item => {
              if (item.href === '/hr/hierarchy') return canSeeView('equipo.jerarquia', true)
              if (item.href === '/hr/org-chart') return canSeeView('equipo.organigrama', true)
              if (item.href === '/hr/leave') return canSeeView('equipo.permisos', true)
              if (item.href === '/hr/attendance') return canSeeView('equipo.asistencia', true)

              return true
            })
          },
          ...(canSeeView('equipo.objetivos', true)
            ? [{ label: nl(GH_HR_NAV.goals), href: '/hr/goals', icon: 'tabler-target' }]
            : []),
          ...(canSeeView('equipo.evaluaciones', true)
            ? [{ label: nl(GH_HR_NAV.evaluations), href: '/hr/evaluations', icon: 'tabler-clipboard-check' }]
            : [])
        ]
      : []

    const supervisorScopeItems: VerticalMenuDataType[] = !hasHrAccess && canSeeHrTeamWorkspace
      ? [
          { label: nl(GH_HR_NAV.team), href: '/hr/team', icon: 'tabler-users-group' },
          { label: nl(GH_HR_NAV.approvals), href: '/hr/approvals', icon: 'tabler-checklist' },
          ...(canSeeSupervisorOrgChart ? [{ label: nl(GH_HR_NAV.orgChart), href: '/hr/org-chart', icon: 'tabler-hierarchy-3' }] : [])
        ]
      : []

    if (canSeePeople && hasHrAccess) {
      menuData.push({
        isSection: true,
        label: 'Personas y HR',
        children: [
          { label: nl(GH_PEOPLE_NAV.people), href: '/people', icon: 'tabler-address-book' },
          ...hrItems
        ]
      })
    } else if (canSeePeople && supervisorScopeItems.length > 0) {
      menuData.push({
        isSection: true,
        label: 'Personas y HR',
        children: [
          { label: nl(GH_PEOPLE_NAV.people), href: '/people', icon: 'tabler-address-book' },
          ...supervisorScopeItems
        ]
      })
    } else if (canSeePeople) {
      menuData.push({
        label: nl(GH_PEOPLE_NAV.people),
        href: '/people',
        icon: 'tabler-address-book'
      })
    } else if (supervisorScopeItems.length > 0) {
      menuData.push({
        isSection: true,
        label: 'Personas y HR',
        children: supervisorScopeItems
      })
    } else if (hasHrAccess) {
      menuData.push({
        isSection: true,
        label: 'Personas y HR',
        children: hrItems
      })
    }

    // ── COMERCIAL (top-level commercial domain over legacy /finance paths) ──
    if (isFinanceUser || isAdminUser) {
      menuData.push({
        label: nl(GH_COMMERCIAL_NAV.root),
        icon: 'tabler-briefcase',
        children: [
          { label: nl(GH_COMMERCIAL_NAV.quotes), href: '/finance/quotes', icon: 'tabler-file-dollar' },
          { label: nl(GH_COMMERCIAL_NAV.contracts), href: '/finance/contracts', icon: 'tabler-file-description' },
          {
            label: nl(GH_COMMERCIAL_NAV.masterAgreements),
            href: '/finance/master-agreements',
            icon: 'tabler-file-certificate'
          },
          { label: nl(GH_COMMERCIAL_NAV.products), href: '/finance/products', icon: 'tabler-packages' }
        ].filter(item => {
          if (item.href === '/finance/quotes') return canSeeView('finanzas.cotizaciones', true)

          // TASK-554 transition: granular commercial/contract/product view codes land in TASK-555.
          return true
        })
      })
    }

    // ── FINANZAS (collapsible top-level with nested submenus) ──
    if (isFinanceUser || isAdminUser) {
      menuData.push({
        label: 'Finanzas',
        icon: 'tabler-report-money',
        children: [
          // Flujo operativo submenu (business operations: sales, purchases, masters)
          {
            label: nl(GH_FINANCE_NAV.flow),
            icon: 'tabler-arrows-exchange',
            children: [
              { label: nl(GH_FINANCE_NAV.dashboard), href: '/finance' },
              { label: nl(GH_FINANCE_NAV.income), href: '/finance/income' },
              { label: nl(GH_FINANCE_NAV.expenses), href: '/finance/expenses' },
              { label: nl(GH_FINANCE_NAV.clients), href: '/finance/clients' },
              { label: nl(GH_FINANCE_NAV.suppliers), href: '/finance/suppliers' }
            ].filter(item => {
              if (item.href === '/finance') return canSeeView('finanzas.resumen', true)
              if (item.href === '/finance/income') return canSeeView('finanzas.ingresos', true)
              if (item.href === '/finance/expenses') return canSeeView('finanzas.egresos', true)
              if (item.href === '/finance/clients') return canSeeView('finanzas.clientes', true)
              if (item.href === '/finance/suppliers') return canSeeView('finanzas.proveedores', true)

              return true
            })
          },

          // Tesorería submenu (cash operations: collections, payments, bank, positions)
          {
            label: nl(GH_FINANCE_NAV.treasury),
            icon: 'tabler-building-bank',
            children: [
              { label: nl(GH_FINANCE_NAV.cashIn), href: '/finance/cash-in' },
              { label: nl(GH_FINANCE_NAV.cashOut), href: '/finance/cash-out' },
              { label: nl(GH_FINANCE_NAV.paymentOrders), href: '/finance/payment-orders' },
              { label: nl(GH_FINANCE_NAV.paymentProfiles), href: '/finance/payment-profiles' },
              { label: nl(GH_FINANCE_NAV.bank), href: '/finance/bank' },
              { label: nl(GH_FINANCE_NAV.shareholderAccount), href: '/finance/shareholder-account' },
              { label: nl(GH_FINANCE_NAV.cashPosition), href: '/finance/cash-position' }
            ].filter(item => {
              if (item.href === '/finance/cash-in') return canSeeView('finanzas.ingresos', true)
              if (item.href === '/finance/cash-out') return canSeeView('finanzas.egresos', true)
              if (item.href === '/finance/payment-orders') return canSeeView('finanzas.ordenes_pago', true)
              if (item.href === '/finance/payment-profiles') return canSeeView('finanzas.perfiles_pago', true)
              if (item.href === '/finance/bank') return canSeeView('finanzas.banco', canSeeBankTreasury)
              if (item.href === '/finance/shareholder-account') return canSeeView('finanzas.cuenta_corriente_accionista', canSeeBankTreasury)
              if (item.href === '/finance/cash-position') return canSeeView('finanzas.resumen', true)

              return true
            })
          },

          // Documentos submenu
          {
            label: nl(GH_FINANCE_NAV.documents),
            icon: 'tabler-file-check',
            children: [
              { label: nl(GH_FINANCE_NAV.purchaseOrders), href: '/finance/purchase-orders' },
              { label: nl(GH_FINANCE_NAV.hes), href: '/finance/hes' },
              { label: nl(GH_FINANCE_NAV.reconciliation), href: '/finance/reconciliation' }
            ].filter(item => {
              if (item.href === '/finance/purchase-orders') return canSeeView('finanzas.ordenes_compra', true)
              if (item.href === '/finance/hes') return canSeeView('finanzas.hes', true)
              if (item.href === '/finance/reconciliation') return canSeeView('finanzas.conciliacion', true)

              return true
            })
          },

          // Inteligencia submenu
          {
            label: nl(GH_FINANCE_NAV.analytics),
            icon: 'tabler-chart-dots',
            children: [
              { label: nl(GH_FINANCE_NAV.intelligence), href: '/finance/intelligence' },
              { label: nl(GH_FINANCE_NAV.costAllocations), href: '/finance/cost-allocations' }
            ].filter(item => {
              if (item.href === '/finance/intelligence') return canSeeView('finanzas.inteligencia', true)
              if (item.href === '/finance/cost-allocations') return canSeeView('finanzas.asignaciones_costos', true)

              return true
            })
          }
        ]
      })
    }

    // ── Herramientas IA (standalone for non-admin ai_tooling users) ──
    if (isAiToolingUser && !isAdminUser) {
      if (canSeeView('ia.herramientas', true)) {
        menuData.push({
          label: nl(GH_INTERNAL_NAV.adminAiTools),
          href: '/admin/ai-tools',
          icon: 'tabler-robot'
        })
      }
    }

    // ── ADMIN CENTER (collapsible top-level with nested submenus) ──
    if (isAdminUser) {
      menuData.push({
        label: GH_INTERNAL_NAV.adminCenter.label,
        icon: 'tabler-shield-lock',
        children: [
          // Identidad y acceso submenu
          {
            label: nl(GH_INTERNAL_NAV.adminIdentityAccess),
            icon: 'tabler-shield-lock',
            children: [
              { label: nl(GH_INTERNAL_NAV.adminCenter), href: '/admin' },
              { label: nl(GH_INTERNAL_NAV.adminUsers), href: '/admin/users' },
              { label: nl(GH_INTERNAL_NAV.adminRoles), href: '/admin/roles' },
              { label: nl(GH_INTERNAL_NAV.adminViews), href: '/admin/views' },
              { label: nl(GH_INTERNAL_NAV.adminAccounts), href: '/admin/accounts' },
              { label: nl(GH_INTERNAL_NAV.adminTenants), href: '/admin/tenants' }
            ].filter(item => {
              if (item.href === '/admin') return canSeeView('administracion.admin_center', true)
              if (item.href === '/admin/users') return canSeeView('administracion.usuarios', true)
              if (item.href === '/admin/roles') return canSeeView('administracion.roles', true)
              if (item.href === '/admin/views') return canSeeView('administracion.vistas', true)
              if (item.href === '/admin/accounts') return canSeeView('administracion.cuentas', true)
              if (item.href === '/admin/tenants') return canSeeView('administracion.spaces', true)

              return true
            })
          },

          // Equipo y operaciones submenu
          {
            label: nl(GH_INTERNAL_NAV.adminTeamOps),
            icon: 'tabler-briefcase',
            children: [
              { label: nl(GH_INTERNAL_NAV.adminTeam), href: '/admin/team' },
              { label: nl(GH_INTERNAL_NAV.adminTalentReview), href: '/admin/talent-review', icon: 'tabler-rosette-discount-check' },
              { label: nl(GH_INTERNAL_NAV.adminTalentOps), href: '/admin/talent-ops', icon: 'tabler-heart-rate-monitor' },
              { label: nl(GH_INTERNAL_NAV.adminBusinessLines), href: '/admin/business-lines' },
              {
                label: nl(GH_INTERNAL_NAV.adminCommercialParties),
                href: '/admin/commercial/parties',
                icon: 'tabler-building-community'
              },
              { label: nl(GH_INTERNAL_NAV.adminPricingCatalog), href: '/admin/pricing-catalog' },
              { label: nl(GH_INTERNAL_NAV.adminServiceSlas), href: '/admin/service-slas', icon: 'tabler-shield-check' },
              { label: nl(GH_INTERNAL_NAV.adminPaymentInstruments), href: '/admin/payment-instruments' }
            ].filter(item => {
              if (item.href === '/admin/team') return canSeeView('administracion.equipo', true)
              if (item.href === '/admin/talent-review') return canSeeView('administracion.equipo', true)
              if (item.href === '/admin/talent-ops') return canSeeView('administracion.equipo', true)
              if (item.href === '/admin/business-lines') return canSeeView('administracion.admin_center', true)
              if (item.href === '/admin/commercial/parties') return canSeeView('administracion.commercial_parties', true)
              if (item.href === '/admin/pricing-catalog') return canSeeView('administracion.admin_center', true)
              if (item.href === '/admin/service-slas') return canSeeView('administracion.admin_center', true)
              if (item.href === '/admin/payment-instruments') return canSeeView('administracion.instrumentos_pago', true)

              return true
            })
          },

          // Platform submenu
          {
            label: <NavLabel label='Platform' subtitle='Infraestructura y observabilidad' show={showSub} />,
            icon: 'tabler-server',
            children: [
              { label: nl(GH_INTERNAL_NAV.adminOperationalCalendar), href: '/admin/operational-calendar' },
              { label: nl(GH_INTERNAL_NAV.adminCorreos), href: '/admin/email-delivery' },
              { label: nl(GH_INTERNAL_NAV.adminEmailPreview), href: '/admin/emails/preview' },
              { label: nl(GH_INTERNAL_NAV.adminNotifications), href: '/admin/notifications' },
              { label: nl(GH_INTERNAL_NAV.adminAiTools), href: '/admin/ai-tools' },
              { label: nl(GH_INTERNAL_NAV.adminCloudIntegrations), href: '/admin/cloud-integrations' },
              { label: nl(GH_INTERNAL_NAV.adminOpsHealth), href: '/admin/ops-health' },
              { label: nl(GH_INTERNAL_NAV.adminUntitledNotionPages), href: '/admin/data-quality/notion-titles' }
            ].filter(item => {
              if (item.href === '/admin/operational-calendar') return canSeeView('administracion.calendario_operativo', true)
              if (item.href === '/admin/email-delivery') return canSeeView('administracion.email_delivery', true)
              if (item.href === '/admin/emails/preview') return canSeeView('administracion.email_delivery', true)
              if (item.href === '/admin/notifications') return canSeeView('administracion.notifications', true)
              if (item.href === '/admin/ai-tools') return canSeeView('ia.herramientas', true)
              if (item.href === '/admin/cloud-integrations') return canSeeView('administracion.cloud_integrations', true)
              if (item.href === '/admin/ops-health') return canSeeView('administracion.ops_health', true)
              if (item.href === '/admin/data-quality/notion-titles') return canSeeView('administracion.cloud_integrations', true)

              return true
            })
          }
        ]
      })
    }

    // ── MI FICHA (section with children, conditional) ──
    if (isMyUser) {
      menuData.push({
        isSection: true,
        label: 'Mi Ficha',
        children: [
          { label: nl(GH_MY_NAV.assignments), href: '/my/assignments', icon: 'tabler-users' },
          { label: nl(GH_MY_NAV.performance), href: '/my/performance', icon: 'tabler-chart-bar' },
          { label: nl(GH_MY_NAV.delivery), href: '/my/delivery', icon: 'tabler-list-check' },
          { label: nl(GH_MY_NAV.profile), href: '/my/profile', icon: 'tabler-user-circle' },
          { label: nl(GH_MY_NAV.payroll), href: '/my/payroll', icon: 'tabler-receipt' },
          { label: nl(GH_MY_NAV.paymentProfile), href: '/my/payment-profile', icon: 'tabler-credit-card' },
          { label: nl(GH_MY_NAV.leave), href: '/my/leave', icon: 'tabler-calendar-event' },
          { label: nl(GH_MY_NAV.goals), href: '/my/goals', icon: 'tabler-target' },
          { label: nl(GH_MY_NAV.evaluations), href: '/my/evaluations', icon: 'tabler-clipboard-check' },
          { label: nl(GH_MY_NAV.organization), href: '/my/organization', icon: 'tabler-building' }
        ].filter(item => {
          if (item.href === '/my/assignments') return canSeeView('mi_ficha.mis_asignaciones', true)
          if (item.href === '/my/performance') return canSeeView('mi_ficha.mi_desempeno', true)
          if (item.href === '/my/delivery') return canSeeView('mi_ficha.mi_delivery', true)
          if (item.href === '/my/profile') return canSeeView('mi_ficha.mi_perfil', true)
          if (item.href === '/my/payroll') return canSeeView('mi_ficha.mi_nomina', true)
          if (item.href === '/my/payment-profile') return canSeeView('mi_ficha.mi_cuenta_pago', true)
          if (item.href === '/my/leave') return canSeeView('mi_ficha.mis_permisos', true)
          if (item.href === '/my/goals') return canSeeView('mi_ficha.mis_objetivos', true)
          if (item.href === '/my/evaluations') return canSeeView('mi_ficha.mis_evaluaciones', true)
          if (item.href === '/my/organization') return canSeeView('mi_ficha.mi_organizacion', true)

          return true
        })
      })
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CLIENT USERS (external portal)
  // ═══════════════════════════════════════════════════════════════════════

  if (!isInternalUser) {
    // Pure collaborator home
    if (isMyUser) {
      menuData.splice(0, 0, {
        label: <NavLabel label='Mi Greenhouse' subtitle='Tu operación personal' show={showSub} />,
        href: '/my',
        icon: 'tabler-smart-home'
      })
    }

    // Primary client nav
    menuData.push(
      ...[
        { label: nl(GH_CLIENT_NAV.dashboard), href: dashboardHref, icon: 'tabler-smart-home' },
        { label: nl(GH_CLIENT_NAV.projects), href: '/proyectos', icon: 'tabler-folders' },
        { label: nl(GH_CLIENT_NAV.sprints), href: '/sprints', icon: 'tabler-bolt' },
        { label: nl(GH_CLIENT_NAV.team), href: '/equipo', icon: 'tabler-users' },
        { label: nl(GH_CLIENT_NAV.reviews), href: '/reviews', icon: 'tabler-git-pull-request' },
        { label: nl(GH_CLIENT_NAV.analytics), href: '/analytics', icon: 'tabler-chart-dots' },
        { label: nl(GH_CLIENT_NAV.campaigns), href: '/campanas', icon: 'tabler-speakerphone' }
      ].filter(item => {
        if (item.href === dashboardHref) return canSeeView('cliente.pulse', true)
        if (item.href === '/proyectos') return canSeeView('cliente.proyectos', true)
        if (item.href === '/sprints') return canSeeView('cliente.ciclos', true)
        if (item.href === '/equipo') return canSeeView('cliente.equipo', true)
        if (item.href === '/reviews') return canSeeView('cliente.revisiones', true)
        if (item.href === '/analytics') return canSeeView('cliente.analytics', true)
        if (item.href === '/campanas') return canSeeView('cliente.campanas', true)

        return true
      })
    )

    // Capability modules
    if (capabilityModules.length > 0 && canSeeView('cliente.modulos', true)) {
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

    // Mi Cuenta section
    menuData.push({
      isSection: true,
      label: 'Mi Cuenta',
      children: [
        { label: nl(GH_CLIENT_NAV.updates), href: '/updates', icon: 'tabler-bell' },
        { label: nl(GH_CLIENT_NAV.notifications), href: '/notifications', icon: 'tabler-notification' },
        { label: nl(GH_CLIENT_NAV.settings), href: '/settings', icon: 'tabler-settings' }
      ].filter(item => {
        if (item.href === '/updates') return canSeeView('cliente.actualizaciones', true)
        if (item.href === '/notifications') return canSeeView('cliente.notificaciones', true)
        if (item.href === '/settings') return canSeeView('cliente.configuracion', true)

        return true
      })
    })

    // Mi Ficha for collaborators with my routeGroup
    if (isMyUser) {
      menuData.push({
        isSection: true,
        label: 'Mi Ficha',
        children: [
          { label: nl(GH_MY_NAV.assignments), href: '/my/assignments', icon: 'tabler-users' },
          { label: nl(GH_MY_NAV.performance), href: '/my/performance', icon: 'tabler-chart-bar' },
          { label: nl(GH_MY_NAV.delivery), href: '/my/delivery', icon: 'tabler-list-check' },
          { label: nl(GH_MY_NAV.profile), href: '/my/profile', icon: 'tabler-user-circle' },
          { label: nl(GH_MY_NAV.payroll), href: '/my/payroll', icon: 'tabler-receipt' },
          { label: nl(GH_MY_NAV.paymentProfile), href: '/my/payment-profile', icon: 'tabler-credit-card' },
          { label: nl(GH_MY_NAV.leave), href: '/my/leave', icon: 'tabler-calendar-event' },
          { label: nl(GH_MY_NAV.goals), href: '/my/goals', icon: 'tabler-target' },
          { label: nl(GH_MY_NAV.evaluations), href: '/my/evaluations', icon: 'tabler-clipboard-check' },
          { label: nl(GH_MY_NAV.organization), href: '/my/organization', icon: 'tabler-building' }
        ].filter(item => {
          if (item.href === '/my/assignments') return canSeeView('mi_ficha.mis_asignaciones', true)
          if (item.href === '/my/performance') return canSeeView('mi_ficha.mi_desempeno', true)
          if (item.href === '/my/delivery') return canSeeView('mi_ficha.mi_delivery', true)
          if (item.href === '/my/profile') return canSeeView('mi_ficha.mi_perfil', true)
          if (item.href === '/my/payroll') return canSeeView('mi_ficha.mi_nomina', true)
          if (item.href === '/my/payment-profile') return canSeeView('mi_ficha.mi_cuenta_pago', true)
          if (item.href === '/my/leave') return canSeeView('mi_ficha.mis_permisos', true)
          if (item.href === '/my/goals') return canSeeView('mi_ficha.mis_objetivos', true)
          if (item.href === '/my/evaluations') return canSeeView('mi_ficha.mis_evaluaciones', true)
          if (item.href === '/my/organization') return canSeeView('mi_ficha.mi_organizacion', true)

          return true
        })
      })
    }

    // Mi Organización for client users with organizationId
    if (!isMyUser && session?.user?.organizationId) {
      if (canSeeView('mi_ficha.mi_organizacion', true)) {
        menuData.push({
          label: nl(GH_MY_NAV.organization),
          href: '/my/organization',
          icon: 'tabler-building'
        })
      }
    }
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
