'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
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
import TeamIdentityBadgeGroup from './TeamIdentityBadgeGroup'
import TeamLoadBar from './TeamLoadBar'
import TeamProgressBar from './TeamProgressBar'
import TeamSignalChip from './TeamSignalChip'
import UpsellBanner from './UpsellBanner'

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
                  subtitle={GH_TEAM.capacity_people_active(data.summary.memberCount)}
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
                  <TeamProgressBar
                    value={data.summary.utilizationPercent}
                    tone={data.summary.utilizationPercent >= 90 ? 'error' : data.summary.utilizationPercent >= 71 ? 'warning' : 'success'}
                  />
                  <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap'>
                    <TeamSignalChip
                      tone={data.summary.utilizationPercent >= 90 ? 'error' : data.summary.utilizationPercent >= 71 ? 'warning' : 'success'}
                      label={data.summary.utilizationPercent >= 85 ? GH_TEAM.cta_signal_high : GH_TEAM.cta_signal_balanced}
                      icon='tabler-activity-heartbeat'
                    />
                    <Typography variant='caption' color='text.secondary'>
                      {GH_TEAM.capacity_utilization_help}
                    </Typography>
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
                  gridTemplateColumns: {
                    xs: '1fr',
                    xl: 'minmax(0, 1.25fr) minmax(320px, 0.75fr)'
                  }
                }}
              >
                <Stack spacing={2}>
                  <Stack spacing={0.5}>
                    <Typography variant='subtitle2'>{GH_TEAM.label_load}</Typography>
                    {!data.hasOperationalMetrics ? (
                      <Typography variant='body2' color='text.secondary'>
                        {GH_TEAM.capacity_contract_only}
                      </Typography>
                    ) : null}
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gap: 2,
                      gridTemplateColumns: {
                        xs: '1fr',
                        lg: 'repeat(2, minmax(0, 1fr))'
                      }
                    }}
                  >
                    {data.members.map(member => {
                      const tone = getTeamRoleTone(member.roleCategory)

                      return (
                        <Box
                          key={member.memberId}
                          sx={{
                            p: 2.5,
                            borderRadius: 4,
                            border: `1px solid ${alpha(tone.source, 0.16)}`,
                            background: `linear-gradient(180deg, ${alpha(tone.source, 0.08)} 0%, ${GH_COLORS.neutral.bgSurface} 36%)`,
                            display: 'grid',
                            gap: 1.75
                          }}
                        >
                          <Stack direction='row' spacing={2} alignItems='center'>
                            <TeamAvatar name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} size={44} />
                            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                              <Typography variant='h6'>{member.displayName}</Typography>
                              <Typography variant='body2' sx={{ color: tone.text }}>
                                {member.roleTitle}
                              </Typography>
                            </Box>
                            <Chip size='small' variant='outlined' label={`${member.fteAllocation.toFixed(1)} FTE`} />
                          </Stack>

                          <TeamIdentityBadgeGroup providers={member.identityProviders} confidence={member.identityConfidence} />

                          {data.hasOperationalMetrics ? (
                            <>
                              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                                <Chip size='small' variant='tonal' color='primary' label={`${member.activeAssets} ${GH_TEAM.active_assets_short}`} />
                                <Chip size='small' variant='tonal' color='success' label={`${member.completedAssets} ${GH_TEAM.project_chip_completed}`} />
                                <Chip size='small' variant='tonal' color='info' label={`${member.projectCount} ${GH_TEAM.projects_short}`} />
                                <TeamSignalChip
                                  tone={member.avgRpa === null ? 'default' : member.avgRpa <= 1.5 ? 'success' : member.avgRpa <= 2.5 ? 'warning' : 'error'}
                                  label={member.avgRpa === null ? GH_TEAM.rpa_empty : GH_TEAM.rpa_label(member.avgRpa)}
                                  icon='tabler-chart-line'
                                />
                              </Stack>

                              <TeamLoadBar items={member.projectBreakdown} emptyLabel={GH_MESSAGES.team_project_breakdown_empty} />
                            </>
                          ) : (
                            <Typography variant='caption' color='text.secondary'>
                              {GH_TEAM.label_committed_capacity}: {`${Math.round(member.fteAllocation * 160)}h/mes`}
                            </Typography>
                          )}
                        </Box>
                      )
                    })}

                    <TeamExpansionGhostCard minHeight={220} onClick={() => setRequestIntent(GH_TEAM.expand_title.toLowerCase())} />
                  </Box>
                </Stack>

                <Stack
                  spacing={2}
                  sx={{
                    p: 2.5,
                    borderRadius: 4,
                    border: `1px solid ${GH_COLORS.neutral.border}`,
                    bgcolor: GH_COLORS.neutral.bgSurface,
                    alignContent: 'start'
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
                    avatarColor={data.summary.utilizationPercent >= 90 ? 'error' : data.summary.utilizationPercent >= 71 ? 'warning' : 'success'}
                    subtitle={GH_MESSAGES.tooltip_utilization}
                  />

                  {data.summary.utilizationPercent >= 85 ? (
                    <UpsellBanner utilizationPercent={data.summary.utilizationPercent} onRequest={() => setRequestIntent(GH_TEAM.cta_button.toLowerCase())} />
                  ) : null}
                </Stack>
              </Box>
            </>
          ) : null}
        </Stack>
      </ExecutiveCardShell>

      <RequestDialog open={requestIntent !== null} intent={requestIntent} onClose={() => setRequestIntent(null)} />
    </>
  )
}

export default TeamCapacitySection
