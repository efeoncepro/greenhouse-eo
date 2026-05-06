'use client'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_MESSAGES } from '@/lib/copy/client-portal'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'

type ClientPortfolioHealthAccordionProps = {
  data: GreenhouseDashboardData
}

const ClientPortfolioHealthAccordion = ({ data }: ClientPortfolioHealthAccordionProps) => {
  const alertsOpen = data.summary.openFrameComments > 0 || data.summary.projectsAtRisk > 0

  return (
    <Accordion defaultExpanded={alertsOpen}>
      <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', md: 'center' }}
          sx={{ width: '100%' }}
          gap={1.5}
        >
          <Box>
            <Typography variant='h6'>{GH_MESSAGES.portfolio_title}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {GH_MESSAGES.portfolio_summary(data.summary.healthyProjects, data.summary.projectsAtRisk)}
            </Typography>
          </Box>
          <Stack direction='row' gap={1} flexWrap='wrap'>
            <Chip size='small' variant='tonal' color='success' label={GH_MESSAGES.portfolio_healthy_chip(data.summary.healthyProjects)} />
            <Chip size='small' variant='tonal' color='warning' label={GH_MESSAGES.portfolio_risk_chip(data.summary.projectsAtRisk)} />
            <Chip size='small' variant='outlined' color='info' label={GH_MESSAGES.portfolio_feedback_chip(data.summary.openFrameComments)} />
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }
          }}
        >
          {[
            [GH_MESSAGES.portfolio_metric_otd, `${data.summary.avgOnTimePct}%`, GH_MESSAGES.portfolio_metric_otd_detail],
            [GH_MESSAGES.portfolio_metric_delivered, String(data.summary.completedLast30Days), GH_MESSAGES.portfolio_metric_delivered_detail],
            [GH_MESSAGES.portfolio_metric_feedback, String(data.summary.openFrameComments), GH_MESSAGES.portfolio_metric_feedback_detail]
          ].map(([label, value, detail]) => (
            <Box
              key={label}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: theme => `1px solid ${theme.palette.divider}`
              }}
            >
              <Typography variant='body2' color='text.secondary'>
                {label}
              </Typography>
              <Typography variant='h4' sx={{ mt: 1 }}>
                {value}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                {detail}
              </Typography>
            </Box>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}

export default ClientPortfolioHealthAccordion
