'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell, ExecutiveMiniStatCard } from '@/components/greenhouse'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import tableStyles from '@core/styles/table.module.css'

import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import { getInitials } from '@/utils/getInitials'

import {
  COMMERCIAL_PARTY_CONFLICT_RESOLUTION_LABELS,
  COMMERCIAL_PARTY_CONFLICT_TYPE_LABELS,
  COMMERCIAL_PARTY_STAGE_LABELS,
  COMMERCIAL_PARTY_STAGE_ORDER,
  COMMERCIAL_PARTY_STAGE_TONES,
  resolveCommercialPartySyncHealth,
  type CommercialPartyDashboardData,
  type CommercialPartyListItem,
  type CommercialPartyStage
} from './types'

type Props = {
  data: CommercialPartyDashboardData
}

type SyncFilter = 'all' | 'attention' | 'aligned' | 'unlinked'
type StageFilter = 'all' | CommercialPartyStage

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Santiago'
})

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sin registro'

  return dateTimeFormatter.format(new Date(value))
}

const syncHealthLabel = (party: CommercialPartyListItem) => {
  const health = resolveCommercialPartySyncHealth(party)

  if (health === 'aligned') return 'Alineado'
  if (health === 'unlinked') return 'Sin ancla HubSpot'

  return 'Requiere atención'
}

const syncHealthTone = (
  party: CommercialPartyListItem
): 'success' | 'warning' | 'secondary' => {
  const health = resolveCommercialPartySyncHealth(party)

  if (health === 'aligned') return 'success'
  if (health === 'unlinked') return 'secondary'

  return 'warning'
}

