'use client'

// TASK-960 — shared "Comprobantes de pago" section for the contractor Self-Service
// Hub + Admin Workbench. Renders the remittance list (cards on self / table on
// admin), a drawer holding the in-app viewer (fetched lazily from the endpoint),
// and Ver / Descargar PDF actions. Replicates the approved mockup integration.

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { OperationalPanel } from '@/components/greenhouse/primitives'
import { formatCurrency, type CurrencyCode } from '@/lib/format'
import { getMicrocopy } from '@/lib/copy'
import { getRemittanceSurfaceCopy } from '@/lib/copy/remittance'
import type { ContractorRemittanceItem } from '@/lib/contractor-engagements/projection-types'
import type { RemittancePresentation } from '@/lib/contractor-engagements/remittance/types'

import RemittanceAdviceViewer from './RemittanceAdviceViewer'

const copy = getRemittanceSurfaceCopy('es-CL')
const aria = getMicrocopy('es-CL').aria

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const formatShortDate = (iso: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)

  if (!match) return iso

  return `${match[3]} ${MONTHS_ES[Number(match[2]) - 1] ?? match[2]} ${match[1]}`
}

const formatNet = (amount: number, currency: string) =>
  formatCurrency(amount, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, 'es-CL')

interface RemittanceAdviceSectionProps {
  items: ContractorRemittanceItem[]
  audience: 'self' | 'admin'
  /** e.g. `/api/my/contractor/remittance` or `/api/hr/contractors/remittance`. */
  endpointBase: string
}

const RemittanceAdviceSection = ({ items, audience, endpointBase }: RemittanceAdviceSectionProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [presentation, setPresentation] = useState<RemittancePresentation | null>(null)

  const openViewer = async (payableId: string) => {
    setDrawerOpen(true)
    setLoading(true)
    setError(null)
    setPresentation(null)

    try {
      const response = await fetch(`${endpointBase}/${payableId}`, { cache: 'no-store' })

      if (!response.ok) throw new Error('load_failed')

      const payload = (await response.json().catch(() => null)) as { presentation?: RemittancePresentation } | null

      if (!payload?.presentation) throw new Error('load_failed')

      setPresentation(payload.presentation)
    } catch {
      setError(copy.loadError)
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = (payableId: string) => {
    window.open(`${endpointBase}/${payableId}?format=pdf`, '_blank', 'noopener')
  }

  const title = audience === 'admin' ? copy.adminTitle : copy.listTitle

  const drawer = (
    <Drawer anchor='right' open={drawerOpen} onClose={() => setDrawerOpen(false)}>
      <Box sx={{ width: { xs: '100vw', sm: 560 }, p: { xs: 4, sm: 6 } }} role='dialog' aria-label={copy.drawerTitle}>
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 4 }}>
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            {copy.drawerTitle}
          </Typography>
          <IconButton onClick={() => setDrawerOpen(false)} aria-label={aria.closeDrawer}>
            <i className='tabler-x' />
          </IconButton>
        </Stack>

        {loading ? (
          <Stack alignItems='center' sx={{ py: 8 }}>
            <CircularProgress />
          </Stack>
        ) : error ? (
          <Alert severity='error' icon={<i className='tabler-alert-triangle' />}>
            {error}
          </Alert>
        ) : presentation ? (
          <RemittanceAdviceViewer presentation={presentation} />
        ) : null}
      </Box>
    </Drawer>
  )

  if (items.length === 0) {
    return (
      <OperationalPanel title={title} subheader={copy.hubHint} icon='tabler-receipt' iconColor='secondary'>
        <Alert severity='info' icon={<i className='tabler-receipt-off' />} role='status'>
          {copy.emptyDescription}
        </Alert>
      </OperationalPanel>
    )
  }

  if (audience === 'admin') {
    return (
      <OperationalPanel title={title} icon='tabler-receipt' iconColor='primary'>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size='small' sx={{ minWidth: 720 }}>
            <caption className='sr-only'>{copy.adminTitle}</caption>
            <TableHead>
              <TableRow>
                <TableCell scope='col'>{copy.payeeCol}</TableCell>
                <TableCell scope='col'>{copy.numberCol}</TableCell>
                <TableCell scope='col'>{copy.netCol}</TableCell>
                <TableCell scope='col'>{copy.dateCol}</TableCell>
                <TableCell scope='col' align='right'>
                  {copy.actionsCol}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.payableId} hover>
                  <TableCell>
                    <Typography variant='subtitle2'>{item.contractorName ?? '—'}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {item.number ?? (
                      <Typography variant='caption' color='text.secondary'>
                        {copy.pendingNumber}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatNet(item.net, item.currency)}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{formatShortDate(item.dateIso)}</TableCell>
                  <TableCell align='right'>
                    <Stack direction='row' spacing={1.5} justifyContent='flex-end'>
                      <Button size='small' variant='tonal' startIcon={<i className='tabler-eye' />} onClick={() => openViewer(item.payableId)}>
                        {copy.view}
                      </Button>
                      <Button size='small' variant='outlined' startIcon={<i className='tabler-download' />} onClick={() => downloadPdf(item.payableId)}>
                        {copy.download}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        {drawer}
      </OperationalPanel>
    )
  }

  return (
    <OperationalPanel title={title} subheader={copy.hubHint} icon='tabler-receipt' iconColor='secondary'>
      <Stack spacing={2}>
        {items.map(item => (
          <Box
            key={item.payableId}
            sx={theme => ({
              p: 3,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.primary.main, 0.02)
            })}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }} spacing={2}>
              <Stack spacing={0.5}>
                <Stack direction='row' spacing={1.5} alignItems='center'>
                  <Typography variant='body2' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {item.number ?? copy.pendingNumber}
                  </Typography>
                  <CustomChip round='true' size='small' variant='tonal' color='secondary' label={item.regimeLabel} />
                </Stack>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {formatNet(item.net, item.currency)} · {formatShortDate(item.dateIso)}
                </Typography>
              </Stack>
              <Stack direction='row' spacing={2}>
                <Button size='small' variant='tonal' startIcon={<i className='tabler-eye' />} onClick={() => openViewer(item.payableId)}>
                  {copy.view}
                </Button>
                <Button size='small' variant='outlined' startIcon={<i className='tabler-download' />} onClick={() => downloadPdf(item.payableId)}>
                  {copy.download}
                </Button>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
      {drawer}
    </OperationalPanel>
  )
}

export default RemittanceAdviceSection
