'use client'

import { useState } from 'react'

import AvatarGroup from '@mui/material/AvatarGroup'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { GH_COLORS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { GreenhouseDashboardData, GreenhouseDashboardTeamMember } from '@/types/greenhouse-dashboard'
import type { TeamMemberResponse, TeamMembersPayload, TeamRoleCategory } from '@/types/team'

import EmptyState from './EmptyState'
import ExecutiveCardShell from './ExecutiveCardShell'
import RequestDialog from './RequestDialog'
import TeamAvatar, { getTeamRoleTone } from './TeamAvatar'
import TeamExpansionGhostCard from './TeamExpansionGhostCard'
import { getBrandDisplayLabel, resolveBrandAssets } from './brand-assets'

// ─── Helpers ────────────────────────────────────────────────────────────────

const CLIENT_HIDDEN_KEYWORDS = ['leadership']

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
  CLIENT_HIDDEN_KEYWORDS.some(kw => roleTitle.toLowerCase().includes(kw))

const formatServiceLineLabel = (brand: string) => {
  const resolved = getBrandDisplayLabel(brand)

  return resolved === brand ? brand.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : resolved
}

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
      firstName: null, lastName: null, preferredName: null, legalName: null,
      orgRoleId: null, orgRoleName: null, professionId: null, professionName: null,
      seniorityLevel: null, employmentType: null, ageYears: null, phone: null,
      teamsUserId: null, slackUserId: null, locationCity: null, locationCountry: null,
      timeZone: null, yearsExperience: null, efeonceStartDate: null,
      tenureEfeonceMonths: null, tenureClientMonths: null, biography: null,
      languages: [], profileCompletenessPercent: 0
    },
    identityProviders: [],
    identityConfidence: 'basic'
  }
}

const buildFallbackTeam = (dashboardData: GreenhouseDashboardData): TeamMembersPayload => {
  const members = dashboardData.accountTeam.members
    .filter(m => !isHiddenInClientView(getFallbackRoleTitle(m)))
    .map(toFallbackMember)
  const totalFte = Number(members.reduce((sum, m) => sum + m.fteAllocation, 0).toFixed(1))

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

// ─── Component ───────────────────────────────────────────────────────────────

type TeamCapacitySectionProps = {
  initialData?: TeamMembersPayload | null
  dashboardData?: GreenhouseDashboardData
}

const TeamCapacitySection = ({ initialData = null, dashboardData }: TeamCapacitySectionProps) => {
  const [requestIntent, setRequestIntent] = useState<string | null>(null)

  const raw = initialData || (dashboardData ? buildFallbackTeam(dashboardData) : null)
  const members = (raw?.members || []).filter(m => !isHiddenInClientView(m.roleTitle))
  const footer = raw?.footer || { serviceLines: [], modality: null, totalFte: 0 }
  const totalHours = Math.round(footer.totalFte * 160)

  const serviceLineSummary = footer.serviceLines
    .map(formatServiceLineLabel)
    .slice(0, 2)
    .join(' · ')

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
        <Stack spacing={4}>

          {/* ── Stats row ──────────────────────────────────────────── */}
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))'
              }
            }}
          >
            <HorizontalWithSubtitle
              title={GH_TEAM.label_people}
              stats={String(members.length)}
              avatarIcon='tabler-users-group'
              avatarColor='primary'
              subtitle={GH_TEAM.section_people_subtitle}
            />
            <HorizontalWithSubtitle
              title={GH_TEAM.label_contracted}
              stats={`${footer.totalFte.toFixed(1)} FTE`}
              avatarIcon='tabler-briefcase'
              avatarColor='success'
              subtitle={GH_TEAM.pulse_summary_hours(totalHours)}
            />
            <HorizontalWithSubtitle
              title={GH_TEAM.label_modality}
              stats={footer.modality || GH_TEAM.modality_pending}
              avatarIcon='tabler-calendar-check'
              avatarColor='info'
              subtitle={serviceLineSummary || GH_TEAM.service_lines_empty}
            />
          </Box>

          {/* ── Member list ────────────────────────────────────────── */}
          <Stack
            divider={
              <Divider flexItem sx={{ borderStyle: 'dashed', borderColor: alpha(GH_COLORS.neutral.border, 0.7) }} />
            }
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(GH_COLORS.neutral.border, 0.9)}`,
              bgcolor: 'background.paper',
              overflow: 'hidden'
            }}
          >
            {/* Avatar group header */}
            <Stack
              direction='row'
              spacing={2}
              alignItems='center'
              justifyContent='space-between'
              sx={{ px: 2.5, py: 1.75, bgcolor: GH_COLORS.neutral.bgSurface }}
            >
              <AvatarGroup
                max={6}
                sx={{
                  '& .MuiAvatar-root': {
                    width: 28,
                    height: 28,
                    fontSize: '0.7rem',
                    borderColor: 'background.paper'
                  }
                }}
              >
                {members.map(member => (
                  <TeamAvatar
                    key={`ava-${member.memberId}`}
                    name={member.displayName}
                    avatarUrl={member.avatarUrl}
                    roleCategory={member.roleCategory}
                    size={28}
                  />
                ))}
              </AvatarGroup>
              <Typography variant='caption' color='text.secondary'>
                {GH_TEAM.capacity_people_helper}
              </Typography>
            </Stack>

            {/* Member rows */}
            {members.map(member => {
              const tone = getTeamRoleTone(member.roleCategory)
              const fteLabel = GH_TEAM.capacity_member_fte(member.fteAllocation)
              const hoursLabel = GH_TEAM.capacity_member_hours(Math.round(member.fteAllocation * 160))

              return (
                <Box
                  key={member.memberId}
                  sx={{
                    px: { xs: 2, md: 2.5 },
                    py: 1.75,
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: alpha(tone.source, 0.04) }
                  }}
                >
                  {/* Left: avatar + name + role */}
                  <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minWidth: 0, flex: 1 }}>
                    <TeamAvatar
                      name={member.displayName}
                      avatarUrl={member.avatarUrl}
                      roleCategory={member.roleCategory}
                      size={40}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant='subtitle2'
                        noWrap
                        sx={{ color: GH_COLORS.neutral.textPrimary, lineHeight: 1.3 }}
                      >
                        {member.displayName}
                      </Typography>
                      <Chip
                        size='small'
                        label={member.roleTitle}
                        sx={{
                          mt: 0.5,
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          color: tone.textDark,
                          bgcolor: tone.bg,
                          border: 'none'
                        }}
                      />
                    </Box>
                  </Stack>

                  {/* Right: FTE */}
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: GH_COLORS.neutral.textPrimary }}>
                      {fteLabel}
                    </Typography>
                    <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                      {hoursLabel}
                    </Typography>
                  </Box>
                </Box>
              )
            })}

            {/* Ghost slot */}
            <Box sx={{ p: 2 }}>
              <TeamExpansionGhostCard variant='row' onClick={() => setRequestIntent(GH_TEAM.expand_title.toLowerCase())} />
            </Box>
          </Stack>

        </Stack>
      </ExecutiveCardShell>

      <RequestDialog open={requestIntent !== null} intent={requestIntent} onClose={() => setRequestIntent(null)} />
    </>
  )
}

export default TeamCapacitySection
