'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

/**
 * TASK-612 — Empty state canónico para facets sin contenido aún (crm, services,
 * staffAug) o con datos vacíos (spaces sin entries). Honest copy es-CL tuteo.
 */

export type FacetEmptyStateProps = {
  icon?: string
  title: string
  description: string
}

const FacetEmptyState = ({ icon = 'tabler-circle-dashed', title, description }: FacetEmptyStateProps) => (
  <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
    <CardContent>
      <Stack spacing={2} alignItems='center' sx={{ py: 4, textAlign: 'center' }}>
        <CustomAvatar variant='rounded' skin='light' color='secondary' size={48}>
          <i className={icon} style={{ fontSize: '1.5rem' }} />
        </CustomAvatar>
        <Typography variant='h6'>{title}</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 480 }}>
          {description}
        </Typography>
      </Stack>
    </CardContent>
  </Card>
)

export default FacetEmptyState
