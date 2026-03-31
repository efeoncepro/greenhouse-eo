'use client'

import { useCallback, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import { BusinessLineMetadataCard } from '@/components/greenhouse'
import type { BusinessLineMetadata } from '@/types/business-line'

import BusinessLineEditDialog from './BusinessLineEditDialog'

type Props = {
  initialData: BusinessLineMetadata[]
}

const AdminBusinessLinesView = ({ initialData }: Props) => {
  const [businessLines, setBusinessLines] = useState<BusinessLineMetadata[]>(initialData)
  const [editing, setEditing] = useState<BusinessLineMetadata | null>(null)

  const handleCardClick = useCallback((bl: BusinessLineMetadata) => {
    setEditing(bl)
  }, [])

  const handleSaved = useCallback((updated: BusinessLineMetadata) => {
    setBusinessLines(prev => prev.map(bl => (bl.moduleCode === updated.moduleCode ? updated : bl)))
    setEditing(null)
  }, [])

  return (
    <Box>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          avatar={
            <CustomAvatar variant='rounded' color='primary' skin='filled' size={40}>
              <i className='tabler-building text-xl' />
            </CustomAvatar>
          }
          title='Business Lines'
          subheader='Metadata canonica de las lineas de negocio de Efeonce Group'
          titleTypographyProps={{ variant: 'h5' }}
          subheaderTypographyProps={{ variant: 'body2' }}
        />
        <Divider />
        <CardContent>
          <Grid container spacing={4}>
            {businessLines.map(bl => (
              <Grid key={bl.moduleCode} size={{ xs: 12, sm: 6, lg: 4 }}>
                <BusinessLineMetadataCard metadata={bl} onClick={handleCardClick} />
              </Grid>
            ))}
          </Grid>

          {businessLines.length === 0 && (
            <Stack alignItems='center' py={6}>
              <Typography variant='body2' color='text.secondary'>
                Sin business lines registradas. Ejecuta la migracion de seed.
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Semantics info card */}
      <Card elevation={0} sx={{ mt: 4, border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          avatar={
            <CustomAvatar variant='rounded' color='info' skin='filled' size={36}>
              <i className='tabler-info-circle text-lg' />
            </CustomAvatar>
          }
          title='Semantica: comercial vs operativa'
          titleTypographyProps={{ variant: 'h6' }}
        />
        <Divider />
        <CardContent>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1}>
                <Typography variant='subtitle2'>BU Comercial</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.7 }}>
                  Quien vende. Bajo que unidad se contrata el servicio. Se usa para revenue, margen, pipeline, renewals.
                  Fuentes: HubSpot, Services, service_modules.
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1}>
                <Typography variant='subtitle2'>BU Operativa</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.7 }}>
                  Quien ejecuta. Que unidad opera el delivery. Se usa para RpA, OTD, throughput, capacity.
                  Fuentes: Notion proyectos, assignment context.
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <BusinessLineEditDialog open={!!editing} metadata={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
    </Box>
  )
}

export default AdminBusinessLinesView
