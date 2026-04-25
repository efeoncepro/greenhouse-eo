'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { styled } from '@mui/material/styles'

import MuiTimeline from '@mui/lab/Timeline'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import type { TimelineProps } from '@mui/lab/Timeline'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import AuditDiffViewer from '@/components/greenhouse/pricing/AuditDiffViewer'
import AuditRevertConfirmDialog from '@/components/greenhouse/pricing/AuditRevertConfirmDialog'
import { GH_PRICING_GOVERNANCE } from '@/config/greenhouse-nomenclature'

// ── Types ──────────────────────────────────────────────────────────────

type EntityType =
  | 'sellable_role'
  | 'tool_catalog'
  | 'overhead_addon'
  | 'role_tier_margin'
  | 'service_tier_margin'
  | 'commercial_model_multiplier'
  | 'country_pricing_factor'
  | 'fte_hours_guide'
  | 'employment_type'
  | 'service_catalog'

type ActionType =
  | 'created'
  | 'updated'
  | 'deactivated'
  | 'reactivated'
  | 'cost_updated'
  | 'pricing_updated'
  | 'bulk_imported'
  | 'recipe_updated'
  | 'deleted'
  | 'reverted'
  | 'approval_applied'
  | 'bulk_edited'

interface AuditEntry {
  auditId: string
  entityType: EntityType
  entityId: string
  entitySku: string | null
  action: ActionType
  actorUserId: string
  actorName: string
  changeSummary: Record<string, unknown>
  effectiveFrom: string | null
  notes: string | null
  createdAt: string
}

interface ListResponse {
  items: AuditEntry[]
}

// ── Labels & colors ────────────────────────────────────────────────────

const ENTITY_LABELS: Record<EntityType, string> = {
  sellable_role: 'Rol vendible',
  tool_catalog: 'Herramienta',
  overhead_addon: 'Overhead',
  role_tier_margin: 'Tier de margen (rol)',
  service_tier_margin: 'Tier de margen (servicio)',
  commercial_model_multiplier: 'Modelo comercial',
  country_pricing_factor: 'Factor país',
  fte_hours_guide: 'Guía FTE',
  employment_type: 'Modalidad de contrato',
  service_catalog: 'Servicio empaquetado'
}

const ACTION_LABELS: Record<ActionType, string> = {
  created: 'Creado',
  updated: 'Actualizado',
  deactivated: 'Desactivado',
  reactivated: 'Reactivado',
  cost_updated: 'Costos actualizados',
  pricing_updated: 'Pricing actualizado',
  bulk_imported: 'Importación masiva',
  recipe_updated: 'Receta actualizada',
  deleted: 'Eliminado',
  reverted: 'Revertido',
  approval_applied: 'Aprobación aplicada',
  bulk_edited: 'Edición masiva'
}

type TimelineDotColor =
  | 'inherit'
  | 'grey'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning'

const ACTION_COLORS: Record<ActionType, TimelineDotColor> = {
  created: 'success',
  updated: 'info',
  deactivated: 'warning',
  reactivated: 'success',
  cost_updated: 'info',
  pricing_updated: 'info',
  bulk_imported: 'primary',
  recipe_updated: 'info',
  deleted: 'error',
  reverted: 'warning',
  approval_applied: 'success',
  bulk_edited: 'primary'
}

const ACTION_ICONS: Record<ActionType, string> = {
  created: 'tabler-plus',
  updated: 'tabler-pencil',
  deactivated: 'tabler-archive',
  reactivated: 'tabler-rotate',
  cost_updated: 'tabler-coin',
  pricing_updated: 'tabler-tag',
  bulk_imported: 'tabler-database-import',
  recipe_updated: 'tabler-recipe',
  deleted: 'tabler-trash',
  reverted: 'tabler-arrow-back-up',
  approval_applied: 'tabler-shield-check',
  bulk_edited: 'tabler-table-options'
}

const REVERTIBLE_ACTIONS: ActionType[] = [
  'updated',
  'deactivated',
  'reactivated',
  'cost_updated',
  'pricing_updated',
  'recipe_updated'
]

const REVERTIBLE_ENTITIES: EntityType[] = [
  'sellable_role',
  'tool_catalog',
  'overhead_addon',
  'service_catalog',
  'role_tier_margin',
  'service_tier_margin',
  'commercial_model_multiplier',
  'country_pricing_factor',
  'employment_type'
]

const READ_ONLY_REVERT_ENTITIES: EntityType[] = ['fte_hours_guide']

// ── Styled ─────────────────────────────────────────────────────────────

const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    '&:before': {
      flex: 0,
      padding: 0
    }
  }
})

// ── Helpers ────────────────────────────────────────────────────────────

