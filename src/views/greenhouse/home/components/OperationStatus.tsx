'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

interface StatusItem {
  label: string
  value: string
  status: 'success' | 'warning' | 'error' | 'secondary'
  icon: string
}

interface Props {
  items: StatusItem[]
}

const OperationStatus = ({ items }: Props) => {
  if (items.length === 0) return null

  return (
    <Box>
      <Typography variant='subtitle2' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', mb: 2 }}>
        Tu operación hoy
      </Typography>
      <Card
        elevation={0}
        sx={{
          border: theme => `1px solid ${theme.palette.divider}`,
          borderLeft: theme => `4px solid ${theme.palette.primary.main}`
        }}
      >
        {items.map((item, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2.5,
              py: 1.5,
              ...(i < items.length - 1 ? { borderBottom: theme => `1px solid ${theme.palette.divider}` } : {})
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <i className={item.icon} style={{ fontSize: '1rem', opacity: 0.6 }} />
              <Typography variant='body2'>{item.label}</Typography>
            </Box>
            <CustomChip round='true' variant='tonal' size='small' label={item.value} color={item.status} />
          </Box>
        ))}
      </Card>
    </Box>
  )
}

export default OperationStatus

export type { StatusItem }
