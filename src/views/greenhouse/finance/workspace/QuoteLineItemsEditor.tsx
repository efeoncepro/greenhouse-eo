'use client'

import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Popover from '@mui/material/Popover'
import Skeleton from '@mui/material/Skeleton'
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

import EmptyState from '@/components/greenhouse/EmptyState'
import type {
  PricingLineOutputV2,
  PricingOutputCurrency,
  PricingV2LineType,
  PricingWarning
} from '@/lib/finance/pricing/contracts'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'

import type { SellableSelection } from '@/components/greenhouse/pricing/SellableItemPickerDrawer'
import QuoteLineWarning from '@/components/greenhouse/pricing/QuoteLineWarning'

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

  /** Gating del cost stack (solo finance/admin). */
  canViewCostStack?: boolean

  /** Output del engine v2 por línea, indexado por posición. */
  simulationLines?: PricingLineOutputV2[] | null
  outputCurrency?: PricingOutputCurrency | null

  /** Warnings del engine, con `lineIndex` para anclar a la fila */
  structuredWarnings?: PricingWarning[] | null

  /** El engine v2 esta re-calculando. Dispara Skeletons en precio/subtotal. */
  simulating?: boolean

  /** Se dispara en cada mutación del draft */
  onDraftChange?: (lines: QuoteLineItem[]) => void

  /** Slot del header para inyectar el AddLineSplitButton desde el shell */
  headerAction?: ReactNode

  /** Handlers del EmptyState — desde el shell para que abra los pickers correctos */
  onAddFromCatalog?: () => void
  onAddFromService?: () => void
  onAddFromTemplate?: () => void
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

