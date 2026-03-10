'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export type MetricListItem = {
  label: string
  value: string
  detail: string
}

type MetricListProps = {
  items: MetricListItem[]
}

const MetricList = ({ items }: MetricListProps) => {
  return (
    <Stack spacing={2}>
      {items.map(item => (
        <Box
          key={item.label}
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: 'action.hover',
            display: 'grid',
            gap: 1.25
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
            <Typography variant='body2' color='text.secondary'>
              {item.label}
            </Typography>
            <Typography variant='h5' sx={{ lineHeight: 1 }}>
              {item.value}
            </Typography>
          </Box>
          <Typography variant='body2' color='text.secondary'>
            {item.detail}
          </Typography>
        </Box>
      ))}
    </Stack>
  )
}

export default MetricList