const formatDateTime = (iso: string): string => {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return iso

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const hasDetails = (summary: Record<string, unknown>): boolean => {
  if (!summary) return false
  const keys = Object.keys(summary)

  return keys.length > 0
}

// ── Component ──────────────────────────────────────────────────────────

interface AuditLogTimelineViewProps {
  canRevert?: boolean
}

const AuditLogTimelineView = ({ canRevert = false }: AuditLogTimelineViewProps) => {
  const [items, setItems] = useState<AuditEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [revertTarget, setRevertTarget] = useState<AuditEntry | null>(null)
  const [revertedIds, setRevertedIds] = useState<Set<string>>(new Set())

  const [entityType, setEntityType] = useState<'all' | EntityType>('all')
  const [entityIdInput, setEntityIdInput] = useState('')
  const [actorUserIdInput, setActorUserIdInput] = useState('')

  const [appliedFilters, setAppliedFilters] = useState<{
    entityType: 'all' | EntityType
    entityId: string
    actorUserId: string
  }>({ entityType: 'all', entityId: '', actorUserId: '' })

  const buildUrl = useCallback((f: typeof appliedFilters) => {
    const params = new URLSearchParams()

    if (f.entityType !== 'all') params.set('entityType', f.entityType)
    if (f.entityId.trim()) params.set('entityId', f.entityId.trim())
    if (f.actorUserId.trim()) params.set('actorUserId', f.actorUserId.trim())
    params.set('limit', '100')

    return `/api/admin/pricing-catalog/audit-log?${params.toString()}`
  }, [])

  const loadData = useCallback(
    async (f: typeof appliedFilters) => {
      setLoading(true)

      try {
        const res = await fetch(buildUrl(f))

        if (res.ok) {
          const body = (await res.json()) as ListResponse

          setItems(body.items ?? [])
          setError(null)
        } else {
          setError(`No pudimos cargar el historial (HTTP ${res.status}).`)
        }
      } catch {
        setError('No se pudo conectar al servidor. Verifica tu conexión.')
      } finally {
        setLoading(false)
      }
    },
    [buildUrl]
  )

  useEffect(() => {
    void loadData(appliedFilters)
  }, [loadData, appliedFilters])

  const handleApplyFilters = () => {
    setAppliedFilters({
      entityType,
      entityId: entityIdInput,
      actorUserId: actorUserIdInput
    })
  }

  const handleClearFilters = () => {
    setEntityType('all')
    setEntityIdInput('')
    setActorUserIdInput('')
    setAppliedFilters({ entityType: 'all', entityId: '', actorUserId: '' })
  }

  const hasActiveFilters =
    appliedFilters.entityType !== 'all' ||
    appliedFilters.entityId !== '' ||
    appliedFilters.actorUserId !== ''

  const subtitle = useMemo(() => {
    if (!items) return undefined
    if (items.length === 0) return hasActiveFilters ? 'Sin resultados' : 'Sin actividad registrada'

    return `${items.length} ${items.length === 1 ? 'evento' : 'eventos'} · últimos primero`
  }, [items, hasActiveFilters])

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
          <Tooltip title='Volver al catálogo'>
            <IconButton
              component='a'
              href='/admin/pricing-catalog'
              size='small'
              aria-label='Volver al catálogo'
            >
              <i className='tabler-arrow-left' />
            </IconButton>
          </Tooltip>
          <Typography variant='h4' sx={{ fontWeight: 600 }}>
            Historial de cambios
          </Typography>
        </Stack>
        <Typography variant='body2' color='text.secondary'>
          Cada creación, actualización o cambio de estado en el catálogo de pricing queda
          registrado con su autor y contexto.
        </Typography>
      </Grid>

      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={() => void loadData(appliedFilters)}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Filtros'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i
                  className='tabler-filter'
                  style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }}
                />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            <Grid container spacing={3} alignItems='flex-end'>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Tipo de entidad'
                  value={entityType}
                  onChange={e => setEntityType(e.target.value as 'all' | EntityType)}
                >
                  <MenuItem value='all'>Todas las entidades</MenuItem>
                  {(Object.keys(ENTITY_LABELS) as EntityType[]).map(key => (
                    <MenuItem key={key} value={key}>
                      {ENTITY_LABELS[key]}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='ID de entidad'
                  value={entityIdInput}
                  onChange={e => setEntityIdInput(e.target.value)}
                  placeholder='ej. ECG-034 o chile_indefinido'
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='ID de usuario'
                  value={actorUserIdInput}
                  onChange={e => setActorUserIdInput(e.target.value)}
                  placeholder='ej. user-...'
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Stack direction='row' spacing={2}>
                  <Button variant='contained' size='small' onClick={handleApplyFilters} fullWidth>
                    Aplicar filtros
                  </Button>
                  <Button
                    variant='outlined'
                    color='secondary'
                    size='small'
                    onClick={handleClearFilters}
                    disabled={!hasActiveFilters}
                  >
                    Limpiar
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Línea de tiempo'
            subheader={subtitle}
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i
                  className='tabler-timeline'
                  style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }}
                />
              </Avatar>
            }
          />
          <Divider />

          {loading && !items ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : !items || items.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>
                  {hasActiveFilters ? 'Sin resultados' : 'Aún no hay actividad registrada'}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {hasActiveFilters
                    ? 'Ajusta los filtros o límpialos para ver más eventos.'
                    : 'Los cambios en el catálogo aparecerán aquí a medida que ocurran.'}
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <CardContent>
              <Timeline>
                {items.map((entry, index) => {
                  const color = ACTION_COLORS[entry.action] ?? 'grey'
                  const icon = ACTION_ICONS[entry.action] ?? 'tabler-activity'
                  const entityLabel = ENTITY_LABELS[entry.entityType] ?? entry.entityType
                  const actionLabel = ACTION_LABELS[entry.action] ?? entry.action
                  const showDetails = hasDetails(entry.changeSummary)

                  return (
                    <TimelineItem key={entry.auditId}>
                      <TimelineOppositeContent
                        sx={{ m: 'auto 0', flex: 0.25 }}
                        variant='caption'
                        color='text.secondary'
                      >
                        {formatDateTime(entry.createdAt)}
                        {entry.effectiveFrom && (
                          <Typography variant='caption' display='block' color='text.disabled'>
                            Vigente: {entry.effectiveFrom}
                          </Typography>
                        )}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color={color} variant='outlined'>
                          <i className={icon} style={{ fontSize: 16 }} aria-hidden='true' />
                        </TimelineDot>
                        {index < items.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ py: 2, px: 3 }}>
                        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' sx={{ mb: 0.5 }}>
                          <CustomChip
                            round='true'
                            size='small'
                            variant='tonal'
                            color='secondary'
                            label={entityLabel}
                          />
                          {entry.entitySku && (
                            <Typography
                              variant='caption'
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                color: 'text.secondary'
                              }}
                            >
                              {entry.entitySku}
                            </Typography>
                          )}
                        </Stack>
                        <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                          {actionLabel}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          por {entry.actorName || 'usuario desconocido'}
                        </Typography>
                        {entry.notes && (
                          <Typography variant='body2' sx={{ mt: 1 }}>
                            {entry.notes}
                          </Typography>
                        )}
                        {showDetails && (
                          <Accordion
                            elevation={0}
                            disableGutters
                            sx={{
                              mt: 1,
                              bgcolor: 'transparent',
                              '&:before': { display: 'none' },
                              border: t => `1px solid ${t.palette.divider}`,
                              borderRadius: 1
                            }}
                          >
                            <AccordionSummary
                              expandIcon={<i className='tabler-chevron-down' />}
                              sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0 } }}
                            >
                              <Typography variant='caption' color='text.secondary'>
                                Ver detalle del cambio
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>
                              <AuditDiffViewer
                                action={entry.action}
                                changeSummary={entry.changeSummary}
                              />
                              {(() => {
                                const actionOk = REVERTIBLE_ACTIONS.includes(entry.action)

                                const entityOk =
                                  REVERTIBLE_ENTITIES.includes(entry.entityType) ||
                                  READ_ONLY_REVERT_ENTITIES.includes(entry.entityType)

                                const alreadyReverted = revertedIds.has(entry.auditId)

                                const isReadOnlyEntity = READ_ONLY_REVERT_ENTITIES.includes(
                                  entry.entityType
                                )

                                const canShowButton = actionOk && entityOk && !alreadyReverted

                                if (!canShowButton) return null

                                const tooltipTitle = isReadOnlyEntity
                                  ? GH_PRICING_GOVERNANCE.auditRevert.triggerDisabledFteGuideReadOnly
                                  : !canRevert
                                    ? GH_PRICING_GOVERNANCE.auditRevert.triggerDisabledNoPermission
                                    : GH_PRICING_GOVERNANCE.auditRevert.triggerLabel

                                return (
                                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Tooltip title={tooltipTitle} disableInteractive>
                                      <span>
                                        <Button
                                          size='small'
                                          variant='outlined'
                                          color='warning'
                                          startIcon={<i className='tabler-arrow-back-up' />}
                                          onClick={() => setRevertTarget(entry)}
                                          disabled={isReadOnlyEntity || !canRevert}
                                        >
                                          {GH_PRICING_GOVERNANCE.auditRevert.triggerLabel}
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  </Box>
                                )
                              })()}
                            </AccordionDetails>
                          </Accordion>
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  )
                })}
              </Timeline>
            </CardContent>
          )}
        </Card>
      </Grid>
      {revertTarget ? (
        <AuditRevertConfirmDialog
          open
          auditId={revertTarget.auditId}
          action={revertTarget.action}
          entityType={ENTITY_LABELS[revertTarget.entityType] ?? revertTarget.entityType}
          entityLabel={revertTarget.entitySku ?? revertTarget.entityId}
          changeSummary={revertTarget.changeSummary}
          onClose={() => setRevertTarget(null)}
          onSuccess={({ newAuditId }) => {
            setRevertedIds(prev => {
              const next = new Set(prev)

              next.add(revertTarget.auditId)
              
return next
            })

            // Remove unused var hint
            void newAuditId

            // Refresh timeline to pick up the new revert entry on top.
            setAppliedFilters(current => ({ ...current }))
          }}
        />
      ) : null}
    </Grid>
  )
}

export default AuditLogTimelineView
