'use client'

import Avatar from '@mui/material/Avatar'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { TeamRoleCategory } from '@/types/team'

export const getTeamRoleTone = (roleCategory: TeamRoleCategory) => {
  switch (roleCategory) {
    case 'account':
      return GH_COLORS.role.account
    case 'operations':
      return GH_COLORS.role.operations
    case 'strategy':
      return GH_COLORS.role.strategy
    case 'design':
      return GH_COLORS.role.design
    case 'media':
      return GH_COLORS.role.media
    case 'development':
      return GH_COLORS.role.development
    default:
      return GH_COLORS.role.development
  }
}

const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')

type TeamAvatarProps = {
  name: string
  avatarUrl: string | null
  roleCategory: TeamRoleCategory
  size?: number
}

const TeamAvatar = ({ name, avatarUrl, roleCategory, size = 48 }: TeamAvatarProps) => {
  const tone = getTeamRoleTone(roleCategory)

  return (
    <Avatar
      src={avatarUrl || undefined}
      sx={{
        width: size,
        height: size,
        bgcolor: tone.bg,
        color: tone.textDark,
        border: `1px solid ${tone.bgHover}`
      }}
    >
      {getInitials(name)}
    </Avatar>
  )
}

export default TeamAvatar
