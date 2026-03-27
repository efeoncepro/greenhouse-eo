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
  activity: ['efeonce_admin', 'efeonce_operations'],
  compensation: ['efeonce_admin', 'hr_payroll'],
  payroll: ['efeonce_admin', 'hr_payroll'],
  finance: ['efeonce_admin', 'finance_manager'],
  memberships: ['efeonce_admin', 'efeonce_operations'],
  'hr-profile': ['efeonce_admin', 'hr_payroll'],
  'ai-tools': ['efeonce_admin', 'efeonce_operations'],
  'identity': ['efeonce_admin', 'efeonce_operations', 'hr_payroll'],
  'intelligence': ['efeonce_admin', 'efeonce_operations']
}

export const TAB_CONFIG: Array<{ value: PersonTab; label: string; icon: string }> = [
  { value: 'memberships', label: 'Organizaciones', icon: 'tabler-building' },
  { value: 'activity', label: 'Actividad', icon: 'tabler-chart-bar' },
  { value: 'intelligence', label: 'Inteligencia', icon: 'tabler-brain' },
  { value: 'compensation', label: 'Compensación', icon: 'tabler-cash' },
  { value: 'payroll', label: 'Nómina', icon: 'tabler-receipt-2' },
  { value: 'finance', label: 'Finanzas', icon: 'tabler-report-money' },
  { value: 'hr-profile', label: 'Perfil HR', icon: 'tabler-user-heart' },
  { value: 'ai-tools', label: 'AI Tools', icon: 'tabler-wand' },
  { value: 'identity', label: 'Identidad', icon: 'tabler-fingerprint' }
]

export const getVisibleTabs = (roleCodes: string[]) =>
  TAB_CONFIG.filter(tab => TAB_PERMISSIONS[tab.value].some(role => roleCodes.includes(role)))

// ── Formatting ─────────────────────────────────────────────────────

export const formatFte = (value: number): string => value.toFixed(1)
