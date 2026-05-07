'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_TEAM } from '@/lib/copy/client-portal'
import type { TeamMemberResponse } from '@/types/team'

import TeamAvatar, { getTeamRoleTone } from './TeamAvatar'
import TeamIdentityBadgeGroup from './TeamIdentityBadgeGroup'

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

const formatMonthsLabel = (value: number | null, fallback: string) => {
  if (value === null) {
    return fallback
  }

  const years = Math.floor(value / 12)
  const months = value % 12

  if (years > 0 && months > 0) {
    return `${years}a ${months}m`
  }

  if (years > 0) {
    return `${years}a`
  }

  return `${months}m`
}

const getLocationLabel = (member: TeamMemberResponse) => {
  const parts = [member.profile.locationCity, member.profile.locationCountry].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : GH_TEAM.location_pending
}

const TeamMemberCard = ({ member }: TeamMemberCardProps) => {
  const tone = getTeamRoleTone(member.roleCategory)
  const profile = member.profile

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 4,
        border: `1px solid ${alpha(tone.source, 0.16)}`,
        background: theme => `linear-gradient(180deg, ${alpha(tone.source, 0.12)} 0%, ${theme.palette.background.default} 42%)`,
        display: 'grid',
        gap: 2.25,
        minHeight: 280
      }}
    >
      <Stack direction='row' spacing={2} alignItems='flex-start'>
        <TeamAvatar name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} size={56} />

        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mb: 1 }}>
            <Chip size='small' variant='tonal' label={member.roleTitle} sx={{ color: tone.textDark, bgcolor: tone.bg }} />
            <Chip size='small' variant='outlined' label={profile.professionName || GH_TEAM.profession_pending} />
          </Stack>

          <Typography variant='h6'>{member.displayName}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {member.startDate ? GH_TEAM.assigned_since(member.startDate) : GH_TEAM.dedication_pending}
          </Typography>
          {profile.preferredName && profile.preferredName !== member.displayName ? (
            <Typography variant='caption' color='text.secondary'>
              {profile.preferredName}
            </Typography>
          ) : null}
        </Box>
      </Stack>

      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          bgcolor: alpha(tone.source, 0.08),
          border: `1px solid ${alpha(tone.source, 0.12)}`
        }}
      >
        <Typography variant='caption' color='text.secondary'>
          {GH_TEAM.label_identity}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <TeamIdentityBadgeGroup providers={member.identityProviders} confidence={member.identityConfidence} />
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
        }}
      >
        {[
          {
            label: GH_TEAM.label_profession,
            value: profile.professionName || GH_TEAM.profession_pending
          },
          {
            label: GH_TEAM.label_location,
            value: getLocationLabel(member)
          },
          {
            label: GH_TEAM.label_experience,
            value:
              profile.yearsExperience === null
                ? GH_TEAM.experience_pending
                : GH_TEAM.experience_years(profile.yearsExperience)
          },
          {
            label: GH_TEAM.label_tenure_efeonce,
            value: formatMonthsLabel(profile.tenureEfeonceMonths, GH_TEAM.tenure_pending)
          },
          {
            label: GH_TEAM.label_tenure_client,
            value: formatMonthsLabel(profile.tenureClientMonths, GH_TEAM.tenure_pending)
          },
          {
            label: GH_TEAM.label_completeness,
            value: `${profile.profileCompletenessPercent}%`
          }
        ].map(item => (
          <Box
            key={item.label}
            sx={{
              p: 1.5,
              borderRadius: 3,
              bgcolor: 'background.default',
              border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`
            }}
          >
            <Typography variant='caption' color='text.secondary'>
              {item.label}
            </Typography>
            <Typography variant='body2' sx={{ mt: 0.5 }}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1.75,
          borderRadius: 3,
          bgcolor: tone.bg,
          color: tone.textDark
        }}
      >
        <Typography variant='body2'>{member.relevanceNote || GH_TEAM.relevance_pending}</Typography>
      </Box>

      <Stack
        sx={{
          p: 2,
          borderRadius: 3,
          bgcolor: 'background.default',
          border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`,
          gap: 1.25
        }}
      >
        <Stack direction='row' spacing={1.25} alignItems='center'>
          <i className={`${getContactIcon(member.contactChannel)} text-[18px]`} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='caption' color='text.secondary'>
              {getContactLabel(member.contactChannel)}
            </Typography>
            <Typography variant='body2' sx={{ wordBreak: 'break-word' }}>
              {member.contactHandle || member.email || GH_TEAM.contact_pending}
            </Typography>
          </Box>
        </Stack>

        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
          {profile.phone ? <Chip size='small' variant='outlined' icon={<i className='tabler-phone' />} label={profile.phone} /> : null}
          {profile.teamsUserId ? (
            <Chip size='small' variant='outlined' icon={<i className='tabler-brand-teams' />} label={profile.teamsUserId} />
          ) : null}
          {profile.slackUserId ? (
            <Chip size='small' variant='outlined' icon={<i className='tabler-brand-slack' />} label={profile.slackUserId} />
          ) : null}
          {profile.languages.length > 0 ? (
            <Chip size='small' variant='tonal' label={`${GH_TEAM.label_languages}: ${profile.languages.join(', ')}`} />
          ) : null}
        </Stack>
      </Stack>
    </Box>
  )
}

export default TeamMemberCard
