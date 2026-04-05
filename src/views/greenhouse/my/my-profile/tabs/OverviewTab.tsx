'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import type { PersonProfileSummary } from '@/types/person-360'

const INTEGRATION_LOGOS: Record<string, string> = {
  microsoft: '/images/integrations/microsoft.svg',
  notion: '/images/integrations/notion.svg',
  hubspot: '/images/integrations/hubspot.svg'
}

const INTEGRATION_LABELS: Record<string, string> = {
  microsoft: 'Microsoft',
  notion: 'Notion',
  hubspot: 'HubSpot'
}

type Props = {
  data: PersonProfileSummary
}

const OverviewTab = ({ data }: Props) => {
  return (
    <Grid container spacing={6}>
      {/* Professional data */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Datos profesionales'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-briefcase' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            <Grid container spacing={4}>
              <FieldItem label='Cargo' value={data.resolvedJobTitle} />
              <FieldItem label='Departamento' value={data.departmentName} />
              <FieldItem label='Nivel' value={data.jobLevel} />
              <FieldItem label='Tipo de contrato' value={data.employmentType} />
              <FieldItem label='Fecha de ingreso' value={data.hireDate} />
              <FieldItem label='Email' value={data.resolvedEmail} />
              <FieldItem label='Telefono' value={data.resolvedPhone} />
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Linked systems */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Sistemas vinculados'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i className='tabler-plug-connected' style={{ fontSize: 20, color: 'var(--mui-palette-info-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {['microsoft', 'notion', 'hubspot'].map(sys => {
              const linked = data.linkedSystems?.includes(sys) ?? false

              return (
                <Box
                  key={sys}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                  role='listitem'
                  aria-label={`${INTEGRATION_LABELS[sys] ?? sys}: ${linked ? 'vinculado' : 'no vinculado'}`}
                >
                  <Box
                    component='img'
                    src={INTEGRATION_LOGOS[sys]}
                    alt=''
                    aria-hidden='true'
                    sx={{
                      width: 24,
                      height: 24,
                      objectFit: 'contain',
                      opacity: linked ? 1 : 0.5,
                      filter: linked ? 'none' : 'grayscale(80%)'
                    }}
                  />
                  <Typography
                    variant='body2'
                    color={linked ? 'text.primary' : 'text.disabled'}
                  >
                    {INTEGRATION_LABELS[sys] ?? sys}
                  </Typography>
                  <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <i
                      className={linked ? 'tabler-check' : 'tabler-x'}
                      aria-hidden='true'
                      style={{
                        fontSize: 14,
                        color: linked
                          ? 'var(--mui-palette-success-main)'
                          : 'var(--mui-palette-text-disabled)'
                      }}
                    />
                    <Typography variant='caption' color={linked ? 'success.main' : 'text.disabled'}>
                      {linked ? 'Vinculado' : 'No vinculado'}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

const FieldItem = ({ label, value }: { label: string; value: string | null }) => {
  if (!value) return null

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Typography variant='caption' color='text.secondary'>{label}</Typography>
      <Typography variant='body2' fontWeight={500}>{value}</Typography>
    </Grid>
  )
}

export default OverviewTab
