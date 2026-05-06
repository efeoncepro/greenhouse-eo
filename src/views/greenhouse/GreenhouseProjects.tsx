'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_CLIENT_NAV, GH_LABELS, GH_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { GreenhouseProjectsData } from '@/types/greenhouse-projects'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

const fallbackData: GreenhouseProjectsData = {
  items: [],
  scope: {
    clientId: '',
    projectCount: 0,
    projectIds: []
  }
}

const formatDateRange = (startDate: string | null, endDate: string | null) => {
  if (!startDate && !endDate) {
    return GH_MESSAGES.projects_dates_pending
  }

  const format = (value: string | null) =>
    value ? formatGreenhouseDate(new Date(`${value}T00:00:00`)) : GH_MESSAGES.projects_dates_open

  return `${format(startDate)} - ${format(endDate)}`
}

const GreenhouseProjects = () => {
  const [data, setData] = useState<GreenhouseProjectsData>(fallbackData)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const activeTasks = data.items.reduce((total, project) => total + project.activeTasks, 0)
  const openReviewItems = data.items.reduce((total, project) => total + project.openReviewItems, 0)

  useEffect(() => {
    const controller = new AbortController()

    const loadProjects = async () => {
      try {
        setIsLoading(true)

        const response = await fetch('/api/projects', {
          cache: 'no-store',
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error(`Projects request failed with ${response.status}`)
        }

        const payload = (await response.json()) as GreenhouseProjectsData

        setData(payload)
        setError(null)
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return
        }

        setError(GH_MESSAGES.error_projects_live)
      } finally {
        setIsLoading(false)
      }
    }

    void loadProjects()

    return () => controller.abort()
  }, [])

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>{GH_CLIENT_NAV.projects.label}</Typography>
        <Typography color='text.secondary'>{GH_MESSAGES.subtitle_projects}</Typography>
      </Box>

      {error ? <Alert severity='warning'>{error}</Alert> : null}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }
        }}
      >
        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant='body2' color='text.secondary'>
                {GH_MESSAGES.projects_scope_metric}
              </Typography>
              <Typography variant='h4'>{isLoading ? '--' : data.scope.projectCount}</Typography>
            </Stack>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant='body2' color='text.secondary'>
                {GH_MESSAGES.projects_active_metric}
              </Typography>
              <Typography variant='h4'>{isLoading ? '--' : activeTasks}</Typography>
            </Stack>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant='body2' color='text.secondary'>
                {GH_MESSAGES.projects_review_metric}
              </Typography>
              <Typography variant='h4'>{isLoading ? '--' : openReviewItems}</Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, minmax(0, 1fr))' }
        }}
      >
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Card key={`project-skeleton-${index}`}>
                <CardContent>
                  <Stack spacing={3}>
                    <Skeleton variant='text' width='70%' height={42} />
                    <Skeleton variant='text' width='40%' />
                    <Skeleton variant='rounded' height={120} />
                    <Skeleton variant='rounded' height={10} />
                    <Skeleton variant='rounded' height={40} />
                  </Stack>
                </CardContent>
              </Card>
            ))
          : data.items.map(project => (
              <Card key={project.id}>
                <CardContent>
                  <Stack spacing={3}>
                    <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                      <Box>
                        <Typography variant='h5'>{project.name}</Typography>
                        <Typography color='text.secondary'>{formatDateRange(project.startDate, project.endDate)}</Typography>
                      </Box>
                      <Chip label={project.status} color={project.statusTone} variant='outlined' />
                    </Stack>

                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                      <Box>
                        <Typography variant='body2' color='text.secondary'>
                          {GH_MESSAGES.projects_total_metric}
                        </Typography>
                        <Typography>{project.totalTasks}</Typography>
                      </Box>
                      <Box>
                        <Typography variant='body2' color='text.secondary'>
                          {GH_LABELS.kpi_active}
                        </Typography>
                        <Typography>{project.activeTasks}</Typography>
                      </Box>
                      <Box>
                        <Typography variant='body2' color='text.secondary'>
                          {GH_LABELS.kpi_feedback}
                        </Typography>
                        <Typography>{project.reviewLoad}</Typography>
                      </Box>
                      <Box>
                        <Typography variant='body2' color='text.secondary'>
                          {GH_LABELS.kpi_rpa}
                        </Typography>
                        <Typography>{project.avgRpa.toFixed(2)}</Typography>
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant='body2' color='text.secondary'>
                        {GH_MESSAGES.projects_delivery_label}
                      </Typography>
                      <Typography>{project.completedTasks}</Typography>
                    </Box>

                    <Box>
                      <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                        <Typography variant='body2'>{GH_MESSAGES.projects_progress_label}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {project.progress}%
                        </Typography>
                      </Stack>
                      <LinearProgress variant='determinate' value={project.progress} sx={{ height: 10, borderRadius: 999 }} />
                    </Box>

                    <Button variant='contained' component={Link} href={`/proyectos/${project.id}`}>
                      {GH_MESSAGES.projects_detail_button}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
        {!isLoading && data.items.length === 0 ? (
          <Card sx={{ gridColumn: '1 / -1' }}>
            <CardContent>
              <Typography>{GH_MESSAGES.empty_projects}</Typography>
            </CardContent>
          </Card>
        ) : null}
      </Box>
    </Stack>
  )
}

export default GreenhouseProjects
