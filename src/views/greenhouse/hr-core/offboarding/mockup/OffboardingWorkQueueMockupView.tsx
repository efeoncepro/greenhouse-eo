'use client'

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { toast } from 'sonner'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import EmptyState from '@/components/greenhouse/EmptyState'
import FieldsProgressChip from '@/components/greenhouse/primitives/FieldsProgressChip'
import MetricSummaryCard from '@/components/greenhouse/primitives/MetricSummaryCard'
import OperationalPanel from '@/components/greenhouse/primitives/OperationalPanel'
import OperationalStatusBadge from '@/components/greenhouse/primitives/OperationalStatusBadge'
import { getMicrocopy } from '@/lib/copy'

import {
  offboardingQueueItems,
  queueTabs,
  type OffboardingQueueItem,
  type QueueChecklistItem,
  type QueueFilter,
  type QueueTone
} from './mockData'

const checklistIcon: Record<QueueChecklistItem['state'], string> = {
  done: 'tabler-circle-check',
  warning: 'tabler-alert-triangle',
  pending: 'tabler-clock',
  blocked: 'tabler-lock'
}

const checklistTone: Record<QueueChecklistItem['state'], QueueTone> = {
  done: 'success',
  warning: 'warning',
  pending: 'secondary',
  blocked: 'error'
}

const filterItems = (filter: QueueFilter) =>
  offboardingQueueItems.filter(item => item.filters.includes(filter))