export interface QuoteLineItemsEditorHandle {
  appendLines: (lines: QuoteLineItem[]) => void
  getDraft: () => QuoteLineItem[]
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

const resolveDisplayUnitPrice = (
  line: QuoteLineItem,
  simulationLine: PricingLineOutputV2 | null
): number | null => {
  if (line.unitPrice !== null && line.unitPrice !== undefined) return line.unitPrice
  if (simulationLine?.suggestedBillRate) return simulationLine.suggestedBillRate.unitPriceOutputCurrency

  return null
}

const resolveDisplaySubtotal = (
  line: QuoteLineItem,
  simulationLine: PricingLineOutputV2 | null
): number => {
  if (line.unitPrice !== null && line.unitPrice !== undefined) {
    return computeRowSubtotalAfterDiscount(line)
  }

  if (simulationLine?.suggestedBillRate) {
    const engineTotal = simulationLine.suggestedBillRate.totalBillOutputCurrency

    if (line.discountType === 'percentage' && line.discountValue) {
      return engineTotal - engineTotal * (line.discountValue / 100)
    }

    if (line.discountType === 'fixed_amount' && line.discountValue) {
      return engineTotal - line.discountValue
    }

    return engineTotal
  }

  return 0
}

const cloneLineItems = (items: QuoteLineItem[]): QuoteLineItem[] => items.map(item => ({ ...item }))

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
    canViewCostStack: canViewCostStackProp = false,
    simulationLines = null,
    outputCurrency = null,
    structuredWarnings = null,
    simulating = false,
    onDraftChange,
    headerAction,
    onAddFromCatalog,
    onAddFromService,
    onAddFromTemplate
  },
  ref
) {
  const [draftLines, setDraftLines] = useState<QuoteLineItem[]>(() => cloneLineItems(lineItems))
  const [dirty, setDirty] = useState(false)

  // Popover "Ajustes" por fila — un solo popover global abierto a la vez
  const [adjustAnchor, setAdjustAnchor] = useState<HTMLElement | null>(null)
  const [adjustIndex, setAdjustIndex] = useState<number | null>(null)

  const onDraftChangeRef = useRef(onDraftChange)

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange
  }, [onDraftChange])

  const mutateDraft = useCallback((updater: (prev: QuoteLineItem[]) => QuoteLineItem[]) => {
    setDraftLines(prev => {
      const next = updater(prev)

      onDraftChangeRef.current?.(next)

      return next
    })
    setDirty(true)
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      appendLines: (lines: QuoteLineItem[]) => {
        if (!lines || lines.length === 0) return
        mutateDraft(prev => [...prev, ...cloneLineItems(lines)])
      },
      getDraft: () => cloneLineItems(draftLines)
    }),
    [draftLines, mutateDraft]
  )

  useEffect(() => {
    if (!dirty) {
      setDraftLines(cloneLineItems(lineItems))
    }
  }, [lineItems, dirty])

  const updateLine = useCallback((index: number, patch: Partial<QuoteLineItem>) => {
    mutateDraft(prev => {
      const next = cloneLineItems(prev)

      next[index] = { ...next[index], ...patch }

      return next
    })
  }, [mutateDraft])

  const handleRemoveLine = useCallback((index: number) => {
    mutateDraft(prev => prev.filter((_, i) => i !== index))
  }, [mutateDraft])

  const handleDiscard = useCallback(() => {
    const reverted = cloneLineItems(lineItems)

    setDraftLines(reverted)
    setDirty(false)
    onDraftChangeRef.current?.(reverted)
  }, [lineItems])

  const handleSave = useCallback(async () => {
    await onSave(draftLines)
    setDirty(false)
  }, [draftLines, onSave])

  const previewTotal = useMemo(
    () =>
      draftLines.reduce(
        (acc, line, idx) => acc + resolveDisplaySubtotal(line, simulationLines?.[idx] ?? null),
        0
      ),
    [draftLines, simulationLines]
  )

  // Agrupar warnings por lineIndex para anclarlos a la row correspondiente
  const warningsByLine = useMemo(() => {
    const map = new Map<number, PricingWarning[]>()

    if (!structuredWarnings) return map

    for (const w of structuredWarnings) {
      if (typeof w.lineIndex === 'number') {
        const list = map.get(w.lineIndex) ?? []

        list.push(w)
        map.set(w.lineIndex, list)
      }
    }

    return map
  }, [structuredWarnings])

  // Warnings globales (sin lineIndex) se muestran fuera del grid
  const globalWarnings = useMemo(
    () => (structuredWarnings ?? []).filter(w => typeof w.lineIndex !== 'number'),
    [structuredWarnings]
  )

  const handleAdjustOpen = useCallback((event: ReactMouseEvent<HTMLButtonElement>, index: number) => {
    setAdjustAnchor(event.currentTarget)
    setAdjustIndex(index)
  }, [])

  const handleAdjustClose = useCallback(() => {
    setAdjustAnchor(null)
    setAdjustIndex(null)
  }, [])

  const currentAdjustLine = adjustIndex !== null ? draftLines[adjustIndex] ?? null : null

  if (!editable) {
    return (
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
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
                  const simulationLine = simulationLines?.[idx] ?? null
                  const resolvedUnitPrice = resolveDisplayUnitPrice(line, simulationLine)

                  const subtotal =
                    line.subtotalAfterDiscount ?? line.subtotalPrice ?? resolveDisplaySubtotal(line, simulationLine)

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
                          {formatCurrency(resolvedUnitPrice, currency)}
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

  const emptyCtaLabels = {
    primary: onAddFromCatalog ? GH_PRICING.emptyItems.ctaPrimary : null,
    secondary: onAddFromService ? GH_PRICING.emptyItems.ctaSecondary : null,
    tertiary: onAddFromTemplate ? GH_PRICING.emptyItems.ctaTertiary : null
  }

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
      <CardHeader
        title={`Ítems de la cotización (${draftLines.length})`}
        subheader='Agrega ítems vendibles desde el catálogo o crea una línea manual.'
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
            <i className='tabler-list-details' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
          </Avatar>
        }
        action={headerAction}
      />
      <Divider />

      {draftLines.length === 0 ? (
        <CardContent>
          <EmptyState
            icon='tabler-clipboard-list'
            title={GH_PRICING.emptyItems.title}
            description={GH_PRICING.emptyItems.subtitle}
            action={
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap flexWrap='wrap' justifyContent='center'>
                {emptyCtaLabels.primary && onAddFromCatalog ? (
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-books' aria-hidden='true' />}
                    onClick={onAddFromCatalog}
                    disabled={saving}
                    sx={{ minHeight: 44 }}
                  >
                    {emptyCtaLabels.primary}
                  </Button>
                ) : null}
                {emptyCtaLabels.secondary && onAddFromService ? (
                  <Button
                    variant='tonal'
                    color='success'
                    startIcon={<i className='tabler-package' aria-hidden='true' />}
                    onClick={onAddFromService}
                    disabled={saving}
                    sx={{ minHeight: 44 }}
                  >
                    {emptyCtaLabels.secondary}
                  </Button>
                ) : null}
                {emptyCtaLabels.tertiary && onAddFromTemplate ? (
                  <Button
                    variant='tonal'
                    color='info'
                    startIcon={<i className='tabler-template' aria-hidden='true' />}
                    onClick={onAddFromTemplate}
                    disabled={saving}
                    sx={{ minHeight: 44 }}
                  >
                    {emptyCtaLabels.tertiary}
                  </Button>
                ) : null}
              </Stack>
            }
            minHeight={260}
          />
        </CardContent>
      ) : (
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
                <TableCell sx={{ minWidth: 96 }} align='right'>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {draftLines.map((line, index) => {
                const simulationLine = simulationLines?.[index] ?? null
                const enginePrice = simulationLine?.suggestedBillRate?.unitPriceOutputCurrency ?? null
                const isManualOverride = line.unitPrice !== null && line.unitPrice !== undefined
                const subtotal = resolveDisplaySubtotal(line, simulationLine)
                const typeMeta = LINE_TYPE_META[line.lineType]
                const showCostStack = canViewCostStackProp && simulationLine && outputCurrency
                const needsPricingContext = line.lineType === 'role' || line.lineType === 'person'
                const tierMeta = simulationLine ? TIER_STATUS_META[simulationLine.tierCompliance.status] : null
                const rowWarnings = warningsByLine.get(index) ?? []
                const rowId = line.lineItemId ?? `draft-row-${index}`

                return (
                  <Fragment key={rowId}>
                    <TableRow id={rowId} hover>
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
                        <Stack spacing={0.5} alignItems='flex-end'>
                          <CustomTextField
                            size='small'
                            type='number'
                            value={line.unitPrice ?? ''}
                            placeholder={enginePrice !== null ? formatCurrency(enginePrice, currency) : undefined}
                            onChange={event => {
                              const raw = event.target.value

                              updateLine(index, { unitPrice: raw === '' ? null : Number(raw) })
                            }}
                            disabled={saving}
                            aria-label={`Precio unitario del ítem ${index + 1}`}
                          />
                          {simulating && !isManualOverride ? (
                            <Skeleton variant='text' width={120} height={18} aria-label='Calculando precio sugerido' />
                          ) : enginePrice !== null && !isManualOverride ? (
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ fontFamily: 'monospace' }}
                              aria-label='Precio sugerido por el motor de pricing'
                            >
                              Sugerido {formatCurrency(enginePrice, currency)}
                            </Typography>
                          ) : null}
                          {isManualOverride && enginePrice !== null ? (
                            <Stack direction='row' spacing={0.5} alignItems='center'>
                              <CustomChip round='true' size='small' variant='outlined' color='warning' label='Override' />
                              <Tooltip title='Volver al precio sugerido'>
                                <span>
                                  <IconButton
                                    size='small'
                                    onClick={() => updateLine(index, { unitPrice: null })}
                                    disabled={saving}
                                    aria-label='Volver al precio sugerido'
                                  >
                                    <i className='tabler-refresh' style={{ fontSize: 16 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell align='right'>
                        {simulating && !isManualOverride && subtotal === 0 ? (
                          <Skeleton variant='text' width={90} height={22} sx={{ ml: 'auto' }} aria-label='Calculando subtotal' />
                        ) : subtotal === 0 && enginePrice === null && !isManualOverride ? (
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', color: 'text.secondary' }} aria-label='Subtotal sin datos suficientes'>
                            —
                          </Typography>
                        ) : (
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                            {formatCurrency(subtotal, currency)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        <Stack direction='row' spacing={0.25} justifyContent='flex-end'>
                          {needsPricingContext ? (
                            <Tooltip title={GH_PRICING.adjustPopover.triggerLabel}>
                              <span>
                                <IconButton
                                  size='small'
                                  onClick={event => handleAdjustOpen(event, index)}
                                  disabled={saving}
                                  aria-label={`${GH_PRICING.adjustPopover.triggerLabel} · ítem ${index + 1}`}
                                >
                                  <i className='tabler-adjustments' style={{ fontSize: 18 }} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : null}
                          <Tooltip title='Eliminar ítem'>
                            <span>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleRemoveLine(index)}
                                disabled={saving}
                                aria-label={`Eliminar ítem ${index + 1}`}
                              >
                                <i className='tabler-trash' style={{ fontSize: 18 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>

                    {rowWarnings.length > 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 1, bgcolor: 'background.default' }}>
                          <QuoteLineWarning warnings={rowWarnings} rowIndex={index} rowElementId={rowId} />
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {showCostStack && simulationLine && outputCurrency ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 1, bgcolor: 'background.default' }}>
                          <QuoteLineCostStack lineOutput={simulationLine} outputCurrency={outputCurrency} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      )}

      {globalWarnings.length > 0 ? (
        <Box sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
          <QuoteLineWarning warnings={globalWarnings} rowIndex={-1} />
        </Box>
      ) : null}

      <Divider />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, p: 3 }}>
        <Box>
          <Typography variant='caption' color='text.secondary'>
            Vista previa del subtotal. Los totales finales se calculan al guardar.
          </Typography>
          {simulating && previewTotal === 0 ? (
            <Skeleton variant='text' width={140} height={24} />
          ) : previewTotal === 0 && draftLines.every(l => l.unitPrice === null || l.unitPrice === undefined) ? (
            <Typography variant='subtitle2' sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              —
            </Typography>
          ) : (
            <Typography variant='subtitle2' sx={{ fontFamily: 'monospace' }}>
              {formatCurrency(previewTotal, currency)}
            </Typography>
          )}
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

      {/* Popover Ajustes de pricing por fila */}
      <Popover
        open={Boolean(adjustAnchor) && currentAdjustLine !== null}
        anchorEl={adjustAnchor}
        onClose={handleAdjustClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: theme => ({
              mt: 1,
              width: 360,
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[6]
            })
          }
        }}
      >
        {currentAdjustLine && adjustIndex !== null ? (
          <Box sx={{ p: 2.5 }} role='dialog' aria-label={GH_PRICING.adjustPopover.title}>
            <Stack spacing={2}>
              <Box>
                <Typography variant='subtitle2'>{GH_PRICING.adjustPopover.title}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {GH_PRICING.adjustPopover.subtitle}
                </Typography>
              </Box>
              <CustomTextField
                size='small'
                type='number'
                fullWidth
                label={GH_PRICING.adjustPopover.fteLabel}
                value={currentAdjustLine.metadata?.fteFraction ?? ''}
                onChange={event => {
                  const raw = event.target.value
                  const next = raw === '' ? null : Number(raw)

                  updateLine(adjustIndex, {
                    metadata: {
                      ...(currentAdjustLine.metadata ?? {}),
                      fteFraction: Number.isFinite(next) ? next : null
                    }
                  })
                }}
                helperText={GH_PRICING.adjustPopover.fteHelper}
                disabled={saving}
                aria-label={GH_PRICING.adjustPopover.fteLabel}
                autoFocus
              />
              <CustomTextField
                size='small'
                type='number'
                fullWidth
                label={GH_PRICING.adjustPopover.periodsLabel}
                value={currentAdjustLine.metadata?.periods ?? ''}
                onChange={event => {
                  const raw = event.target.value
                  const next = raw === '' ? null : Number(raw)

                  updateLine(adjustIndex, {
                    metadata: {
                      ...(currentAdjustLine.metadata ?? {}),
                      periods: Number.isFinite(next) ? next : null
                    }
                  })
                }}
                disabled={saving}
                aria-label={GH_PRICING.adjustPopover.periodsLabel}
              />
              <CustomTextField
                size='small'
                fullWidth
                label={GH_PRICING.adjustPopover.employmentTypeLabel}
                value={currentAdjustLine.metadata?.employmentTypeCode ?? ''}
                onChange={event => {
                  updateLine(adjustIndex, {
                    metadata: {
                      ...(currentAdjustLine.metadata ?? {}),
                      employmentTypeCode: event.target.value || null
                    }
                  })
                }}
                placeholder={GH_PRICING.adjustPopover.employmentTypePlaceholder}
                disabled={saving}
                aria-label={GH_PRICING.adjustPopover.employmentTypeLabel}
              />
              <Stack direction='row' spacing={1} justifyContent='flex-end'>
                <Button variant='tonal' color='secondary' onClick={handleAdjustClose}>
                  {GH_PRICING.adjustPopover.closeLabel}
                </Button>
                <Button variant='contained' onClick={handleAdjustClose}>
                  {GH_PRICING.adjustPopover.applyLabel}
                </Button>
              </Stack>
            </Stack>
          </Box>
        ) : null}
      </Popover>

    </Card>
  )
})

export default QuoteLineItemsEditor
