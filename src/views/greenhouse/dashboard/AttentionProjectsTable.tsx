'use client'

import Link from '@mui/material/Link'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'

import CustomAvatar from '@core/components/mui/Avatar'
import type { GreenhouseDashboardProjectRisk } from '@/types/greenhouse-dashboard'
import { getProjectTone } from '@views/greenhouse/dashboard/config'
import tableStyles from '@core/styles/table.module.css'

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
  return (
    <Card>
      <CardHeader
        title={title}
        subheader={subtitle}
        action={<Chip size='small' variant='tonal' color='info' label={`${projects.length} proyectos`} />}
      />
      <CardContent sx={{ pt: 0 }}>
        {projects.length === 0 ? (
          <Typography color='text.secondary'>No hay proyectos con datos suficientes para este tenant todavia.</Typography>
        ) : (
          <div className='overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Flow</th>
                  <th>Review</th>
                  <th>Progress</th>
                  <th>Atencion</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr key={project.id}>
                    <td>
                      <div className='flex items-center gap-3'>
                        <CustomAvatar skin='light' color={getProjectTone(project)} size={34}>
                          {getInitials(project.name)}
                        </CustomAvatar>
                        <div className='flex flex-col'>
                          <Typography className='font-medium' color='text.primary'>
                            {project.name}
                          </Typography>
                          <Typography variant='body2'>{project.status}</Typography>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Stack spacing={0.5}>
                        <Typography color='text.primary'>{project.activeWorkItems} activas</Typography>
                        <Typography variant='body2'>{project.queuedWorkItems} en cola</Typography>
                      </Stack>
                    </td>
                    <td>
                      <Stack spacing={0.5}>
                        <Typography color='text.primary'>{project.reviewPressureTasks} con revision</Typography>
                        <Typography variant='body2'>{project.blockedTasks} bloqueadas</Typography>
                      </Stack>
                    </td>
                    <td>
                      <div className='flex items-center gap-3 min-w-[180px]'>
                        <LinearProgress
                          color={getProjectTone(project)}
                          value={project.onTimePct ?? 0}
                          variant='determinate'
                          className='is-20'
                        />
                        <Typography color='text.primary'>
                          {project.onTimePct === null ? 'Sin dato' : `${Math.round(project.onTimePct)}%`}
                        </Typography>
                      </div>
                    </td>
                    <td>
                      <Typography color='text.primary'>{project.attentionScore.toFixed(1)}</Typography>
                    </td>
                    <td>
                      {project.pageUrl ? (
                        <Link href={project.pageUrl} target='_blank' rel='noreferrer' underline='hover'>
                          Abrir
                        </Link>
                      ) : (
                        <Typography variant='body2' color='text.disabled'>
                          Sin link
                        </Typography>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AttentionProjectsTable
