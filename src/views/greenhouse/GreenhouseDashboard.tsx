'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'

const fallbackDashboardData: GreenhouseDashboardData = {
  kpis: [
    { label: 'Average RpA', value: '--', detail: 'Loading scoped metrics from BigQuery', tone: 'success' },
    { label: 'Active tasks', value: '--', detail: 'Loading current workload', tone: 'warning' },
    { label: 'Completed tasks', value: '--', detail: 'Loading completion signal', tone: 'info' },
    { label: 'Open review items', value: '--', detail: 'Loading review pressure', tone: 'error' }
  ],
  statusRows: [
    { label: 'In progress', value: 0, color: 'success.main' },
    { label: 'Ready for review', value: 0, color: 'warning.main' },
    { label: 'Client changes', value: 0, color: 'error.main' },
    { label: 'Queued next', value: 0, color: 'info.main' }
  ],
  projects: [],
  summary: {
    completionRate: 0
  },
  scope: {
    clientId: '',
    projectCount: 0,
    projectIds: [],
    lastSyncedAt: null
  }
}

const GreenhouseDashboard = () => {
  const [data, setData] = useState<GreenhouseDashboardData>(fallbackDashboardData)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const loadDashboard = async () => {
      try {
        setIsLoading(true)

        const response = await fetch('/api/dashboard/kpis', {
          cache: 'no-store',
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error(`Dashboard request failed with ${response.status}`)
        }

        const payload = (await response.json()) as GreenhouseDashboardData

        setData(payload)
        setError(null)
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return
        }

        setError('The dashboard could not load live metrics from BigQuery.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadDashboard()

    return () => controller.abort()
  }, [])

  const syncedAtLabel = data.scope.lastSyncedAt
    ? new Date(data.scope.lastSyncedAt).toLocaleString()
    : 'Waiting for the first successful sync'

  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(34,197,94,0.16) 0%, rgba(16,185,129,0.12) 35%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2}>
            <Chip label='Greenhouse overview' color='success' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>Client visibility that shows where delivery is smooth and where it is not.</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 780 }}>
              This dashboard now reads scoped project metrics from BigQuery. Current tenant scope: {data.scope.projectCount}{' '}
              projects, last sync {syncedAtLabel}.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {error ? <Alert severity='warning'>{error}</Alert> : null}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        {data.kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent>
              <Stack spacing={2}>
                <Chip label={kpi.label} color={kpi.tone} variant='outlined' sx={{ width: 'fit-content' }} />
                <Typography variant='h3'>{kpi.value}</Typography>
                <Typography color='text.secondary'>{kpi.detail}</Typography>
                {isLoading ? <LinearProgress color={kpi.tone} sx={{ borderRadius: 999 }} /> : null}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.3fr 1fr' } }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='h5'>Portfolio activity</Typography>
              <Typography color='text.secondary'>
                Current workload distribution across live Notion task states for the projects in this client scope.
              </Typography>
              <Stack spacing={2.5}>
                {data.statusRows.map(row => (
                  <Box key={row.label}>
                    <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                      <Typography>{row.label}</Typography>
                      <Typography color='text.secondary'>{row.value} tasks</Typography>
                    </Stack>
                    <LinearProgress
                      variant='determinate'
                      value={Math.min(row.value * 8, 100)}
                      sx={{
                        height: 10,
                        borderRadius: 999,
                        '& .MuiLinearProgress-bar': { backgroundColor: row.color }
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='h5'>Sprint signal</Typography>
              <Typography color='text.secondary'>
                This slice is already live. The next layer is sprint-specific velocity, blockers, and unresolved comments
                per project.
              </Typography>
              <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'action.hover' }}>
                <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                  <Typography variant='body2'>Sprint completion</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {data.summary.completionRate}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant='determinate'
                  value={data.summary.completionRate}
                  sx={{ height: 12, borderRadius: 999 }}
                />
              </Box>
              <Divider />
              <Stack spacing={1.5}>
                <Typography variant='body2' color='text.secondary'>
                  Immediate attention
                </Typography>
                <Typography>
                  Open review pressure is now computed from live task data instead of static demo numbers.
                </Typography>
                <Typography color='text.secondary'>
                  Next action: surface late-review tasks, blocked tasks, and unresolved comments in project detail.
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant='h5'>Projects under watch</Typography>
            <Box sx={{ display: 'grid', gap: 2 }}>
              {data.projects.map(project => (
                <Box
                  key={project.id}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: theme => `1px solid ${theme.palette.divider}`,
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr auto' },
                    alignItems: 'center'
                  }}
                >
                  <Box>
                    <Typography variant='h6'>{project.name}</Typography>
                    <Typography color='text.secondary'>{project.activeTasks} active tasks in scope</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Average RpA
                    </Typography>
                    <Typography variant='h6'>{project.avgRpa.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ minWidth: { xs: '100%', md: 180 } }}>
                    <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                      <Typography variant='body2'>On-time execution</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {project.progress}%
                      </Typography>
                    </Stack>
                    <LinearProgress variant='determinate' value={project.progress} sx={{ height: 10, borderRadius: 999 }} />
                  </Box>
                </Box>
              ))}
              {!isLoading && data.projects.length === 0 ? (
                <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px dashed ${theme.palette.divider}` }}>
                  <Typography>No scoped projects returned data yet.</Typography>
                </Box>
              ) : null}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default GreenhouseDashboard
