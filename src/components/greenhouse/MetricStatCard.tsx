'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { GreenhouseKpiTone } from '@/types/greenhouse-dashboard'

type MetricStatCardProps = {
  chipLabel: string
  chipTone: GreenhouseKpiTone
  title?: string
  value: string
  detail: string
}

const MetricStatCard = ({ chipLabel, chipTone, title, value, detail }: MetricStatCardProps) => {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Chip label={chipLabel} color={chipTone} variant='outlined' sx={{ width: 'fit-content' }} />
          {title ? <Typography variant='h5'>{title}</Typography> : null}
          <Typography variant='h3'>{value}</Typography>
          <Typography color='text.secondary'>{detail}</Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default MetricStatCard
