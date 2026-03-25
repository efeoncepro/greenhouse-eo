'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

interface ProfileData {
  resolvedDisplayName: string | null
  resolvedEmail: string | null
  resolvedPhone: string | null
  resolvedAvatarUrl: string | null
  resolvedJobTitle: string | null
  departmentName: string | null
  jobLevel: string | null
  employmentType: string | null
  hireDate: string | null
  hasMemberFacet: boolean
  hasUserFacet: boolean
  hasCrmFacet: boolean
  linkedSystems: string[]
}

const INTEGRATION_LOGOS: Record<string, string> = {
  microsoft: '/images/integrations/microsoft.svg',
  notion: '/images/integrations/notion.svg',
  hubspot: '/images/integrations/hubspot.svg'
}

const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string | null }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <i className={icon} style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
    <Box>
      <Typography variant='caption' color='text.secondary'>{label}</Typography>
      <Typography variant='body2'>{value || '—'}</Typography>
    </Box>
  </Box>
)

const MyProfileView = () => {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/my/profile')

      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  if (!data) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant='h6'>Perfil no disponible</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={6}>
      {/* Identity */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
            {data.resolvedAvatarUrl ? (
              <Avatar src={data.resolvedAvatarUrl} sx={{ width: 80, height: 80 }} />
            ) : (
              <CustomAvatar color='primary' skin='light-static' sx={{ width: 80, height: 80, fontSize: 32 }}>
                {(data.resolvedDisplayName || 'G')[0]}
              </CustomAvatar>
            )}
            <Typography variant='h5'>{data.resolvedDisplayName || 'Colaborador'}</Typography>
            <Typography variant='body2' color='text.secondary'>{data.resolvedEmail}</Typography>
            {data.resolvedPhone && (
              <Typography variant='body2' color='text.secondary'>{data.resolvedPhone}</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Professional */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Datos profesionales' avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-briefcase' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} /></Avatar>} />
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <InfoRow icon='tabler-id' label='Cargo' value={data.resolvedJobTitle} />
            <InfoRow icon='tabler-building' label='Departamento' value={data.departmentName} />
            <InfoRow icon='tabler-stairs' label='Nivel' value={data.jobLevel} />
            <InfoRow icon='tabler-file-certificate' label='Tipo de contrato' value={data.employmentType} />
            <InfoRow icon='tabler-calendar' label='Fecha de ingreso' value={data.hireDate} />
          </CardContent>
        </Card>
      </Grid>

      {/* Linked systems */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Sistemas vinculados' avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-plug-connected' style={{ fontSize: 20, color: 'var(--mui-palette-info-main)' }} /></Avatar>} />
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {['microsoft', 'notion', 'hubspot'].map(sys => {
              const linked = data.linkedSystems?.includes(sys) ?? false

              return (
                <Box key={sys} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    component='img'
                    src={INTEGRATION_LOGOS[sys]}
                    alt={sys}
                    sx={{ width: 24, height: 24, objectFit: 'contain', opacity: linked ? 1 : 0.5, filter: linked ? 'none' : 'grayscale(80%)' }}
                  />
                  <Typography variant='body2' color={linked ? 'text.primary' : 'text.disabled'} sx={{ textTransform: 'capitalize' }}>{sys}</Typography>
                  <i className={linked ? 'tabler-check' : 'tabler-x'} style={{ fontSize: 14, marginLeft: 'auto', color: linked ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-text-disabled)' }} />
                </Box>
              )
            })}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default MyProfileView
