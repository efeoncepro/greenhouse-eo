'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { GreenhouseDashboardProjectRisk } from '@/types/greenhouse-dashboard'
import { getProjectTone } from '@views/greenhouse/dashboard/config'

type AttentionProjectCardProps = {
  project: GreenhouseDashboardProjectRisk
}

const AttentionProjectCard = ({ project }: AttentionProjectCardProps) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr 1fr auto' },
        alignItems: 'center'
      }}
    >
      <Stack spacing={0.75}>
        <Stack direction='row' flexWrap='wrap' gap={1} alignItems='center'>
          <Typography variant='h6'>{project.name}</Typography>
          <Chip size='small' label={project.status} color={getProjectTone(project)} variant='outlined' />
        </Stack>
        <Typography color='text.secondary'>
          {project.activeWorkItems} activas, {project.reviewPressureTasks} con revision abierta, {project.blockedTasks} bloqueadas.
        </Typography>
        {project.pageUrl ? (
          <Link href={project.pageUrl} target='_blank' rel='noreferrer' underline='hover'>
            Abrir origen en Notion
          </Link>
        ) : null}
      </Stack>
      <Box>
        <Typography variant='body2' color='text.secondary'>
          On-time
        </Typography>
        <Typography variant='h6'>{project.onTimePct === null ? 'Sin dato' : `${Math.round(project.onTimePct)}%`}</Typography>
      </Box>
      <Box>
        <Typography variant='body2' color='text.secondary'>
          Score de atencion
        </Typography>
        <Typography variant='h6'>{project.attentionScore.toFixed(1)}</Typography>
      </Box>
      <Stack direction='row' gap={1} flexWrap='wrap' justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
        <Chip size='small' variant='tonal' color='warning' label={`${project.queuedWorkItems} en cola`} />
        <Chip size='small' variant='tonal' color='info' label={`${project.openFrameComments} comments`} />
      </Stack>
    </Box>
  )
}

export default AttentionProjectCard
