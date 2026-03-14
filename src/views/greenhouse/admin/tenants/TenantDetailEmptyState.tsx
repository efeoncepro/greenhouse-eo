'use client'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type TenantDetailEmptyStateProps = {
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  disabled?: boolean
}

const TenantDetailEmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  disabled = false
}: TenantDetailEmptyStateProps) => {
  return (
    <Card variant='outlined'>
      <CardContent>
        <Stack spacing={2.5} alignItems='center' textAlign='center' sx={{ py: 5, px: { xs: 1, md: 6 } }}>
          <Stack
            alignItems='center'
            justifyContent='center'
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              color: 'primary.main',
              backgroundColor: 'action.hover'
            }}
          >
            <i className={`${icon} text-[30px]`} aria-hidden='true' />
          </Stack>
          <Stack spacing={1}>
            <Typography variant='h6'>{title}</Typography>
            <Typography color='text.secondary'>{description}</Typography>
          </Stack>
          {actionLabel && onAction ? (
            <Button variant='contained' onClick={onAction} disabled={disabled}>
              {actionLabel}
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default TenantDetailEmptyState
