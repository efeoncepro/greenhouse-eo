type SearchData = {
  id: string
  name: string
  url: string
  icon: string
  section: string
  shortcut?: string
}

const data: SearchData[] = [
  // Dashboards
  { id: '1', name: 'Pulse', url: '/dashboards', icon: 'tabler-trending-up', section: 'Dashboards' },
  { id: '2', name: 'Dashboard financiero', url: '/finance', icon: 'tabler-chart-bar', section: 'Dashboards' },

  // Finanzas
  { id: '10', name: 'Ventas', url: '/finance/income', icon: 'tabler-cash', section: 'Finanzas' },
  { id: '11', name: 'Compras', url: '/finance/expenses', icon: 'tabler-receipt', section: 'Finanzas' },
  { id: '12', name: 'Clientes', url: '/finance/clients', icon: 'tabler-address-book', section: 'Finanzas' },
  { id: '13', name: 'Proveedores', url: '/finance/suppliers', icon: 'tabler-truck', section: 'Finanzas' },
  { id: '14', name: 'Cuentas', url: '/finance/accounts', icon: 'tabler-building-bank', section: 'Finanzas' },
  { id: '15', name: 'Conciliación', url: '/finance/reconciliation', icon: 'tabler-adjustments-check', section: 'Finanzas' },
  { id: '16', name: 'Tipo de cambio', url: '/finance/exchange-rates', icon: 'tabler-arrows-exchange', section: 'Finanzas' },

  // People / HR
  { id: '20', name: 'Nómina', url: '/hr/payroll', icon: 'tabler-report-money', section: 'People' },
  { id: '21', name: 'Personas', url: '/people', icon: 'tabler-user-heart', section: 'People' },
  { id: '22', name: 'Jerarquía', url: '/hr/hierarchy', icon: 'tabler-hierarchy-2', section: 'People' },
  { id: '23', name: 'Organigrama', url: '/hr/org-chart', icon: 'tabler-hierarchy-3', section: 'People' },

  // Administración
  { id: '30', name: 'Spaces', url: '/admin/tenants', icon: 'tabler-building', section: 'Administración' },
  { id: '31', name: 'Usuarios', url: '/admin/users', icon: 'tabler-users', section: 'Administración' },
  { id: '32', name: 'Equipo', url: '/admin/team', icon: 'tabler-users-group', section: 'Administración' },
  { id: '33', name: 'Roles y permisos', url: '/admin/roles', icon: 'tabler-lock', section: 'Administración' },
  { id: '34', name: 'Configuración', url: '/admin/settings', icon: 'tabler-settings', section: 'Administración' }
]

export default data
