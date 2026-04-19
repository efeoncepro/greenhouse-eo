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

  /** Opciones de tipo de contratación desde /api/finance/quotes/pricing/config (catalog.employmentTypes). */
  employmentTypeOptions?: Array<{ value: string; label: string }>

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
    saving,
    canViewCostStack: canViewCostStackProp = false,
    simulationLines = null,
    outputCurrency = null,
    structuredWarnings = null,
    simulating = false,
    employmentTypeOptions = [],
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
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  // Popover "Ajustes" por fila — un solo popover global abierto a la vez
  const [adjustAnchor, setAdjustAnchor] = useState<HTMLElement | null>(null)
  const [adjustIndex, setAdjustIndex] = useState<number | null>(null)

  const toggleRowExpanded = useCallback((index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)

      if (next.has(index)) next.delete(index)
      else next.add(index)

      return next
    })
  }, [])

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
      <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}`, borderRadius: `${theme.shape.customBorderRadius.lg}px` })}>
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
                        <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(resolvedUnitPrice, currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
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
    <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}`, borderRadius: `${theme.shape.customBorderRadius.lg}px` })}>
      <CardHeader
        title={
          <Stack direction='row' spacing={1} alignItems='center'>
            <Typography variant='h6' sx={{ fontWeight: 600 }}>
              Ítems de la cotización
            </Typography>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={draftLines.length === 0 ? 'secondary' : 'primary'}
              label={String(draftLines.length)}
            />
          </Stack>
        }
        subheader={draftLines.length === 0 ? undefined : 'Agrega ítems vendibles desde el catálogo o crea una línea manual.'}
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity', width: 40, height: 40 }}>
            <i className='tabler-list-details' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
          </Avatar>
        }
        action={headerAction}
      />
      <Divider />

      {draftLines.length === 0 ? (
        <CardContent>
          <EmptyState
            icon='tabler-file-invoice'
            animatedIcon='/animations/empty-chart.json'
            title={GH_PRICING.emptyItems.title}
            description={GH_PRICING.emptyItems.subtitle}
            action={
              onAddFromCatalog ? (
                <Stack direction='row' spacing={1} alignItems='center' useFlexGap>
                  <Button
                    variant='contained'
                    size='small'
                    startIcon={<i className='tabler-books' aria-hidden='true' />}
                    onClick={onAddFromCatalog}
                    disabled={saving}
                  >
                    {GH_PRICING.emptyItems.ctaPrimary}
                  </Button>
                  {(onAddFromService || onAddFromTemplate) ? (
                    <>
                      <Typography variant='caption' color='text.secondary'>
                        o
                      </Typography>
                      {onAddFromService ? (
                        <Button
                          variant='text'
                          size='small'
                          color='primary'
                          onClick={onAddFromService}
                          disabled={saving}
                        >
                          {GH_PRICING.emptyItems.ctaSecondary}
                        </Button>
                      ) : null}
                      {onAddFromTemplate ? (
                        <Button
                          variant='text'
                          size='small'
                          color='primary'
                          onClick={onAddFromTemplate}
                          disabled={saving}
                        >
                          {GH_PRICING.emptyItems.ctaTertiary}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </Stack>
              ) : null
            }
            minHeight={220}
          />
        </CardContent>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 32, minWidth: 32 }} aria-label='Expandir detalle' />
                <TableCell sx={{ minWidth: 220 }}>Ítem</TableCell>
                <TableCell sx={{ minWidth: 140 }}>Tipo</TableCell>
                <TableCell sx={{ minWidth: 90 }} align='right'>Cantidad</TableCell>
                <TableCell sx={{ minWidth: 110 }}>Unidad</TableCell>
                <TableCell sx={{ minWidth: 130 }} align='right'>Precio unitario</TableCell>
                <TableCell sx={{ minWidth: 110 }} align='right'>Subtotal</TableCell>
                <TableCell sx={{ minWidth: 80 }} align='right' aria-label='Acciones' />
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

                const hasDetails = Boolean(needsPricingContext || showCostStack)
                const isExpanded = expandedRows.has(index)
                const isHovered = hoveredRow === index

                return (
                  <Fragment key={rowId}>
                    <TableRow
                      id={rowId}
                      hover
                      onMouseEnter={() => setHoveredRow(index)}
                      onMouseLeave={() => setHoveredRow(prev => (prev === index ? null : prev))}
                    >
                      <TableCell sx={{ width: 32, minWidth: 32, pr: 0 }}>
                        {hasDetails ? (
                          <Tooltip title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'} disableInteractive>
                            <IconButton
                              size='small'
                              onClick={() => toggleRowExpanded(index)}
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? 'Ocultar detalle de pricing' : 'Ver detalle de pricing'}
                              sx={{
                                transition: 'transform 150ms ease-out',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
                              }}
                            >
                              <i className='tabler-chevron-right' style={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </TableCell>
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
                        <Stack spacing={0.25} alignItems='flex-end'>
                          <CustomTextField
                            size='small'
                            type='number'
                            value={line.quantity}
                            onChange={event => {
                              const raw = event.target.value
                              const next = raw === '' ? 0 : Number(raw)
                              const parsed = Number.isFinite(next) ? next : 0

                              // Para lineas period-based (role/person) sincronizamos
                              // metadata.periods con quantity: la engine multiplica
                              // por periods, no por quantity, cuando la base es mensual.
                              updateLine(index, needsPricingContext
                                ? {
                                    quantity: parsed,
                                    metadata: {
                                      ...(line.metadata ?? {}),
                                      periods: parsed
                                    }
                                  }
                                : { quantity: parsed }
                              )
                            }}
                            disabled={saving}
                            aria-label={`Cantidad del ítem ${index + 1}`}
                          />
                          {needsPricingContext ? (
                            <Typography variant='caption' color='text.secondary'>
                              meses facturables
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {needsPricingContext ? (
                          <Tooltip title='El engine usa base mensual para roles y personas' disableInteractive>
                            <span>
                              <CustomChip
                                round='true'
                                size='small'
                                variant='tonal'
                                color='secondary'
                                label='Mes'
                              />
                            </span>
                          </Tooltip>
                        ) : (
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
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        <Stack spacing={0.5} alignItems='flex-end'>
                          {/*
                            Patrón enterprise (Stripe Billing / Ramp / Linear):
                            el input siempre muestra un valor concreto.
                            - Si el usuario tiene override → muestra line.unitPrice.
                            - Si no, muestra el precio del engine (catalog-backed).
                            - Mientras el engine no responda en first-load, skeleton.
                            Al cambiar cantidad el enginePrice se actualiza y el
                            input refleja el nuevo valor en vivo, sin pisar overrides.
                          */}
                          {simulating && enginePrice === null && !isManualOverride ? (
                            <Skeleton variant='rounded' width={140} height={32} aria-label='Calculando precio del catálogo' />
                          ) : (
                            <CustomTextField
                              size='small'
                              type='number'
                              value={line.unitPrice ?? (enginePrice !== null ? enginePrice : '')}
                              onChange={event => {
                                const raw = event.target.value

                                updateLine(index, { unitPrice: raw === '' ? null : Number(raw) })
                              }}
                              disabled={saving}
                              aria-label={`Precio unitario del ítem ${index + 1}`}
                            />
                          )}
                          {isManualOverride && enginePrice !== null ? (
                            <Stack direction='row' spacing={0.5} alignItems='center'>
                              <CustomChip round='true' size='small' variant='outlined' color='warning' label='Override' />
                              <Tooltip title={`Volver al precio del catálogo (${formatCurrency(enginePrice, currency)})`}>
                                <span>
                                  <IconButton
                                    size='small'
                                    onClick={() => updateLine(index, { unitPrice: null })}
                                    disabled={saving}
                                    aria-label='Volver al precio del catálogo'
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
                          <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }} aria-label='Subtotal sin datos suficientes'>
                            —
                          </Typography>
                        ) : (
                          <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                            {formatCurrency(subtotal, currency)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        <Stack direction='row' spacing={0.25} justifyContent='flex-end'>
                          {needsPricingContext ? (
                            <Tooltip title={GH_PRICING.adjustPopover.triggerLabel} disableInteractive>
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
                          <Tooltip title='Eliminar ítem' disableInteractive>
                            <span>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleRemoveLine(index)}
                                disabled={saving}
                                aria-label={`Eliminar ítem ${index + 1}`}
                                sx={{
                                  opacity: isHovered ? 1 : 0,
                                  transition: 'opacity 150ms ease-out',
                                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                                  '&:focus-visible': { opacity: 1 }
                                }}
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
                        <TableCell colSpan={8} sx={{ py: 1, bgcolor: 'background.default' }}>
                          <QuoteLineWarning warnings={rowWarnings} rowIndex={index} rowElementId={rowId} />
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {isExpanded && showCostStack && simulationLine && outputCurrency ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          sx={theme => ({
                            py: 1.5,
                            bgcolor: 'background.default',
                            borderLeft: `3px solid ${theme.palette.primary.main}`
                          })}
                        >
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

      {dirty && draftLines.length > 0 ? (
        <>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, px: 3, py: 2 }}>
            <Button
              variant='text'
              color='secondary'
              size='small'
              onClick={handleDiscard}
              disabled={saving}
            >
              Descartar cambios
            </Button>
          </Box>
        </>
      ) : null}

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
                select
                size='small'
                fullWidth
                label={GH_PRICING.adjustPopover.employmentTypeLabel}
                value={currentAdjustLine.metadata?.employmentTypeCode ?? ''}
                onChange={event => {
                  const raw = event.target.value

                  updateLine(adjustIndex, {
                    metadata: {
                      ...(currentAdjustLine.metadata ?? {}),
                      employmentTypeCode: raw === '' ? null : raw
                    }
                  })
                }}
                disabled={saving || employmentTypeOptions.length === 0}
                helperText={
                  employmentTypeOptions.length === 0
                    ? 'Cargando opciones…'
                    : GH_PRICING.adjustPopover.employmentTypePlaceholder
                }
                aria-label={GH_PRICING.adjustPopover.employmentTypeLabel}
              >
                <MenuItem value=''>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_PRICING.adjustPopover.employmentTypePlaceholder}
                  </Typography>
                </MenuItem>
                {employmentTypeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </CustomTextField>
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
