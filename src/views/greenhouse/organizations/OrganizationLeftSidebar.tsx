'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import type { OrganizationDetailData } from './types'

type Props = {
  detail: OrganizationDetailData
  isAdmin?: boolean
  syncing?: boolean
  onEditOrganization?: () => void
  onSyncHubspot?: () => void
}

const COUNTRY_FLAGS: Record<string, string> = {
  CL: '🇨🇱', CO: '🇨🇴', VE: '🇻🇪', MX: '🇲🇽', PE: '🇵🇪', US: '🇺🇸', AR: '🇦🇷', BR: '🇧🇷', EC: '🇪🇨'
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  prospect: 'warning',
  churned: 'error'
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  prospect: 'Prospecto',
  churned: 'Churned'
}

const OrganizationLeftSidebar = ({ detail, isAdmin, syncing, onEditOrganization, onSyncHubspot }: Props) => {
  const initial = detail.organizationName.charAt(0).toUpperCase()
  const flag = detail.country ? COUNTRY_FLAGS[detail.country.toUpperCase()] ?? '🌐' : null

  return (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pt: 6 }}>
        <CustomAvatar variant='rounded' skin='light' color='primary' size={100}>
          <Typography variant='h3' sx={{ fontWeight: 700 }}>{initial}</Typography>
        </CustomAvatar>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant='h5'>{detail.organizationName}</Typography>
          {detail.industry && (
            <Typography variant='body2' color='text.secondary'>{detail.industry}</Typography>
          )}
        </Box>
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={STATUS_COLOR[detail.status] ?? 'secondary'}
          label={STATUS_LABEL[detail.status] ?? detail.status}
        />
        {flag && detail.country && (
          <Typography variant='body2'>{flag} {detail.country}</Typography>
        )}

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 6, width: '100%', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{detail.spaceCount}</Typography>
            <Typography variant='caption' color='text.secondary'>Spaces</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{detail.membershipCount}</Typography>
            <Typography variant='caption' color='text.secondary'>Membresías</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{detail.uniquePersonCount}</Typography>
            <Typography variant='caption' color='text.secondary'>Personas</Typography>
          </Box>
        </Box>
      </CardContent>

      {/* Fiscal info */}
      {(detail.legalName || detail.taxId) && (
        <>
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant='overline' color='text.secondary'>Información fiscal</Typography>
            {detail.legalName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <i className='tabler-file-text' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
                <Typography variant='body2'>{detail.legalName}</Typography>
              </Box>
            )}
            {detail.taxId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <i className='tabler-receipt' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
                <Typography variant='body2'>
                  {detail.taxIdType ? `${detail.taxIdType}: ` : ''}{detail.taxId}
                </Typography>
              </Box>
            )}
          </CardContent>
        </>
      )}

      {/* Identity */}
      <Divider />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant='overline' color='text.secondary'>Identificadores</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='tabler-fingerprint' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
          <Typography variant='body2' sx={{ fontWeight: 600 }}>{detail.publicId}</Typography>
        </Box>
        {detail.hubspotCompanyId && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box component='img' src='/images/integrations/hubspot.svg' alt='HubSpot' sx={{ width: 16, height: 16, objectFit: 'contain' }} />
              <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
                HubSpot: {detail.hubspotCompanyId}
              </Typography>
            </Box>
            {isAdmin && onSyncHubspot && (
              <Button
                variant='tonal'
                size='small'
                color='warning'
                startIcon={syncing ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-refresh' />}
                disabled={syncing}
                onClick={onSyncHubspot}
                sx={{ mt: 0.5 }}
              >
                {syncing ? 'Sincronizando...' : 'Sincronizar con HubSpot'}
              </Button>
            )}
          </>
        )}
      </CardContent>

      {/* Notes */}
      {detail.notes && (
        <>
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant='overline' color='text.secondary'>Notas</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ whiteSpace: 'pre-wrap' }}>
              {detail.notes}
            </Typography>
          </CardContent>
        </>
      )}

      {/* Admin actions */}
      {isAdmin && onEditOrganization && (
        <>
          <Divider />
          <CardContent>
            <Button
              variant='tonal'
              fullWidth
              startIcon={<i className='tabler-edit' />}
              onClick={onEditOrganization}
            >
              Editar organización
            </Button>
          </CardContent>
        </>
      )}
    </Card>
  )
}

export default OrganizationLeftSidebar
