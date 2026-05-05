import type {
  EntitlementAction,
  EntitlementCapabilityKey,
  EntitlementScope,
  GreenhouseEntitlementModule
} from '@/config/entitlements-catalog'
import type { HomeAudienceKey } from '@/lib/entitlements/types'

// TASK-553 — Canonical Shortcut Catalog
//
// Single source of truth for header + Home recommended shortcuts. Each entry
// declares the access requirements on BOTH access planes:
//   - `module`: the GreenhouseEntitlementModule the user must see (canSeeModule)
//   - `viewCode` (optional): authorized view required when the surface is
//     controlled at view granularity
//   - `requiredCapability` (optional): finer entitlement gate via can()
//
// Shortcuts are validated by `src/lib/shortcuts/resolver.ts`. NEVER hardcode
// a shortcut array in a layout component — register it here.

export type ShortcutCapabilityRequirement = {
  capability: EntitlementCapabilityKey
  action: EntitlementAction
  scope?: EntitlementScope
}

export interface CanonicalShortcut {
  /** Stable identifier persisted in user_shortcut_pins.shortcut_key. NEVER rename. */
  key: string
  /** Primary label shown in Home recommended pills + header dropdown. */
  label: string
  /** Secondary line shown in the header dropdown. Empty string is allowed. */
  subtitle: string
  /** Destination route. Resolved via Next router. */
  route: string
  /** Tabler icon class (e.g., `tabler-report-money`). */
  icon: string
  /** Module-level gate. Required. */
  module: GreenhouseEntitlementModule
  /** View-level gate. When declared, user must have it in `authorizedViews`. */
  viewCode?: string
  /** Capability gate. When declared, `can(...)` must return true. */
  requiredCapability?: ShortcutCapabilityRequirement
}

export const SHORTCUT_CATALOG = [
  {
    key: 'admin-center',
    label: 'Administracion',
    subtitle: 'Centro de control',
    route: '/admin',
    icon: 'tabler-shield-lock',
    module: 'admin'
  },
  {
    key: 'admin-users',
    label: 'Usuarios',
    subtitle: 'Cuentas y accesos',
    route: '/admin/users',
    icon: 'tabler-users',
    module: 'admin'
  },
  {
    key: 'agency',
    label: 'Agency',
    subtitle: 'Operacion comercial',
    route: '/agency',
    icon: 'tabler-building',
    module: 'agency'
  },
  {
    key: 'agency-pulse',
    label: 'Pulse',
    subtitle: 'Salud operacional',
    route: '/agency/pulse',
    icon: 'tabler-pulse',
    module: 'agency'
  },
  {
    key: 'people',
    label: 'Personas',
    subtitle: 'Directorio del equipo',
    route: '/people',
    icon: 'tabler-address-book',
    module: 'people'
  },
  {
    key: 'hr',
    label: 'Nomina',
    subtitle: 'HR & payroll',
    route: '/hr/payroll',
    icon: 'tabler-users-group',
    module: 'hr'
  },
  {
    key: 'hr-leave',
    label: 'Permisos',
    subtitle: 'Vacaciones y ausencias',
    route: '/hr/leave',
    icon: 'tabler-calendar-event',
    module: 'hr'
  },
  {
    key: 'finance',
    label: 'Finanzas',
    subtitle: 'Control financiero',
    route: '/finance',
    icon: 'tabler-report-money',
    module: 'finance'
  },
  {
    key: 'finance-bank',
    label: 'Banco',
    subtitle: 'Cuentas y saldos',
    route: '/finance/bank',
    icon: 'tabler-building-bank',
    module: 'finance'
  },
  {
    key: 'finance-cash-out',
    label: 'Por pagar',
    subtitle: 'Cuentas pendientes',
    route: '/finance/cash-out',
    icon: 'tabler-cash-banknote',
    module: 'finance'
  },
  {
    key: 'finance-income',
    label: 'Ventas',
    subtitle: 'Documentos de venta',
    route: '/finance/income',
    icon: 'tabler-cash',
    module: 'finance'
  },
  {
    key: 'my-workspace',
    label: 'Mi espacio',
    subtitle: 'Mi ficha y tareas',
    route: '/my',
    icon: 'tabler-user-circle',
    module: 'my_workspace'
  },
  {
    key: 'client-portal',
    label: 'Proyectos',
    subtitle: 'Vista cliente',
    route: '/proyectos',
    icon: 'tabler-folders',
    module: 'client_portal'
  }
] as const satisfies readonly CanonicalShortcut[]

export type ShortcutKey = (typeof SHORTCUT_CATALOG)[number]['key']

// Audience-driven ordering. Keys not listed for an audience fall to the end
// (still visible if they pass the access checks, just lower priority).
export const AUDIENCE_SHORTCUT_ORDER: Record<HomeAudienceKey, readonly ShortcutKey[]> = {
  admin: [
    'admin-center',
    'agency',
    'finance',
    'people',
    'hr',
    'agency-pulse',
    'finance-bank',
    'admin-users',
    'finance-cash-out',
    'finance-income',
    'hr-leave',
    'my-workspace',
    'client-portal'
  ],
  internal: [
    'agency',
    'people',
    'finance',
    'hr',
    'agency-pulse',
    'admin-center',
    'finance-bank',
    'hr-leave',
    'finance-cash-out',
    'finance-income',
    'admin-users',
    'my-workspace',
    'client-portal'
  ],
  hr: ['hr', 'hr-leave', 'people', 'my-workspace', 'agency'],
  finance: [
    'finance',
    'finance-bank',
    'finance-cash-out',
    'finance-income',
    'agency',
    'my-workspace',
    'admin-center'
  ],
  collaborator: ['my-workspace', 'people', 'hr', 'hr-leave'],
  client: ['client-portal']
}

const SHORTCUT_BY_KEY: Record<string, CanonicalShortcut> = SHORTCUT_CATALOG.reduce(
  (acc, shortcut) => {
    acc[shortcut.key] = shortcut

    return acc
  },
  {} as Record<string, CanonicalShortcut>
)

export const getShortcutByKey = (key: string): CanonicalShortcut | undefined => SHORTCUT_BY_KEY[key]

export const isKnownShortcutKey = (key: string): key is ShortcutKey => Object.hasOwn(SHORTCUT_BY_KEY, key)
