'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type { PricingLineOutputV2, PricingOutputCurrency, PricingV2LineType } from '@/lib/finance/pricing/contracts'

import SellableItemPickerDrawer, {
  type SellableItemPickerTab,
  type SellableSelection
} from '@/components/greenhouse/pricing/SellableItemPickerDrawer'

import QuoteLineCostStack from './QuoteLineCostStack'

export type QuoteLineSource = 'catalog' | 'service' | 'template' | 'manual'

export interface QuoteLineItem {
  lineItemId?: string
  label: string
  description: string | null
  lineType: 'person' | 'role' | 'deliverable' | 'direct_cost'
  unit: 'hour' | 'month' | 'unit' | 'project'
  quantity: number
  unitPrice: number | null
  subtotalPrice: number | null
  subtotalAfterDiscount: number | null
  productId?: string | null
  roleCode?: string | null
  memberId?: string | null
  discountType?: 'percentage' | 'fixed_amount' | null
  discountValue?: number | null
  source?: QuoteLineSource
  serviceSku?: string | null
  serviceLineOrder?: number | null
  metadata?: {
    pricingV2LineType?: PricingV2LineType
    sku?: string
    fteFraction?: number | null
    periods?: number | null
    employmentTypeCode?: string | null
    moduleId?: string | null
    serviceSku?: string | null
    serviceLineOrder?: number | null
    templateItemId?: string | null
  } | null
}

export interface QuoteLineItemsEditorProps {
  quotationId: string
  currency: string
  editable: boolean
  lineItems: QuoteLineItem[]
  onSave: (lines: QuoteLineItem[]) => Promise<void>
  saving: boolean
  businessLineCode?: string | null

  /** Gating del cost stack (solo finance/admin). El caller es responsable de
   * computar este flag con `canViewCostStack(tenant)`. */
  canViewCostStack?: boolean

  /** Output del engine v2 por línea, indexado por posición. Cuando está disponible
   * y el viewer tiene permisos, se renderiza el QuoteLineCostStack debajo de cada
   * línea con tier compliance y breakdown interno. */
  simulationLines?: PricingLineOutputV2[] | null
  outputCurrency?: PricingOutputCurrency | null
}

const LINE_TYPE_OPTIONS: Array<{ value: QuoteLineItem['lineType']; label: string; color: 'primary' | 'info' | 'success' | 'warning' }> = [
  { value: 'person', label: 'Persona', color: 'info' },
  { value: 'role', label: 'Rol', color: 'primary' },
  { value: 'deliverable', label: 'Entregable', color: 'success' },
  { value: 'direct_cost', label: 'Costo directo', color: 'warning' }
]

const UNIT_OPTIONS: Array<{ value: QuoteLineItem['unit']; label: string }> = [
  { value: 'hour', label: 'Hora' },
  { value: 'month', label: 'Mes' },
  { value: 'unit', label: 'Unidad' },
  { value: 'project', label: 'Proyecto' }
]

const LINE_TYPE_META = LINE_TYPE_OPTIONS.reduce<Record<QuoteLineItem['lineType'], { label: string; color: 'primary' | 'info' | 'success' | 'warning' }>>(
  (acc, option) => {
    acc[option.value] = { label: option.label, color: option.color }

    return acc
  },
  { person: { label: 'Persona', color: 'info' }, role: { label: 'Rol', color: 'primary' }, deliverable: { label: 'Entregable', color: 'success' }, direct_cost: { label: 'Costo directo', color: 'warning' } }
)

const UNIT_LABELS: Record<QuoteLineItem['unit'], string> = {
  hour: 'Hora',
  month: 'Mes',
  unit: 'Unidad',
  project: 'Proyecto'
}

const SOURCE_META: Record<QuoteLineSource, { label: string; color: 'primary' | 'info' | 'success' | 'warning' | 'secondary'; icon: string }> = {
  catalog: { label: 'Catálogo', color: 'primary', icon: 'tabler-books' },
  service: { label: 'Servicio', color: 'success', icon: 'tabler-package' },
  template: { label: 'Template', color: 'info', icon: 'tabler-template' },
  manual: { label: 'Manual', color: 'secondary', icon: 'tabler-edit' }
}

export interface QuoteLineItemsEditorHandle {

  /** Añade líneas desde una fuente externa (source selector del shell).
   * Marca el draft como dirty para que la lista no se resetee si cambia `lineItems`. */
  appendLines: (lines: QuoteLineItem[]) => void

