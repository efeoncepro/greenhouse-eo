'use client'

import { startTransition, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
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

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import tableStyles from '@core/styles/table.module.css'

import {
  getConflictAvailableFields,
  getConflictDiffRows,
  getConflictDisplayName,
  getDefaultAction,
  getDefaultFieldForAction,
  getDuplicateProducts,
  getHubSpotSnapshot,
  getLocalSnapshot,
  getSupportedActions
} from './action-support'
import {
  fieldLabelFromKey,
  formatConflictFieldLabel,
  formatCurrency,
  formatDateTime,
  formatFieldValue,
  formatRelativeAge,
  formatSnapshotValue
} from './formatters'
import type {
  ProductSyncConflictAction,
  ProductSyncConflictDetail,
  ProductSyncConflictField,
  ProductSyncConflictResolveResponse
} from './types'
import {
  PRODUCT_SOURCE_KIND_LABELS,
  PRODUCT_SYNC_CONFLICT_FIELD_LABELS,
  PRODUCT_SYNC_CONFLICT_RESOLUTION_LABELS,
  PRODUCT_SYNC_CONFLICT_TYPE_LABELS
} from './types'

type Props = {
  conflictId: string
}

const STATUS_TONES = {
  pending: 'error',
  resolved_greenhouse_wins: 'success',
  resolved_hubspot_wins: 'warning',
  ignored: 'secondary'
} as const

const TYPE_TONES = {
  orphan_in_hubspot: 'warning',
  orphan_in_greenhouse: 'info',
  field_drift: 'warning',
  sku_collision: 'error',
  archive_mismatch: 'secondary'
} as const

const buildDetailUrl = (conflictId: string) => `/api/admin/commercial/product-sync-conflicts/${conflictId}`

const ProductSyncConflictDetailView = ({ conflictId }: Props) => {
  const router = useRouter()
  const [detail, setDetail] = useState<ProductSyncConflictDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [reason, setReason] = useState('')
  const [selectedAction, setSelectedAction] = useState<ProductSyncConflictAction | null>(null)
  const [selectedField, setSelectedField] = useState<ProductSyncConflictField | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(buildDetailUrl(conflictId), {
          cache: 'no-store',
          signal: controller.signal
        })

        const payload = (await response.json().catch(() => null)) as
          | ProductSyncConflictDetail
          | { error?: string | null }
          | null

        if (!response.ok) {
          setError(payload && 'error' in payload ? payload.error ?? 'No se pudo cargar el detalle.' : 'No se pudo cargar el detalle.')

          return
        }

        setDetail(payload as ProductSyncConflictDetail)
      } catch (fetchError) {
        if (controller.signal.aborted) return

        setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el detalle.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [conflictId, reloadToken])

  const supportedActions = useMemo(() => (detail ? getSupportedActions(detail) : []), [detail])
  const availableFields = useMemo(() => (detail ? getConflictAvailableFields(detail) : []), [detail])
  const diffRows = useMemo(() => (detail ? getConflictDiffRows(detail) : []), [detail])
  const localSnapshot = useMemo(() => (detail ? getLocalSnapshot(detail) : null), [detail])
  const hubSpotSnapshot = useMemo(() => (detail ? getHubSpotSnapshot(detail) : null), [detail])
  const duplicateProducts = useMemo(() => (detail ? getDuplicateProducts(detail) : []), [detail])

  useEffect(() => {
    if (!detail) return

    const nextAction = getDefaultAction(detail)

    setSelectedAction(current =>
      current && supportedActions.some(option => option.action === current) ? current : nextAction
    )
  }, [detail, supportedActions])

  useEffect(() => {
    if (!detail) return

    setSelectedField(getDefaultFieldForAction(detail, selectedAction))
  }, [detail, selectedAction])

  const selectedActionDefinition = supportedActions.find(item => item.action === selectedAction) ?? null

  const handleResolve = async () => {
    if (!detail || !selectedAction) {
      return
    }

    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      setFeedback({
        tone: 'error',
        message: 'Debes registrar un motivo operativo antes de resolver el conflicto.'
      })

      return
    }

    if (selectedAction === 'accept_hubspot_field' && !selectedField) {
      setFeedback({
        tone: 'error',
        message: 'Selecciona el campo remoto que quieres aceptar.'
      })

      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch(`${buildDetailUrl(conflictId)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          reason: trimmedReason,
          ...(selectedAction === 'accept_hubspot_field' && selectedField ? { field: selectedField } : {})
        })
      })

      const payload = (await response.json().catch(() => null)) as
        | ProductSyncConflictResolveResponse
        | { error?: string | null }
        | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload && 'error' in payload ? payload.error ?? 'No se pudo resolver el conflicto.' : 'No se pudo resolver el conflicto.'
        })

        return
      }

      setFeedback({
        tone: 'success',
        message: 'Resolucion registrada correctamente.'
      })
      setReason('')
      setReloadToken(current => current + 1)
      startTransition(() => router.refresh())
    } catch (submitError) {
      setFeedback({
        tone: 'error',
        message: submitError instanceof Error ? submitError.message : 'No se pudo resolver el conflicto.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Stack direction='row' spacing={2} alignItems='center'>
            <CircularProgress size={20} />
            <Typography color='text.secondary'>Cargando detalle del conflicto...</Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (error || !detail) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant='h4'>No se pudo abrir el conflicto</Typography>
            <Typography color='text.secondary'>{error ?? 'El conflicto solicitado no devolvio datos.'}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button variant='contained' onClick={() => setReloadToken(current => current + 1)}>
                Reintentar
              </Button>
              <Button component={Link} href='/admin/commercial/product-sync-conflicts' variant='outlined'>
                Volver a la lista
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const displayName = getConflictDisplayName(detail)

  const localRows = [
    ['product_id', detail.productId],
    ['finance_product_id', detail.financeProductId],
    ['product_code', detail.productCode ?? localSnapshot?.productCode ?? null],
    ['product_name', detail.productName ?? localSnapshot?.productName ?? null],
    ['source_kind', detail.sourceKind ? PRODUCT_SOURCE_KIND_LABELS[detail.sourceKind] ?? detail.sourceKind : null],
    ['source_id', detail.sourceId],
    ['source_variant_key', detail.sourceVariantKey],
    ['default_unit_price', localSnapshot?.defaultUnitPrice != null ? formatCurrency(localSnapshot.defaultUnitPrice) : null],
    ['hubspot_sync_status', detail.hubspotSyncStatus ?? localSnapshot?.hubspotSyncStatus ?? null],
    ['is_archived', localSnapshot?.isArchived ?? detail.isArchived]
  ] as const

  const hubspotRows = [
    ['hubspot_product_id', detail.hubspotProductId ?? hubSpotSnapshot?.hubspotProductId ?? null],
    ['gh_product_code', hubSpotSnapshot?.gh_product_code ?? null],
    ['gh_source_kind', hubSpotSnapshot?.gh_source_kind ?? null],
    ['gh_last_write_at', hubSpotSnapshot?.gh_last_write_at ? formatDateTime(hubSpotSnapshot.gh_last_write_at) : null],
    ['name', hubSpotSnapshot?.name ?? null],
    ['sku', hubSpotSnapshot?.sku ?? null],
    ['price', hubSpotSnapshot?.price != null ? formatCurrency(hubSpotSnapshot.price) : null],
    ['description', hubSpotSnapshot?.description ?? null],
    ['is_archived', hubSpotSnapshot?.isArchived]
  ] as const

  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(59,130,246,0.14) 0%, rgba(245,158,11,0.12) 44%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap='wrap' useFlexGap>
              <CustomChip label='Admin Center / Comercial' color='warning' variant='outlined' round='true' />
              <CustomChip
                label={PRODUCT_SYNC_CONFLICT_TYPE_LABELS[detail.conflictType]}
                color={TYPE_TONES[detail.conflictType]}
                variant='tonal'
                round='true'
              />
              <CustomChip
                label={PRODUCT_SYNC_CONFLICT_RESOLUTION_LABELS[detail.resolutionStatus]}
                color={STATUS_TONES[detail.resolutionStatus]}
                variant='outlined'
                round='true'
              />
            </Stack>
            <Box>
              <Typography variant='h3'>{displayName}</Typography>
              <Typography color='text.secondary' sx={{ maxWidth: 980 }}>
                Vista de resolucion para comparar el snapshot local con la huella remota de HubSpot, revisar el tipo de
                drift y aplicar una accion auditada solo cuando el conflicto lo soporte.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button component={Link} href='/admin/commercial/product-sync-conflicts' variant='contained'>
                Volver a la lista
              </Button>
              <Button component='a' href='#product-sync-action-area' variant='outlined'>
                Ir al area de accion
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {feedback ? <Alert severity={feedback.tone}>{feedback.message}</Alert> : null}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard
          title='Estado'
          value={PRODUCT_SYNC_CONFLICT_RESOLUTION_LABELS[detail.resolutionStatus]}
          detail={detail.resolutionStatus === 'pending' ? 'Aun requiere decision administrativa.' : 'La resolucion ya fue aplicada.'}
          tone={detail.resolutionStatus === 'pending' ? 'error' : 'success'}
        />
        <ExecutiveMiniStatCard
          title='Detectado'
          value={formatRelativeAge(detail.detectedAt)}
          detail={formatDateTime(detail.detectedAt)}
          tone='info'
        />
        <ExecutiveMiniStatCard
          title='Auto-heal'
          value={detail.autoHealEligible ? 'Elegible' : 'Manual'}
          detail={
            detail.autoHealEligible
              ? 'El detector marco este caso como potencialmente reparable.'
              : 'Este caso exige una decision humana o una limpieza posterior.'
          }
          tone={detail.autoHealEligible ? 'success' : 'warning'}
        />
        <ExecutiveMiniStatCard
          title='Ancla local'
          value={detail.productCode ?? 'Sin SKU local'}
          detail={detail.productId ?? detail.hubspotProductId ?? 'Sin anchor visible'}
          tone={detail.productId ? 'info' : 'warning'}
        />
      </Box>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, xl: 7 }}>
          <ExecutiveCardShell
            title='Diff operativo'
            subtitle='Compara solo lo que hoy esta en conflicto. Si el conflicto no trae pares greenhouse/hubspot, usa las snapshots debajo como contexto.'
          >
            <Stack spacing={3}>
              {diffRows.length === 0 ? (
                <Alert severity='info' variant='outlined'>
                  Este conflicto no trae un diff campo a campo normalizado. Revisa las snapshots y anclas para decidir la accion correcta.
                </Alert>
              ) : (
                <TableContainer>
                  <Table className={tableStyles.table}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Campo</TableCell>
                        <TableCell>Greenhouse</TableCell>
                        <TableCell>HubSpot</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {diffRows.map(row => (
                        <TableRow key={row.field}>
                          <TableCell>
                            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                              {fieldLabelFromKey(row.field)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{formatFieldValue(row.field, row.greenhouse)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{formatFieldValue(row.field, row.hubspot)}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {duplicateProducts.length > 0 ? (
                <>
                  <Divider />
                  <Stack spacing={1.5}>
                    <Typography variant='h6'>Productos duplicados detectados</Typography>
                    {duplicateProducts.map((product, index) => (
                      <Card key={`${product.productId ?? product.productCode ?? 'duplicate'}-${index}`} variant='outlined'>
                        <CardContent>
                          <Stack spacing={0.75}>
                            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                              {product.productName ?? product.productCode ?? product.productId ?? 'Producto sin nombre'}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {product.productId ?? 'Sin product_id'} · SKU {product.productCode ?? 'Sin SKU'}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {product.sourceKind ?? 'Sin source kind'} · {product.isArchived ? 'Archivado' : 'Activo'}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </>
              ) : null}
            </Stack>
          </ExecutiveCardShell>
        </Grid>

        <Grid size={{ xs: 12, xl: 5 }} id='product-sync-action-area'>
          <ExecutiveCardShell
            title='Accion administrativa'
            subtitle='Solo se muestran resoluciones que este conflicto soporta segun su tipo, anclas y metadatos actuales.'
          >
            <Stack spacing={3}>
              {detail.resolutionStatus !== 'pending' ? (
                <Alert severity='success' variant='outlined'>
                  Este conflicto ya no admite nuevas acciones desde esta superficie. Si necesitas otra decision, primero revisa el audit trail del catalogo.
                </Alert>
              ) : supportedActions.length === 0 ? (
                <Alert severity='warning' variant='outlined'>
                  No hay acciones habilitadas para este conflicto con el metadata actual. Revisa snapshots, source kind y anclas antes de escalar.
                </Alert>
              ) : (
                <>
                  <CustomTextField
                    select
                    label='Accion'
                    value={selectedAction ?? ''}
                    onChange={event => setSelectedAction(event.target.value as ProductSyncConflictAction)}
                    fullWidth
                  >
                    {supportedActions.map(option => (
                      <MenuItem key={option.action} value={option.action}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </CustomTextField>

                  {selectedActionDefinition ? (
                    <Alert severity='info' variant='outlined'>
                      {selectedActionDefinition.description}
                    </Alert>
                  ) : null}

                  {selectedAction === 'accept_hubspot_field' ? (
                    <CustomTextField
                      select
                      label='Campo remoto a aceptar'
                      value={selectedField ?? ''}
                      onChange={event => setSelectedField(event.target.value as ProductSyncConflictField)}
                      fullWidth
                    >
                      {availableFields.length > 1 ? <MenuItem value='all'>{PRODUCT_SYNC_CONFLICT_FIELD_LABELS.all}</MenuItem> : null}
                      {availableFields.map(field => (
                        <MenuItem key={field} value={field}>
                          {formatConflictFieldLabel(field)}
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  ) : null}

                  <CustomTextField
                    label='Motivo operativo'
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder='Ej. Confirmado con revenue ops: HubSpot fue editado manualmente y debemos conservar ese valor.'
                  />

                  <Button
                    variant='contained'
                    onClick={() => void handleResolve()}
                    disabled={submitting || !selectedAction}
                    startIcon={submitting ? <CircularProgress color='inherit' size={16} /> : undefined}
                  >
                    {selectedActionDefinition?.submitLabel ?? 'Resolver conflicto'}
                  </Button>
                </>
              )}

              {detail.resolutionStatus !== 'pending' ? (
                <Stack spacing={1}>
                  <Typography variant='body2'>
                    <strong>Resuelto por:</strong> {detail.resolvedBy ?? 'Sistema'}
                  </Typography>
                  <Typography variant='body2'>
                    <strong>Aplicado:</strong> {formatDateTime(detail.resolutionAppliedAt)}
                  </Typography>
                </Stack>
              ) : null}
            </Stack>
          </ExecutiveCardShell>
        </Grid>
      </Grid>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ExecutiveCardShell
            title='Snapshot local'
            subtitle='Lectura Greenhouse usada para replay, adopcion o aceptacion remota.'
          >
            <Stack spacing={1.5}>
              {localRows.map(([label, value]) => (
                <Typography key={label} variant='body2'>
                  <strong>{label}:</strong> {formatSnapshotValue(value)}
                </Typography>
              ))}
            </Stack>
          </ExecutiveCardShell>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ExecutiveCardShell
            title='Snapshot HubSpot'
            subtitle='Huella remota que dejo el reconciler al detectar el drift.'
          >
            <Stack spacing={1.5}>
              {hubspotRows.map(([label, value]) => (
                <Typography key={label} variant='body2'>
                  <strong>{label}:</strong> {formatSnapshotValue(value)}
                </Typography>
              ))}
            </Stack>
          </ExecutiveCardShell>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ExecutiveCardShell
            title='Anclas y provenance'
            subtitle='Contexto tecnico minimo para revisar source ownership y rastrear la ultima actividad relevante.'
          >
            <Stack spacing={1.5}>
              <Typography variant='body2'>
                <strong>source kind:</strong>{' '}
                {detail.sourceKind ? PRODUCT_SOURCE_KIND_LABELS[detail.sourceKind] ?? detail.sourceKind : 'Sin source kind'}
              </Typography>
              <Typography variant='body2'>
                <strong>source id:</strong> {detail.sourceId ?? 'Sin source id'}
              </Typography>
              <Typography variant='body2'>
                <strong>source variant key:</strong> {detail.sourceVariantKey ?? 'Sin variant key'}
              </Typography>
              <Typography variant='body2'>
                <strong>Ultimo outbound:</strong> {formatDateTime(detail.lastOutboundSyncAt)}
              </Typography>
              <Typography variant='body2'>
                <strong>Ultimo drift check:</strong> {formatDateTime(detail.lastDriftCheckAt)}
              </Typography>
            </Stack>
          </ExecutiveCardShell>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ExecutiveCardShell
            title='Lectura operativa'
            subtitle='Guia rapida para decidir si conviene mantener Greenhouse, aceptar HubSpot o solo cerrar el caso.'
          >
            <Stack spacing={1.5}>
              <Alert severity={detail.resolutionStatus === 'pending' ? 'warning' : 'success'} variant='outlined'>
                {detail.resolutionStatus === 'pending'
                  ? 'Mientras siga pendiente, evita asumir que el catalogo esta alineado en ambos lados.'
                  : 'La resolucion ya fue aplicada. Verifica solamente si el downstream reflejo el cambio esperado.'}
              </Alert>
              <Typography variant='body2'>
                <strong>Campos remotos aceptables:</strong>{' '}
                {availableFields.length > 0
                  ? availableFields.map(field => PRODUCT_SYNC_CONFLICT_FIELD_LABELS[field]).join(', ')
                  : 'Ninguno para este conflicto'}
              </Typography>
              <Typography variant='body2'>
                <strong>Acciones disponibles:</strong>{' '}
                {supportedActions.length > 0 ? supportedActions.map(item => item.label).join(', ') : 'Sin acciones habilitadas'}
              </Typography>
            </Stack>
          </ExecutiveCardShell>
        </Grid>
      </Grid>
    </Stack>
  )
}

export default ProductSyncConflictDetailView
