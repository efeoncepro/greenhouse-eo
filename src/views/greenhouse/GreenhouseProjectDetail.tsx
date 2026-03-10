'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import type { GreenhouseProjectDetailData, GreenhouseProjectTasksData } from '@/types/greenhouse-project-detail'

interface Props {
  projectId: string
}

const formatDateLabel = (value: string | null, options?: Intl.DateTimeFormatOptions) => {
  if (!value) {
    return 'Not set'
  }

  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)

  return date.toLocaleString(undefined, options)
}

const formatDateRange = (startDate: string | null, endDate: string | null) => {
  if (!startDate && !endDate) {
    return 'Dates not set yet'
  }

  return `${formatDateLabel(startDate, { month: 'short', day: 'numeric', year: 'numeric' })} - ${formatDateLabel(endDate, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}`
}

const GreenhouseProjectDetail = ({ projectId }: Props) => {
  const [detail, setDetail] = useState<GreenhouseProjectDetailData | null>(null)
  const [tasks, setTasks] = useState<GreenhouseProjectTasksData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const loadProject = async () => {
      try {
        setIsLoading(true)

        const [detailResponse, tasksResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}`, {
            cache: 'no-store',
            signal: controller.signal
          }),
          fetch(`/api/projects/${projectId}/tasks`, {
            cache: 'no-store',
            signal: controller.signal
          })
        ])

        if (!detailResponse.ok || !tasksResponse.ok) {
          throw new Error(`Project detail request failed with ${detailResponse.status}/${tasksResponse.status}`)
        }

        const [detailPayload, tasksPayload] = (await Promise.all([
          detailResponse.json(),
          tasksResponse.json()
        ])) as [GreenhouseProjectDetailData, GreenhouseProjectTasksData]

        setDetail(detailPayload)
        setTasks(tasksPayload)
        setError(null)
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return
        }

        setError('The project detail view could not load tenant-scoped data from BigQuery.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadProject()

    return () => controller.abort()
  }, [projectId])

  return (
    <Stack spacing={6}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }} gap={3}>
        <Box>
          <Button component={Link} href='/proyectos' variant='text' sx={{ px: 0, minWidth: 0, mb: 1 }}>
            Back to projects
          </Button>
          <Typography variant='h4'>{detail?.project.name || 'Project detail'}</Typography>
          <Typography color='text.secondary'>
            {detail
              ? `Tenant-scoped execution, review pressure, and sprint context for project ${detail.project.id}.`
              : 'Loading scoped project metrics and task data.'}
          </Typography>
        </Box>

        {detail?.project.pageUrl ? (
          <Button component='a' href={detail.project.pageUrl} target='_blank' rel='noreferrer' variant='outlined'>
            Open source workspace
          </Button>
        ) : null}
      </Stack>

      {isLoading ? <LinearProgress sx={{ borderRadius: 999 }} /> : null}
      {error ? <Alert severity='warning'>{error}</Alert> : null}

      {detail ? (
        <>
          <Card sx={{ overflow: 'hidden' }}>
            <CardContent
              sx={{
                p: { xs: 4, md: 6 },
                background:
                  'linear-gradient(135deg, rgba(34,197,94,0.14) 0%, rgba(59,130,246,0.12) 45%, rgba(15,23,42,0) 100%)'
              }}
            >
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' gap={2}>
                  <Box>
                    <Stack direction='row' alignItems='center' gap={1.5} sx={{ mb: 1 }}>
                      <Chip label={detail.project.status} color={detail.project.statusTone} variant='outlined' />
                      <Chip label={`Review load: ${detail.project.reviewLoad}`} color='default' variant='outlined' />
                    </Stack>
                    <Typography variant='h3'>{detail.project.name}</Typography>
                    <Typography color='text.secondary' sx={{ maxWidth: 760 }}>
                      {detail.project.summary || 'This project does not have a summary yet. Execution context is derived from live task data.'}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: { md: 260 } }}>
                    <Typography variant='body2' color='text.secondary'>
                      Delivery window
                    </Typography>
                    <Typography sx={{ mb: 2 }}>{formatDateRange(detail.project.startDate, detail.project.endDate)}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      On-time execution
                    </Typography>
                    <Typography variant='h4'>{detail.project.progress}%</Typography>
                  </Box>
                </Stack>

                <Box>
                  <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                    <Typography variant='body2'>On-time execution</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {detail.project.progress}%
                    </Typography>
                  </Stack>
                  <LinearProgress variant='determinate' value={detail.project.progress} sx={{ height: 12, borderRadius: 999 }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
            }}
          >
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>
                  Total tasks
                </Typography>
                <Typography variant='h4'>{detail.project.totalTasks}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>
                  Active tasks
                </Typography>
                <Typography variant='h4'>{detail.project.activeTasks}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>
                  Open review items
                </Typography>
                <Typography variant='h4'>{detail.project.openReviewItems}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>
                  Blocked tasks
                </Typography>
                <Typography variant='h4'>{detail.project.blockedTasks}</Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.7fr 1fr' } }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant='h5'>Tasks in scope</Typography>
                    <Typography color='text.secondary'>
                      Sorted by most recently edited task. Review flags and blockers are computed from the live task rows.
                    </Typography>
                  </Box>

                  <TableContainer>
                    <Table sx={{ minWidth: 760 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Task</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align='right'>RpA</TableCell>
                          <TableCell align='right'>Versions</TableCell>
                          <TableCell align='right'>Comments</TableCell>
                          <TableCell>Review</TableCell>
                          <TableCell>Last update</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tasks?.items.map(task => (
                          <TableRow key={task.id} hover>
                            <TableCell>
                              <Stack spacing={0.75}>
                                {task.pageUrl ? (
                                  <Typography
                                    component='a'
                                    href={task.pageUrl}
                                    target='_blank'
                                    rel='noreferrer'
                                    sx={{ color: 'primary.main', fontWeight: 500 }}
                                  >
                                    {task.name}
                                  </Typography>
                                ) : (
                                  <Typography sx={{ fontWeight: 500 }}>{task.name}</Typography>
                                )}
                                <Typography variant='body2' color='text.secondary'>
                                  {task.sprintName || 'No sprint assigned'}
                                </Typography>
                                {task.lastFrameComment ? (
                                  <Typography variant='caption' color='text.secondary'>
                                    Last comment: {task.lastFrameComment}
                                  </Typography>
                                ) : null}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip label={task.status} color={task.statusTone} variant='outlined' />
                            </TableCell>
                            <TableCell align='right'>{task.rpa.toFixed(2)}</TableCell>
                            <TableCell align='right'>{task.frameVersions}</TableCell>
                            <TableCell align='right'>{task.frameComments}</TableCell>
                            <TableCell>
                              <Stack direction='row' flexWrap='wrap' gap={1}>
                                {task.reviewOpen ? <Chip label='Open review' color='warning' size='small' /> : null}
                                {task.blocked ? <Chip label='Blocked' color='error' size='small' /> : null}
                                {!task.reviewOpen && !task.blocked ? <Chip label='Clear' color='success' size='small' /> : null}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{formatDateLabel(task.lastEditedAt, { dateStyle: 'medium', timeStyle: 'short' })}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {!tasks || tasks.items.length === 0 ? (
                    <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px dashed ${theme.palette.divider}` }}>
                      <Typography>No task rows were returned for this project yet.</Typography>
                    </Box>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            <Stack spacing={3}>
              <Card>
                <CardContent>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant='h5'>Review pressure</Typography>
                      <Typography color='text.secondary'>
                        Use this slice to decide whether the next client conversation should focus on approvals, rework, or unblockers.
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'grid', gap: 2 }}>
                      <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                        <Typography variant='body2' color='text.secondary'>
                          Tasks with open reviews
                        </Typography>
                        <Typography variant='h4'>{detail.reviewPressure.tasksWithOpenReviews}</Typography>
                      </Box>
                      <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                        <Typography variant='body2' color='text.secondary'>
                          Ready for review
                        </Typography>
                        <Typography variant='h4'>{detail.reviewPressure.tasksReadyForReview}</Typography>
                      </Box>
                      <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                        <Typography variant='body2' color='text.secondary'>
                          In client changes
                        </Typography>
                        <Typography variant='h4'>{detail.reviewPressure.tasksInClientChanges}</Typography>
                      </Box>
                      <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                        <Typography variant='body2' color='text.secondary'>
                          Blocked tasks
                        </Typography>
                        <Typography variant='h4'>{detail.reviewPressure.tasksBlocked}</Typography>
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant='h5'>Sprint context</Typography>
                      <Typography color='text.secondary'>
                        The active sprint section appears only when task rows carry sprint assignments for this project.
                      </Typography>
                    </Box>

                    {detail.sprint ? (
                      <>
                        <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                          <Box>
                            <Typography variant='h6'>{detail.sprint.name}</Typography>
                            <Typography color='text.secondary'>
                              {formatDateRange(detail.sprint.startDate, detail.sprint.endDate)}
                            </Typography>
                          </Box>
                          <Chip label={detail.sprint.status} color='info' variant='outlined' />
                        </Stack>

                        <Box>
                          <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                            <Typography variant='body2'>Sprint completion</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {detail.sprint.progress}%
                            </Typography>
                          </Stack>
                          <LinearProgress variant='determinate' value={detail.sprint.progress} sx={{ height: 10, borderRadius: 999 }} />
                        </Box>

                        <Divider />

                        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                          <Box>
                            <Typography variant='body2' color='text.secondary'>
                              Tasks in sprint
                            </Typography>
                            <Typography variant='h5'>{detail.sprint.totalTasks}</Typography>
                          </Box>
                          <Box>
                            <Typography variant='body2' color='text.secondary'>
                              Completed
                            </Typography>
                            <Typography variant='h5'>{detail.sprint.completedTasks}</Typography>
                          </Box>
                        </Box>

                        {detail.sprint.pageUrl ? (
                          <Button component='a' href={detail.sprint.pageUrl} target='_blank' rel='noreferrer' variant='text' sx={{ px: 0, minWidth: 0 }}>
                            Open sprint source
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px dashed ${theme.palette.divider}` }}>
                        <Typography>No sprint assignment is available for this project yet.</Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        </>
      ) : null}
    </Stack>
  )
}

export default GreenhouseProjectDetail
