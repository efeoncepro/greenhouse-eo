'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { SprintTeamVelocitySection } from '@/components/greenhouse'
import { GH_CLIENT_NAV } from '@/config/greenhouse-nomenclature'
import { GH_MESSAGES } from '@/lib/copy/client-portal'

const TASK407_ARIA_BREADCRUMBS = "breadcrumbs"


type GreenhouseSprintDetailProps = {
  sprintId: string
}

const GreenhouseSprintDetail = ({ sprintId }: GreenhouseSprintDetailProps) => {
  return (
    <Stack spacing={6}>
      <Stack spacing={1.5}>
        <Breadcrumbs aria-label={TASK407_ARIA_BREADCRUMBS}>
          <Typography component={Link} href='/home' color='inherit'>
            {GH_CLIENT_NAV.dashboard.label}
          </Typography>
          <Typography component={Link} href='/sprints' color='inherit'>
            {GH_CLIENT_NAV.sprints.label}
          </Typography>
          <Typography color='text.primary'>{sprintId}</Typography>
        </Breadcrumbs>

        <Box>
          <Typography variant='h4'>{GH_CLIENT_NAV.sprints.label}</Typography>
          <Typography color='text.secondary'>{GH_MESSAGES.sprints_team_subtitle}</Typography>
        </Box>
      </Stack>

      <SprintTeamVelocitySection sprintId={sprintId} />
    </Stack>
  )
}

export default GreenhouseSprintDetail
