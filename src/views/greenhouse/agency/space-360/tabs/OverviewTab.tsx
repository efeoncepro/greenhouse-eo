'use client'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import NexaInsightsBlock from '@/components/greenhouse/NexaInsightsBlock'
import type { ScopeOwnership } from '@/lib/operational-responsibility/readers'

import type { Space360Detail } from '@/lib/agency/space-360'

type Props = {
  detail: Space360Detail
}

const ownershipLabels: Record<keyof ScopeOwnership, string> = {
  accountLead: 'Líder de Cuenta',
  deliveryLead: 'Líder de Delivery',
  financeReviewer: 'Revisor Financiero',
  operationsLead: 'Líder de Operaciones'
}

const ownershipKeys: (keyof ScopeOwnership)[] = ['accountLead', 'deliveryLead', 'financeReviewer', 'operationsLead']

const statusColor = (status: string) => {
  if (status === 'optimal') return 'success'
  if (status === 'attention') return 'warning'
  if (status === 'critical') return 'error'

  return 'secondary'
}

const OverviewTab = ({ detail }: Props) => {
  const nexaInsights = detail.nexaInsights ?? {
    insights: [],
    totalAnalyzed: 0,
    lastAnalysis: null,
    runStatus: null,
    timeline: []
  }

  return (
    <Stack spacing={6}>
      <NexaInsightsBlock
        insights={nexaInsights.insights}
        totalAnalyzed={nexaInsights.totalAnalyzed}
        lastAnalysis={nexaInsights.lastAnalysis}
        runStatus={nexaInsights.runStatus}
        defaultExpanded={nexaInsights.totalAnalyzed > 0}
        timelineInsights={nexaInsights.timeline ?? []}
      />

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card variant='outlined'>
            <CardHeader title='Resumen operativo' subheader='Lectura consolidada por dimensión para este Space.' />
            <CardContent>
              <Grid container spacing={4}>
                {detail.overview.dimensions.map(item => (
                  <Grid key={item.key} size={{ xs: 12, md: 6 }}>
                    <Card variant='outlined' sx={{ height: '100%' }}>
                      <CardContent sx={{ display: 'grid', gap: 1.5 }}>
                        <Stack direction='row' alignItems='center' justifyContent='space-between' gap={2}>
                          <Typography variant='h6'>{item.label}</Typography>
                          <CustomChip
                            round='true'
                            size='small'
                            color={statusColor(item.status)}
                            variant='tonal'
                            label={item.status === 'missing' ? 'Parcial' : item.status === 'optimal' ? 'Óptimo' : item.status === 'attention' ? 'Atención' : 'Crítico'}
                          />
                        </Stack>
                        <Typography variant='body2'>{item.summary}</Typography>
                        <Typography variant='caption' color='text.secondary'>{item.detail}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={6}>
            <Card variant='outlined'>
              <CardHeader
                title='Ownership'
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'action.hover', color: 'text.primary', width: 34, height: 34 }}>
                    <i className='tabler-users' style={{ fontSize: 20 }} />
                  </Avatar>
                }
              />
              <CardContent sx={{ pt: 0 }}>
                {ownershipKeys.some(k => detail.ownership[k] !== null) ? (
                  <Stack direction='row' flexWrap='wrap' gap={1.5}>
                    {ownershipKeys.map(key => {
                      const entry = detail.ownership[key]

                      return entry ? (
                        <Chip
                          key={key}
                          variant='outlined'
                          color='primary'
                          size='small'
                          label={`${ownershipLabels[key]}: ${entry.memberName}`}
                        />
                      ) : null
                    })}
                  </Stack>
                ) : (
                  <Typography variant='body2' color='text.disabled'>
                    Sin responsabilidades asignadas para este space.
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card variant='outlined'>
              <CardHeader title='Alertas' subheader='Señales actuales y gaps que todavía requieren follow-on.' />
              <CardContent sx={{ display: 'grid', gap: 2 }}>
                {detail.overview.alerts.length === 0 ? (
                  <Alert severity='success'>No hay alertas activas para este Space.</Alert>
                ) : (
                  detail.overview.alerts.map(alert => <Alert key={alert} severity='warning'>{alert}</Alert>)
                )}
              </CardContent>
            </Card>

            <Card variant='outlined'>
              <CardHeader title='Actividad reciente' subheader='Últimos eventos observados en outbox para este contexto.' />
              <CardContent sx={{ pt: 0 }}>
                <List disablePadding>
                  {detail.overview.recentActivity.length === 0 ? (
                    <ListItem disableGutters>
                      <ListItemText primary='Sin actividad reciente' secondary='Todavía no encontramos eventos salientes para este Space o su clientId.' />
                    </ListItem>
                  ) : (
                    detail.overview.recentActivity.map(item => (
                      <ListItem key={item.eventId} disableGutters divider>
                        <ListItemText
                          primary={item.title}
                          secondary={`${item.description} · ${new Date(item.occurredAt).toLocaleString('es-CL')}`}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              </CardContent>
            </Card>

            <Card variant='outlined'>
              <CardHeader title='Proveniencia' subheader='Qué capas alimentan esta 360 hoy.' />
              <CardContent>
                <List disablePadding>
                  {detail.overview.provenance.map(item => (
                    <ListItem key={item} disableGutters divider>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  )
}

export default OverviewTab
