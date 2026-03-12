'use client'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { GreenhouseDashboardProjectRisk } from '@/types/greenhouse-dashboard'
import { getProjectAttentionLabel } from '@views/greenhouse/dashboard/helpers'

type ClientAttentionProjectsAccordionProps = {
  projects: GreenhouseDashboardProjectRisk[]
}

const ClientAttentionProjectsAccordion = ({ projects }: ClientAttentionProjectsAccordionProps) => {
  const alertProjects = projects.filter(
    project => project.blockedTasks > 0 || project.reviewPressureTasks > 0 || (project.onTimePct ?? 100) < 90
  )

  return (
    <Accordion defaultExpanded={alertProjects.length > 0}>
      <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', md: 'center' }}
          sx={{ width: '100%' }}
          gap={1.5}
        >
          <Box>
            <Typography variant='h6'>Proyectos bajo atención</Typography>
            <Typography variant='body2' color='text.secondary'>
              {getProjectAttentionLabel(alertProjects.length)}
            </Typography>
          </Box>
          <Chip size='small' variant='outlined' color={alertProjects.length > 0 ? 'warning' : 'success'} label={`${alertProjects.length} alertas`} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {alertProjects.length === 0 ? (
          <Typography color='text.secondary'>Todos los proyectos operan normalmente.</Typography>
        ) : (
          <Stack spacing={2.5}>
            {alertProjects.map(project => (
              <Box
                key={project.id}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  display: 'grid',
                  gap: 1.5
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' gap={1.5}>
                  <Box>
                    <Typography variant='h6'>{project.name}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {project.status}
                    </Typography>
                  </Box>
                  <Stack direction='row' gap={1} flexWrap='wrap'>
                    {project.blockedTasks > 0 ? <Chip size='small' variant='tonal' color='error' label={`${project.blockedTasks} bloqueadas`} /> : null}
                    {project.reviewPressureTasks > 0 ? (
                      <Chip size='small' variant='tonal' color='warning' label={`${project.reviewPressureTasks} en revisión`} />
                    ) : null}
                    <Chip size='small' variant='outlined' color='info' label={`OTD ${project.onTimePct === null ? 'Sin dato' : `${Math.round(project.onTimePct)}%`}`} />
                  </Stack>
                </Stack>

                {project.pageUrl ? (
                  <Link href={project.pageUrl} target='_blank' rel='noreferrer' underline='hover'>
                    Abrir proyecto
                  </Link>
                ) : null}
              </Box>
            ))}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

export default ClientAttentionProjectsAccordion
