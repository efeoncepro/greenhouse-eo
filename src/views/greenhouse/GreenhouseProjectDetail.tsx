'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
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

import { EmptyState, ProjectTeamSection } from '@/components/greenhouse'
import { GH_CLIENT_NAV, GH_LABELS, GH_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { GreenhouseProjectDetailData, GreenhouseProjectTasksData } from '@/types/greenhouse-project-detail'

const TASK407_ARIA_BREADCRUMBS = "breadcrumbs"


interface Props {
  projectId: string
}

const formatDateLabel = (value: string | null, options?: Intl.DateTimeFormatOptions) => {
  if (!value) {
    return GH_MESSAGES.projects_dates_pending
  }

  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)

  return date.toLocaleString(undefined, options)
}

const formatDateRange = (startDate: string | null, endDate: string | null) => {
  if (!startDate && !endDate) {
    return GH_MESSAGES.projects_dates_pending
  }

  const format = (value: string | null) =>
    value ? formatDateLabel(value, { month: 'short', day: 'numeric', year: 'numeric' }) : GH_MESSAGES.projects_dates_open

  return `${format(startDate)} - ${format(endDate)}`
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

        setError(GH_MESSAGES.error_project_detail)
      } finally {
        setIsLoading(false)
      }
    }

    void loadProject()

    return () => controller.abort()
  }, [projectId])

  return (
    <Stack spacing={6}>
      <Stack spacing={1.5}>
        <Breadcrumbs aria-label={TASK407_ARIA_BREADCRUMBS}>
          <Typography component={Link} href='/home' color='inherit'>
            {GH_CLIENT_NAV.dashboard.label}
          </Typography>
          <Typography component={Link} href='/proyectos' color='inherit'>
            {GH_CLIENT_NAV.projects.label}
          </Typography>
          <Typography color='text.primary'>{detail?.project.name || '...'}</Typography>
        </Breadcrumbs>

        <Box>
          <Button component={Link} href='/proyectos' variant='text' sx={{ px: 0, minWidth: 0, mb: 1 }}>
            {GH_MESSAGES.project_back}
          </Button>
          <Typography variant='h4'>{detail?.project.name || GH_CLIENT_NAV.projects.label}</Typography>
          <Typography color='text.secondary'>
            {detail ? detail.project.summary || GH_MESSAGES.project_summary_empty : GH_MESSAGES.loading_data}
          </Typography>
        </Box>
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
                  'linear-gradient(135deg, rgba(2,60,112,0.12) 0%, rgba(3,117,219,0.1) 42%, rgba(15,23,42,0) 100%)'
              }}
            >
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' gap={2}>
                  <Box>
                    <Stack direction='row' alignItems='center' gap={1.5} sx={{ mb: 1 }} flexWrap='wrap'>
                      <Chip label={detail.project.status} color={detail.project.statusTone} variant='outlined' />
                      <Chip label={`${GH_LABELS.kpi_feedback}: ${detail.project.reviewLoad}`} color='default' variant='outlined' />
                    </Stack>
                    <Typography variant='h3'>{detail.project.name}</Typography>
                  </Box>

                  <Box sx={{ minWidth: { md: 260 } }}>
                    <Typography variant='body2' color='text.secondary'>
                      {GH_MESSAGES.project_delivery_window}
                    </Typography>
                    <Typography sx={{ mb: 2 }}>{formatDateRange(detail.project.startDate, detail.project.endDate)}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {GH_MESSAGES.project_status_summary}
                    </Typography>
                    <Typography variant='h4'>{detail.project.progress}%</Typography>
                  </Box>
                </Stack>

                <Box>
                  <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                    <Typography variant='body2'>{GH_MESSAGES.projects_progress_label}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {detail.project.progress}%
                    </Typography>
                  </Stack>
                  <LinearProgress variant='determinate' value={detail.project.progress} sx={{ height: 12, borderRadius: 999 }} />
                </Box>

                {detail.project.pageUrl ? (
                  <Button component='a' href={detail.project.pageUrl} target='_blank' rel='noreferrer' variant='outlined' sx={{ alignSelf: 'flex-start' }}>
                    {GH_MESSAGES.project_workspace_button}
                  </Button>
                ) : null}
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
            {[
              [GH_MESSAGES.projects_total_metric, detail.project.totalTasks],
              [GH_LABELS.kpi_active, detail.project.activeTasks],
              [GH_LABELS.kpi_feedback, detail.project.openReviewItems],
              [GH_LABELS.kpi_rpa, detail.project.avgRpa.toFixed(2)]
            ].map(([label, value]) => (
              <Card key={label}>
                <CardContent>
                  <Typography variant='body2' color='text.secondary'>
                    {label}
                  </Typography>
                  <Typography variant='h4'>{value}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <ProjectTeamSection projectId={projectId} />

          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.7fr 1fr' } }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant='h5'>{GH_MESSAGES.project_assets_title}</Typography>
                    <Typography color='text.secondary'>{GH_MESSAGES.project_assets_subtitle}</Typography>
                  </Box>

                  {tasks && tasks.items.length > 0 ? (
                    <TableContainer>
                      <Table sx={{ minWidth: 760 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>{GH_LABELS.col_asset}</TableCell>
                            <TableCell>{GH_LABELS.col_status}</TableCell>
                            <TableCell align='right'>RpA</TableCell>
                            <TableCell align='right'>{GH_LABELS.col_rounds}</TableCell>
                            <TableCell align='right'>{GH_LABELS.col_feedback}</TableCell>
                            <TableCell>{GH_LABELS.col_review}</TableCell>
                            <TableCell>{GH_LABELS.col_last_activity}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tasks.items.map(task => (
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
                                    {task.sprintName || GH_MESSAGES.project_task_cycle_unassigned}
                                  </Typography>
                                  {task.lastFrameComment ? (
                                    <Typography variant='caption' color='text.secondary'>
                                      {GH_MESSAGES.project_last_comment_prefix}: {task.lastFrameComment}
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
                                  {task.reviewOpen ? <Chip label={GH_MESSAGES.project_review_open_chip} color='warning' size='small' /> : null}
                                  {task.blocked ? <Chip label={GH_MESSAGES.project_review_blocked_chip} color='error' size='small' /> : null}
                                  {!task.reviewOpen && !task.blocked ? (
                                    <Chip label={GH_MESSAGES.project_review_clear_chip} color='success' size='small' />
                                  ) : null}
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
                  ) : (
                    <EmptyState icon='tabler-folders' title={GH_MESSAGES.project_assets_title} description={GH_MESSAGES.empty_project_assets} minHeight={220} />
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Stack spacing={3}>
              <Card>
                <CardContent>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant='h5'>{GH_MESSAGES.project_review_title}</Typography>
                      <Typography color='text.secondary'>{GH_MESSAGES.project_review_subtitle}</Typography>
                    </Box>

                    <Box sx={{ display: 'grid', gap: 2 }}>
                      {[
                        [GH_MESSAGES.project_review_open, detail.reviewPressure.tasksWithOpenReviews],
                        [GH_MESSAGES.project_review_ready, detail.reviewPressure.tasksReadyForReview],
                        [GH_MESSAGES.project_review_changes, detail.reviewPressure.tasksInClientChanges],
                        [GH_MESSAGES.project_review_blocked, detail.reviewPressure.tasksBlocked]
                      ].map(([label, value]) => (
                        <Box key={label} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                          <Typography variant='body2' color='text.secondary'>
                            {label}
                          </Typography>
                          <Typography variant='h4'>{value}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant='h5'>{GH_MESSAGES.project_cycle_title}</Typography>
                      <Typography color='text.secondary'>{GH_MESSAGES.project_cycle_subtitle}</Typography>
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
                            <Typography variant='body2'>{GH_MESSAGES.project_cycle_progress}</Typography>
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
                              {GH_MESSAGES.project_cycle_assets}
                            </Typography>
                            <Typography variant='h5'>{detail.sprint.totalTasks}</Typography>
                          </Box>
                          <Box>
                            <Typography variant='body2' color='text.secondary'>
                              {GH_MESSAGES.project_cycle_completed}
                            </Typography>
                            <Typography variant='h5'>{detail.sprint.completedTasks}</Typography>
                          </Box>
                        </Box>

                        <Stack direction='row' spacing={2} flexWrap='wrap'>
                          <Button component={Link} href={`/sprints/${detail.sprint.id}`} variant='text' sx={{ px: 0, minWidth: 0 }}>
                            {GH_MESSAGES.project_cycle_detail}
                          </Button>
                          {detail.sprint.pageUrl ? (
                            <Button component='a' href={detail.sprint.pageUrl} target='_blank' rel='noreferrer' variant='text' sx={{ px: 0, minWidth: 0 }}>
                              {GH_MESSAGES.project_cycle_source}
                            </Button>
                          ) : null}
                        </Stack>
                      </>
                    ) : (
                      <EmptyState icon='tabler-timeline' title={GH_LABELS.sprint_active} description={GH_MESSAGES.empty_project_cycle} minHeight={220} />
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
