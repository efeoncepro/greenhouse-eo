'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { TeamBySprintPayload } from '@/types/team'
import { getRpaStatus } from '@views/greenhouse/dashboard/helpers'

import EmptyState from './EmptyState'
import ExecutiveCardShell from './ExecutiveCardShell'
import TeamAvatar, { getTeamRoleTone } from './TeamAvatar'
import TeamIdentityBadgeGroup from './TeamIdentityBadgeGroup'
import TeamProgressBar from './TeamProgressBar'
import TeamSignalChip from './TeamSignalChip'

type SprintTeamVelocitySectionProps = {
  sprintId: string
}

const getUtcDate = (value: string | null) => (value ? new Date(`${value}T00:00:00.000Z`) : null)

const getElapsedPercent = (startDate: string | null, endDate: string | null) => {
  const start = getUtcDate(startDate)
  const end = getUtcDate(endDate)

  if (!start || !end || end.getTime() <= start.getTime()) {
    return null
  }

  const now = new Date()
  const currentUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const elapsed = currentUtc - start.getTime()
  const total = end.getTime() - start.getTime()

  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
}

const getProgressColor = (completionPercent: number, elapsedPercent: number | null) => {
  if (elapsedPercent === null) {
    return 'info'
  }

  const delta = completionPercent - elapsedPercent

  if (delta < -20) {
    return 'error'
  }

  if (delta < 0) {
    return 'warning'
  }

  return 'success'
}

const SprintTeamVelocitySection = ({ sprintId }: SprintTeamVelocitySectionProps) => {
  const [data, setData] = useState<TeamBySprintPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const loadData = async () => {
      try {
        setIsLoading(true)

        const response = await fetch(`/api/team/by-sprint/${sprintId}`, {
          cache: 'no-store',
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error(`Sprint team request failed with ${response.status}`)
        }

        const payload = (await response.json()) as TeamBySprintPayload

        setData(payload)
        setError(null)
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return
        }

        setError(GH_MESSAGES.error_team_sprint)
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()

    return () => controller.abort()
  }, [sprintId])

  const elapsedPercent = useMemo(() => getElapsedPercent(data?.startDate || null, data?.endDate || null), [data?.endDate, data?.startDate])
  const completionPercent = data && data.totalTasks > 0 ? Math.round((data.completedTasks / data.totalTasks) * 100) : 0

  return (
    <ExecutiveCardShell title={GH_TEAM.sprint_vel_title} subtitle={GH_TEAM.sprint_vel_subtitle}>
      <Stack spacing={3}>
        {isLoading ? (
          <Stack spacing={2}>
            <Skeleton variant='rounded' height={84} />
            <Skeleton variant='rounded' height={240} />
          </Stack>
        ) : null}

        {error ? <Alert severity='warning'>{error}</Alert> : null}
        {!isLoading && !error && data && !data.hasOperationalMetrics ? <Alert severity='info'>{GH_MESSAGES.team_operational_pending}</Alert> : null}

        {!isLoading && !error && data && data.members.length > 0 ? (
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
                title={GH_TEAM.sprint_tasks_title}
                stats={String(data.totalTasks)}
                avatarIcon='tabler-checklist'
                avatarColor='primary'
                subtitle={GH_TEAM.sprint_people_active(data.memberCount)}
              />
              <Box
                sx={{
                  p: 3,
                  borderRadius: 4,
                  border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`,
                  bgcolor: 'background.paper',
                  display: 'grid',
                  gap: 1.5
                }}
              >
                <Typography variant='body2' color='text.secondary'>
                  {GH_TEAM.sprint_completed_title}
                </Typography>
                <Typography variant='h4'>{`${completionPercent}%`}</Typography>
                <TeamSignalChip
                  tone={getProgressColor(completionPercent, elapsedPercent)}
                  label={GH_TEAM.sprint_completed_total(data.completedTasks)}
                  icon='tabler-progress-check'
                />
              </Box>
              <HorizontalWithSubtitle
                title={GH_TEAM.sprint_pace_title}
                stats={elapsedPercent === null ? '--' : `${elapsedPercent}%`}
                avatarIcon='tabler-timeline'
                avatarColor='info'
                subtitle={data.sprintStatus || GH_TEAM.sprint_pace_pending}
              />
            </Box>

            <Box
              sx={{
                p: 2.5,
                borderRadius: 4,
                bgcolor: 'background.default',
                border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`
              }}
            >
              <Stack direction='row' justifyContent='space-between' spacing={2} alignItems='center'>
                <Typography variant='subtitle2'>{GH_TEAM.sprint_global_progress}</Typography>
                <TeamSignalChip
                  tone={getProgressColor(completionPercent, elapsedPercent)}
                  label={elapsedPercent === null ? GH_TEAM.sprint_baseline_missing : `${GH_TEAM.sprint_plan_prefix} ${elapsedPercent}%`}
                  icon='tabler-timeline'
                />
              </Stack>
              <TeamProgressBar
                value={completionPercent}
                tone={getProgressColor(completionPercent, elapsedPercent)}
              />
            </Box>

            <Stack spacing={2.25}>
              {data.members.map(member => {
                const memberCompletionPercent = member.totalInSprint > 0 ? Math.round((member.completed / member.totalInSprint) * 100) : 0
                const rpaStatus = getRpaStatus(member.avgRpa)
                const tone = getTeamRoleTone(member.roleCategory)

                return (
                  <Box
                    key={member.memberId}
                    sx={{
                      p: 2.5,
                      borderRadius: 4,
                      border: `1px solid ${alpha(tone.source, 0.16)}`,
                      background: `linear-gradient(180deg, ${alpha(tone.source, 0.08)} 0%, rgba(255,255,255,0) 100%)`,
                      display: 'grid',
                      gap: 1.75
                    }}
                  >
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <TeamAvatar name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} size={36} />
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant='body1'>{member.displayName}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {member.roleTitle}
                        </Typography>
                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                          {GH_TEAM.sprint_progress_personal(memberCompletionPercent)}
                        </Typography>
                      </Box>
                      <TeamSignalChip
                        tone={rpaStatus.tone === 'default' ? 'default' : rpaStatus.tone}
                        label={member.avgRpa === null ? GH_TEAM.rpa_empty : GH_TEAM.rpa_label(member.avgRpa)}
                        icon={rpaStatus.icon}
                      />
                    </Stack>

                    <TeamIdentityBadgeGroup providers={member.identityProviders} confidence={member.identityConfidence} />

                    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                      <Chip size='small' variant='tonal' color='success' label={`${member.completed} ${GH_TEAM.sprint_chip_completed}`} />
                      <Chip size='small' variant='tonal' color='warning' label={`${member.pending} ${GH_TEAM.sprint_chip_pending}`} />
                      <Chip size='small' variant='tonal' color='info' label={`${member.totalInSprint} ${GH_TEAM.sprint_chip_total}`} />
                    </Stack>

                    <TeamProgressBar
                      value={memberCompletionPercent}
                      tone={getProgressColor(memberCompletionPercent, elapsedPercent)}
                    />
                  </Box>
                )
              })}
            </Stack>
          </>
        ) : null}

        {!isLoading && !error && (!data || data.members.length === 0) ? (
          <EmptyState icon='tabler-users-group' title={GH_TEAM.sprint_vel_title} description={GH_MESSAGES.empty_sprint_team} minHeight={220} />
        ) : null}
      </Stack>
    </ExecutiveCardShell>
  )
}

export default SprintTeamVelocitySection
