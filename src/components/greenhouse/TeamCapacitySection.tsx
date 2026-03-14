'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { GH_COLORS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { GreenhouseDashboardData, GreenhouseDashboardTeamMember } from '@/types/greenhouse-dashboard'
import type { TeamMemberResponse, TeamMembersPayload, TeamRoleCategory } from '@/types/team'

import BusinessLineBadge from './BusinessLineBadge'
import EmptyState from './EmptyState'
import ExecutiveCardShell from './ExecutiveCardShell'
import RequestDialog from './RequestDialog'
import TeamAvatar, { getTeamRoleTone } from './TeamAvatar'
import TeamExpansionGhostCard from './TeamExpansionGhostCard'
import { getBrandDisplayLabel, resolveBrandAssets } from './brand-assets'

const formatServiceLineLabel = (brand: string) => {
  const resolved = getBrandDisplayLabel(brand)

  // If no entry found, the function returns the raw brand string — format it nicely
  if (resolved === brand) {
    return brand.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  return resolved
}

const hasBrandAssets = (brand: string) => resolveBrandAssets(brand) !== null

const CLIENT_ROLES_HIDDEN = ['leadership']

const inferRoleCategory = (roleTitle: string): TeamRoleCategory => {
  const r = roleTitle.toLowerCase()

  if (r.includes('account') || r.includes('leadership')) return 'account'
  if (r.includes('operat')) return 'operations'
  if (r.includes('strateg')) return 'strategy'
  if (r.includes('design') || r.includes('creative')) return 'design'
  if (r.includes('media')) return 'media'

  return 'development'
}

const isHiddenInClientView = (roleTitle: string) =>
  CLIENT_ROLES_HIDDEN.some(keyword => roleTitle.toLowerCase().includes(keyword))

const getFallbackRoleTitle = (member: GreenhouseDashboardTeamMember) => {
  if (member.role !== 'Efeonce Team') return member.role

  const name = member.name.toLowerCase()

  if (name.includes('valentina')) return 'Account Manager'
  if (name.includes('humberly')) return 'Content Strategist'
  if (name.includes('luis')) return 'Operations Specialist'

  return 'Operations Specialist'
}

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
  const members = dashboardData.accountTeam.members
    .filter(member => !isHiddenInClientView(getFallbackRoleTitle(member)))
    .map(toFallbackMember)

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

type TeamCapacitySectionProps = {
  initialData?: TeamMembersPayload | null
  dashboardData?: GreenhouseDashboardData
}

const TeamCapacitySection = ({ initialData = null, dashboardData }: TeamCapacitySectionProps) => {
  const [requestIntent, setRequestIntent] = useState<string | null>(null)

  const raw = initialData || (dashboardData ? buildFallbackTeam(dashboardData) : null)

  // Filter internal roles from client-facing view
  const members = (raw?.members || []).filter(member => !isHiddenInClientView(member.roleTitle))

  const footer = raw?.footer || { serviceLines: [], modality: null, totalFte: 0 }
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
            gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.4fr) minmax(260px, 0.6fr)' }
          }}
        >
          {/* ── Member list ─────────────────────────────── */}
          <Stack
            divider={<Divider flexItem sx={{ borderStyle: 'dashed', opacity: 0.6 }} />}
            sx={{
              borderRadius: 3,
              border: `1px solid ${GH_COLORS.neutral.border}`,
              bgcolor: 'background.paper',
              overflow: 'hidden'
            }}
          >
            {members.map(member => {
              const tone = getTeamRoleTone(member.roleCategory)
              const fteLabel = GH_TEAM.capacity_member_fte(member.fteAllocation)
              const hoursLabel = GH_TEAM.capacity_member_hours(Math.round(member.fteAllocation * 160))

              return (
                <Stack
                  key={member.memberId}
                  direction='row'
                  spacing={2}
                  alignItems='center'
                  justifyContent='space-between'
                  sx={{ px: { xs: 2, md: 2.5 }, py: 1.75 }}
                >
                  <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minWidth: 0, flex: 1 }}>
                    <TeamAvatar name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} size={40} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='subtitle2' noWrap sx={{ color: GH_COLORS.neutral.textPrimary }}>
                        {member.displayName}
                      </Typography>
                      <Typography variant='caption' noWrap sx={{ color: tone.text, display: 'block' }}>
                        {member.roleTitle}
                      </Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant='body2' sx={{ fontWeight: 500, color: GH_COLORS.neutral.textPrimary }}>
                      {fteLabel}
                    </Typography>
                    <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                      {hoursLabel}
                    </Typography>
                  </Box>
                </Stack>
              )
            })}

            <Box sx={{ p: 2 }}>
              <TeamExpansionGhostCard variant='row' onClick={() => setRequestIntent(GH_TEAM.expand_title.toLowerCase())} />
            </Box>
          </Stack>

          {/* ── Summary panel ────────────────────────────── */}
          <Stack
            spacing={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${GH_COLORS.neutral.border}`,
              bgcolor: GH_COLORS.neutral.bgSurface,
              alignSelf: 'start',
              overflow: 'hidden',
              position: { xs: 'static', xl: 'sticky' },
              top: { xl: 96 }
            }}
          >
            <Box sx={{ p: 2.5 }}>
              <HorizontalWithSubtitle
                title={GH_TEAM.label_contracted}
                stats={`${footer.totalFte.toFixed(1)} FTE`}
                avatarIcon='tabler-users-group'
                avatarColor='primary'
                subtitle={GH_TEAM.pulse_summary_hours(totalHours)}
              />
            </Box>

            <Divider />

            <Stack spacing={2} sx={{ p: 2.5 }}>
              {primaryServiceLine ? (
                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    {GH_TEAM.label_service_line}
                  </Typography>
                  <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
                    {hasBrandAssets(primaryServiceLine) && <BusinessLineBadge brand={primaryServiceLine} />}
                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                      {formatServiceLineLabel(primaryServiceLine)}
                    </Typography>
                    {extraServiceLines > 0 && (
                      <Typography variant='caption' color='text.secondary'>
                        {GH_TEAM.pulse_service_lines_more(extraServiceLines)}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              ) : null}

              {footer.modality ? (
                <Box>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    {GH_TEAM.label_modality}
                  </Typography>
                  <Chip label={footer.modality} size='small' variant='tonal' color='primary' />
                </Box>
              ) : null}
            </Stack>
          </Stack>
        </Box>
      </ExecutiveCardShell>

      <RequestDialog open={requestIntent !== null} intent={requestIntent} onClose={() => setRequestIntent(null)} />
    </>
  )
}

export default TeamCapacitySection