  /** Devuelve el snapshot actual del draft (útil para submit externo). */
  getDraft: () => QuoteLineItem[]
}

const TIER_STATUS_META: Record<
  'below_min' | 'in_range' | 'at_optimum' | 'above_max' | 'unknown',
  { label: string; color: 'error' | 'warning' | 'success' | 'info' }
> = {
  below_min: { label: 'Bajo mínimo', color: 'error' },
  in_range: { label: 'En rango', color: 'success' },
  at_optimum: { label: 'Óptimo', color: 'success' },
  above_max: { label: 'Sobre rango', color: 'warning' },
  unknown: { label: 'Tier sin definir', color: 'info' }
}

const formatCurrency = (amount: number | null, currency: string): string => {
  if (amount === null || Number.isNaN(amount)) return '—'

  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount)
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString('es-CL')}`
  }
}

const computeRowSubtotal = (line: QuoteLineItem): number => {
  const quantity = Number.isFinite(line.quantity) ? line.quantity : 0
  const unitPrice = line.unitPrice ?? 0

  return quantity * unitPrice
}

const computeRowSubtotalAfterDiscount = (line: QuoteLineItem): number => {
  const subtotal = computeRowSubtotal(line)

  if (line.discountType === 'percentage' && line.discountValue) {
    return subtotal - subtotal * (line.discountValue / 100)
  }

  if (line.discountType === 'fixed_amount' && line.discountValue) {
    return subtotal - line.discountValue
  }

  return subtotal
}

const cloneLineItems = (items: QuoteLineItem[]): QuoteLineItem[] => items.map(item => ({ ...item }))

// Mapea una selección del SellableItemPickerDrawer a un QuoteLineItem persistible.
// engine v2 usa 5 line types; la tabla actual persiste 4 (person/role/deliverable/direct_cost).
// Para tool y overhead_addon, aplanamos a direct_cost + metadata.pricingV2LineType + metadata.sku
// (TASK-464e Delta 2026-04-18).
// TASK-473 añade `source` para trazabilidad visual del origen de la línea.
export const mapSelectionToLine = (selection: SellableSelection): QuoteLineItem => {
  switch (selection.tab) {
    case 'roles':
      return {
        label: selection.label,
        description: null,
        lineType: 'role',
        unit: 'month',
        quantity: 1,
        unitPrice: null,
        subtotalPrice: null,
        subtotalAfterDiscount: null,
        roleCode: selection.sku,
        memberId: null,
        productId: null,
        discountType: null,
        discountValue: null,
        source: 'catalog',
        metadata: { pricingV2LineType: 'role', sku: selection.sku, fteFraction: 1.0, periods: 1 }
      }
    case 'tools':
      return {
        label: selection.label,
        description: null,
        lineType: 'direct_cost',
        unit: 'unit',
        quantity: 1,
        unitPrice: null,
        subtotalPrice: null,
        subtotalAfterDiscount: null,
        roleCode: null,
        memberId: null,
        productId: null,
        discountType: null,
        discountValue: null,
        source: 'catalog',
        metadata: { pricingV2LineType: 'tool', sku: selection.sku }
      }
    case 'overhead':
      return {
        label: selection.label,
        description: null,
        lineType: 'direct_cost',
        unit: 'unit',
        quantity: 1,
        unitPrice: null,
        subtotalPrice: null,
        subtotalAfterDiscount: null,
        roleCode: null,
        memberId: null,
        productId: null,
        discountType: null,
        discountValue: null,
        source: 'catalog',
        metadata: { pricingV2LineType: 'overhead_addon', sku: selection.sku }
      }
    case 'people':
      return {
        label: selection.label,
        description: null,
        lineType: 'person',
        unit: 'hour',
        quantity: 1,
        unitPrice: null,
        subtotalPrice: null,
        subtotalAfterDiscount: null,
        roleCode: null,
        memberId: selection.sku,
        productId: null,
        discountType: null,
        discountValue: null,
        source: 'catalog',
        metadata: { pricingV2LineType: 'person', sku: selection.sku, fteFraction: 1.0, periods: 1 }
      }
    case 'services':
    default:
      return {
        label: selection.label,
        description: null,
        lineType: 'deliverable',
        unit: 'project',
        quantity: 1,
        unitPrice: null,
        subtotalPrice: null,
        subtotalAfterDiscount: null,
        roleCode: null,
        memberId: null,
        productId: null,
        discountType: null,
        discountValue: null,
        source: 'service',
        serviceSku: selection.sku,
        metadata: {
          sku: selection.sku,
          moduleId: (selection.metadata?.moduleId as string | undefined) ?? null,
          serviceSku: selection.sku
        }
      }
  }
}

export const makeBlankManualLine = (): QuoteLineItem => ({
  label: '',
  description: null,
  lineType: 'deliverable',
  unit: 'unit',
  quantity: 1,
  unitPrice: null,
  subtotalPrice: null,
  subtotalAfterDiscount: null,
  roleCode: null,
  memberId: null,
  productId: null,
  discountType: null,
  discountValue: null,
  source: 'manual',
  metadata: null
})

const QuoteLineItemsEditor = forwardRef<QuoteLineItemsEditorHandle, QuoteLineItemsEditorProps>(function QuoteLineItemsEditor(
  {
    currency,
    editable,
    lineItems,
    onSave,
    saving,
    businessLineCode = null,
    canViewCostStack: canViewCostStackProp = false,
    simulationLines = null,
    outputCurrency = null
  },
  ref
) {
  const [draftLines, setDraftLines] = useState<QuoteLineItem[]>(() => cloneLineItems(lineItems))
  const [dirty, setDirty] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerInitialTab, setPickerInitialTab] = useState<SellableItemPickerTab>('roles')

  useImperativeHandle(
    ref,
    () => ({
      appendLines: (lines: QuoteLineItem[]) => {
        if (!lines || lines.length === 0) return
        setDraftLines(prev => [...prev, ...cloneLineItems(lines)])
        setDirty(true)
      },
      getDraft: () => cloneLineItems(draftLines)
    }),
    [draftLines]
  )

  useEffect(() => {
    if (!dirty) {
      setDraftLines(cloneLineItems(lineItems))
    }
  }, [lineItems, dirty])

  const updateLine = useCallback((index: number, patch: Partial<QuoteLineItem>) => {
    setDraftLines(prev => {
      const next = cloneLineItems(prev)

      next[index] = { ...next[index], ...patch }

      return next
    })
    setDirty(true)
  }, [])

  const handleOpenPicker = useCallback((tab: SellableItemPickerTab) => {
    setPickerInitialTab(tab)
    setPickerOpen(true)
  }, [])

  const handlePickerSelect = useCallback((selections: SellableSelection[]) => {
    if (selections.length === 0) return

    setDraftLines(prev => [...prev, ...selections.map(mapSelectionToLine)])
    setDirty(true)
  }, [])

  const handleRemoveLine = useCallback((index: number) => {
    setDraftLines(prev => prev.filter((_, i) => i !== index))
    setDirty(true)
  }, [])

  const handleDiscard = useCallback(() => {
    setDraftLines(cloneLineItems(lineItems))
    setDirty(false)
  }, [lineItems])

  const handleSave = useCallback(async () => {
    await onSave(draftLines)
    setDirty(false)
  }, [draftLines, onSave])

  const excludedSkus = useMemo(
    () =>
      draftLines
        .map(line => line.metadata?.sku ?? line.roleCode ?? line.productId ?? null)
        .filter((sku): sku is string => typeof sku === 'string'),
    [draftLines]
  )

  const totalRows = draftLines.length

  const previewTotal = useMemo(
    () => draftLines.reduce((acc, line) => acc + computeRowSubtotalAfterDiscount(line), 0),
    [draftLines]
  )

  if (!editable) {
    return (
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={`Ítems de la cotización (${lineItems.length})`}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-list-details' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        {lineItems.length === 0 ? (
          <CardContent>
            <Typography variant='body2' color='text.secondary' role='status'>
              Esta cotización aún no tiene ítems.
            </Typography>
          </CardContent>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Ítem</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align='right'>Cantidad</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell align='right'>Precio unitario</TableCell>
                  <TableCell align='right'>Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lineItems.map((line, idx) => {
                  const subtotal = line.subtotalAfterDiscount ?? line.subtotalPrice ?? computeRowSubtotalAfterDiscount(line)
                  const typeMeta = LINE_TYPE_META[line.lineType]

                  return (
                    <TableRow key={line.lineItemId ?? `${line.label}-${idx}`} hover>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {line.label}
                        </Typography>
                        {line.description && (
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                            {line.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5} alignItems='flex-start'>
                          <CustomChip round='true' size='small' variant='tonal' color={typeMeta.color} label={typeMeta.label} />
                          {line.source ? (
                            <CustomChip
                              round='true'
                              size='small'
                              variant='outlined'
                              color={SOURCE_META[line.source].color}
                              label={SOURCE_META[line.source].label}
                            />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>{line.quantity}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{UNIT_LABELS[line.unit]}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {formatCurrency(line.unitPrice, currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                          {formatCurrency(subtotal, currency)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>
    )
  }

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title={`Ítems de la cotización (${totalRows})`}
        subheader='Agrega ítems vendibles desde el catálogo o crea una línea manual.'
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
            <i className='tabler-list-details' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
          </Avatar>
        }
      />
      <Divider />
      <Box sx={{ p: 3 }}>
        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
          <Button
            variant='outlined'
            size='small'
            startIcon={<i className='tabler-user-star' />}
            onClick={() => handleOpenPicker('roles')}
            disabled={saving}
          >
            + Rol
          </Button>
          <Button
            variant='outlined'
            size='small'
            startIcon={<i className='tabler-user' />}
            onClick={() => handleOpenPicker('people')}
            disabled={saving}
          >
            + Persona
          </Button>
          <Button
            variant='outlined'
            size='small'
            startIcon={<i className='tabler-tool' />}
            onClick={() => handleOpenPicker('tools')}
            disabled={saving}
          >
            + Herramienta
          </Button>
          <Button
            variant='outlined'
            size='small'
            startIcon={<i className='tabler-receipt' />}
            onClick={() => handleOpenPicker('overhead')}
            disabled={saving}
          >
            + Overhead
          </Button>
          <Button
            variant='outlined'
            size='small'
            color='secondary'
            startIcon={<i className='tabler-edit' />}
            onClick={() => {
              setDraftLines(prev => [...prev, makeBlankManualLine()])
              setDirty(true)
            }}
            disabled={saving}
          >
            + Manual
          </Button>
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ overflowX: 'auto' }}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 220 }}>Ítem</TableCell>
              <TableCell sx={{ minWidth: 140 }}>Tipo</TableCell>
              <TableCell sx={{ minWidth: 90 }} align='right'>Cantidad</TableCell>
              <TableCell sx={{ minWidth: 110 }}>Unidad</TableCell>
              <TableCell sx={{ minWidth: 130 }} align='right'>Precio unitario</TableCell>
              <TableCell sx={{ minWidth: 110 }} align='right'>Subtotal</TableCell>
              <TableCell sx={{ minWidth: 60 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {draftLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                    <Typography variant='body2' color='text.secondary'>
                      Aún no agregaste ítems. Usa los botones de arriba para elegir del catálogo.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              draftLines.map((line, index) => {
                const subtotal = computeRowSubtotalAfterDiscount(line)
                const typeMeta = LINE_TYPE_META[line.lineType]
                const simulationLine = simulationLines?.[index] ?? null
                const showCostStack = canViewCostStackProp && simulationLine && outputCurrency
                const needsPricingContext = line.lineType === 'role' || line.lineType === 'person'
                const tierMeta = simulationLine ? TIER_STATUS_META[simulationLine.tierCompliance.status] : null

                return (
                  <>
                    <TableRow key={line.lineItemId ?? `draft-${index}`} hover>
                      <TableCell>
                        <Stack spacing={1}>
                          <CustomTextField
                            size='small'
                            fullWidth
                            placeholder='Ej. Diseño de identidad'
                            value={line.label}
                            onChange={event => updateLine(index, { label: event.target.value })}
                            disabled={saving}
                            aria-label={`Etiqueta del ítem ${index + 1}`}
                          />
                          {line.metadata?.sku && (
                            <Typography variant='caption' color='text.secondary'>
                              SKU {line.metadata.sku}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <CustomChip round='true' size='small' variant='tonal' color={typeMeta.color} label={typeMeta.label} />
                          {line.source ? (
                            <CustomChip
                              round='true'
                              size='small'
                              variant='outlined'
                              color={SOURCE_META[line.source].color}
                              label={SOURCE_META[line.source].label}
                            />
                          ) : null}
                          {tierMeta ? (
                            <CustomChip
                              round='true'
                              size='small'
                              variant='tonal'
                              color={tierMeta.color}
                              label={tierMeta.label}
                            />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell align='right'>
                        <CustomTextField
                          size='small'
                          type='number'
                          value={line.quantity}
                          onChange={event => {
                            const raw = event.target.value
                            const next = raw === '' ? 0 : Number(raw)

                            updateLine(index, { quantity: Number.isFinite(next) ? next : 0 })
                          }}
                          disabled={saving}
                          aria-label={`Cantidad del ítem ${index + 1}`}
                        />
                      </TableCell>
                      <TableCell>
                        <CustomTextField
                          select
                          size='small'
                          fullWidth
                          value={line.unit}
                          onChange={event => updateLine(index, { unit: event.target.value as QuoteLineItem['unit'] })}
                          disabled={saving}
                          aria-label={`Unidad del ítem ${index + 1}`}
                        >
                          {UNIT_OPTIONS.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </CustomTextField>
                      </TableCell>
                      <TableCell align='right'>
                        <CustomTextField
                          size='small'
                          type='number'
                          value={line.unitPrice ?? ''}
                          onChange={event => {
                            const raw = event.target.value

                            updateLine(index, { unitPrice: raw === '' ? null : Number(raw) })
                          }}
                          disabled={saving}
                          aria-label={`Precio unitario del ítem ${index + 1}`}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                          {formatCurrency(subtotal, currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Tooltip title='Eliminar ítem'>
                          <span>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => handleRemoveLine(index)}
                              disabled={saving}
                              aria-label={`Eliminar ítem ${index + 1}`}
                            >
                              <i className='tabler-trash' />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    {needsPricingContext ? (
                      <TableRow key={`${line.lineItemId ?? `draft-${index}`}-ctx`}>
                        <TableCell colSpan={7} sx={{ py: 1, bgcolor: 'background.default' }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                            <Typography variant='caption' color='text.secondary' sx={{ minWidth: 140 }}>
                              Contexto de pricing
                            </Typography>
                            <CustomTextField
                              size='small'
                              type='number'
                              label='FTE'
                              value={line.metadata?.fteFraction ?? ''}
                              onChange={event => {
                                const raw = event.target.value
                                const next = raw === '' ? null : Number(raw)

                                updateLine(index, {
                                  metadata: { ...(line.metadata ?? {}), fteFraction: Number.isFinite(next) ? next : null }
                                })
                              }}
                              helperText='0.1 a 1.0 (fracción dedicada)'
                              sx={{ maxWidth: 160 }}
                              disabled={saving}
                              aria-label={`FTE del ítem ${index + 1}`}
                            />
                            <CustomTextField
                              size='small'
                              type='number'
                              label='Períodos (meses)'
                              value={line.metadata?.periods ?? ''}
                              onChange={event => {
                                const raw = event.target.value
                                const next = raw === '' ? null : Number(raw)

                                updateLine(index, {
                                  metadata: { ...(line.metadata ?? {}), periods: Number.isFinite(next) ? next : null }
                                })
                              }}
                              sx={{ maxWidth: 160 }}
                              disabled={saving}
                              aria-label={`Períodos del ítem ${index + 1}`}
                            />
                            <CustomTextField
                              size='small'
                              label='Tipo de contratación'
                              value={line.metadata?.employmentTypeCode ?? ''}
                              onChange={event => {
                                updateLine(index, {
                                  metadata: {
                                    ...(line.metadata ?? {}),
                                    employmentTypeCode: event.target.value || null
                                  }
                                })
                              }}
                              placeholder='Default del rol si vacío'
                              sx={{ maxWidth: 240 }}
                              disabled={saving}
                              aria-label={`Tipo de contratación del ítem ${index + 1}`}
                            />
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {showCostStack && simulationLine && outputCurrency ? (
                      <TableRow key={`${line.lineItemId ?? `draft-${index}`}-cost`}>
                        <TableCell colSpan={7} sx={{ py: 1, bgcolor: 'background.default' }}>
                          <QuoteLineCostStack lineOutput={simulationLine} outputCurrency={outputCurrency} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </>
                )
              })
            )}
          </TableBody>
        </Table>
      </Box>
      <Divider />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, p: 3 }}>
        <Box>
          <Typography variant='caption' color='text.secondary'>
            Vista previa del subtotal. Los totales finales se calculan al guardar.
          </Typography>
          <Typography variant='subtitle2' sx={{ fontFamily: 'monospace' }}>
            {formatCurrency(previewTotal, currency)}
          </Typography>
        </Box>
        <Stack direction='row' spacing={1}>
          <Button
            variant='tonal'
            color='secondary'
            onClick={handleDiscard}
            disabled={saving || !dirty}
          >
            Descartar
          </Button>
          <Button
            variant='contained'
            startIcon={<i className='tabler-device-floppy' />}
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </Stack>
      </Box>

      <SellableItemPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
        initialTab={pickerInitialTab}
        businessLineCode={businessLineCode}
        excludeSkus={excludedSkus}
      />
    </Card>
  )
})

export default QuoteLineItemsEditor
