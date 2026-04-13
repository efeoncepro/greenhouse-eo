'use client'

import { useEffect, useMemo, useState } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import AvatarGroup from '@mui/material/AvatarGroup'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { GH_COLORS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { TeamByProjectPayload } from '@/types/team'
import { getRpaStatus } from '@views/greenhouse/dashboard/helpers'

import EmptyState from './EmptyState'
import ExecutiveCardShell from './ExecutiveCardShell'
import TeamAvatar from './TeamAvatar'
import TeamIdentityBadgeGroup from './TeamIdentityBadgeGroup'
import TeamSignalChip from './TeamSignalChip'

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
                p: 2.5,
                borderRadius: 4,
                border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`,
                bgcolor: 'background.default',
                display: 'grid',
                gap: 2
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent='space-between'
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Stack spacing={1}>
                  <Typography variant='subtitle2'>{GH_TEAM.project_team_title}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_TEAM.project_people_summary_label(data.memberCount)}
                  </Typography>
                </Stack>

                <AvatarGroup
                  max={6}
                  sx={{
                    '& .MuiAvatar-root': {
                      width: 32,
                      height: 32,
                      fontSize: '0.75rem',
                      border: theme => `2px solid ${theme.palette.background.default}`
                    }
                  }}
                >
                  {data.members.map(member => (
                    <TeamAvatar key={member.memberId} name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} size={32} />
                  ))}
                </AvatarGroup>
              </Stack>

              <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
                <Chip size='small' variant='tonal' color='primary' label={`${summary.activeAssets} ${GH_TEAM.project_chip_active}`} />
                <Chip size='small' variant='tonal' color='success' label={`${summary.completedAssets} ${GH_TEAM.project_chip_completed}`} />
                <Chip size='small' variant='tonal' color='warning' label={`${summary.inReview} ${GH_TEAM.project_chip_review}`} />
              </Stack>
            </Box>

            <Accordion
              disableGutters
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`,
                '&::before': { display: 'none' }
              }}
            >
              <AccordionSummary expandIcon={<i className='tabler-chevron-down text-[20px]' />}>
                <Stack spacing={0.5}>
                  <Typography variant='subtitle2'>{GH_TEAM.project_detail_title}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_TEAM.project_expand_label}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer>
                  <Table sx={{ minWidth: 720 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{GH_TEAM.project_person_column}</TableCell>
                        <TableCell align='right'>{GH_TEAM.project_active_column}</TableCell>
                        <TableCell align='right'>{GH_TEAM.project_completed_column}</TableCell>
                        <TableCell align='right'>{GH_TEAM.label_rpa}</TableCell>
                        <TableCell align='right'>{GH_TEAM.project_review_column}</TableCell>
                        <TableCell align='right'>{GH_TEAM.project_changes_column}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.members.map(member => {
                        const rpaStatus = getRpaStatus(member.avgRpa)

                        return (
                          <TableRow key={member.memberId} hover>
                            <TableCell>
                              <Stack direction='row' spacing={1.5} alignItems='center'>
                                <TeamAvatar name={member.displayName} avatarUrl={member.avatarUrl} roleCategory={member.roleCategory} size={36} />
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                    {member.displayName}
                                  </Typography>
                                  <Typography variant='caption' color='text.secondary'>
                                    {member.roleTitle}
                                  </Typography>
                                  <Box sx={{ mt: 0.75 }}>
                                    <TeamIdentityBadgeGroup providers={member.identityProviders} confidence={member.identityConfidence} />
                                  </Box>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell align='right'>{member.activeAssets}</TableCell>
                            <TableCell align='right'>{member.completedAssets}</TableCell>
                            <TableCell align='right'>
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <TeamSignalChip
                                  tone={rpaStatus.tone === 'default' ? 'default' : rpaStatus.tone}
                                  label={member.avgRpa === null ? GH_TEAM.rpa_empty : GH_TEAM.rpa_label(member.avgRpa)}
                                  icon={rpaStatus.icon}
                                />
                              </Box>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography
                                variant='body2'
                                sx={{
                                  fontWeight: 600,
                                  color: theme => member.inReview > 0 ? GH_COLORS.semaphore.yellow.text : theme.palette.customColors.midnight
                                }}
                              >
                                {member.inReview}
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography
                                variant='body2'
                                sx={{
                                  fontWeight: 600,
                                  color: theme => member.changesRequested > 0 ? GH_COLORS.semaphore.red.text : theme.palette.customColors.midnight
                                }}
                              >
                                {member.changesRequested}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
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