const CommercialPartiesAdminView = ({ data }: Props) => {
  const [searchValue, setSearchValue] = useState('')
  const [stageFilter, setStageFilter] = useState<StageFilter>('all')
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all')

  const filteredParties = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return data.parties.filter(party => {
      const matchesQuery =
        query.length === 0 ||
        [
          party.displayName,
          party.legalName ?? '',
          party.publicId ?? '',
          party.hubspotCompanyId ?? '',
          party.clientId ?? '',
          party.domain ?? ''
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)

      const matchesStage = stageFilter === 'all' || party.lifecycleStage === stageFilter
      const syncHealth = resolveCommercialPartySyncHealth(party)
      const matchesSync = syncFilter === 'all' || syncHealth === syncFilter

      return matchesQuery && matchesStage && matchesSync
    })
  }, [data.parties, searchValue, stageFilter, syncFilter])

  const firstAttentionParty = data.parties.find(party => party.pendingConflictCount > 0) ?? data.parties[0] ?? null

  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(13,148,136,0.14) 0%, rgba(245,158,11,0.12) 42%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2.5}>
            <CustomChip
              label={GH_INTERNAL_NAV.adminCommercialParties.label}
              color='warning'
              variant='outlined'
              round='true'
              sx={{ width: 'fit-content' }}
            />
            <Typography variant='h3'>{GH_INTERNAL_NAV.adminCommercialParties.subtitle}</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 980 }}>
              Surface operativa para vigilar adopción HubSpot, embudo comercial, conflictos de sync y anclas
              financieras por party. Este slice abre lectura ejecutiva, drill-down y una vía controlada de intervención
              manual cuando la operación lo exige.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                component={Link}
                href={firstAttentionParty ? `/admin/commercial/parties/${firstAttentionParty.organizationId}` : '/admin'}
                variant='contained'
              >
                {firstAttentionParty ? 'Abrir party prioritaria' : 'Volver a Admin Center'}
              </Button>
              <Button component='a' href='#commercial-party-conflicts' variant='outlined'>
                Revisar conflictos recientes
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard
          title='Parties materializadas'
          value={String(data.parties.length)}
          detail={`${data.candidateBacklogTotal} candidates HubSpot siguen sin adopción`}
          tone='info'
        />
        <ExecutiveMiniStatCard
          title='Oportunidades en seguimiento'
          value={String(data.stageTotals.opportunity)}
          detail={`${data.stageTotals.prospect} prospectos listos para madurar`}
          tone='warning'
        />
        <ExecutiveMiniStatCard
          title='Clientes activos'
          value={String(data.stageTotals.active_client)}
          detail={`${data.linkedClientCount} parties ya tienen client_id enlazado`}
          tone='success'
        />
        <ExecutiveMiniStatCard
          title='Conflictos pendientes'
          value={String(data.totalPendingConflicts)}
          detail={`${data.conflictedPartyCount} parties con atención operativa`}
          tone={data.totalPendingConflicts > 0 ? 'error' : 'success'}
        />
      </Box>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, xl: 7 }}>
          <ExecutiveCardShell
            title='Embudo y backlog HubSpot'
            subtitle='Lectura viva del recorrido prospect → opportunity → active_client, más backlog aún no materializado.'
          >
            <Stack spacing={3}>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }
                }}
              >
                {(['prospect', 'opportunity', 'active_client'] as CommercialPartyStage[]).map(stage => (
                  <Card key={stage} variant='outlined' sx={{ borderStyle: 'dashed' }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <CustomChip
                          label={COMMERCIAL_PARTY_STAGE_LABELS[stage]}
                          color={COMMERCIAL_PARTY_STAGE_TONES[stage]}
                          variant='tonal'
                          round='true'
                          size='small'
                          sx={{ width: 'fit-content' }}
                        />
                        <Typography variant='h4'>{data.stageTotals[stage]}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {stage === 'prospect'
                            ? `${data.candidateBacklogByStage.prospect} candidatos HubSpot todavía no adoptados`
                            : stage === 'opportunity'
                              ? `${data.candidateBacklogByStage.opportunity} candidates listos para evaluación`
                              : `${data.linkedClientCount} con puente a finance/client`}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <Alert severity={data.candidateBacklogTotal > 0 ? 'warning' : 'success'} variant='outlined'>
                {data.candidateBacklogTotal > 0
                  ? `${data.candidateBacklogTotal} companies del mirror HubSpot siguen sin materializarse como party. La mayor presión está en prospectos (${data.candidateBacklogByStage.prospect}) y opportunities (${data.candidateBacklogByStage.opportunity}).`
                  : 'No hay backlog pendiente de adopción desde HubSpot en este corte.'}
              </Alert>

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }
                }}
              >
                {(['inactive', 'provider_only', 'disqualified', 'churned'] as CommercialPartyStage[]).map(stage => (
                  <Card key={stage} variant='outlined'>
                    <CardContent sx={{ pb: '16px !important' }}>
                      <Typography variant='overline' color='text.secondary'>
                        {COMMERCIAL_PARTY_STAGE_LABELS[stage]}
                      </Typography>
                      <Typography variant='h5'>{data.stageTotals[stage]}</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Stack>
          </ExecutiveCardShell>
        </Grid>

        <Grid size={{ xs: 12, xl: 5 }} id='commercial-party-conflicts'>
          <ExecutiveCardShell
            title='Conflictos recientes'
            subtitle='Últimos desalineamientos detectados por lifecycle outbound y defensas anti ping-pong.'
          >
            <Stack spacing={2.5}>
              {data.recentConflicts.length === 0 ? (
                <Alert severity='success' variant='outlined'>
                  No hay conflictos recientes publicados para commercial party lifecycle.
                </Alert>
              ) : (
                data.recentConflicts.map(conflict => (
                  <Card key={conflict.conflictId} variant='outlined'>
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap alignItems='center'>
                          <CustomChip
                            label={COMMERCIAL_PARTY_CONFLICT_TYPE_LABELS[conflict.conflictType]}
                            color='warning'
                            size='small'
                            variant='tonal'
                            round='true'
                          />
                          <CustomChip
                            label={COMMERCIAL_PARTY_CONFLICT_RESOLUTION_LABELS[conflict.resolutionStatus]}
                            color={conflict.resolutionStatus === 'pending' ? 'error' : 'secondary'}
                            size='small'
                            variant='outlined'
                            round='true'
                          />
                        </Stack>
                        <Typography variant='h6'>{conflict.displayName}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          Detectado {formatDateTime(conflict.detectedAt)}
                        </Typography>
                        {conflict.organizationId ? (
                          <Button component={Link} href={`/admin/commercial/parties/${conflict.organizationId}`} size='small'>
                            Abrir detalle
                          </Button>
                        ) : null}
                      </Stack>
                    </CardContent>
                  </Card>
                ))
              )}
            </Stack>
          </ExecutiveCardShell>
        </Grid>
      </Grid>

      <Card>
        <CardHeader
          title='Lista operativa de parties'
          subheader='Filtra por stage, estado de sync y texto libre para revisar adopciones, oportunidades y clientes ya materializados.'
        />
        <CardContent>
          <Stack spacing={3}>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0,2fr) repeat(2, minmax(0,1fr))' }
              }}
            >
              <CustomTextField
                value={searchValue}
                onChange={event => setSearchValue(event.target.value)}
                placeholder='Buscar por nombre, public_id, HubSpot company o client_id'
                fullWidth
              />
              <CustomTextField
                select
                value={stageFilter}
                onChange={event => setStageFilter(event.target.value as StageFilter)}
                fullWidth
              >
                <MenuItem value='all'>Todos los stages</MenuItem>
                {COMMERCIAL_PARTY_STAGE_ORDER.map(stage => (
                  <MenuItem key={stage} value={stage}>
                    {COMMERCIAL_PARTY_STAGE_LABELS[stage]}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                value={syncFilter}
                onChange={event => setSyncFilter(event.target.value as SyncFilter)}
                fullWidth
              >
                <MenuItem value='all'>Todo el sync health</MenuItem>
                <MenuItem value='attention'>Requiere atención</MenuItem>
                <MenuItem value='aligned'>Alineado</MenuItem>
                <MenuItem value='unlinked'>Sin ancla HubSpot</MenuItem>
              </CustomTextField>
            </Box>

            <Divider />

            {filteredParties.length === 0 ? (
              <Alert severity='info' variant='outlined'>
                No hay parties que coincidan con los filtros actuales.
              </Alert>
            ) : (
              <TableContainer>
                <Table className={tableStyles.table}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Party</TableCell>
                      <TableCell>Lifecycle</TableCell>
                      <TableCell>Sync health</TableCell>
                      <TableCell>Client bridge</TableCell>
                      <TableCell>Señales</TableCell>
                      <TableCell align='right'>Última actividad</TableCell>
                      <TableCell align='right'>Detalle</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredParties.map(party => (
                      <TableRow key={party.organizationId} hover>
                        <TableCell>
                          <Stack direction='row' spacing={2} alignItems='center'>
                            <CustomAvatar skin='light' color='warning' size={38}>
                              {getInitials(party.displayName)}
                            </CustomAvatar>
                            <Stack spacing={0.25}>
                              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                {party.displayName}
                              </Typography>
                              <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                                {party.publicId ?? party.commercialPartyId}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {party.domain ?? party.hubspotCompanyId ?? 'Sin dominio visible'}
                              </Typography>
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1}>
                            <CustomChip
                              label={COMMERCIAL_PARTY_STAGE_LABELS[party.lifecycleStage]}
                              color={COMMERCIAL_PARTY_STAGE_TONES[party.lifecycleStage]}
                              size='small'
                              variant='tonal'
                              round='true'
                              sx={{ width: 'fit-content' }}
                            />
                            <Typography variant='caption' color='text.secondary'>
                              Desde {formatDateTime(party.lifecycleStageSince)}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1}>
                            <CustomChip
                              label={syncHealthLabel(party)}
                              color={syncHealthTone(party)}
                              size='small'
                              variant='tonal'
                              round='true'
                              sx={{ width: 'fit-content' }}
                            />
                            <Typography variant='caption' color='text.secondary'>
                              {party.hubspotLifecycleStage
                                ? `HubSpot: ${party.hubspotLifecycleStage}`
                                : 'Sin lifecycle mirror'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {party.clientId ? (
                            <Stack spacing={0.5}>
                              <CustomChip label='Client enlazado' color='success' size='small' variant='outlined' round='true' />
                              <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                                {party.clientId}
                              </Typography>
                            </Stack>
                          ) : (
                            <CustomChip label='Sin client_id' color='secondary' size='small' variant='tonal' round='true' />
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.75}>
                            <Typography variant='caption' color='text.secondary'>
                              {party.pendingConflictCount > 0
                                ? `${party.pendingConflictCount} conflicto(s) pendientes`
                                : 'Sin conflictos pendientes'}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {party.activeQuotes > 0
                                ? `${party.activeQuotes} quote(s) activas`
                                : party.activeContracts > 0
                                  ? `${party.activeContracts} contrato(s) activos`
                                  : 'Sin anclas comerciales activas'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>{formatDateTime(party.lastActivityAt)}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Button component={Link} href={`/admin/commercial/parties/${party.organizationId}`} size='small'>
                            Abrir detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default CommercialPartiesAdminView
