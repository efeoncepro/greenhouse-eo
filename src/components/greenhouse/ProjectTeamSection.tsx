'use client'

import { useEffect, useState } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import AvatarGroup from '@mui/material/AvatarGroup'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

import { GH_LABELS, GH_MESSAGES, GH_TEAM } from '@/config/greenhouse-nomenclature'
import type { TeamByProjectPayload } from '@/types/team'
import { getRpaStatus } from '@views/greenhouse/dashboard/helpers'

import EmptyState from './EmptyState'
import TeamAvatar from './TeamAvatar'

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

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Typography variant='h5'>{GH_TEAM.project_team_title}</Typography>
            <Typography color='text.secondary'>{GH_TEAM.project_team_subtitle}</Typography>
          </Stack>

          {isLoading ? <Skeleton variant='rounded' height={84} /> : null}
          {error ? <Alert severity='warning'>{error}</Alert> : null}

          {!isLoading && !error && data && data.members.length > 0 ? (
            <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent' }}>
              <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                <Stack direction='row' spacing={2} alignItems='center' sx={{ flexWrap: 'wrap' }}>
                  <AvatarGroup max={5}>
                    {data.members.map(member => (
                      <TeamAvatar
                        key={member.memberId}
                        name={member.displayName}
                        avatarUrl={member.avatarUrl}
                        roleCategory={member.roleCategory}
                        size={32}
                      />
                    ))}
                  </AvatarGroup>
                  <Typography variant='body2'>{GH_TEAM.project_people_summary.replace('{count}', String(data.memberCount))}</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pb: 0 }}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>{GH_TEAM.project_person_column}</TableCell>
                      <TableCell align='right'>{GH_TEAM.project_active_column}</TableCell>
                      <TableCell align='right'>{GH_TEAM.project_completed_column}</TableCell>
                      <TableCell align='right'>{GH_LABELS.kpi_rpa}</TableCell>
                      <TableCell align='right'>{GH_TEAM.project_review_column}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.members.map(member => {
                      const rpaStatus = getRpaStatus(member.avgRpa)

                      return (
                        <TableRow key={member.memberId}>
                          <TableCell>
                            <Stack direction='row' spacing={1.5} alignItems='center'>
                              <TeamAvatar
                                name={member.displayName}
                                avatarUrl={member.avatarUrl}
                                roleCategory={member.roleCategory}
                                size={32}
                              />
                              <Typography variant='body2'>{member.displayName}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align='right'>{member.activeAssets}</TableCell>
                          <TableCell align='right'>{member.completedAssets}</TableCell>
                          <TableCell align='right'>
                            <Chip
                              size='small'
                              color={rpaStatus.tone === 'default' ? 'default' : rpaStatus.tone}
                              label={member.avgRpa === null ? '--' : member.avgRpa.toFixed(1)}
                              variant='outlined'
                            />
                          </TableCell>
                          <TableCell align='right'>{member.inReview}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          ) : null}

          {!isLoading && !error && (!data || data.members.length === 0) ? (
            <EmptyState icon='tabler-users-group' title={GH_TEAM.project_team_title} description={GH_MESSAGES.empty_team_project} minHeight={180} />
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default ProjectTeamSection
