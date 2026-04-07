/**
 * Resolve a profile banner image based on the person's role or department.
 *
 * Banners are pre-generated per category using Imagen 4 and stored as static
 * assets in public/images/banners/. The resolver maps role codes and department
 * names to one of 7 category banners.
 *
 * Categories:
 *   leadership  — executives, directors, managing roles
 *   operations  — operations, project management, account management
 *   creative    — design, UX, branding, content
 *   technology  — development, engineering, tech leads
 *   strategy    — strategy, media, analytics, growth
 *   support     — HR, finance, legal, admin
 *   default     — fallback for unmatched roles
 */

type BannerCategory = 'leadership' | 'operations' | 'creative' | 'technology' | 'strategy' | 'support' | 'default'

const ROLE_TO_BANNER: Record<string, BannerCategory> = {
  // Leadership
  efeonce_admin: 'leadership',

  // Operations
  efeonce_operations: 'operations',
  efeonce_account: 'operations',

  // HR / Finance / Support
  hr_manager: 'support',
  hr_payroll: 'support',
  finance_manager: 'support',

  // Client roles → default
  client_executive: 'default',
  client_manager: 'default',
  client_specialist: 'default'
}

const DEPARTMENT_TO_BANNER: Record<string, BannerCategory> = {
  // Creative
  diseno: 'creative',
  design: 'creative',
  ux: 'creative',
  branding: 'creative',
  contenido: 'creative',
  content: 'creative',

  // Technology
  desarrollo: 'technology',
  development: 'technology',
  engineering: 'technology',
  tecnologia: 'technology',
  technology: 'technology',

  // Strategy / Media
  estrategia: 'strategy',
  strategy: 'strategy',
  media: 'strategy',
  analytics: 'strategy',
  growth: 'strategy',

  // Operations
  operaciones: 'operations',
  operations: 'operations',
  proyectos: 'operations',
  projects: 'operations',
  cuentas: 'operations',
  accounts: 'operations',

  // Support
  rrhh: 'support',
  hr: 'support',
  finanzas: 'support',
  finance: 'support',
  legal: 'support',
  admin: 'support',
  administracion: 'support'
}

/**
 * Resolve the banner image path for a person based on their roles and department.
 *
 * Priority: roleCodes (first match) → departmentName (normalized) → 'default'
 */
export const resolveProfileBanner = (
  roleCodes: string[],
  departmentName: string | null
): string => {
  // Check role codes first (highest priority role wins)
  for (const role of roleCodes) {
    const category = ROLE_TO_BANNER[role]

    if (category) return `/images/banners/${category}.png`
  }

  // Check department name
  if (departmentName) {
    const normalized = departmentName.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const category = DEPARTMENT_TO_BANNER[normalized]

    if (category) return `/images/banners/${category}.png`
  }

  return '/images/banners/default.png'
}