const OffboardingWorkQueueMockupView = () => {
  const theme = useTheme()
  const copy = getMicrocopy()
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(offboardingQueueItems[0]?.id ?? null)

  const filteredItems = useMemo(() => filterItems(filter), [filter])
  const selectedItem = offboardingQueueItems.find(item => item.id === selectedItemId) ?? null

  const summary = useMemo(
    () => ({
      attention: filterItems('attention').length,
      ready: filterItems('ready').length,
      documents: filterItems('documents').length,
      noSettlement: filterItems('noSettlement').length
    }),
    []
  )

  const handleAction = (item: OffboardingQueueItem) => {
    toast.success(`${item.primaryAction} preparado para ${item.collaborator.name}.`)
    setSelectedItemId(item.id)
  }

  return (
    <Stack spacing={6}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent='space-between'
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={3}
      >
        <Stack spacing={1}>
          <Typography variant='h4'>Cola de offboarding</Typography>
          <Typography variant='body1' color='text.secondary'>
            Prioriza prerequisitos, cálculo, emisión y cierre contractual desde una sola cola.
          </Typography>
        </Stack>
        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
          <Button variant='tonal' color='secondary' startIcon={<i className='tabler-refresh' aria-hidden='true' />}>
            Actualizar
          </Button>
          <Button variant='contained' startIcon={<i className='tabler-plus' aria-hidden='true' />}>
            Nuevo caso
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(4, minmax(0, 1fr))'
          },
          gap: 4
        }}
      >
        <MetricSummaryCard
          title='Requieren acción'
          value={summary.attention}
          subtitle='Cartas, declaración o ratificación pendiente'
          icon='tabler-alert-triangle'
          iconColor='warning'
          statusLabel='Atención HR'
          statusTone='warning'
        />
        <MetricSummaryCard
          title='Listos para cálculo'
          value={summary.ready}
          subtitle='Prerequisitos legales completos'
          icon='tabler-calculator'
          iconColor='success'
          statusLabel='Siguiente paso claro'
          statusTone='success'
        />
        <MetricSummaryCard
          title='Documentos'
          value={summary.documents}
          subtitle='Emitir, reemitir o ratificar'
          icon='tabler-file-text'
          iconColor='primary'
          statusLabel='Legal en curso'
          statusTone='primary'
        />
        <MetricSummaryCard
          title='Sin finiquito laboral'
          value={summary.noSettlement}
          subtitle='Honorarios o proveedor externo'
          icon='tabler-briefcase'
          iconColor='secondary'
          statusLabel='Cierre separado'
          statusTone='secondary'
        />
      </Box>

      <OperationalPanel
        title='Casos de salida'
        subheader='Cada fila muestra el bloqueo real y la acción más próxima.'
        icon='tabler-list-check'
        action={
          <Tooltip title='La proyección backend debería entregar esta cola ya resuelta'>
            <IconButton aria-label={copy.aria.moreActions}>
              <i className='tabler-info-circle' aria-hidden='true' />
            </IconButton>
          </Tooltip>
        }
      >
        <Stack spacing={4}>
          <Alert severity='info' variant='outlined'>
            Datos parciales se muestran como bloqueo o advertencia; la cola no infiere completitud cuando faltan respaldos.
          </Alert>

          <Tabs
            value={filter}
            onChange={(_, value: QueueFilter) => setFilter(value)}
            variant='scrollable'
            allowScrollButtonsMobile
            aria-label={copy.aria.filterInput}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40
              }
            }}
          >
            {queueTabs.map(tab => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={`${tab.label} (${filterItems(tab.value).length})`}
              />
            ))}
          </Tabs>

          {filteredItems.length ? (
            <DataTableShell
              identifier='offboarding-work-queue-mockup'
              ariaLabel='Cola operacional de offboarding'
              density='compact'
              stickyFirstColumn
            >
              <Table size='small' sx={{ minWidth: 1040 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Caso</TableCell>
                    <TableCell>Colaborador</TableCell>
                    <TableCell>Salida</TableCell>
                    <TableCell>Estado operativo</TableCell>
                    <TableCell>Próximo paso</TableCell>
                    <TableCell align='right'>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map(item => {
                    const isSelected = item.id === selectedItemId

                    return (
                      <TableRow
                        key={item.id}
                        hover
                        selected={isSelected}
                        tabIndex={0}
                        onClick={() => setSelectedItemId(item.id)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedItemId(item.id)
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&.Mui-selected': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08)
                          },
                          '&:focus-visible': {
                            outline: `2px solid ${theme.palette.primary.main}`,
                            outlineOffset: -2
                          }
                        }}
                      >
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant='body2' fontWeight={600}>
                              {item.publicId}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {item.causal}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction='row' spacing={2} alignItems='center'>
                            <CustomAvatar skin='light' color='primary' size={34}>
                              {item.collaborator.initials}
                            </CustomAvatar>
                            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                              <Typography variant='body2' fontWeight={600} noWrap>
                                {item.collaborator.name}
                              </Typography>
                              <Typography variant='caption' color='text.secondary' noWrap>
                                {item.collaborator.role}
                              </Typography>
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant='body2'>{item.effectiveDate}</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              Último día {item.lastWorkingDay}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1}>
                            <OperationalStatusBadge label={item.statusLabel} tone={item.statusTone} />
                            <FieldsProgressChip
                              filled={item.progress.filled}
                              total={item.progress.total}
                              readyLabel={item.progress.readyLabel}
                              nextStepHint={item.progress.nextStepHint}
                              srLabel={(filled, total) =>
                                `${item.collaborator.name}: ${filled} de ${total} pasos completos.`
                              }
                              suffix={total => `de ${total} pasos`}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1} sx={{ maxWidth: 320 }}>
                            <Typography variant='body2'>{item.nextStep}</Typography>
                            {item.amountLabel ? (
                              <Typography
                                variant='caption'
                                sx={{ fontWeight: 600, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
                              >
                                {item.amountLabel}
                              </Typography>
                            ) : null}
                            {item.blockerCopy ? (
                              <Typography variant='caption' color='text.secondary'>
                                {item.blockerCopy}
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell align='right'>
                          <Button
                            variant={item.statusTone === 'warning' ? 'contained' : 'tonal'}
                            color={item.statusTone === 'secondary' ? 'secondary' : 'primary'}
                            size='small'
                            onClick={event => {
                              event.stopPropagation()
                              handleAction(item)
                            }}
                          >
                            {item.primaryAction}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </DataTableShell>
          ) : (
            <EmptyState
              icon='tabler-filter-off'
              title='Sin casos en este filtro'
              description='Cambia el filtro o crea un caso de salida para continuar.'
              action={<Button variant='contained'>Nuevo caso</Button>}
            />
          )}
        </Stack>
      </OperationalPanel>

      <Drawer
        anchor='right'
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItemId(null)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 520 },
            maxWidth: '100%'
          }
        }}
      >
        {selectedItem ? (
          <Stack spacing={5} sx={{ p: 6 }}>
            <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
              <Stack spacing={1}>
                <Typography variant='h5'>{selectedItem.collaborator.name}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {selectedItem.publicId}
                </Typography>
              </Stack>
              <IconButton aria-label={copy.aria.closeDrawer} onClick={() => setSelectedItemId(null)}>
                <i className='tabler-x' aria-hidden='true' />
              </IconButton>
            </Stack>

            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
              <OperationalStatusBadge label={selectedItem.statusLabel} tone={selectedItem.statusTone} />
              <CustomChip round='true' size='small' variant='tonal' color='secondary' label={selectedItem.lane} />
            </Stack>

            <Stack spacing={2}>
              <Typography variant='subtitle1'>Preparación del caso</Typography>
              <LinearProgress
                variant='determinate'
                value={Math.round((selectedItem.progress.filled / selectedItem.progress.total) * 100)}
                aria-label={`Avance del caso ${selectedItem.publicId}`}
                sx={{ height: 6, borderRadius: 999 }}
              />
              <Typography variant='body2' color='text.secondary'>
                {selectedItem.nextStep}
              </Typography>
            </Stack>

            <Divider />

            <Stack spacing={3}>
              <Typography variant='subtitle1'>Checklist operativo</Typography>
              {selectedItem.checklist.map(check => (
                <Stack key={check.id} direction='row' spacing={2} alignItems='center'>
                  <OperationalStatusBadge
                    label={check.label}
                    tone={checklistTone[check.state]}
                    icon={checklistIcon[check.state]}
                  />
                </Stack>
              ))}
            </Stack>

            <Divider />

            <Stack spacing={3}>
              <Typography variant='subtitle1'>Acciones</Typography>
              <Button
                variant='contained'
                fullWidth
                startIcon={<i className='tabler-arrow-right' aria-hidden='true' />}
                onClick={() => handleAction(selectedItem)}
              >
                {selectedItem.primaryAction}
              </Button>
              <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                {selectedItem.secondaryActions.map(action => (
                  <Button key={action} variant='tonal' color='secondary' size='small'>
                    {action}
                  </Button>
                ))}
              </Stack>
            </Stack>

            {selectedItem.blockerCopy ? (
              <Alert severity={selectedItem.statusTone === 'secondary' ? 'info' : 'warning'} variant='outlined'>
                {selectedItem.blockerCopy}
              </Alert>
            ) : null}
          </Stack>
        ) : null}
      </Drawer>
    </Stack>
  )
}

export default OffboardingWorkQueueMockupView
