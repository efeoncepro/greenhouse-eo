'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_COLORS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { GreenhouseDashboardAccountTeam } from '@/types/greenhouse-dashboard'

import { getBrandDisplayLabel } from './brand-assets'
import EmptyState from './EmptyState'
import ExecutiveCardShell from './ExecutiveCardShell'
import BusinessLineBadge from './BusinessLineBadge'

type Props = {
  accountTeam: GreenhouseDashboardAccountTeam
  businessLines: string[]
}

type TeamRoleTone = keyof typeof GH_COLORS.role
type ServiceTone = keyof typeof GH_COLORS.service

const getRoleTone = (role: string): TeamRoleTone => {
  const normalizedRole = role.toLowerCase()

  if (normalizedRole.includes('account')) return 'account'
  if (normalizedRole.includes('operat')) return 'operations'
  if (normalizedRole.includes('strateg')) return 'strategy'
  if (normalizedRole.includes('design') || normalizedRole.includes('creative')) return 'design'
  if (normalizedRole.includes('media')) return 'media'

  return 'development'
}

const getRoleNote = (role: string) => {
  const roleTone = getRoleTone(role)

  switch (roleTone) {
    case 'account':
      return GH_TEAM.role_note_account
    case 'operations':
      return GH_TEAM.role_note_operations
    case 'strategy':
      return GH_TEAM.role_note_strategy
    case 'design':
      return GH_TEAM.role_note_design
    case 'media':
      return GH_TEAM.role_note_media
    default:
      return GH_TEAM.role_note_development
  }
}

const getServiceTone = (businessLine: string): ServiceTone => {
  switch (businessLine) {
    case 'globe':
      return 'globe'
    case 'crm_solutions':
      return 'crm_solutions'
    case 'reach':
      return 'reach'
    case 'wave':
      return 'wave'
    default:
      return 'efeonce_digital'
  }
}

const formatDedication = (allocationPct: number | null, monthlyHours: number | null) => {
  if (allocationPct !== null && monthlyHours !== null) {
    return `${allocationPct}% · ${monthlyHours}h/mes`
  }

  if (allocationPct !== null) {
    return `${allocationPct}%`
  }

  if (monthlyHours !== null) {
    return `${monthlyHours}h/mes`
  }

  return GH_TEAM.dedication_pending
}

const AccountTeamDossierSection = ({ accountTeam, businessLines }: Props) => {
  const teamMembers = accountTeam.members

  if (teamMembers.length === 0) {
    return (
      <ExecutiveCardShell title={GH_TEAM.section_title} subtitle={GH_TEAM.section_subtitle}>
        <EmptyState icon='tabler-users-group' title={GH_TEAM.section_title} description={GH_MESSAGES.empty_team} minHeight={260} />
      </ExecutiveCardShell>
    )
  }

  return (
    <ExecutiveCardShell title={GH_TEAM.section_title} subtitle={GH_TEAM.section_subtitle}>
      <Stack spacing={3}>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))'
            }
          }}
        >
          {teamMembers.map(member => {
            const roleTone = GH_COLORS.role[getRoleTone(member.role)]

            return (
              <Box
                key={member.id}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`,
                  backgroundColor: 'background.default',
                  display: 'grid',
                  gap: 2
                }}
              >
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Avatar
                    src={member.avatarPath || undefined}
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: roleTone.bg,
                      color: roleTone.textDark,
                      border: `1px solid ${roleTone.bgHover}`
                    }}
                  >
                    {member.name
                      .split(' ')
                      .slice(0, 2)
                      .map(part => part[0] || '')
                      .join('')
                      .toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant='h6'>{member.name}</Typography>
                    <Typography variant='body2' sx={{ color: roleTone.text }}>
                      {member.role}
                    </Typography>
                  </Box>
                </Stack>

                <Typography variant='body2' color='text.secondary'>
                  {getRoleNote(member.role)}
                </Typography>

                <Box>
                  <Typography variant='caption' color='text.secondary'>
                    {GH_TEAM.label_fte}
                  </Typography>
                  <Typography variant='body2'>{formatDedication(member.allocationPct, member.monthlyHours)}</Typography>
                </Box>
              </Box>
            )
          })}
        </Box>

        <Stack spacing={1.5}>
          <Typography variant='subtitle2'>{GH_TEAM.service_lines_title}</Typography>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            {businessLines.length > 0 ? (
              businessLines.map(line => {
                const tone = GH_COLORS.service[getServiceTone(line)]

                return (
                  <Box
                    key={line}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1,
                      py: 0.75,
                      borderRadius: 999,
                      bgcolor: tone.bg,
                      color: tone.text,
                      border: `1px solid ${tone.text}`
                    }}
                    >
                    <BusinessLineBadge brand={line} />
                    <Typography variant='caption' sx={{ fontWeight: 700, color: tone.text }}>
                      {getBrandDisplayLabel(line)}
                    </Typography>
                  </Box>
                )
              })
            ) : (
              <Typography variant='body2' color='text.secondary'>
                {GH_TEAM.service_lines_empty}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Stack>
    </ExecutiveCardShell>
  )
}

export default AccountTeamDossierSection
