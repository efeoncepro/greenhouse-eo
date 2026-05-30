'use client'

import { useMemo, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import {
  MetricSummaryCard,
  OperationalPanel,
  OperationalSignalList
} from '@/components/greenhouse/primitives'

import AdminReviewDecisionDrawerMockup from './AdminReviewDecisionDrawerMockup'
import ContractorTimeline from './ContractorTimeline'
import { adminQueue, adminSignals, contractorScenarios } from './data'
import type { ContractorScenario, ContractorScenarioId, ContractorTone } from './types'

type ReviewDecision = 'approve' | 'dispute' | 'reject'

const toneToColor: Record<ContractorTone, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  secondary: 'secondary'
}

const toneToIcon: Record<ContractorTone, string> = {
  success: 'tabler-circle-check',
  warning: 'tabler-alert-circle',
  error: 'tabler-alert-triangle',
  info: 'tabler-info-circle',
  secondary: 'tabler-circle'
}

const AdminHero = ({
  selected,
  onReview
}: {
  selected: ContractorScenario
  onReview: (decision: ReviewDecision) => void
}) => (
  <Card
    sx={theme => ({
      border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
      bgcolor: alpha(theme.palette.primary.main, 0.04)
    })}
  >
    <CardContent>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={4}
        justifyContent='space-between'
        alignItems={{ xs: 'flex-start', lg: 'center' }}
      >
        <Stack spacing={1.5} sx={{ maxWidth: 820 }}>
          <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
            <CustomChip round='true' size='small' variant='tonal' color='primary' label='Workbench HR' />
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={toneToColor[selected.readinessTone]}
              label={selected.readinessLabel}
            />
          </Stack>
          <Typography variant='h3'>Operación contractor</Typography>
          <Typography variant='body1' color='text.secondary'>
            Cola operativa para revisar engagements, evidencia, bloqueos de preparación y el paso hacia Finance.
          </Typography>
        </Stack>
        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
          <Button
            variant='contained'
            startIcon={<i className='tabler-checkup-list' />}
            onClick={() => onReview(selected.id === 'disputed' ? 'dispute' : 'approve')}
            data-capture='admin-review-selected'
          >
            Revisar seleccionado
          </Button>
          <Button variant='tonal' color='secondary' startIcon={<i className='tabler-building-bank' />}>
            Ver paso a Finance
          </Button>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const AdminQueueTable = ({
  selectedId,
  onSelect
}: {
  selectedId: ContractorScenarioId
  onSelect: (scenarioId: ContractorScenarioId) => void
}) => (
  <OperationalPanel
    title='Cola de revisión'
    subheader='Prioriza disputas, FX bloqueado, soporte pendiente y cierres con items abiertos.'
    icon='tabler-list-details'
    iconColor='primary'
  >
    <Box sx={{ overflowX: 'auto' }}>
      <Table size='small' sx={{ minWidth: 820 }}>
        <TableHead>
          <TableRow>
            <TableCell>Contractor</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Monto</TableCell>
            <TableCell>Responsable</TableCell>
            <TableCell>Edad</TableCell>
            <TableCell align='right'>Acción</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {adminQueue.map(row => {
            const selected = row.scenarioId === selectedId

            return (
              <TableRow
                key={row.id}
                hover
                selected={selected}
                sx={theme => ({
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08)
                  }
                })}
              >
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant='subtitle2'>{row.contractorName}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {row.id} · {row.country}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>{row.subtype}</TableCell>
                <TableCell>
                  <CustomChip round='true' size='small' variant='tonal' color={toneToColor[row.tone]} label={row.status} />
                </TableCell>
                <TableCell>{row.amount}</TableCell>
                <TableCell>{row.responsable}</TableCell>
                <TableCell>{row.age}</TableCell>
                <TableCell align='right'>
                  <Button
                    size='small'
                    variant={selected ? 'contained' : 'tonal'}
                    onClick={() => onSelect(row.scenarioId)}
                  >
                    Abrir
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Box>
  </OperationalPanel>
)

const AdminInspector = ({
  scenario,
  onReview
}: {
  scenario: ContractorScenario
  onReview: (decision: ReviewDecision) => void
}) => {
  const supportComplete = scenario.supportItems.filter(item => item.tone === 'success').length

  return (
    <OperationalPanel
      title='Inspector'
      subheader={scenario.readinessDetail}
      icon='tabler-user-check'
      iconColor={toneToColor[scenario.readinessTone]}
      action={<CustomChip round='true' size='small' variant='tonal' color={toneToColor[scenario.readinessTone]} label={scenario.readinessLabel} />}
    >
      <Stack spacing={4}>
        <Stack spacing={2}>
          <DetailRow label='Contractor' value={scenario.contractorName} />
          <DetailRow label='Engagement' value={scenario.engagementPublicId} />
          <DetailRow label='Relación' value={scenario.relationshipSubtype} />
          <DetailRow label='País' value={scenario.country} />
          <DetailRow label='Compliance' value={scenario.taxResponsable} />
          <DetailRow label='Soporte' value={`${supportComplete}/${scenario.supportItems.length} completos`} />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography variant='subtitle2'>Acciones de revisión</Typography>
          <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
            <Button
              variant='contained'
              size='small'
              startIcon={<i className='tabler-check' />}
              onClick={() => onReview('approve')}
              data-capture='admin-approve-action'
            >
              Aprobar
            </Button>
            <Button
              variant='tonal'
              color='warning'
              size='small'
              startIcon={<i className='tabler-message-report' />}
              onClick={() => onReview('dispute')}
              data-capture='admin-dispute-action'
            >
              Disputar
            </Button>
            <Button
              variant='tonal'
              color='error'
              size='small'
              startIcon={<i className='tabler-x' />}
              onClick={() => onReview('reject')}
              data-capture='admin-reject-action'
            >
              Rechazar
            </Button>
          </Stack>
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography variant='subtitle2'>Soportes</Typography>
          {scenario.supportItems.map(item => (
            <Stack key={item.id} direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  {item.label}
                </Typography>
                <Typography variant='caption' color='text.secondary' noWrap>
                  {item.filename ?? 'Pendiente de adjuntar'}
                </Typography>
              </Box>
              <CustomChip round='true' size='small' variant='tonal' color={toneToColor[item.tone]} label={item.status} />
            </Stack>
          ))}
        </Stack>
      </Stack>
    </OperationalPanel>
  )
}

const ReadinessPanel = ({ scenario }: { scenario: ContractorScenario }) => {
  const items = scenario.blockers.map(blocker => ({
    id: blocker.id,
    title: blocker.title,
    description: blocker.detail,
    statusLabel: blocker.responsable,
    statusTone: blocker.tone,
    statusIcon: toneToIcon[blocker.tone],
    action: blocker.responsable === 'Contractor' ? 'Enviar observación al contractor' : 'Asignar a responsable interno'
  }))

  return (
    <OperationalPanel title='Preparación del payable' icon='tabler-shield-dollar' iconColor='warning'>
      {items.length > 0 ? (
        <OperationalSignalList items={items} columns={{ xs: 1, md: 2 }} />
      ) : (
        <Alert severity='success' icon={<i className='tabler-circle-check' />}>
          No hay bloqueos visibles para este escenario. El siguiente paso puede pasar a Finance cuando el bridge esté activo.
        </Alert>
      )}
    </OperationalPanel>
  )
}

const FinancePasoPanel = ({ scenario }: { scenario: ContractorScenario }) => (
  <OperationalPanel
    title='Paso hacia Finance'
    subheader='El pago nace como obligation; no como pago directo ni ajuste de otro dominio.'
    icon='tabler-building-bank'
    iconColor='info'
  >
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 4 }}>
        <PasoStep
          title='Envío de trabajo'
          status={scenario.submissions[0]?.status ?? 'Sin envío'}
          tone={scenario.submissions[0]?.tone ?? 'secondary'}
          detail='Evidencia operacional y monto bruto.'
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <PasoStep
          title='Contractor payable'
          status={scenario.blockers.length > 0 ? 'Bloqueado' : 'Listo'}
          tone={scenario.blockers.length > 0 ? 'warning' : 'success'}
          detail='Preparación de invoice, tax owner, FX y perfil de pago.'
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <PasoStep
          title='Finance obligation'
          status={scenario.id === 'paid' ? 'Generada' : 'Pendiente'}
          tone={scenario.id === 'paid' ? 'success' : 'secondary'}
          detail='Obligation idempotente por contractor payable.'
        />
      </Grid>
    </Grid>
  </OperationalPanel>
)

const PasoStep = ({
  title,
  status,
  tone,
  detail
}: {
  title: string
  status: string
  tone: ContractorTone
  detail: string
}) => (
  <Stack
    spacing={2}
    sx={theme => ({
      height: '100%',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      p: 4
    })}
  >
    <Stack direction='row' justifyContent='space-between' spacing={2} alignItems='flex-start'>
      <Typography variant='subtitle1'>{title}</Typography>
      <CustomChip round='true' size='small' variant='tonal' color={toneToColor[tone]} label={status} />
    </Stack>
    <Typography variant='body2' color='text.secondary'>
      {detail}
    </Typography>
  </Stack>
)

const ContractorAdminWorkbenchMockupView = () => {
  const searchParams = useSearchParams()
  const requestedScenario = searchParams.get('scenario') as ContractorScenarioId | null
  const requestedDecision = searchParams.get('decision') as ReviewDecision | null

  const initialScenario = contractorScenarios.some(item => item.id === requestedScenario)
    ? requestedScenario ?? 'disputed'
    : 'disputed'

  const initialDecision: ReviewDecision =
    requestedDecision === 'approve' || requestedDecision === 'reject' || requestedDecision === 'dispute'
      ? requestedDecision
      : 'dispute'

  const [selectedId, setSelectedId] = useState<ContractorScenarioId>(initialScenario)
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(searchParams.get('drawer') === 'review')
  const [reviewDecision, setReviewDecision] = useState<ReviewDecision>(initialDecision)

  const selected = useMemo(
    () => contractorScenarios.find(scenario => scenario.id === selectedId) ?? contractorScenarios[0],
    [selectedId]
  )

  const handleReview = (decision: ReviewDecision) => {
    setReviewDecision(decision)
    setReviewDrawerOpen(true)
  }

  return (
    <Stack spacing={6}>
      <Stack spacing={1}>
        <Typography variant='h4'>Gestión contractor</Typography>
        <Typography variant='body2' color='text.secondary'>
          Revisión operacional de contractors, evidencia y preparación antes de Finance.
        </Typography>
      </Stack>

      <AdminHero selected={selected} onReview={handleReview} />

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricSummaryCard
            title='En revisión'
            value='2'
            subtitle='Envíos enviados o disputados'
            icon='tabler-clipboard-check'
            iconColor='info'
            statusLabel='Operacional'
            statusTone='info'
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricSummaryCard
            title='Bloqueados'
            value='3'
            subtitle='FX, soporte o cuenta pendiente'
            icon='tabler-lock'
            iconColor='warning'
            statusLabel='Requiere responsable'
            statusTone='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricSummaryCard
            title='Listos a Finance'
            value='1'
            subtitle='Sin bloqueos visibles'
            icon='tabler-building-bank'
            iconColor='success'
            statusLabel='Puente'
            statusTone='success'
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricSummaryCard
            title='Pagados'
            value='1'
            subtitle='Orden conciliada'
            icon='tabler-circle-check'
            iconColor='success'
            statusLabel='Cerrado'
            statusTone='success'
          />
        </Grid>
      </Grid>

      <Grid container spacing={6} alignItems='stretch'>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Stack spacing={6}>
            <AdminQueueTable selectedId={selectedId} onSelect={setSelectedId} />
            <ReadinessPanel scenario={selected} />
            <FinancePasoPanel scenario={selected} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, xl: 4 }}>
          <Stack spacing={6}>
            <AdminInspector scenario={selected} onReview={handleReview} />
            <Box data-capture='contractor-timeline'>
              <OperationalPanel title='Timeline del caso' icon='tabler-timeline' iconColor='info'>
                <ContractorTimeline steps={selected.timeline} />
              </OperationalPanel>
            </Box>
          </Stack>
        </Grid>
      </Grid>

      <OperationalPanel
        title='Señales operativas'
        subheader='Vista de control para TASK-798 sin crear una consola paralela.'
        icon='tabler-activity-heartbeat'
        iconColor='primary'
      >
        <OperationalSignalList items={adminSignals} columns={{ xs: 1, md: 2, xl: 4 }} />
      </OperationalPanel>

      <AdminReviewDecisionDrawerMockup
        open={reviewDrawerOpen}
        scenario={selected}
        initialDecision={reviewDecision}
        onClose={() => setReviewDrawerOpen(false)}
      />
    </Stack>
  )
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Stack direction='row' justifyContent='space-between' spacing={3}>
    <Typography variant='body2' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 600, textAlign: 'right' }}>
      {value}
    </Typography>
  </Stack>
)

export default ContractorAdminWorkbenchMockupView
