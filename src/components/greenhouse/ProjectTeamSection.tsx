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
import { GH_LABELS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { TeamByProjectPayload } from '@/types/team'
import { getRpaStatus } from '@views/greenhouse/dashboard/helpers'

import EmptyState from './EmptyState'
import ExecutiveCardShell from './ExecutiveCardShell'
import TeamAvatar, { getTeamRoleTone } from './TeamAvatar'
import TeamIdentityBadgeGroup from './TeamIdentityBadgeGroup'

type ProjectTeamSectionProps = {
  projectId: string
}

const ProjectTeamSection = ({ projectId }: ProjectTeamSectionProps) => {
  const [data, setData] = useState<TeamByProjectPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const loadData = async () => {
      try {
        setIsLoading(true)

        const response = await fetch(`/api/team/by-project/${projectId}`, {
          cache: 'no-store',
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error(`Project team request failed with ${response.status}`)
        }

        const payload = (await response.json()) as TeamByProjectPayload

        setData(payload)
        setError(null)
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return
        }

        setError(GH_MESSAGES.error_team_project)
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()

    return () => controller.abort()
  }, [projectId])

  const summary = useMemo(() => {
    if (!data) {
      return {
        activeAssets: 0,
        completedAssets: 0,
        inReview: 0
      }
    }

    return data.members.reduce(
      (accumulator, member) => ({
        activeAssets: accumulator.activeAssets + member.activeAssets,
        completedAssets: accumulator.completedAssets + member.completedAssets,
        inReview: accumulator.inReview + member.inReview
      }),
      {
        activeAssets: 0,
        completedAssets: 0,
        inReview: 0
      }
    )
  }, [data])

  return (
    <ExecutiveCardShell title={GH_TEAM.project_team_title} subtitle={GH_TEAM.project_team_subtitle}>
      <Stack spacing={2.5}>
        {isLoading ? (
          <Stack spacing={2}>
            <Skeleton variant='rounded' height={84} />
            <Skeleton variant='rounded' height={220} />
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
                title={GH_TEAM.label_people}
                stats={String(data.memberCount)}
                avatarIcon='tabler-users-group'
                avatarColor='primary'
                subtitle={GH_TEAM.project_people_subtitle}
              />
              <HorizontalWithSubtitle
                title={GH_TEAM.project_active_column}
                stats={String(summary.activeAssets)}
                avatarIcon='tabler-briefcase'
                avatarColor='info'
                subtitle={GH_TEAM.project_load_subtitle}
              />
              <HorizontalWithSubtitle
                title={GH_LABELS.col_review}
                stats={String(summary.inReview)}
                avatarIcon='tabler-eye-search'
                avatarColor='warning'
                subtitle={`${summary.completedAssets} ${GH_TEAM.project_review_subtitle.toLowerCase()}`}
              />
            </Box>

            <Stack spacing={2}>
              {data.members.map(member => {
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
                      <TeamAvatar name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} size={40} />
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant='h6'>{member.displayName}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {member.roleTitle}
                        </Typography>
                        {member.email ? (
                          <Typography variant='caption' color='text.secondary'>
                            {member.email}
                          </Typography>
                        ) : null}
                      </Box>
                      <Chip
                        size='small'
                        color={rpaStatus.tone === 'default' ? 'default' : rpaStatus.tone}
                        label={member.avgRpa === null ? 'RpA --' : `RpA ${member.avgRpa.toFixed(1)}`}
                        variant='outlined'
                      />
                    </Stack>

                    <TeamIdentityBadgeGroup providers={member.identityProviders} confidence={member.identityConfidence} />

                    <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
                      <Chip size='small' variant='tonal' color='primary' label={`${member.activeAssets} ${GH_TEAM.project_chip_active}`} />
                      <Chip size='small' variant='tonal' color='success' label={`${member.completedAssets} ${GH_TEAM.project_chip_completed}`} />
                      <Chip size='small' variant='tonal' color='warning' label={`${member.inReview} ${GH_TEAM.project_chip_review}`} />
                      <Chip size='small' variant='tonal' color='secondary' label={`${member.changesRequested} ${GH_TEAM.project_chip_changes}`} />
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          </>
        ) : null}

        {!isLoading && !error && (!data || data.members.length === 0) ? (
          <EmptyState icon='tabler-users-group' title={GH_TEAM.project_team_title} description={GH_MESSAGES.empty_team_project} minHeight={180} />
        ) : null}
      </Stack>
    </ExecutiveCardShell>
  )
}

export default ProjectTeamSection
