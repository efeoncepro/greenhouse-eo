export const resolvePortalHomeAlias = (portalHomePath?: string | null) => {
  const normalized = portalHomePath?.trim() || ''

  if (!normalized) {
    return ''
  }

  switch (normalized) {
    case '/dashboard':
    case '/internal/dashboard':
      return '/home'
    case '/finance/dashboard':
      return '/finance'
    case '/hr/leave':
      return '/hr/payroll'
    case '/my/profile':
      return '/my'
    default:
      return normalized
  }
}
