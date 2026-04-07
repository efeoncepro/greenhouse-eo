'use client'

import AvatarGroup from '@mui/material/AvatarGroup'
import Tooltip from '@mui/material/Tooltip'

import CustomAvatar from '@core/components/mui/Avatar'

import { getInitials } from '@/utils/getInitials'

export type TeamAvatarGroupMember = {
  name: string
  avatarUrl: string | null
}

type TeamAvatarGroupProps = {
  /** List of team members to display */
  members: TeamAvatarGroupMember[]
  /** Maximum avatars before showing +N overflow (default: 4) */
  max?: number
  /** Avatar diameter in pixels (default: 32) */
  size?: number
  /** Show tooltip with name on hover (default: true) */
  showTooltip?: boolean
}

const TeamAvatarGroup = ({ members, max = 4, size = 32, showTooltip = true }: TeamAvatarGroupProps) => {
  if (members.length === 0) return null

  return (
    <AvatarGroup max={max} className='flex items-center pull-up'>
      {members.map((member, index) => {
        const avatar = member.avatarUrl ? (
          <CustomAvatar key={index} src={member.avatarUrl} size={size} alt={member.name} />
        ) : (
          <CustomAvatar key={index} color='primary' skin='light-static' size={size}>
            {getInitials(member.name)}
          </CustomAvatar>
        )

        return showTooltip ? (
          <Tooltip key={index} title={member.name}>
            {avatar}
          </Tooltip>
        ) : (
          avatar
        )
      })}
    </AvatarGroup>
  )
}

export default TeamAvatarGroup
