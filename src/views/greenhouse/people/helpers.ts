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

export const TAB_PERMISSIONS: Record<PersonTab, string[]> = {
  profile: ['efeonce_admin', 'efeonce_operations', 'hr_payroll'],
  activity: ['efeonce_admin', 'efeonce_operations'],
  memberships: ['efeonce_admin', 'efeonce_operations'],
  economy: ['efeonce_admin', 'hr_payroll', 'finance_manager'],
  'ai-tools': ['efeonce_admin', 'efeonce_operations']
}

export const TAB_CONFIG: Array<{ value: PersonTab; label: string; icon: string }> = [
  { value: 'profile', label: 'Perfil', icon: 'tabler-user' },
  { value: 'activity', label: 'Actividad', icon: 'tabler-chart-dots' },
  { value: 'memberships', label: 'Organizaciones', icon: 'tabler-building' },
  { value: 'economy', label: 'Economia', icon: 'tabler-wallet' },
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
