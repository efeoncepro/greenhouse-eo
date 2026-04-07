'use client'

import { useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import type { OrganizationDetailData } from '../types'

interface DeliveryFacet {
  icoMetrics: {
    rpaAvg: number | null
    otdPct: number | null
    throughputCount: number
  } | null
  projectCount: number
  activeProjectCount: number
  sprintCount: number
  taskCounts: {
    total: number
    completed: number
    active: number
    overdue: number
    carryOver: number
  }
}

interface ProjectSummary {
  notionPageId: string
  projectName: string
  status: string
  totalTasks: number
  activeTasks: number
  completedTasks: number
  avgRpa: number
  openReviewItems: number
  pageUrl: string | null
}

interface SpaceProjectGroup {
  spaceId: string
  spaceName: string
  hasNotionSource: boolean
  projects: ProjectSummary[]
  healthScore: number
}

interface ProjectsData {
  spaces: SpaceProjectGroup[]
  totals: {
    totalProjects: number
    activeProjects: number
    totalTasks: number
    activeTasks: number
    completedTasks: number
    avgRpa: number
    overallHealth: 'green' | 'yellow' | 'red'
  }
}

const healthColor = (health: string): 'success' | 'warning' | 'error' => {
  if (health === 'green') return 'success'
  if (health === 'yellow') return 'warning'

  return 'error'
}

const statusColor = (status: string): 'success' | 'warning' | 'info' | 'secondary' => {
  if (['Listo', 'Done', 'Finalizado', 'Completado'].includes(status)) return 'success'
  if (['Cambios Solicitados', 'Listo para revisión', 'Listo para revision'].includes(status)) return 'warning'
  if (status === 'En curso') return 'info'

  return 'secondary'
}

type Props = {
  detail: OrganizationDetailData
}

const OrganizationProjectsTab = ({ detail }: Props) => {
  const [data, setData] = useState<ProjectsData | null>(null)
  const [delivery360, setDelivery360] = useState<DeliveryFacet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      try {
        // Fetch both: 360 delivery facet (aggregate counts) + legacy projects (detailed per-project)
        const [res360, resLegacy] = await Promise.all([
          fetch(`/api/organization/${detail.organizationId}/360?facets=delivery`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/organizations/${detail.organizationId}/projects`).then(r => r.ok ? r.json() : null).catch(() => null)
        ])

        if (res360?.delivery) setDelivery360(res360.delivery)
        if (resLegacy) setData(resLegacy)
      } catch {
        // Non-blocking
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [detail.organizationId])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  // Use 360 delivery counts as source of truth for totals; fall back to legacy data for per-project detail
  const totalProjects = delivery360?.projectCount ?? data?.totals?.totalProjects ?? 0
  const hasProjects = totalProjects > 0
  const hasDetailedProjects = data && data.totals.totalProjects > 0

  if (!hasProjects) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>Sin proyectos</Typography>
            <Typography variant='body2' color='text.secondary'>
              No hay proyectos registrados para {detail.organizationName}.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  // Resolved KPI values — prefer 360 data for counts, legacy for detail
  const activeProjects = delivery360?.activeProjectCount ?? data?.totals?.activeProjects ?? 0
  const totalTasks = delivery360?.taskCounts?.total ?? data?.totals?.totalTasks ?? 0
  const activeTasks = delivery360?.taskCounts?.active ?? data?.totals?.activeTasks ?? 0
  const completedTasks = delivery360?.taskCounts?.completed ?? data?.totals?.completedTasks ?? 0
  const avgRpa = delivery360?.icoMetrics?.rpaAvg ?? data?.totals?.avgRpa ?? 0
  const overallHealth = data?.totals?.overallHealth ?? (avgRpa >= 70 ? 'green' : avgRpa >= 40 ? 'yellow' : 'red')
  const spaceCount = data?.spaces?.length ?? (detail.spaces?.length ?? 0)

  return (
    <Grid container spacing={6}>
      {/* KPI row */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Proyectos totales'
          stats={String(totalProjects)}
          subtitle={`${activeProjects} activo${activeProjects !== 1 ? 's' : ''}`}
          avatarIcon='tabler-folders'
          avatarColor='primary'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Tasks totales'
          stats={String(totalTasks)}
          subtitle={`${activeTasks} activas · ${completedTasks} completadas`}
          avatarIcon='tabler-list-check'
          avatarColor='info'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='RPA promedio'
          stats={avgRpa ? `${Math.round(avgRpa)}%` : '—'}
          subtitle='Rendimiento por asignación'
          avatarIcon='tabler-chart-line'
          avatarColor={healthColor(overallHealth)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Health general'
          stats={overallHealth === 'green' ? 'Óptimo' : overallHealth === 'yellow' ? 'Atención' : 'Crítico'}
          subtitle={`${spaceCount} Space${spaceCount !== 1 ? 's' : ''}`}
          avatarIcon='tabler-heart-rate-monitor'
          avatarColor={healthColor(overallHealth)}
        />
      </Grid>

      {/* Project detail tables (from legacy endpoint, if available) */}
      {!hasDetailedProjects && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant='body2' color='text.secondary'>
                  {totalProjects} proyecto{totalProjects !== 1 ? 's' : ''} registrado{totalProjects !== 1 ? 's' : ''} — el detalle por proyecto estará disponible cuando se configuren las fuentes de Notion.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {hasDetailedProjects && data!.spaces.map(space => (
        <Grid size={{ xs: 12 }} key={space.spaceId}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title={space.spaceName}
              subheader={space.hasNotionSource
                ? `${space.projects.length} proyecto${space.projects.length !== 1 ? 's' : ''} · Health: ${space.healthScore}%`
                : 'Sin fuente de Notion configurada'}
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                  <i className='tabler-folder' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                </Avatar>
              }
            />
            {space.projects.length > 0 && (
              <>
                <Divider />
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Proyecto</TableCell>
                        <TableCell align='center'>Estado</TableCell>
                        <TableCell align='right'>Tasks</TableCell>
                        <TableCell align='right'>Activas</TableCell>
                        <TableCell align='right'>RPA</TableCell>
                        <TableCell align='right'>Revisiones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {space.projects.map(p => (
                        <TableRow key={p.notionPageId} hover>
                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>{p.projectName}</Typography>
                          </TableCell>
                          <TableCell align='center'>
                            <CustomChip
                              round='true'
                              size='small'
                              variant='tonal'
                              color={statusColor(p.status)}
                              label={p.status}
                            />
                          </TableCell>
                          <TableCell align='right'>{p.totalTasks}</TableCell>
                          <TableCell align='right'>{p.activeTasks}</TableCell>
                          <TableCell align='right'>
                            <CustomChip
                              round='true'
                              size='small'
                              variant='tonal'
                              color={p.avgRpa >= 70 ? 'success' : p.avgRpa >= 40 ? 'warning' : 'error'}
                              label={`${Math.round(p.avgRpa)}%`}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            {p.openReviewItems > 0 ? (
                              <CustomChip round='true' size='small' variant='tonal' color='warning' label={String(p.openReviewItems)} />
                            ) : (
                              <Typography variant='body2' color='text.secondary'>0</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default OrganizationProjectsTab
