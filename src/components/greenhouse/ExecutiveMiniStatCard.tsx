'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import type { GreenhouseKpiTone } from '@/types/greenhouse-dashboard'

type SupportItem = {
  label: string
  value: string
}

type ExecutiveMiniStatCardProps = {
  eyebrow?: string
  tone?: GreenhouseKpiTone
  title: string
  value: string
  detail: string
  supportItems?: SupportItem[]
}

const ExecutiveMiniStatCard = ({
  eyebrow,
  tone = 'info',
  title,
  value,
  detail,
  supportItems = []
}: ExecutiveMiniStatCardProps) => {
  const theme = useTheme()

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
            <Stack spacing={0.75}>
              <Typography variant='body2' color='text.secondary'>
                {title}
              </Typography>
              <Typography variant='h3'>{value}</Typography>
            </Stack>
            {eyebrow ? <Chip size='small' color={tone} variant='tonal' label={eyebrow} /> : null}
          </Stack>
          <Typography variant='body2' color='text.secondary'>
            {detail}
          </Typography>
          {supportItems.length > 0 ? (
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: `repeat(${supportItems.length}, minmax(0, 1fr))` }}>
              {supportItems.map(item => (
                <Box
                  key={item.label}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette[tone].main, 0.08)
                  }}
                >
                  <Typography variant='caption' color='text.secondary'>
                    {item.label}
                  </Typography>
                  <Typography variant='h6'>{item.value}</Typography>
                </Box>
              ))}
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default ExecutiveMiniStatCard
