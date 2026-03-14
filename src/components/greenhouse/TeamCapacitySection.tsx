'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_COLORS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { GreenhouseDashboardData, GreenhouseDashboardTeamMember } from '@/types/greenhouse-dashboard'
import type { TeamContactChannel, TeamMemberResponse, TeamMembersPayload, TeamRoleCategory } from '@/types/team'

import BusinessLineBadge from './BusinessLineBadge'
import EmptyState from './EmptyState'
import ExecutiveCardShell from './ExecutiveCardShell'
import RequestDialog from './RequestDialog'
import TeamAvatar, { getTeamRoleTone } from './TeamAvatar'
import TeamExpansionGhostCard from './TeamExpansionGhostCard'
import { getBrandDisplayLabel } from './brand-assets'

const inferRoleCategory = (roleTitle: string): TeamRoleCategory => {
  const normalizedRole = roleTitle.toLowerCase()

  if (normalizedRole.includes('account') || normalizedRole.includes('leadership')) return 'account'
  if (normalizedRole.includes('operat')) return 'operations'
  if (normalizedRole.includes('strateg')) return 'strategy'
  if (normalizedRole.includes('design') || normalizedRole.includes('creative')) return 'design'
  if (normalizedRole.includes('media')) return 'media'

  return 'development'
}

const getContactLabel = (channel: TeamContactChannel) => {
  switch (channel) {
    case 'slack':
      return GH_TEAM.contact_channel_slack
    case 'email':
      return GH_TEAM.contact_channel_email
    default:
      return GH_TEAM.contact_channel_teams
  }
}

const getContactIcon = (channel: TeamContactChannel) => {
  switch (channel) {
    case 'slack':
      return 'tabler-brand-slack'
    case 'email':
      return 'tabler-mail'
    default:
      return 'tabler-brand-teams'
  }
}

const getFallbackRoleTitle = (member: GreenhouseDashboardTeamMember) => {
  if (member.role !== 'Efeonce Team') {
    return member.role
  }

  const normalizedName = member.name.toLowerCase()

  if (normalizedName.includes('valentina')) return 'Account Manager'
  if (normalizedName.includes('humberly')) return 'Content Strategist'
  if (normalizedName.includes('luis')) return 'Operations Specialist'

  return 'Operations Specialist'
}

const shouldHideFallbackMember = (member: GreenhouseDashboardTeamMember) => member.role.toLowerCase().includes('leadership')

const toFallbackMember = (member: GreenhouseDashboardTeamMember): TeamMemberResponse => {
  const roleTitle = getFallbackRoleTitle(member)
  const monthlyHours = member.monthlyHours ?? (member.allocationPct !== null ? Math.round((member.allocationPct / 100) * 160) : 0)

  const fteAllocation =
    member.allocationPct !== null
      ? Number((member.allocationPct / 100).toFixed(1))
      : monthlyHours > 0
        ? Number((monthlyHours / 160).toFixed(1))
        : 0

  return {
    memberId: member.id,
    displayName: member.name,
    email: '',
    avatarUrl: member.avatarPath || null,
    roleTitle,
    roleCategory: inferRoleCategory(roleTitle),
    relevanceNote: null,
    contactChannel: 'teams',
    contactHandle: null,
    fteAllocation,
    startDate: null,
    profile: {
      firstName: null,
      lastName: null,
      preferredName: null,
      legalName: null,
      orgRoleId: null,
      orgRoleName: null,
      professionId: null,
      professionName: null,
      seniorityLevel: null,
      employmentType: null,
      ageYears: null,
      phone: null,
      teamsUserId: null,
      slackUserId: null,
      locationCity: null,
      locationCountry: null,
      timeZone: null,
      yearsExperience: null,
      efeonceStartDate: null,
      tenureEfeonceMonths: null,
      tenureClientMonths: null,
      biography: null,
      languages: [],
      profileCompletenessPercent: 0
    },
    identityProviders: [],
    identityConfidence: 'basic'
  }
}

