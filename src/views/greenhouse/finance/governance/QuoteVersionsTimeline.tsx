'use client'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

interface VersionDiffLineItem {
  label: string
  unitPrice: number | null
  quantity: number | null
  subtotalPrice: number | null
}

interface VersionDiffChange {
  label: string
  field: string
  oldValue: string | number | null
  newValue: string | number | null
  deltaPct: number | null
}

interface VersionDiff {
  added: VersionDiffLineItem[]
  removed: VersionDiffLineItem[]
  changed: VersionDiffChange[]
  impact: {
    previousTotal: number | null
    currentTotal: number | null
    totalDeltaPct: number | null
    previousMargin: number | null
    currentMargin: number | null
    marginDelta: number | null
  }
}

export interface VersionHistoryEntry {
  versionId: string
  versionNumber: number
  totalPrice: number | null
  totalCost: number | null
  totalDiscount: number | null
  effectiveMarginPct: number | null
  createdBy: string
  createdAt: string
  notes: string | null
  diffFromPrevious: VersionDiff | null
}

interface Props {
  loading: boolean
  error: string | null
  versions: VersionHistoryEntry[]
  currentVersion: number | null
  quotationStatus: string
  canCreateVersion: boolean
  onCreateVersion: () => void
  creatingVersion: boolean
}

const formatCLP = (amount: number | null) => {
  if (amount === null) return '—'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDate = (iso: string) => {
  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) return iso

  return d.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
}

const formatPct = (value: number | null) => {
  if (value === null) return '—'

  return `${value.toFixed(2)}%`
}

const QuoteVersionsTimeline = ({
  loading,
  error,
  versions,
  currentVersion,
  quotationStatus,
  canCreateVersion,
  onCreateVersion,
  creatingVersion
}: Props) => {
  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant='rounded' height={60} />
        <Skeleton variant='rounded' height={140} />
        <Skeleton variant='rounded' height={140} />
      </Stack>
    )
  }

  if (error) {
    return <Alert severity='error'>{error}</Alert>
  }

  if (versions.length === 0) {
    return (
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='body2' color='text.secondary' align='center'>
            Aún no hay versiones registradas para esta cotización.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const lockedForNewVersion =
    quotationStatus === 'pending_approval' || quotationStatus === 'converted'

  return (
    <Stack spacing={3}>
      <Card variant='outlined'>
        <CardHeader
          title='Historial de versiones'
          subheader={`${versions.length} versión${versions.length === 1 ? '' : 'es'} · vigente v${currentVersion ?? '?'}`}
          action={
            canCreateVersion ? (
              <Button
                variant='contained'
                size='small'
                startIcon={<i className='tabler-git-branch' />}
                disabled={creatingVersion || lockedForNewVersion}
                onClick={onCreateVersion}
              >
                {creatingVersion ? 'Creando…' : 'Nueva versión'}
              </Button>
            ) : null
          }
        />
        {lockedForNewVersion && canCreateVersion && (
          <Box sx={{ px: 3, pb: 2 }}>
            <Alert severity='info'>
              No se puede crear una versión mientras la cotización esté en {quotationStatus}. Espera a que termine la aprobación o conversión para continuar.
            </Alert>
          </Box>
        )}
      </Card>

      <Stack spacing={2}>
        {versions.map(version => {
          const isCurrent = version.versionNumber === currentVersion
          const diff = version.diffFromPrevious

          return (
            <Card key={version.versionId} variant='outlined'>
              <CardHeader
                avatar={
                  <Avatar
                    variant='rounded'
                    sx={{
                      bgcolor: isCurrent ? 'primary.lightOpacity' : 'secondary.lightOpacity',
                      fontWeight: 600
                    }}
                  >
                    v{version.versionNumber}
                  </Avatar>
                }
                title={
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Typography variant='subtitle1' sx={{ fontWeight: 500 }}>
                      Versión {version.versionNumber}
                    </Typography>
                    {isCurrent && (
                      <Chip label='Vigente' size='small' color='primary' variant='outlined' />
                    )}
                  </Stack>
                }
                subheader={`${formatDate(version.createdAt)} · ${version.createdBy}`}
              />
              <Divider />
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    divider={<Divider orientation='vertical' flexItem />}
                  >
                    <Box>
                      <Typography variant='caption' color='text.secondary'>
                        Total
                      </Typography>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCLP(version.totalPrice)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant='caption' color='text.secondary'>
                        Margen efectivo
                      </Typography>
                      <Typography variant='body2'>{formatPct(version.effectiveMarginPct)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant='caption' color='text.secondary'>
                        Descuento
                      </Typography>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCLP(version.totalDiscount)}
                      </Typography>
                    </Box>
                  </Stack>

                  {version.notes && (
                    <Box>
                      <Typography variant='caption' color='text.secondary'>
                        Notas
                      </Typography>
                      <Typography variant='body2'>{version.notes}</Typography>
                    </Box>
                  )}

                  {diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0) && (
                    <Box>
                      <Typography variant='subtitle2' sx={{ mb: 1 }}>
                        Cambios respecto a la versión anterior
                      </Typography>
                      <Stack spacing={0.5}>
                        {diff.impact.totalDeltaPct !== null && (
                          <Typography variant='caption' color='text.secondary'>
                            Variación total: {diff.impact.totalDeltaPct.toFixed(2)}%
                          </Typography>
                        )}
                        {diff.added.length > 0 && (
                          <Typography variant='body2' color='success.main'>
                            + {diff.added.length} ítem(s) agregado(s): {diff.added.map(a => a.label).join(', ')}
                          </Typography>
                        )}
                        {diff.removed.length > 0 && (
                          <Typography variant='body2' color='error.main'>
                            − {diff.removed.length} ítem(s) removido(s): {diff.removed.map(r => r.label).join(', ')}
                          </Typography>
                        )}
                        {diff.changed.slice(0, 5).map((change, idx) => (
                          <Typography
                            key={`${change.label}-${change.field}-${idx}`}
                            variant='body2'
                            color='warning.main'
                          >
                            {change.label} · {change.field}: {String(change.oldValue ?? '—')} → {String(change.newValue ?? '—')}
                            {change.deltaPct !== null ? ` (${change.deltaPct.toFixed(2)}%)` : ''}
                          </Typography>
                        ))}
                        {diff.changed.length > 5 && (
                          <Typography variant='caption' color='text.secondary'>
                            y {diff.changed.length - 5} cambio(s) más…
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )
        })}
      </Stack>
    </Stack>
  )
}

export default QuoteVersionsTimeline
