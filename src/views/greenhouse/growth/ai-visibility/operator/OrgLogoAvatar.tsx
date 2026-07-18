'use client'

import CustomAvatar from '@core/components/mui/Avatar'

/**
 * TASK-1276 polish — avatar de organización con LOGO real (feedback del operador: "esos clientes
 * tienen logo y no se ve nada en su avatar"). La URL llega YA resuelta desde el server vía el
 * helper canónico `resolveOrganizationLogoUrl` (espejo de `resolveAvatarUrl` para usuarios) —
 * este componente NUNCA compone URLs. Fallback: iniciales.
 */

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

const OrgLogoAvatar = ({
  name,
  logoUrl,
  size = 34,
  color = 'primary'
}: {
  name: string
  logoUrl: string | null
  size?: number
  color?: 'primary' | 'info' | 'warning'
}) => (
  <CustomAvatar skin='light' color={color} variant='rounded' size={size}>
    {logoUrl ? (
      <img
        src={logoUrl}
        alt=''
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit' }}
      />
    ) : (
      initialsOf(name)
    )}
  </CustomAvatar>
)

export default OrgLogoAvatar
