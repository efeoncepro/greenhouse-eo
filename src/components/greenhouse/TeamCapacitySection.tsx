'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { GH_COLORS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { TeamCapacityPayload } from '@/types/team'

import EmptyState from './EmptyState'
import ExecutiveCardShell from './ExecutiveCardShell'
import RequestDialog from './RequestDialog'
import TeamAvatar from './TeamAvatar'
import TeamLoadBar from './TeamLoadBar'
import UpsellBanner from './UpsellBanner'

const getSemaphoreColor = (utilizationPercent: number) => {
  if (utilizationPercent >= 90) {
    return GH_COLORS.semaphore.red.text
  }

  if (utilizationPercent >= 71) {
    return GH_COLORS.semaphore.yellow.text
  }

  return GH_COLORS.semaphore.green.text
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
                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: GH_COLORS.neutral.bgSurface }}>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_TEAM.label_contracted}
                  </Typography>
                  <Typography variant='h4' sx={{ mt: 0.75 }}>
                    {data.summary.totalFte.toFixed(1)} FTE
                  </Typography>
                </Box>

                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: GH_COLORS.neutral.bgSurface }}>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_TEAM.label_hours}
                  </Typography>
                  <Typography variant='h4' sx={{ mt: 0.75 }}>
                    {`${data.summary.utilizedHoursMonth} / ${data.summary.totalHoursMonth}h`}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {data.period}
                  </Typography>
                </Box>

                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: GH_COLORS.neutral.bgSurface }}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Typography variant='body2' color='text.secondary'>
                      {GH_TEAM.label_utilization}
                    </Typography>
                    <Tooltip title={GH_MESSAGES.tooltip_utilization}>
                      <Box component='span' tabIndex={0} sx={{ display: 'inline-flex', alignItems: 'center' }}>
                        <i className='tabler-info-circle text-[16px]' />
                      </Box>
                    </Tooltip>
                  </Stack>
                  <Typography variant='h4' sx={{ mt: 0.75, color: getSemaphoreColor(data.summary.utilizationPercent) }}>
                    {data.summary.utilizationPercent}%
                  </Typography>
                </Box>
              </Box>

              {!data.hasOperationalMetrics ? (
                <Alert severity='info'>{GH_MESSAGES.team_operational_pending}</Alert>
              ) : null}

              <Stack spacing={2}>
                <Typography variant='subtitle2'>{GH_TEAM.label_load}</Typography>

                {data.members.map(member => (
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
                      <TeamAvatar name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} size={40} />
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant='h6'>{member.displayName}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {member.roleTitle}
                        </Typography>
                      </Box>
                      <Stack spacing={0.25} sx={{ textAlign: 'right' }}>
                        <Typography variant='body2'>{`${member.activeAssets} ${GH_TEAM.active_assets_short}`}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {`${member.projectCount} ${GH_TEAM.projects_short}`}
                        </Typography>
                      </Stack>
                    </Stack>

                    <TeamLoadBar items={member.projectBreakdown} emptyLabel={GH_MESSAGES.team_project_breakdown_empty} />
                  </Box>
                ))}
              </Stack>

              {data.summary.utilizationPercent >= 85 ? (
                <UpsellBanner utilizationPercent={data.summary.utilizationPercent} onRequest={() => setRequestIntent(GH_TEAM.cta_button.toLowerCase())} />
              ) : null}
            </>
          ) : null}
        </Stack>
      </ExecutiveCardShell>

      <RequestDialog open={requestIntent !== null} intent={requestIntent} onClose={() => setRequestIntent(null)} />
    </>
  )
}

export default TeamCapacitySection
