'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import type { PayrollCurrency } from '@/types/payroll'

// TASK-412 — side drawer that lists every version of a payroll entry
// (v1, v2, …) so HR admins can audit what changed between reliquidations.
// Reads `/api/hr/payroll/entries/[entryId]/versions` on open.

interface EntryVersion {
  entryId: string
  version: number
  isActive: boolean
  supersededBy: string | null
  reopenAuditId: string | null
  grossTotal: number
  netTotal: number
  createdAt: string | null
  updatedAt: string | null
}

interface VersionsResponse {
  entryId: string
  periodId: string
  memberId: string
  memberName: string
  currency: PayrollCurrency
  versions: EntryVersion[]
}

interface Props {
  open: boolean
  onClose: () => void
  entryId: string | null
  memberName?: string | null
}

const formatMoney = (value: number, currency: PayrollCurrency) =>
  currency === 'CLP'
    ? `$${Math.round(value).toLocaleString('es-CL')}`
    : `US$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatAbsoluteTime = (value: string | null) => {
  if (!value) return '—'

  try {
    return new Date(value).toLocaleString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return value
  }
}

const formatSignedMoney = (delta: number, currency: PayrollCurrency) => {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  const absValue = Math.abs(delta)

  return `${sign}${formatMoney(absValue, currency)}`
}

const EntryVersionHistoryDrawer = ({ open, onClose, entryId, memberName }: Props) => {
  const [data, setData] = useState<VersionsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !entryId) {
      if (!open) {
        setData(null)
        setError(null)
      }

      return
    }

    let active = true

    setLoading(true)
    setError(null)

    const loadVersions = async () => {
      try {
        const res = await fetch(`/api/hr/payroll/entries/${entryId}/versions`)

        if (!res.ok) {
          const body = await res.json().catch(() => null)

          throw new Error(body?.error || 'No se pudo cargar el historial de versiones.')
        }

        const payload = (await res.json()) as VersionsResponse

        if (active) {
          setData(payload)
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el historial de versiones.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadVersions()

    return () => {
      active = false
    }
  }, [open, entryId])

  const versions = data?.versions ?? []
  const currency: PayrollCurrency = data?.currency ?? 'CLP'
  const displayedName = data?.memberName ?? memberName ?? null

  // Sort versions so active/highest-version card appears first. The API
  // already returns them ordered DESC by version, but we normalize here.
  const orderedVersions = [...versions].sort((a, b) => b.version - a.version)

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 460 } } }}
    >
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Stack>
            <Typography variant='h6'>Historial de versiones</Typography>
            {displayedName && (
              <Typography variant='body2' color='text.secondary'>
                {displayedName}
              </Typography>
            )}
          </Stack>
          <IconButton onClick={onClose} size='small' aria-label='Cerrar historial de versiones'>
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {loading && (
          <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 4 }}>
            <CircularProgress size={18} />
            <Typography variant='body2' color='text.secondary'>
              Cargando versiones…
            </Typography>
          </Stack>
        )}

        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && orderedVersions.length === 0 && (
          <Alert severity='info'>
            Este entry todavía no tiene historial de reliquidaciones.
          </Alert>
        )}

        {!loading && !error && orderedVersions.length > 0 && (
          <Stack spacing={2}>
            {orderedVersions.map((version, index) => {
              const previous = orderedVersions[index + 1] ?? null
              const grossDelta = previous ? version.grossTotal - previous.grossTotal : 0
              const netDelta = previous ? version.netTotal - previous.netTotal : 0

              return (
                <Card
                  key={version.entryId}
                  variant='outlined'
                  sx={{
                    borderLeft: '4px solid',
                    borderLeftColor: version.isActive ? 'success.main' : 'text.disabled'
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Stack direction='row' spacing={1.5} alignItems='center' justifyContent='space-between'>
                        <Stack direction='row' spacing={1.25} alignItems='center'>
                          <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                            Versión {version.version}
                          </Typography>
                          <CustomChip
                            round='true'
                            size='small'
                            variant='tonal'
                            color={version.isActive ? 'success' : 'secondary'}
                            label={version.isActive ? 'Activa' : 'Archivada'}
                          />
                          {version.version > 1 && (
                            <CustomChip
                              round='true'
                              size='small'
                              color='warning'
                              label='Reliquidada'
                              icon={<i className='tabler-arrow-back-up' />}
                            />
                          )}
                        </Stack>
                      </Stack>

                      <Stack direction='row' spacing={3}>
                        <Stack spacing={0.25}>
                          <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Bruto
                          </Typography>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                            {formatMoney(version.grossTotal, currency)}
                          </Typography>
                          {previous && grossDelta !== 0 && (
                            <Typography
                              variant='caption'
                              color={grossDelta > 0 ? 'success.main' : 'error.main'}
                            >
                              {formatSignedMoney(grossDelta, currency)} vs v{previous.version}
                            </Typography>
                          )}
                        </Stack>
                        <Stack spacing={0.25}>
                          <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Neto
                          </Typography>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {formatMoney(version.netTotal, currency)}
                          </Typography>
                          {previous && netDelta !== 0 && (
                            <Typography
                              variant='caption'
                              color={netDelta > 0 ? 'success.main' : 'error.main'}
                            >
                              {formatSignedMoney(netDelta, currency)} vs v{previous.version}
                            </Typography>
                          )}
                        </Stack>
                      </Stack>

                      <Divider />

                      <Stack spacing={0.5}>
                        <Typography variant='caption' color='text.secondary'>
                          Creada: {formatAbsoluteTime(version.createdAt)}
                        </Typography>
                        {version.updatedAt && version.updatedAt !== version.createdAt && (
                          <Typography variant='caption' color='text.secondary'>
                            Actualizada: {formatAbsoluteTime(version.updatedAt)}
                          </Typography>
                        )}
                        {version.reopenAuditId && (
                          <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            Audit: {version.reopenAuditId}
                          </Typography>
                        )}
                      </Stack>

                      <Link
                        href={`/api/hr/payroll/entries/${version.entryId}/receipt`}
                        target='_blank'
                        rel='noopener noreferrer'
                        sx={{ fontSize: '0.8rem', alignSelf: 'flex-start' }}
                      >
                        Descargar PDF de esta versión
                      </Link>
                    </Stack>
                  </CardContent>
                </Card>
              )
            })}
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}

export default EntryVersionHistoryDrawer