const buildFallbackTeam = (dashboardData: GreenhouseDashboardData): TeamMembersPayload => {
  const members = dashboardData.accountTeam.members.filter(member => !shouldHideFallbackMember(member)).map(toFallbackMember)
  const totalFte = Number(members.reduce((sum, member) => sum + member.fteAllocation, 0).toFixed(1))

  return {
    members,
    footer: {
      serviceLines: dashboardData.scope.businessLines,
      modality: dashboardData.scope.serviceModules.length > 0 ? 'On-Going' : 'On-Demand',
      totalFte
    },
    source: 'legacy_override'
  }
}

const formatDedication = (member: TeamMemberResponse) => {
  const monthlyHours = Math.round(member.fteAllocation * 160)

  return {
    fte: GH_TEAM.capacity_member_fte(member.fteAllocation),
    hours: GH_TEAM.capacity_member_hours(monthlyHours)
  }
}

type TeamCapacitySectionProps = {
  initialData?: TeamMembersPayload | null
  dashboardData?: GreenhouseDashboardData
}

const TeamCapacitySection = ({ initialData = null, dashboardData }: TeamCapacitySectionProps) => {
  const [requestIntent, setRequestIntent] = useState<string | null>(null)

  const data = initialData || (dashboardData ? buildFallbackTeam(dashboardData) : null)
  const members = data?.members || []

  const footer = data?.footer || {
    serviceLines: [],
    modality: null,
    totalFte: 0
  }

  const totalHours = Math.round(footer.totalFte * 160)
  const primaryServiceLine = footer.serviceLines[0] || null
  const extraServiceLines = Math.max(0, footer.serviceLines.length - 1)

  if (members.length === 0) {
    return (
      <>
        <ExecutiveCardShell title={GH_TEAM.pulse_title} subtitle={GH_TEAM.pulse_subtitle}>
          <EmptyState icon='tabler-users-group' title={GH_TEAM.pulse_title} description={GH_MESSAGES.empty_team} minHeight={260} />
        </ExecutiveCardShell>
        <RequestDialog open={requestIntent !== null} intent={requestIntent} onClose={() => setRequestIntent(null)} />
      </>
    )
  }

  return (
    <>
      <ExecutiveCardShell title={GH_TEAM.pulse_title} subtitle={GH_TEAM.pulse_subtitle}>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              xl: 'minmax(0, 1.35fr) minmax(300px, 0.65fr)'
            }
          }}
        >
          <Stack spacing={1.5}>
            {members.map(member => {
              const tone = getTeamRoleTone(member.roleCategory)
              const dedication = formatDedication(member)
              const contactValue = member.contactHandle || member.email || GH_TEAM.contact_pending

              return (
                <Box
                  key={member.memberId}
                  sx={{
                    px: { xs: 2, md: 2.5 },
                    py: 2,
                    borderRadius: 3,
                    border: `1px solid ${GH_COLORS.neutral.border}`,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='center'>
                    <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minWidth: 0, flexGrow: 1 }}>
                      <TeamAvatar name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} size={44} />

                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography
                          sx={{
                            color: GH_COLORS.neutral.textPrimary,
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            lineHeight: 1.35
                          }}
                        >
                          {member.displayName}
                        </Typography>

                        <Typography
                          sx={{
                            color: tone.text,
                            fontSize: '0.8125rem',
                            fontWeight: 400,
                            lineHeight: 1.35,
                            mt: 0.25
                          }}
                        >
                          {member.roleTitle}
                        </Typography>

                        <Stack direction='row' spacing={0.75} alignItems='center' sx={{ mt: 0.75, minWidth: 0 }}>
                          <Box component='span' sx={{ color: GH_COLORS.neutral.textSecondary, display: 'inline-flex' }}>
                            <i className={`${getContactIcon(member.contactChannel)} text-[16px]`} />
                          </Box>
                          <Typography
                            sx={{
                              color: GH_COLORS.neutral.textSecondary,
                              fontSize: '0.75rem',
                              fontWeight: 400,
                              lineHeight: 1.35,
                              minWidth: 0
                            }}
                          >
                            {`${getContactLabel(member.contactChannel)} - ${contactValue}`}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>

                    <Box sx={{ minWidth: 92, textAlign: 'right', flexShrink: 0 }}>
                      <Typography
                        sx={{
                          color: GH_COLORS.neutral.textPrimary,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          lineHeight: 1.35
                        }}
                      >
                        {dedication.fte}
                      </Typography>
                      <Typography
                        sx={{
                          color: GH_COLORS.neutral.textSecondary,
                          fontSize: '0.75rem',
                          fontWeight: 400,
                          lineHeight: 1.35,
                          mt: 0.25
                        }}
                      >
                        {dedication.hours}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )
            })}

            <TeamExpansionGhostCard variant='row' onClick={() => setRequestIntent(GH_TEAM.expand_title.toLowerCase())} />
          </Stack>

          <Stack
            spacing={2}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${GH_COLORS.neutral.border}`,
              bgcolor: GH_COLORS.neutral.bgSurface,
              alignSelf: 'start',
              position: {
                xs: 'static',
                xl: 'sticky'
              },
              top: {
                xl: 96
              }
            }}
          >
            <Typography variant='subtitle2'>{GH_TEAM.pulse_summary_title}</Typography>

            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${alpha(GH_COLORS.neutral.border, 0.9)}`,
                bgcolor: 'background.paper'
              }}
            >
              <Typography variant='caption' color='text.secondary'>
                {GH_TEAM.label_contracted}
              </Typography>
              <Typography variant='body1' sx={{ mt: 0.75, color: GH_COLORS.neutral.textPrimary }}>
                {GH_TEAM.pulse_summary_fte(footer.totalFte)}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${alpha(GH_COLORS.neutral.border, 0.9)}`,
                bgcolor: 'background.paper'
              }}
            >
              <Typography variant='caption' color='text.secondary'>
                {GH_TEAM.label_hours}
              </Typography>
              <Typography variant='body1' sx={{ mt: 0.75, color: GH_COLORS.neutral.textPrimary }}>
                {GH_TEAM.pulse_summary_hours(totalHours)}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${alpha(GH_COLORS.neutral.border, 0.9)}`,
                bgcolor: 'background.paper'
              }}
            >
              <Typography variant='caption' color='text.secondary'>
                {GH_TEAM.label_service_line}
              </Typography>

              {primaryServiceLine ? (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Box>
                    <BusinessLineBadge brand={primaryServiceLine} />
                  </Box>
                  <Typography variant='body2'>{getBrandDisplayLabel(primaryServiceLine)}</Typography>
                  {extraServiceLines > 0 ? (
                    <Typography variant='caption' color='text.secondary'>
                      {GH_TEAM.pulse_service_lines_more(extraServiceLines)}
                    </Typography>
                  ) : null}
                </Stack>
              ) : (
                <Typography variant='body2' sx={{ mt: 0.75, color: GH_COLORS.neutral.textSecondary }}>
                  {GH_TEAM.service_lines_empty}
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${alpha(GH_COLORS.neutral.border, 0.9)}`,
                bgcolor: 'background.paper'
              }}
            >
              <Typography variant='caption' color='text.secondary'>
                {GH_TEAM.label_modality}
              </Typography>
              <Typography variant='body1' sx={{ mt: 0.75, color: GH_COLORS.neutral.textPrimary }}>
                {footer.modality || GH_TEAM.modality_pending}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </ExecutiveCardShell>

      <RequestDialog open={requestIntent !== null} intent={requestIntent} onClose={() => setRequestIntent(null)} />
    </>
  )
}

export default TeamCapacitySection
