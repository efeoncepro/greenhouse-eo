'use client'

import { useCallback, useMemo, useState } from 'react'

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

import RemittanceAdviceSection from '@/components/greenhouse/contractors/RemittanceAdviceSection'
import { MetricSummaryCard, OperationalPanel, OperationalSignalList } from '@/components/greenhouse/primitives'
import { formatCurrency, type CurrencyCode } from '@/lib/format'
import { cadenceLabel, cadencePaymentUnitLabel, rateTypeLabel } from '@/lib/contractor-engagements/compensation-display'
import { GH_CONTRACTOR_COMPENSATION as CC } from '@/lib/copy/contractor-compensation'
import type {
  ContractorHrWorkbenchProjection,
  ContractorTone,
  ContractorWorkbenchQueueRow
} from '@/lib/contractor-engagements/projection-types'

import AdminReviewDecisionDrawer, { type ReviewDecision } from './AdminReviewDecisionDrawer'
import ContractorEngagementCompensationDrawer from './ContractorEngagementCompensationDrawer'
import ContractorGuardrailPanel from './ContractorGuardrailPanel'

const toneToColor: Record<ContractorTone, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  secondary: 'secondary'
}

interface ContractorAdminWorkbenchViewProps {
  initialProjection: ContractorHrWorkbenchProjection
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

const AdminHero = ({
  selected,
  onReview
}: {
  selected: ContractorWorkbenchQueueRow | null
  onReview: () => void
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
            {selected ? (
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={toneToColor[selected.statusTone]}
                label={selected.statusLabel}
              />
            ) : null}
          </Stack>
          <Typography variant='h4'>Gestión contractor</Typography>
          <Typography variant='body1' color='text.secondary'>
            Revisa engagements, evidencia y bloqueos de preparación antes de que el pago pase a Finance.
          </Typography>
        </Stack>
        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
          <Button
            variant='contained'
            startIcon={<i className='tabler-checkup-list' />}
            disabled={!selected}
            onClick={onReview}
            data-capture='admin-review-selected'
          >
            Revisar seleccionado
          </Button>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const AdminQueueTable = ({
  rows,
  selectedId,
  onSelect
}: {
  rows: ContractorWorkbenchQueueRow[]
  selectedId: string | null
  onSelect: (engagementId: string) => void
}) => (
  <OperationalPanel
    title='Cola de revisión'
    subheader='Prioriza disputas, bloqueos de preparación y soporte pendiente.'
    icon='tabler-list-details'
    iconColor='primary'
  >
    {rows.length > 0 ? (
      <Box sx={{ overflowX: 'auto' }}>
        <Table size='small' sx={{ minWidth: 820 }}>
          <caption className='sr-only'>Cola de revisión de contractors</caption>
          <TableHead>
            <TableRow>
              <TableCell scope='col'>Contractor</TableCell>
              <TableCell scope='col'>Tipo</TableCell>
              <TableCell scope='col'>Estado</TableCell>
              <TableCell scope='col'>Monto</TableCell>
              <TableCell scope='col'>Responsable</TableCell>
              <TableCell scope='col' align='right'>
                Acción
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => {
              const selected = row.contractorEngagementId === selectedId

              return (
                <TableRow
                  key={row.contractorEngagementId}
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
                        {row.engagementPublicId} · {row.country}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{row.relationshipSubtype}</TableCell>
                  <TableCell>
                    <CustomChip
                      round='true'
                      size='small'
                      variant='tonal'
                      color={toneToColor[row.statusTone]}
                      label={row.statusLabel}
                    />
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.amount}</TableCell>
                  <TableCell>{row.responsable}</TableCell>
                  <TableCell align='right'>
                    <Button
                      size='small'
                      variant={selected ? 'contained' : 'tonal'}
                      onClick={() => onSelect(row.contractorEngagementId)}
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
    ) : (
      <Alert severity='info' icon={<i className='tabler-clipboard-check' />} role='status'>
        No hay casos contractor en revisión. Cuando llegue un envío o un bloqueo, aparecerá aquí.
      </Alert>
    )}
  </OperationalPanel>
)

const BLOCKED_PAYABLE_SIGNAL = {
  title: 'Payable bloqueado',
  description:
    'El payable no cumple los gates de preparación (invoice, tax owner, FX o cuenta de pago). Se resuelve en Finance.',
  statusLabel: 'Finance'
} as const

const ReadinessPanel = ({ row }: { row: ContractorWorkbenchQueueRow }) => {
  const hasBlocked = row.blockedPayableCount > 0

  return (
    <OperationalPanel title='Preparación del payable' icon='tabler-shield-dollar' iconColor='warning'>
      {hasBlocked ? (
        <OperationalSignalList
          items={[
            {
              id: `${row.contractorEngagementId}-blocked`,
              title: BLOCKED_PAYABLE_SIGNAL.title,
              description: BLOCKED_PAYABLE_SIGNAL.description,
              statusLabel: BLOCKED_PAYABLE_SIGNAL.statusLabel,
              statusTone: 'warning',
              statusIcon: 'tabler-alert-circle'
            }
          ]}
          columns={{ xs: 1 }}
        />
      ) : (
        <Alert severity='success' icon={<i className='tabler-circle-check' />}>
          No hay bloqueos de preparación para este caso. El siguiente paso puede avanzar hacia Finance.
        </Alert>
      )}
    </OperationalPanel>
  )
}

const FinanceStepPanel = ({ row }: { row: ContractorWorkbenchQueueRow }) => {
  const hasBlocked = row.blockedPayableCount > 0
  const hasPending = row.pendingCount > 0

  return (
    <OperationalPanel
      title='Paso hacia Finance'
      subheader='El pago nace como obligación; no como pago directo ni ajuste de otro dominio.'
      icon='tabler-building-bank'
      iconColor='info'
    >
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <PasoStep
            title='Envío de trabajo'
            status={hasPending ? 'En revisión' : 'Sin envío pendiente'}
            tone={hasPending ? 'info' : 'secondary'}
            detail='Evidencia operacional y monto bruto del periodo.'
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PasoStep
            title='Contractor payable'
            status={hasBlocked ? 'Bloqueado' : 'Listo'}
            tone={hasBlocked ? 'warning' : 'success'}
            detail='Preparación de invoice, tax owner, FX y cuenta de pago.'
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PasoStep
            title='Obligación Finance'
            status={hasBlocked ? 'Pendiente' : 'Lista para generar'}
            tone={hasBlocked ? 'secondary' : 'info'}
            detail='Obligación idempotente por contractor payable.'
          />
        </Grid>
      </Grid>
    </OperationalPanel>
  )
}

const AdminInspector = ({
  row,
  onReview
}: {
  row: ContractorWorkbenchQueueRow
  onReview: () => void
}) => (
  <OperationalPanel
    title='Inspector'
    subheader={row.nextAction}
    icon='tabler-user-check'
    iconColor={toneToColor[row.statusTone]}
    action={
      <CustomChip round='true' size='small' variant='tonal' color={toneToColor[row.statusTone]} label={row.statusLabel} />
    }
  >
    <Stack spacing={4}>
      <Stack spacing={2}>
        <DetailRow label='Contractor' value={row.contractorName} />
        <DetailRow label='Engagement' value={row.engagementPublicId} />
        <DetailRow label='Relación' value={row.relationshipSubtype} />
        <DetailRow label='País' value={row.country} />
        <DetailRow label='Entidad contratante' value={row.legalEntityLabel} />
        <DetailRow label='Compliance' value={row.classificationRiskStatus} />
        <DetailRow label='Envíos en revisión' value={String(row.pendingCount)} />
        <DetailRow label='Payables bloqueados' value={String(row.blockedPayableCount)} />
      </Stack>

      <Divider />

      <Stack spacing={2}>
        <Typography variant='subtitle2'>Revisión del envío</Typography>
        <Button
          variant='contained'
          size='small'
          startIcon={<i className='tabler-checkup-list' />}
          onClick={onReview}
          data-capture='admin-review-action'
        >
          Revisar envío
        </Button>
        <Typography variant='caption' color='text.secondary'>
          Aprobar habilita la preparación del payable. La aprobación no ejecuta el pago.
        </Typography>
      </Stack>
    </Stack>
  </OperationalPanel>
)

const CompensationPanel = ({
  row,
  onEdit
}: {
  row: ContractorWorkbenchQueueRow
  onEdit: () => void
}) => {
  const hasRate = row.agreedRate.rateAmount !== null

  const money = (n: number, currency: string) =>
    formatCurrency(n, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, 'es-CL')

  return (
    <OperationalPanel
      title={CC.editor.panelTitle}
      subheader={CC.editor.panelSubheader}
      icon='tabler-coin'
      iconColor={hasRate ? 'primary' : 'warning'}
      action={
        hasRate ? (
          <Button size='small' variant='tonal' startIcon={<i className='tabler-edit' />} onClick={onEdit}>
            {CC.editor.editCta}
          </Button>
        ) : null
      }
    >
      {hasRate ? (
        <Stack spacing={0.5}>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {CC.editor.amountLabel} · {rateTypeLabel(row.agreedRate.rateType)} · {cadenceLabel(row.agreedRate.paymentCadence)}
          </Typography>
          <Typography variant='h5' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
            {money(row.agreedRate.rateAmount as number, row.agreedRate.currency)}
            <Typography component='span' variant='body2' sx={{ color: 'text.secondary', fontWeight: 400 }}>
              {' '}/ {cadencePaymentUnitLabel(row.agreedRate.paymentCadence)}
            </Typography>
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={3} alignItems='flex-start'>
          <Alert severity='warning' icon={<i className='tabler-alert-triangle' />} sx={{ width: '100%' }}>
            {CC.editor.emptyDescription}
          </Alert>
          <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={onEdit}>
            {CC.editor.defineCta}
          </Button>
        </Stack>
      )}
    </OperationalPanel>
  )
}

const ContractorAdminWorkbenchView = ({ initialProjection }: ContractorAdminWorkbenchViewProps) => {
  const [projection, setProjection] = useState<ContractorHrWorkbenchProjection>(initialProjection)

  const [selectedId, setSelectedId] = useState<string | null>(
    initialProjection.queue[0]?.contractorEngagementId ?? null
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerDecision, setDrawerDecision] = useState<ReviewDecision>('approve')
  const [compDrawerOpen, setCompDrawerOpen] = useState(false)

  const selected = useMemo(
    () => projection.queue.find(row => row.contractorEngagementId === selectedId) ?? null,
    [projection.queue, selectedId]
  )

  const refetch = useCallback(async () => {
    try {
      const response = await fetch('/api/hr/contractors/workbench', { cache: 'no-store' })

      if (!response.ok) return

      const next = (await response.json().catch(() => null)) as ContractorHrWorkbenchProjection | null

      if (!next) return

      setProjection(next)

      // Keep the current selection if it still exists; otherwise fall back to the first row.
      const stillExists = next.queue.some(row => row.contractorEngagementId === selectedId)

      if (!stillExists) {
        setSelectedId(next.queue[0]?.contractorEngagementId ?? null)
      }
    } catch {
      // Refetch failures are non-blocking; the mutation already succeeded server-side.
    }
  }, [selectedId])

  const openReview = (decision: ReviewDecision) => {
    if (!selected) return

    setDrawerDecision(decision)
    setDrawerOpen(true)
  }

  const handleReviewed = useCallback(() => {
    void refetch()
    setDrawerOpen(false)
  }, [refetch])

  const signalItems = projection.signals.map(signal => ({
    id: signal.id,
    title: signal.title,
    description: signal.description,
    statusLabel: signal.statusLabel,
    statusTone: toneToColor[signal.statusTone],
    statusIcon: signal.statusIcon
  }))

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>Gestión contractor</Typography>
        <Typography variant='body2' color='text.secondary'>
          Revisión operacional de contractors, evidencia y preparación antes de Finance.
        </Typography>
      </Box>

      {projection.degraded.length > 0 ? (
        <Alert severity='warning' icon={<i className='tabler-alert-triangle' />}>
          {projection.degraded[0]?.message ?? 'Algunos datos no se pudieron cargar. Intenta actualizar la página.'}
        </Alert>
      ) : null}

      <AdminHero selected={selected} onReview={() => openReview(selected?.statusTone === 'warning' ? 'dispute' : 'approve')} />

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricSummaryCard
            title='En revisión'
            value={String(projection.totals.inReview)}
            subtitle='Envíos enviados o disputados'
            icon='tabler-clipboard-check'
            iconColor='info'
            statusLabel='Operacional'
            statusTone='info'
            statusIcon='tabler-info-circle'
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricSummaryCard
            title='Bloqueados'
            value={String(projection.totals.blocked)}
            subtitle='Preparación pendiente'
            icon='tabler-lock'
            iconColor='warning'
            statusLabel='Requiere responsable'
            statusTone='warning'
            statusIcon='tabler-alert-circle'
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricSummaryCard
            title='Listos a Finance'
            value={String(projection.totals.readyForFinance)}
            subtitle='Sin bloqueos de preparación'
            icon='tabler-building-bank'
            iconColor='success'
            statusLabel='Puente'
            statusTone='success'
            statusIcon='tabler-circle-check'
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <MetricSummaryCard
            title='Pagados'
            value={String(projection.totals.paid)}
            subtitle='Obligación conciliada'
            icon='tabler-circle-check'
            iconColor='success'
            statusLabel='Cerrado'
            statusTone='success'
            statusIcon='tabler-circle-check'
          />
        </Grid>
      </Grid>

      <Grid container spacing={6} alignItems='stretch'>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Stack spacing={6}>
            <AdminQueueTable rows={projection.queue} selectedId={selectedId} onSelect={setSelectedId} />
            {selected ? (
              <>
                <ReadinessPanel row={selected} />
                <FinanceStepPanel row={selected} />
              </>
            ) : null}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, xl: 4 }}>
          <Stack spacing={6}>
            {selected ? (
              <>
                <CompensationPanel row={selected} onEdit={() => setCompDrawerOpen(true)} />
                <ContractorGuardrailPanel row={selected} onResolved={() => void refetch()} />
                <AdminInspector row={selected} onReview={() => openReview('approve')} />
              </>
            ) : (
              <OperationalPanel title='Inspector' icon='tabler-user-check' iconColor='secondary'>
                <Alert severity='info' icon={<i className='tabler-info-circle' />} role='status'>
                  Selecciona un caso de la cola para ver su detalle y revisar el envío.
                </Alert>
              </OperationalPanel>
            )}
          </Stack>
        </Grid>
      </Grid>

      <OperationalPanel
        title='Señales operativas'
        subheader='Estado de salud de la operación contractor.'
        icon='tabler-activity-heartbeat'
        iconColor='primary'
      >
        {signalItems.length > 0 ? (
          <OperationalSignalList items={signalItems} columns={{ xs: 1, md: 2, xl: 4 }} />
        ) : (
          <Alert severity='success' icon={<i className='tabler-circle-check' />} role='status'>
            Sin señales de atención en la operación contractor.
          </Alert>
        )}
      </OperationalPanel>

      <RemittanceAdviceSection
        items={projection.remittances}
        audience='admin'
        endpointBase='/api/hr/contractors/remittance'
      />

      <AdminReviewDecisionDrawer
        open={drawerOpen}
        queueRow={selected}
        initialDecision={drawerDecision}
        onClose={() => setDrawerOpen(false)}
        onReviewed={handleReviewed}
      />

      {selected ? (
        <ContractorEngagementCompensationDrawer
          open={compDrawerOpen}
          engagement={{
            contractorEngagementId: selected.contractorEngagementId,
            publicId: selected.engagementPublicId,
            contractorName: selected.contractorName,
            relationshipSubtypeLabel: selected.relationshipSubtype,
            rateType: selected.agreedRate.rateType,
            rateAmount: selected.agreedRate.rateAmount,
            paymentCadence: selected.agreedRate.paymentCadence,
            currency: selected.agreedRate.currency
          }}
          onClose={() => setCompDrawerOpen(false)}
          onSaved={() => {
            setCompDrawerOpen(false)
            void refetch()
          }}
        />
      ) : null}
    </Stack>
  )
}

export default ContractorAdminWorkbenchView
