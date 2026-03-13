'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

import { GH_COLORS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { TeamBySprintPayload } from '@/types/team'
import { getRpaStatus } from '@views/greenhouse/dashboard/helpers'

import EmptyState from './EmptyState'
import TeamAvatar from './TeamAvatar'

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

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant='h5'>{GH_TEAM.sprint_vel_title}</Typography>
            <Typography color='text.secondary'>{GH_TEAM.sprint_vel_subtitle}</Typography>
          </Stack>

          {isLoading ? <Skeleton variant='rounded' height={240} /> : null}
          {error ? <Alert severity='warning'>{error}</Alert> : null}
          {!isLoading && !error && data && !data.hasOperationalMetrics ? <Alert severity='info'>{GH_MESSAGES.team_operational_pending}</Alert> : null}

          {!isLoading && !error && data && data.members.length > 0 ? (
            <Stack spacing={2.25}>
              {data.members.map(member => {
                const completionPercent = member.totalInSprint > 0 ? Math.round((member.completed / member.totalInSprint) * 100) : 0
                const rpaStatus = getRpaStatus(member.avgRpa)

                return (
                  <Box
                    key={member.memberId}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: `1px solid ${GH_COLORS.neutral.border}`,
                      display: 'grid',
                      gap: 1.5
                    }}
                  >
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <TeamAvatar name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} size={36} />
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant='body1'>{member.displayName}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {`${member.completed} / ${member.totalInSprint}`}
                        </Typography>
                      </Box>
                      <Chip
                        size='small'
                        color={rpaStatus.tone === 'default' ? 'default' : rpaStatus.tone}
                        label={member.avgRpa === null ? 'RpA --' : `RpA ${member.avgRpa.toFixed(1)}`}
                        variant='outlined'
                      />
                    </Stack>

                    <LinearProgress
                      variant='determinate'
                      value={completionPercent}
                      color={getProgressColor(completionPercent, elapsedPercent)}
                      sx={{ height: 10, borderRadius: 999 }}
                    />
                  </Box>
                )
              })}
            </Stack>
          ) : null}

          {!isLoading && !error && (!data || data.members.length === 0) ? (
            <EmptyState icon='tabler-users-group' title={GH_TEAM.sprint_vel_title} description={GH_MESSAGES.empty_sprint_team} minHeight={220} />
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default SprintTeamVelocitySection
