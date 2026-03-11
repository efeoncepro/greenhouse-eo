'use client'

import Link from '@mui/material/Link'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'

import CustomAvatar from '@core/components/mui/Avatar'
import type { GreenhouseDashboardProjectRisk } from '@/types/greenhouse-dashboard'
import { getProjectTone } from '@views/greenhouse/dashboard/config'

type AttentionProjectsTableProps = {
  projects: GreenhouseDashboardProjectRisk[]
  title: string
  subtitle: string
}

const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')

const AttentionProjectsTable = ({ projects, title, subtitle }: AttentionProjectsTableProps) => {
  const averageOnTime =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, project) => sum + (project.onTimePct ?? 0), 0) / Math.max(projects.length, 1)
        )
      : 0

  return (
    <Card>
      <CardHeader
        title={title}
        subheader={projects.length > 0 ? `Promedio ${averageOnTime}% on-time en proyectos priorizados` : subtitle}
        action={<Chip size='small' variant='tonal' color='info' label={`${projects.length} proyectos`} />}
      />
      <CardContent sx={{ pt: 0 }}>
        {projects.length === 0 ? (
          <Typography color='text.secondary'>No hay proyectos con datos suficientes para este tenant todavia.</Typography>
        ) : (
          <Stack spacing={4}>
            {projects.map(project => (
              <Stack key={project.id} direction='row' spacing={2.5} alignItems='center'>
                <CustomAvatar skin='light' color={getProjectTone(project)} size={36}>
                  {getInitials(project.name)}
                </CustomAvatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={{ xs: 1.5, md: 2.5 }}
                    justifyContent='space-between'
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    useFlexGap
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography className='font-medium' color='text.primary'>
                        {project.name}
                      </Typography>
                      <Typography variant='body2'>
                        {project.status} • {project.activeWorkItems} activas • {project.reviewPressureTasks} con revision
                      </Typography>
                    </Box>
                    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                      <Chip size='small' variant='tonal' color='warning' label={`${project.blockedTasks} bloqueadas`} />
                      <Chip size='small' variant='tonal' color='info' label={`${project.queuedWorkItems} en cola`} />
                      <Chip size='small' variant='outlined' color={getProjectTone(project)} label={`Atencion ${project.attentionScore.toFixed(1)}`} />
                    </Stack>
                  </Stack>
                  <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 2 }}>
                    <LinearProgress
                      color={getProjectTone(project)}
                      value={project.onTimePct ?? 0}
                      variant='determinate'
                      className='is-full min-bs-2'
                    />
                    <Typography color='text.disabled' sx={{ minWidth: 48, textAlign: 'right' }}>
                      {project.onTimePct === null ? 'Sin dato' : `${Math.round(project.onTimePct)}%`}
                    </Typography>
                    {project.pageUrl ? (
                      <Link href={project.pageUrl} target='_blank' rel='noreferrer' underline='hover'>
                        Abrir
                      </Link>
                    ) : null}
                  </Stack>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

export default AttentionProjectsTable
