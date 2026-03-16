'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import type { OrganizationDetailData } from '../types'

type Props = {
  detail: OrganizationDetailData
}

const OrganizationFinanceTab = ({ detail }: Props) => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Finanzas'
            subheader='Resumen financiero de la organización'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                <i className='tabler-report-money' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
              <Typography variant='h6' sx={{ mb: 1 }}>Próximamente</Typography>
              <Typography variant='body2' color='text.secondary'>
                La vista financiera consolidada para {detail.organizationName} estará disponible cuando se complete el bridge financiero.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default OrganizationFinanceTab
