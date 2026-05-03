import type { TeamRoleCategory } from '@/types/team'

// ── Country flags ──────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  CL: '🇨🇱',
  CO: '🇨🇴',
  VE: '🇻🇪',
  MX: '🇲🇽',
  PE: '🇵🇪',
  US: '🇺🇸',
  AR: '🇦🇷',
  BR: '🇧🇷',
  EC: '🇪🇨'
}

export const countryFlag = (code: string | null): string => {
  if (!code) return '🌐'

  return COUNTRY_FLAGS[code.toUpperCase()] ?? '🌐'
}

export const countryLabel = (code: string | null): string => {
  if (!code) return 'Sin país'

  return `${countryFlag(code)} ${code.toUpperCase()}`
}

// ── Role category labels ───────────────────────────────────────────

export const ROLE_CATEGORIES: TeamRoleCategory[] = ['account', 'operations', 'strategy', 'design', 'development', 'media']

export const safeRoleCategory = (value: string): TeamRoleCategory =>
  ROLE_CATEGORIES.includes(value as TeamRoleCategory) ? (value as TeamRoleCategory) : 'unknown'

export const roleCategoryLabel: Record<TeamRoleCategory, string> = {
  account: 'Account',
  operations: 'Operations',
  strategy: 'Strategy',
  design: 'Design',
  development: 'Development',
  media: 'Media',
  unknown: 'Sin categoría'
}

// ── Tab permissions ────────────────────────────────────────────────

export type { PersonTab } from '@/types/people'

import type { PersonTab } from '@/types/people'

import { ROLE_CODES } from '@/config/role-codes'

export const TAB_PERMISSIONS: Record<PersonTab, string[]> = {
  profile: [ROLE_CODES.EFEONCE_ADMIN, ROLE_CODES.EFEONCE_OPERATIONS, ROLE_CODES.HR_PAYROLL],
  activity: [ROLE_CODES.EFEONCE_ADMIN, ROLE_CODES.EFEONCE_OPERATIONS],
  memberships: [ROLE_CODES.EFEONCE_ADMIN, ROLE_CODES.EFEONCE_OPERATIONS],
  economy: [ROLE_CODES.EFEONCE_ADMIN, ROLE_CODES.HR_PAYROLL, ROLE_CODES.FINANCE_ADMIN],
  // TASK-749: tab "Pago" — fuente primaria del Beneficiary Payment Profile del miembro.
  payment: [ROLE_CODES.EFEONCE_ADMIN, ROLE_CODES.FINANCE_ADMIN, ROLE_CODES.FINANCE_ANALYST],
  'ai-tools': [ROLE_CODES.EFEONCE_ADMIN, ROLE_CODES.EFEONCE_OPERATIONS]
}

export const TAB_CONFIG: Array<{ value: PersonTab; label: string; icon: string }> = [
  { value: 'profile', label: 'Perfil', icon: 'tabler-user' },
  { value: 'activity', label: 'Actividad', icon: 'tabler-chart-dots' },
  { value: 'memberships', label: 'Organizaciones', icon: 'tabler-building' },
  { value: 'economy', label: 'Economia', icon: 'tabler-wallet' },
  { value: 'payment', label: 'Pago', icon: 'tabler-id-badge' },
  { value: 'ai-tools', label: 'Herramientas', icon: 'tabler-wand' }
]

/** Map old tab URL params to new consolidated tabs */
export const LEGACY_TAB_REDIRECT: Record<string, PersonTab> = {
  compensation: 'economy',
  payroll: 'economy',
  finance: 'economy',
  'hr-profile': 'profile',
  identity: 'profile',
  intelligence: 'activity'
}

export const getVisibleTabs = (roleCodes: string[]) =>
  TAB_CONFIG.filter(tab => TAB_PERMISSIONS[tab.value].some(role => roleCodes.includes(role)))

// ── Formatting ─────────────────────────────────────────────────────

export const formatFte = (value: number): string => value.toFixed(1)
