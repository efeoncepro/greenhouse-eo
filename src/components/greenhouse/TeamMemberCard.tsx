'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_COLORS, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { TeamMemberResponse } from '@/types/team'

import TeamAvatar, { getTeamRoleTone } from './TeamAvatar'

type TeamMemberCardProps = {
  member: TeamMemberResponse
}

const getContactLabel = (channel: TeamMemberResponse['contactChannel']) => {
  switch (channel) {
    case 'slack':
      return GH_TEAM.contact_channel_slack
    case 'email':
      return GH_TEAM.contact_channel_email
    default:
      return GH_TEAM.contact_channel_teams
  }
}

const getContactIcon = (channel: TeamMemberResponse['contactChannel']) => {
  switch (channel) {
    case 'slack':
      return 'tabler-brand-slack'
    case 'email':
      return 'tabler-mail'
    default:
      return 'tabler-brand-teams'
  }
}

const TeamMemberCard = ({ member }: TeamMemberCardProps) => {
  const tone = getTeamRoleTone(member.roleCategory)

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px solid ${GH_COLORS.neutral.border}`,
        backgroundColor: GH_COLORS.neutral.bgSurface,
        display: 'grid',
        gap: 2
      }}
    >
      <Stack direction='row' spacing={2} alignItems='center'>
        <TeamAvatar name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h6'>{member.displayName}</Typography>
          <Typography variant='body2' sx={{ color: tone.text }}>
            {member.roleTitle}
          </Typography>
        </Box>
      </Stack>

      {member.relevanceNote ? (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderRadius: 2.5,
            bgcolor: tone.bg,
            color: tone.textDark
          }}
        >
          <Typography variant='body2'>{member.relevanceNote}</Typography>
        </Box>
      ) : (
        <Typography variant='body2' color='text.secondary'>
          {GH_TEAM.relevance_pending}
        </Typography>
      )}

      <Stack direction='row' spacing={1.25} alignItems='center'>
        <i className={`${getContactIcon(member.contactChannel)} text-[18px]`} />
        <Box>
          <Typography variant='caption' color='text.secondary'>
            {getContactLabel(member.contactChannel)}
          </Typography>
          <Typography variant='body2'>{member.contactHandle || member.email || GH_TEAM.contact_pending}</Typography>
        </Box>
      </Stack>
    </Box>
  )
}

export default TeamMemberCard
