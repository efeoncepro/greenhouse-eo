'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import AvatarGroup from '@mui/material/AvatarGroup'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { GH_COLORS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { TeamCapacityPayload } from '@/types/team'

import EmptyState from './EmptyState'
import ExecutiveCardShell from './ExecutiveCardShell'
import RequestDialog from './RequestDialog'
import TeamAvatar, { getTeamRoleTone } from './TeamAvatar'
import TeamExpansionGhostCard from './TeamExpansionGhostCard'
import TeamLoadBar from './TeamLoadBar'
import TeamProgressBar from './TeamProgressBar'
import TeamSignalChip from './TeamSignalChip'
import UpsellBanner from './UpsellBanner'

const getUtilizationTone = (value: number): 'success' | 'warning' | 'error' => {
  if (value >= 90) return 'error'
  if (value >= 71) return 'warning'

  return 'success'
}

const TeamCapacitySection = () => {
  const [data, setData] = useState<TeamCapacityPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [requestIntent, setRequestIntent] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadData = async () => {
      try {
        setIsLoading(true)

        const response = await fetch('/api/team/capacity', {
          cache: 'no-store',
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error(`Team capacity request failed with ${response.status}`)
        }

        const payload = (await response.json()) as TeamCapacityPayload

        setData(payload)
        setError(null)
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return
        }

        setError(GH_MESSAGES.error_team_capacity)
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()

    return () => controller.abort()
  }, [])

  return (
    <>
      <ExecutiveCardShell title={GH_TEAM.capacity_title} subtitle={GH_TEAM.capacity_subtitle}>
        <Stack spacing={3}>
          {isLoading ? (
            <Stack spacing={2.5}>
              <Skeleton variant='rounded' height={120} />
              <Skeleton variant='rounded' height={280} />
            </Stack>
          ) : null}

          {error ? <Alert severity='warning'>{error}</Alert> : null}

          {!isLoading && !error && (!data || data.members.length === 0) ? (
            <EmptyState icon='tabler-users-group' title={GH_TEAM.capacity_title} description={GH_MESSAGES.empty_capacity} minHeight={260} />
          ) : null}

          {!isLoading && !error && data ? (
            <>
              {(() => {
                const utilizationTone = getUtilizationTone(data.summary.utilizationPercent)
                const memberFteValues = Array.from(new Set(data.members.map(member => member.fteAllocation.toFixed(2))))
                const showMemberAllocation = memberFteValues.length > 1

                const avgActiveAssets =
                  data.members.length > 0 ? data.members.reduce((sum, member) => sum + member.activeAssets, 0) / data.members.length : 0

                return (
                  <>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(3, minmax(0, 1fr))'
                  }
                }}
              >
                <HorizontalWithSubtitle
                  title={GH_TEAM.label_contracted}
                  stats={`${data.summary.totalFte.toFixed(1)} FTE`}
                  avatarIcon='tabler-users-group'
                  avatarColor='primary'
                  subtitle={GH_TEAM.capacity_people_assigned(data.summary.memberCount)}
                />

                <HorizontalWithSubtitle
                  title={GH_TEAM.label_hours}
                  stats={`${data.summary.utilizedHoursMonth} / ${data.summary.totalHoursMonth}h`}
                  avatarIcon='tabler-clock-hour-4'
                  avatarColor='info'
                  subtitle={data.period}
                />

                <Box
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    border: `1px solid ${GH_COLORS.neutral.border}`,
                    bgcolor: 'background.paper',
                    display: 'grid',
                    gap: 1.5
                  }}
                >
                  <Typography variant='body2' color='text.secondary'>
                    {GH_TEAM.label_utilization}
                  </Typography>
                  <Typography variant='h4'>{`${data.summary.utilizationPercent}%`}</Typography>
                  <Stack spacing={1.25}>
                    <TeamProgressBar value={data.summary.utilizationPercent} tone={utilizationTone} />
                    <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap'>
                      <TeamSignalChip
                        tone={utilizationTone}
                        label={data.summary.utilizationPercent >= 85 ? GH_TEAM.cta_signal_high : GH_TEAM.cta_signal_balanced}
                        icon='tabler-activity-heartbeat'
                      />
                      <Typography variant='caption' color='text.secondary'>
                        {GH_TEAM.capacity_utilization_help}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Box>

              {!data.hasOperationalMetrics ? (
                <Alert severity='info'>{GH_MESSAGES.team_operational_pending}</Alert>
              ) : null}

              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  alignItems: 'start',
                  gridTemplateColumns: {
                    xs: '1fr',
                    xl: 'minmax(0, 1.35fr) minmax(320px, 0.65fr)'
                  }
                }}
              >
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent='space-between' alignItems={{ xs: 'flex-start', md: 'center' }}>
                    <Stack spacing={0.5}>
                      <Typography variant='subtitle2'>{GH_TEAM.label_load}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {data.hasOperationalMetrics ? GH_TEAM.capacity_operational_live : GH_TEAM.capacity_contract_only}
                      </Typography>
                    </Stack>

                    <Stack direction='row' spacing={1.5} alignItems='center' useFlexGap flexWrap='wrap'>
                      <AvatarGroup
                        max={4}
                        sx={{
                          '& .MuiAvatar-root': {
                            width: 28,
                            height: 28,
                            fontSize: '0.75rem',
                            borderColor: 'background.paper'
                          }
                        }}
                      >
                        {data.members.map(member => (
                          <TeamAvatar
                            key={`capacity-avatar-${member.memberId}`}
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
                  </Stack>

                  <Stack
                    divider={<Divider flexItem sx={{ borderStyle: 'dashed', borderColor: alpha(GH_COLORS.neutral.border, 0.8) }} />}
                    sx={{
                      borderRadius: 4,
                      border: `1px solid ${alpha(GH_COLORS.neutral.border, 0.9)}`,
                      bgcolor: 'background.paper',
                      overflow: 'hidden'
                    }}
                  >
                    {data.members.map(member => {
                      const tone = getTeamRoleTone(member.roleCategory)
                      const isOverloaded = data.hasOperationalMetrics && avgActiveAssets > 0 && member.activeAssets > avgActiveAssets * 1.5

                      return (
                        <Stack
                          key={member.memberId}
                          sx={{
                            px: { xs: 2, md: 2.5 },
                            py: 2,
                            gap: 1.5
                          }}
                        >
                          <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
                            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minWidth: 0 }}>
                              <TeamAvatar name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} size={36} />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant='subtitle2' sx={{ color: 'text.primary' }}>
                                  {member.displayName}
                                </Typography>
                                <Typography variant='caption' sx={{ color: tone.text, display: 'block' }}>
                                  {member.roleTitle}
                                </Typography>
                              </Box>
                            </Stack>

                            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                              <Stack direction='row' spacing={1} justifyContent='flex-end' flexWrap='wrap' useFlexGap>
                                {data.hasOperationalMetrics ? (
                                  <>
                                    <TeamSignalChip
                                      tone={isOverloaded ? 'error' : 'primary'}
                                      label={GH_TEAM.capacity_assets_label(member.activeAssets)}
                                      icon='tabler-layers-intersect'
                                    />
                                    <Chip
                                      size='small'
                                      variant='tonal'
                                      color='info'
                                      label={GH_TEAM.capacity_projects_label(member.projectCount)}
                                    />
                                    {member.avgRpa !== null ? (
                                      <TeamSignalChip
                                        tone={member.avgRpa <= 1.5 ? 'success' : member.avgRpa <= 2.5 ? 'warning' : 'error'}
                                        label={GH_TEAM.rpa_label(member.avgRpa)}
                                        icon='tabler-chart-line'
                                      />
                                    ) : null}
                                  </>
                                ) : showMemberAllocation ? (
                                  <>
                                    <Chip size='small' variant='outlined' label={GH_TEAM.capacity_member_fte(member.fteAllocation)} />
                                    <Typography variant='caption' color='text.secondary'>
                                      {GH_TEAM.capacity_member_hours(Math.round(member.fteAllocation * 160))}
                                    </Typography>
                                  </>
                                ) : null}
                              </Stack>
                            </Box>
                          </Stack>

                          {data.hasOperationalMetrics ? (
                            <Stack spacing={1}>
                              <TeamLoadBar items={member.projectBreakdown} emptyLabel={GH_MESSAGES.team_project_breakdown_empty} />
                              <Typography variant='caption' color='text.secondary'>
                                {member.completedAssets} {GH_TEAM.project_chip_completed}
                              </Typography>
                            </Stack>
                          ) : null}
                        </Stack>
                      )
                    })}

                    <Box sx={{ p: 2 }}>
                      <TeamExpansionGhostCard variant='row' onClick={() => setRequestIntent(GH_TEAM.expand_title.toLowerCase())} />
                    </Box>
                  </Stack>
                </Stack>

                <Stack
                  spacing={2}
                  sx={{
                    p: 2.5,
                    borderRadius: 4,
                    border: `1px solid ${GH_COLORS.neutral.border}`,
                    bgcolor: GH_COLORS.neutral.bgSurface,
                    alignSelf: 'start'
                  }}
                >
                  <Typography variant='subtitle2'>{GH_TEAM.capacity_summary_subtitle}</Typography>
                  <HorizontalWithSubtitle
                    title={GH_TEAM.label_contracted}
                    stats={`${data.summary.totalFte.toFixed(1)} FTE`}
                    avatarIcon='tabler-users-group'
                    avatarColor='primary'
                    subtitle={`${data.summary.totalHoursMonth}h/mes`}
                  />
                  <HorizontalWithSubtitle
                    title={GH_TEAM.label_hours}
                    stats={`${data.summary.utilizedHoursMonth}h`}
                    avatarIcon='tabler-clock-hour-4'
                    avatarColor='info'
                    subtitle={data.period}
                  />
                  <HorizontalWithSubtitle
                    title={GH_TEAM.label_utilization}
                    stats={`${data.summary.utilizationPercent}%`}
                    avatarIcon='tabler-activity-heartbeat'
                    avatarColor={utilizationTone}
                    subtitle={GH_MESSAGES.tooltip_utilization}
                  />

                  {data.summary.utilizationPercent >= 85 ? (
                    <UpsellBanner utilizationPercent={data.summary.utilizationPercent} onRequest={() => setRequestIntent(GH_TEAM.cta_button.toLowerCase())} />
                  ) : null}
                </Stack>
              </Box>
                  </>
                )
              })()}
            </>
          ) : null}
        </Stack>
      </ExecutiveCardShell>

      <RequestDialog open={requestIntent !== null} intent={requestIntent} onClose={() => setRequestIntent(null)} />
    </>
  )
}

export default TeamCapacitySection
