'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import type { PersonProfileSummary } from '@/types/person-360'

type Props = {
  data: PersonProfileSummary
}

const MyProfileSidebar = ({ data }: Props) => {
  const linkedCount = data.linkedSystems?.length ?? 0

  return (
    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pt: 6, pb: 4 }}>
        {/* Avatar */}
        {data.resolvedAvatarUrl ? (
          <Avatar
            src={data.resolvedAvatarUrl}
            alt={data.resolvedDisplayName}
            sx={{ width: 120, height: 120 }}
          />
        ) : (
          <CustomAvatar
            color='primary'
            skin='light-static'
            sx={{ width: 120, height: 120, fontSize: 48 }}
          >
            {(data.resolvedDisplayName || 'G')[0]}
          </CustomAvatar>
        )}

        {/* Name + role */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant='h5' sx={{ mb: 0.5 }}>
            {data.resolvedDisplayName || 'Colaborador'}
          </Typography>
          {data.resolvedJobTitle && (
            <CustomChip
              round='true'
              label={data.resolvedJobTitle}
              color='primary'
              variant='tonal'
              size='small'
            />
          )}
        </Box>
      </CardContent>

      <Divider />

      {/* Stats */}
      <CardContent sx={{ display: 'flex', justifyContent: 'center', gap: 6, py: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CustomAvatar variant='rounded' color='primary' skin='light' size={40} sx={{ mb: 1, mx: 'auto' }}>
            <i className='tabler-plug-connected' style={{ fontSize: 20 }} />
          </CustomAvatar>
          <Typography variant='h6'>{linkedCount}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {linkedCount === 1 ? 'Sistema' : 'Sistemas'}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <CustomAvatar variant='rounded' color='info' skin='light' size={40} sx={{ mb: 1, mx: 'auto' }}>
            <i className='tabler-id' style={{ fontSize: 20 }} />
          </CustomAvatar>
          <Typography variant='h6'>
            {[data.hasMemberFacet, data.hasUserFacet, data.hasCrmFacet].filter(Boolean).length}
          </Typography>
          <Typography variant='body2' color='text.secondary'>Facetas</Typography>
        </Box>
      </CardContent>

      <Divider />

      {/* Details */}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 3 }}>
        <DetailRow icon='tabler-mail' label='Email' value={data.resolvedEmail} />
        <DetailRow icon='tabler-phone' label='Telefono' value={data.resolvedPhone} />
        <DetailRow icon='tabler-building' label='Departamento' value={data.departmentName} />
        <DetailRow icon='tabler-stairs' label='Nivel' value={data.jobLevel} />
        <DetailRow icon='tabler-file-certificate' label='Contrato' value={data.employmentType} />
        <DetailRow icon='tabler-calendar' label='Fecha de ingreso' value={data.hireDate} />
      </CardContent>
    </Card>
  )
}

const DetailRow = ({ icon, label, value }: { icon: string; label: string; value: string | null }) => {
  if (!value) return null

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <i className={icon} style={{ fontSize: 18, color: 'var(--mui-palette-text-secondary)' }} aria-hidden='true' />
      <Box>
        <Typography variant='caption' color='text.secondary'>{label}</Typography>
        <Typography variant='body2' fontWeight={500}>{value}</Typography>
      </Box>
    </Box>
  )
}

export default MyProfileSidebar
