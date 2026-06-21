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
import ButtonBase from '@mui/material/ButtonBase'
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
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { DataTableShell } from '@/components/greenhouse/data-table'
import { useListAnimation } from '@/hooks/useListAnimation'
import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'
import type {
  PricingLineOutputV2,
  PricingOutputCurrency,
  PricingV2LineType,
  PricingWarning
} from '@/lib/finance/pricing/contracts'
import { GH_PRICING } from '@/lib/copy/pricing'

import type { SellableSelection } from '@/components/greenhouse/pricing/SellableItemPickerDrawer'
import CostOverrideDialog, {
  type CostOverrideDialogSuccessResult
} from '@/components/greenhouse/pricing/CostOverrideDialog'
import QuoteLineWarning from '@/components/greenhouse/pricing/QuoteLineWarning'

import QuoteLineCostStack from './QuoteLineCostStack'
import { formatCurrency as formatGreenhouseCurrency, formatNumber as formatGreenhouseNumber } from '@/lib/format'

const TASK407_ARIA_EXPANDIR_DETALLE = "Expandir detalle"
const TASK407_ARIA_ACCIONES = "Acciones"
const TASK407_ARIA_CALCULANDO_PRECIO_DEL_CATALOGO = "Calculando precio del catálogo"
const TASK407_ARIA_CALCULANDO_SUBTOTAL = "Calculando subtotal"
const TASK407_ARIA_SUBTOTAL_SIN_DATOS_SUFICIENTES = "Subtotal sin datos suficientes"
const TASK407_ARIA_AVISOS_DEL_MOTOR_DE_PRICING = "Avisos del motor de pricing"
const TASK407_ARIA_EDITOR_LINEAS = "Editor de lineas del quote"


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

  /**
   * Gating del trigger de override manual del costo por línea (TASK-481).
   * El dialog en sí es más restrictivo que ver el cost stack: solo
   * `finance_admin + efeonce_admin` pueden aplicarlo. Aunque el prop venga
   * en true para un `finance_analyst`, el endpoint backend responde 403
   * y el dialog muestra el banner "sin permiso".
   */
  canOverrideCost?: boolean

  /**
   * Callback disparado cuando el dialog de override persiste exitosamente.
   * El shell debería usarlo para re-simular pricing y refrescar la UI,
   * porque el cost_breakdown cambió en backend.
   */
  onCostOverrideApplied?: (result: CostOverrideDialogSuccessResult) => void

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
  onAddFromManual?: () => void

  /** TASK-615: nota de bloqueo cuando un upstream chip todavía no está completo
   *  (ej. organización ausente). Aparece debajo de los CTAs del empty state. */
  pendingHint?: string | null
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

const SOURCE_META: Record<QuoteLineSource, { label: string; color: 'primary' | 'info' | 'success' | 'warning'; icon: string }> = {
  catalog: { label: 'Catálogo', color: 'primary', icon: 'tabler-books' },
  service: { label: 'Servicio', color: 'success', icon: 'tabler-package' },
  template: { label: 'Template', color: 'info', icon: 'tabler-template' },
  manual: { label: 'Manual', color: 'info', icon: 'tabler-edit' }
}

const EDITOR_ROW_GRID_COLUMNS =
  '28px minmax(260px, 1fr) minmax(104px, 0.28fr) minmax(132px, 0.34fr) minmax(132px, 0.34fr) 36px'

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
    return formatGreenhouseCurrency(amount, currency, {
  maximumFractionDigits: 0
}, 'es-CL')
  } catch {
    return `${currency} ${formatGreenhouseNumber(Math.round(amount), 'es-CL')}`
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
    canOverrideCost = false,
    onCostOverrideApplied,
    simulationLines = null,
    outputCurrency = null,
    structuredWarnings = null,
    simulating = false,
    employmentTypeOptions = [],
    onDraftChange,
    headerAction,
    onAddFromCatalog,
    onAddFromService,
    onAddFromTemplate,
    onAddFromManual,
    pendingHint = null,
    quotationId
  },
  ref
) {
  const [draftLines, setDraftLines] = useState<QuoteLineItem[]>(() => cloneLineItems(lineItems))
  const [dirty, setDirty] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [readonlyTableBodyRef] = useListAnimation()
  const [draftTableBodyRef] = useListAnimation()
  const prefersReducedMotion = useReducedMotion()

  // Popover "Ajustes" por fila — un solo popover global abierto a la vez
  const [adjustAnchor, setAdjustAnchor] = useState<HTMLElement | null>(null)
  const [adjustIndex, setAdjustIndex] = useState<number | null>(null)

  // Popover de warnings por fila (TASK-508) — reemplaza el Alert full-row.
  const [warningAnchor, setWarningAnchor] = useState<HTMLElement | null>(null)
  const [warningIndex, setWarningIndex] = useState<number | null>(null)

  // Override dialog (TASK-481) — controla qué línea tiene el dialog abierto.
  const [overrideDialogIndex, setOverrideDialogIndex] = useState<number | null>(null)

  const toggleRowExpanded = useCallback((index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)

      if (next.has(index)) next.delete(index)
      else next.add(index)

      return next
    })
  }, [])

  const onDraftChangeRef = useRef(onDraftChange)
  const pendingDraftChangeRef = useRef<QuoteLineItem[] | null>(null)

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange
  }, [onDraftChange])

  useEffect(() => {
    const pendingDraft = pendingDraftChangeRef.current

    if (!pendingDraft) return

    pendingDraftChangeRef.current = null
    onDraftChangeRef.current?.(pendingDraft)
  }, [draftLines])

  const mutateDraft = useCallback((updater: (prev: QuoteLineItem[]) => QuoteLineItem[]) => {
    setDirty(true)
    setDraftLines(prev => {
      const next = updater(prev)

      pendingDraftChangeRef.current = next

      return next
    })
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

  const handleAdjustOpen = useCallback((event: ReactMouseEvent<HTMLElement>, index: number) => {
    setAdjustAnchor(event.currentTarget)
    setAdjustIndex(index)
  }, [])

  const handleAdjustClose = useCallback(() => {
    setAdjustAnchor(null)
    setAdjustIndex(null)
  }, [])

  const handleWarningOpen = useCallback((event: ReactMouseEvent<HTMLElement>, index: number) => {
    setWarningAnchor(event.currentTarget)
    setWarningIndex(index)
  }, [])

  const handleWarningClose = useCallback(() => {
    setWarningAnchor(null)
    setWarningIndex(null)
  }, [])

  const currentAdjustLine = adjustIndex !== null ? draftLines[adjustIndex] ?? null : null
  const currentWarnings = warningIndex !== null ? warningsByLine.get(warningIndex) ?? [] : []

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
          <DataTableShell identifier='quote-line-items-summary' ariaLabel='Resumen de lineas del quote'>
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
              <TableBody ref={readonlyTableBodyRef}>
                {lineItems.map((line, idx) => {
                  const simulationLine = simulationLines?.[idx] ?? null
                  const resolvedUnitPrice = resolveDisplayUnitPrice(line, simulationLine)

                  const subtotal =
                    line.subtotalAfterDiscount ?? line.subtotalPrice ?? resolveDisplaySubtotal(line, simulationLine)

                  const typeMeta = LINE_TYPE_META[line.lineType]

                  return (
                    <TableRow key={line.lineItemId ?? `${line.label}-${idx}`} hover>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
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
                        <Typography variant='monoAmount'>
                          {formatCurrency(subtotal, currency)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </DataTableShell>
        )}
      </Card>
    )
  }

  return (
    <Box
      data-capture='quote-builder-line-canvas'
      sx={theme => ({
        minWidth: 0,
        overflowX: 'clip',
        borderBlockStart: `1px solid ${alpha(theme.palette.divider, 0.92)}`
      })}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: { xs: 1.25, md: 2 },
          px: { xs: 0, md: 0 },
          py: { xs: 1.25, md: 1.75 }
        }}
      >
        <Stack spacing={0.35} sx={{ minWidth: 0 }}>
          <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap'>
            <Typography variant='h6'>Ítems de la cotización</Typography>
            <CustomChip round='true' size='small' variant='tonal' color='primary' label={draftLines.length} />
          </Stack>
          {draftLines.length === 0 ? null : (
            <Typography variant='body2' color='text.secondary' sx={{ display: { xs: 'none', sm: 'block' } }}>
              Agrega ítems vendibles desde el catálogo o crea una línea manual.
            </Typography>
          )}
        </Stack>
        {headerAction ? (
          <Box
            sx={{
              justifySelf: { xs: 'start', md: 'end' },
              '& .MuiButton-root': {
                minHeight: { xs: 38, md: 40 },
                px: { xs: 1.4, md: 1.8 }
              }
            }}
          >
            {headerAction}
          </Box>
        ) : null}
      </Box>
      <Divider />

      {draftLines.length === 0 ? (
        <Box sx={{ p: 0 }}>
          <Stack spacing={0}>
            <Box
              sx={theme => ({
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                px: { xs: 2.5, md: 4 },
                py: 2,
                backgroundColor: theme.palette.background.paper,
                borderBottom: `1px solid ${theme.palette.divider}`
              })}
            >
              <ButtonBase
                data-capture='quote-builder-open-catalog'
                onClick={onAddFromCatalog}
                disabled={saving || !onAddFromCatalog}
                sx={theme => ({
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: 1.5,
                  minWidth: 0,
                  maxWidth: { sm: 620 },
                  px: 1.5,
                  py: 1.25,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.default,
                  boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.58)}`,
                  textAlign: 'left',
                  transition: prefersReducedMotion
                    ? 'none'
                    : theme.transitions.create(['border-color', 'background-color', 'box-shadow', 'transform'], {
                        duration: theme.transitions.duration.shortest
                      }),
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: theme.palette.background.paper,
                    transform: 'translateY(-1px)'
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2
                  },
                  '&.Mui-disabled': {
                    opacity: 0.64,
                    transform: 'none'
                  }
                })}
              >
                <Box
                  component='span'
                  sx={theme => ({
                    width: 36,
                    height: 36,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                    color: 'primary.main',
                    backgroundColor: theme.palette.primary.lightOpacity,
                    flexShrink: 0
                  })}
                >
                  <Box component='i' className='tabler-search' aria-hidden='true' sx={{ fontSize: 19 }} />
                </Box>
                <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                  <Typography variant='body1' sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
                    {GH_PRICING.dealDesk.lineCanvas.searchPlaceholder}
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.35 }} noWrap>
                    {GH_PRICING.dealDesk.lineCanvas.searchSupportingText}
                  </Typography>
                </Stack>
                <CustomChip
                  round='true'
                  size='small'
                  variant='outlined'
                  color='primary'
                  label={GH_PRICING.dealDesk.lineCanvas.searchOpenLabel}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' }, flexShrink: 0 }}
                />
              </ButtonBase>
            </Box>

            <Box
              component={motion.div}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              data-capture='quote-builder-empty-line-methods'
              sx={theme => ({
                px: { xs: 2.5, md: 4 },
                py: { xs: 4, md: 5 },
                backgroundColor: theme.palette.background.paper
              })}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 0.72fr) minmax(0, 1.28fr)' },
                  gap: { xs: 3, md: 4 },
                  alignItems: 'start',
                  minWidth: 0
                }}
              >
                <Stack spacing={2} sx={{ minWidth: 0 }}>
                  <Stack spacing={0.75}>
                    <Typography variant='overline' color='text.secondary'>
                      Alcance
                    </Typography>
                    <Typography variant='h5'>
                      {GH_PRICING.dealDesk.lineCanvas.emptyTitle}
                    </Typography>
                    <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 420 }}>
                      {GH_PRICING.dealDesk.lineCanvas.emptySubtitle}
                    </Typography>
                  </Stack>

                  {pendingHint ? (
                    <Stack
                      direction='row'
                      spacing={1}
                      alignItems='flex-start'
                      role='status'
                      sx={theme => ({
                        color: 'warning.main',
                        p: 1.5,
                        pr: { xs: 7, sm: 1.5 },
                        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                        backgroundColor: theme.palette.warning.lightOpacity
                      })}
                    >
                      <Box
                        component='i'
                        className='tabler-alert-circle'
                        aria-hidden='true'
                        sx={{ fontSize: 16, mt: 0.1, flexShrink: 0 }}
                      />
                      <Typography variant='body2' sx={{ color: 'warning.main', fontWeight: 600, minWidth: 0 }}>
                        {pendingHint}
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>

                <Box
                  component='ul'
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 1.5,
                    m: 0,
                    p: 0,
                    listStyle: 'none',
                    minWidth: 0
                  }}
                >
                  {GH_PRICING.emptyItems.methodHints.map((hint, index) => {
                    const handlers = [onAddFromCatalog, onAddFromService, onAddFromTemplate, onAddFromManual]
                    const handler = handlers[index]
                    const isPrimaryMethod = index === 0

                    return (
                      <Box
                        key={hint.title}
                        component={motion.li}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut', delay: index * 0.035 }}
                        sx={{ minWidth: 0 }}
                      >
                        <ButtonBase
                          onClick={handler}
                          disabled={saving || !handler}
                          sx={theme => ({
                            width: '100%',
                            minWidth: 0,
                            minHeight: { xs: 88, md: 104 },
                            display: 'grid',
                            gridTemplateColumns: 'auto minmax(0, 1fr)',
                            gap: 1.5,
                            alignItems: 'flex-start',
                            justifyContent: 'flex-start',
                            p: 2,
                            border: `1px solid ${isPrimaryMethod ? theme.palette.primary.main : theme.palette.divider}`,
                            borderRadius: `${theme.shape.customBorderRadius.md}px`,
                            backgroundColor: isPrimaryMethod
                              ? alpha(theme.palette.primary.main, 0.08)
                              : theme.palette.background.default,
                            textAlign: 'left',
                            boxShadow: isPrimaryMethod ? `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.08)}` : 'none',
                            transition: prefersReducedMotion
                              ? 'none'
                              : theme.transitions.create(['border-color', 'box-shadow', 'background-color', 'transform'], {
                                  duration: theme.transitions.duration.shortest
                                }),
                            '&:hover': {
                              borderColor: theme.palette.primary.main,
                              backgroundColor: theme.palette.background.paper,
                              transform: 'translateY(-2px)'
                            },
                            '&:active': {
                              transform: 'translateY(0)'
                            },
                            '&:focus-visible': {
                              outline: `2px solid ${theme.palette.primary.main}`,
                              outlineOffset: 2
                            },
                            '&.Mui-disabled': {
                              opacity: 0.56
                            }
                          })}
                        >
                          <Box
                            component='span'
                            sx={theme => ({
                              width: 32,
                              height: 32,
                              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: theme.palette.background.paper,
                              border: `1px solid ${theme.palette.divider}`,
                              color: isPrimaryMethod ? 'primary.main' : 'text.secondary',
                              flexShrink: 0
                            })}
                          >
                            <Box
                              component='i'
                              className={hint.icon}
                              aria-hidden='true'
                              sx={{ fontSize: 18 }}
                            />
                          </Box>
                          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                            <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap'>
                              <Typography variant='body1' sx={{ fontWeight: 600, lineHeight: 1.35 }}>
                                {hint.title}
                              </Typography>
                              {isPrimaryMethod ? (
                                <CustomChip
                                  round='true'
                                  size='small'
                                  variant='tonal'
                                  color='primary'
                                  label={GH_PRICING.emptyItems.recommendedLabel}
                                />
                              ) : null}
                            </Stack>
                            <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.45 }}>
                              {hint.description}
                            </Typography>
                          </Stack>
                        </ButtonBase>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            </Box>
          </Stack>
        </Box>
      ) : (
        <Box
          role='table'
          aria-label={TASK407_ARIA_EDITOR_LINEAS}
          sx={theme => ({
            minWidth: 0,
            borderBlockStart: `1px solid ${theme.palette.divider}`,
            overflowX: 'clip'
          })}
        >
          <Typography
            variant='caption'
            sx={{
              position: 'absolute',
              width: 1,
              height: 1,
              p: 0,
              m: -1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap',
              border: 0
            }}
          >
            {TASK407_ARIA_EXPANDIR_DETALLE} · {TASK407_ARIA_ACCIONES}
          </Typography>
          <Box
            role='row'
            sx={theme => ({
              display: { xs: 'none', lg: 'grid' },
              gridTemplateColumns: EDITOR_ROW_GRID_COLUMNS,
              alignItems: 'center',
              gap: 1.25,
              mx: 1.5,
              mt: 1.25,
              px: 1.5,
              py: 0.75,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              backgroundColor: alpha(theme.palette.text.primary, 0.025),
              color: theme.palette.text.secondary,
              minWidth: 0
            })}
          >
            <Box aria-hidden='true' />
            <Typography role='columnheader' variant='caption' sx={{ fontWeight: 600 }}>
              Ítem
            </Typography>
            <Typography role='columnheader' variant='caption' sx={{ fontWeight: 600 }}>
              Cantidad
            </Typography>
            <Typography role='columnheader' variant='caption' sx={{ fontWeight: 600, textAlign: 'right' }}>
              Precio unitario
            </Typography>
            <Typography role='columnheader' variant='caption' sx={{ fontWeight: 600, textAlign: 'right' }}>
              Subtotal
            </Typography>
            <Box role='columnheader' aria-label={TASK407_ARIA_ACCIONES} />
          </Box>

          <Box ref={draftTableBodyRef} role='rowgroup'>
              {draftLines.map((line, index) => {
                const simulationLine = simulationLines?.[index] ?? null
                const enginePrice = simulationLine?.suggestedBillRate?.unitPriceOutputCurrency ?? null
                const subtotal = resolveDisplaySubtotal(line, simulationLine)
                const typeMeta = LINE_TYPE_META[line.lineType]
                const showCostStack = canViewCostStackProp && simulationLine && outputCurrency
                const needsPricingContext = line.lineType === 'role' || line.lineType === 'person'
                const v2LineType = line.metadata?.pricingV2LineType ?? null

                // Catalog-priced: precio SIEMPRE viene del engine, input read-only.
                // Matches lineRequiresSuggestedPrice en quote-builder-pricing.ts.
                const isCatalogPriced =
                  v2LineType === 'role' ||
                  v2LineType === 'person' ||
                  v2LineType === 'tool' ||
                  v2LineType === 'overhead_addon'

                const fteFraction = line.metadata?.fteFraction ?? 1

                // Precio efectivo mostrado al usuario. Para role/person lo escalamos
                // por FTE para que el subtotal = meses × precioMostrado sea lineal y
                // auditable a ojo. Para tool/overhead no aplica FTE.
                const displayedUnitPrice =
                  enginePrice === null
                    ? null
                    : needsPricingContext
                      ? enginePrice * fteFraction
                      : enginePrice

                // Manual override solo aplica a líneas NO catalog-backed (direct_cost).
                const hasManualPrice = !isCatalogPriced && line.unitPrice !== null && line.unitPrice !== undefined
                const tierMeta = simulationLine ? TIER_STATUS_META[simulationLine.tierCompliance.status] : null
                const rowWarnings = warningsByLine.get(index) ?? []
                const rowId = line.lineItemId ?? `draft-row-${index}`

                const hasDetails = Boolean(needsPricingContext || showCostStack)
                const isExpanded = expandedRows.has(index)
                const isHovered = hoveredRow === index

                return (
                  <Fragment key={rowId}>
                    <Box
                      id={rowId}
                      role='row'
                      onMouseEnter={() => setHoveredRow(index)}
                      onMouseLeave={() => setHoveredRow(prev => (prev === index ? null : prev))}
                      sx={theme => ({
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'minmax(0, 1fr) auto',
                          md: 'repeat(2, minmax(0, 1fr))',
                          lg: EDITOR_ROW_GRID_COLUMNS
                        },
                        gap: { xs: 0.6, md: 1, lg: 1.25 },
                        alignItems: { xs: 'stretch', lg: 'center' },
                        px: { xs: 1.5, lg: 2 },
                        py: { xs: 0.85, lg: 0.95 },
                        borderBlockEnd: `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme.palette.background.paper,
                        transition: theme.transitions.create(['background-color'], {
                          duration: theme.transitions.duration.shortest
                        }),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.018)
                        },
                        '@media (prefers-reduced-motion: reduce)': {
                          transition: 'none'
                        },
                        minWidth: 0
                      })}
                    >
                      <Box
                        role='cell'
                        sx={{
                          display: { xs: 'none', lg: 'flex' },
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 0,
                          gridColumn: '1 / 2',
                          alignSelf: 'center'
                        }}
                      >
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
                      </Box>
                      <Box role='cell' sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', md: '1 / -1', lg: '2 / 3' } }}>
                        <Stack spacing={0.35}>
                          <Stack direction='row' spacing={0.75} alignItems='center' sx={{ minWidth: 0 }}>
                            {hasDetails ? (
                              <Tooltip title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'} disableInteractive>
                                <IconButton
                                  size='small'
                                  onClick={() => toggleRowExpanded(index)}
                                  aria-expanded={isExpanded}
                                  aria-label={isExpanded ? 'Ocultar detalle de pricing' : 'Ver detalle de pricing'}
                                  sx={{
                                    display: { xs: 'inline-flex', lg: 'none' },
                                    flexShrink: 0,
                                    transition: 'transform 150ms ease-out',
                                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
                                  }}
                                >
                                  <i className='tabler-chevron-right' style={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            <CustomTextField
                              size='small'
                              fullWidth
                              placeholder='Ej. Diseño de identidad'
                              value={line.label}
                              onChange={event => updateLine(index, { label: event.target.value })}
                              disabled={saving}
                              aria-label={`Etiqueta del ítem ${index + 1}`}
                              sx={theme => ({
                                '& .MuiInputBase-root': {
                                  minHeight: { xs: 36, md: 40 },
                                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                                  backgroundColor: { xs: 'transparent', sm: theme.palette.background.paper },
                                  boxShadow: { xs: 'none', sm: undefined }
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: { xs: 'transparent', sm: undefined }
                                },
                                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: { xs: alpha(theme.palette.primary.main, 0.28), sm: undefined }
                                },
                                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: { xs: alpha(theme.palette.primary.main, 0.38), sm: undefined }
                                },
                                '& .MuiInputBase-input': {
                                  py: { xs: 0.45, md: 0.85 },
                                  px: { xs: 0, sm: undefined }
                                }
                              })}
                            />
                          </Stack>
                          <Stack direction='row' spacing={0.6} alignItems='center' useFlexGap flexWrap='wrap'>
                            {line.source ? (
                              <Tooltip title={`Origen: ${SOURCE_META[line.source].label}`} disableInteractive>
                                <Box
                                  component='span'
                                  aria-label={`Origen: ${SOURCE_META[line.source].label}`}
                                  sx={theme => ({
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    color: theme.palette.text.secondary
                                  })}
                                >
                                  <i className={SOURCE_META[line.source].icon} aria-hidden='true' style={{ fontSize: 14 }} />
                                </Box>
                              </Tooltip>
                            ) : null}
                            {line.metadata?.sku ? (
                              <Typography variant='caption' color='text.secondary'>
                                SKU {line.metadata.sku}
                              </Typography>
                            ) : null}
                            <CustomChip round='true' size='small' variant='tonal' color={typeMeta.color} label={typeMeta.label} />
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
                        </Stack>
                      </Box>
                      <Box
                        role='cell'
                        sx={{
                          display: 'none',
                          minWidth: 0,
                          gridColumn: { xs: 'auto', md: '1 / 2' }
                        }}
                      >
                        {/* Consolidación post-TASK-508: tipo + tier en una columna
                            compacta. Source (catálogo/servicio/template/manual)
                            se muestra como ícono prefijo en la celda Ítem. */}
                        <Typography variant='caption' color='text.secondary' sx={{ display: { xs: 'block', lg: 'none' }, mb: 0.5 }}>
                          Tipo
                        </Typography>
                        <Stack spacing={0.5} direction='row' alignItems='center' flexWrap='wrap' useFlexGap>
                          <CustomChip round='true' size='small' variant='tonal' color={typeMeta.color} label={typeMeta.label} />
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
                      </Box>
                      <Box role='cell' sx={{ minWidth: 0, gridColumn: { xs: '1 / 2', sm: '1 / 2', md: '2 / 3', lg: '3 / 4' } }}>
                        <Stack spacing={0.25} alignItems={{ xs: 'stretch', lg: 'flex-start' }} sx={{ minWidth: 0 }}>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ display: { xs: 'none', sm: 'block', lg: 'none' } }}
                          >
                            Cantidad
                          </Typography>
                          <Stack direction='row' spacing={0.6} alignItems='center' sx={{ minWidth: 0 }}>
                            <CustomTextField
                              size='small'
                              type='number'
                              value={needsPricingContext
                                ? (line.metadata?.periods ?? 1)
                                : line.quantity
                              }
                              onChange={event => {
                                const raw = event.target.value
                                const next = raw === '' ? 0 : Number(raw)
                                const parsed = Number.isFinite(next) ? next : 0

                                // Para role/person la Cantidad visible representa meses
                                // (periods). Mutamos solo metadata.periods; line.quantity
                                // permanece en 1 para evitar el doble-conteo en el engine
                                // (bill = unitPrice × fte × periods × quantity).
                                updateLine(index, needsPricingContext
                                  ? {
                                      metadata: {
                                        ...(line.metadata ?? {}),
                                        periods: parsed
                                      }
                                    }
                                  : { quantity: parsed }
                                )
                              }}
                              disabled={saving}
                              aria-label={needsPricingContext ? `Meses del ítem ${index + 1}` : `Cantidad del ítem ${index + 1}`}
                              sx={theme => ({
                                maxWidth: { xs: 76, sm: 104, lg: 74 },
                                '& .MuiInputBase-root': {
                                  minHeight: { xs: 34, lg: 38 },
                                  borderRadius: `${theme.shape.customBorderRadius.md}px`
                                },
                                '& .MuiInputBase-input': {
                                  py: { xs: 0.55, lg: 0.75 }
                                }
                              })}
                            />
                            {needsPricingContext ? (
                              <Tooltip title='El engine usa base mensual para roles y personas' disableInteractive>
                                <span>
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    variant='tonal'
                                    color='primary'
                                    label='Mes'
                                  />
                                </span>
                              </Tooltip>
                            ) : (
                              <CustomTextField
                                select
                                size='small'
                                value={line.unit}
                                onChange={event => updateLine(index, { unit: event.target.value as QuoteLineItem['unit'] })}
                                disabled={saving}
                                aria-label={`Unidad del ítem ${index + 1}`}
                                sx={{ minWidth: 112 }}
                              >
                                {UNIT_OPTIONS.map(option => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </CustomTextField>
                            )}
                          </Stack>
                          {needsPricingContext ? (
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: { xs: 'none', sm: 'block', lg: 'none' } }}
                            >
                              meses facturables
                            </Typography>
                          ) : null}
                        </Stack>
                      </Box>
                      <Box role='cell' sx={{ minWidth: 0, gridColumn: { xs: '2 / 3', sm: '2 / 3', md: '1 / -1', lg: '4 / 5' } }}>
                        <Stack
                          spacing={0.25}
                          alignItems={{ xs: 'flex-end', md: 'flex-start', lg: 'flex-end' }}
                          sx={{ minWidth: 0 }}
                        >
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ display: { xs: 'none', sm: 'block', lg: 'none' } }}
                          >
                            Precio unitario
                          </Typography>
                          {isCatalogPriced ? (

                              /*
                                Items de catálogo (role / person / tool / overhead_addon):
                                el catálogo es SoT; el precio no se edita desde la UI.
                                Se muestra como Typography read-only, FTE-ajustado en
                                role/person para que el subtotal (meses × precio) sea
                                lineal y auditable a ojo. Si el usuario necesita un
                                precio distinto, crea una línea manual (direct_cost).
                              */
                              simulating && enginePrice === null ? (
                                <Skeleton variant='text' width={110} height={22} aria-label={TASK407_ARIA_CALCULANDO_PRECIO_DEL_CATALOGO} />
                              ) : displayedUnitPrice !== null ? (
                                <Stack
                                  direction='row'
                                  spacing={0.75}
                                  alignItems='center'
                                  justifyContent={{ xs: 'flex-end', md: 'flex-start', lg: 'flex-end' }}
                                  useFlexGap
                                  flexWrap='wrap'
                                  sx={{ minWidth: 0 }}
                                >
                                  <Typography
                                    variant='monoAmount'
                                    aria-label={`Precio unitario del ítem ${index + 1}, precio del catálogo`}
                                  >
                                    {formatCurrency(displayedUnitPrice, currency)}
                                  </Typography>
                                  {needsPricingContext ? (
                                    <Tooltip title='Ajustar FTE y tipo de contratación'>
                                      <span>
                                        <CustomChip
                                          round='true'
                                          size='small'
                                          variant='tonal'
                                          color='primary'
                                          label={`FTE ${fteFraction.toFixed(2).replace(/\.?0+$/, '')}×`}
                                          onClick={event => handleAdjustOpen(event, index)}
                                          sx={{ cursor: 'pointer' }}
                                        />
                                      </span>
                                    </Tooltip>
                                  ) : null}
                                </Stack>
                              ) : (
                                <Typography variant='body2' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                  —
                                </Typography>
                              )
                            ) : (

                              /* Líneas manuales (direct_cost sin pricingV2LineType): editable. */
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
                                sx={{ maxWidth: { sm: 150 } }}
                              />
                            )}
                        </Stack>
                      </Box>
                      <Box
                        role='cell'
                        sx={{
                          minWidth: 0,
                          gridColumn: { xs: '1 / 2', sm: '1 / -1', md: '1 / -1', lg: '5 / 6' },
                          textAlign: { lg: 'right' }
                        }}
                      >
                        <Stack spacing={0.25} alignItems={{ xs: 'flex-start', sm: 'flex-end', lg: 'flex-end' }} sx={{ minWidth: 0 }}>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ display: { xs: 'none', sm: 'block', lg: 'none' } }}
                          >
                            Subtotal
                          </Typography>
                          {simulating && !hasManualPrice && subtotal === 0 ? (
                            <Skeleton variant='text' width={90} height={22} aria-label={TASK407_ARIA_CALCULANDO_SUBTOTAL} />
                          ) : subtotal === 0 && enginePrice === null && !hasManualPrice ? (
                            <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }} aria-label={TASK407_ARIA_SUBTOTAL_SIN_DATOS_SUFICIENTES}>
                              —
                            </Typography>
                          ) : (
                            <Typography variant='monoAmount'>
                              {formatCurrency(subtotal, currency)}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                      <Box
                        role='cell'
                        sx={{
                          minWidth: 0,
                          gridColumn: { xs: '2 / 3', sm: '2 / 3', lg: '6 / 7' },
                          alignSelf: { lg: 'center' }
                        }}
                      >
                        <Stack
                          direction={{ xs: 'row', lg: 'column' }}
                          spacing={0.25}
                          justifyContent={{ xs: 'flex-end', lg: 'center' }}
                          alignItems='center'
                        >
                          {rowWarnings.length > 0 ? (
                            (() => {
                              const worstSeverity = rowWarnings.some(w => w.severity === 'critical')
                                ? 'critical'
                                : rowWarnings.some(w => w.severity === 'warning')
                                  ? 'warning'
                                  : 'info'

                              const iconClass =
                                worstSeverity === 'critical'
                                  ? 'tabler-alert-triangle'
                                  : worstSeverity === 'warning'
                                    ? 'tabler-alert-circle'
                                    : 'tabler-info-circle'

                              const iconColor =
                                worstSeverity === 'critical'
                                  ? 'error'
                                  : worstSeverity === 'warning'
                                    ? 'warning'
                                    : 'info'

                              return (
                                <Tooltip
                                  title={`${rowWarnings.length} aviso${rowWarnings.length === 1 ? '' : 's'} del engine`}
                                  disableInteractive
                                >
                                  <span>
                                    <IconButton
                                      size='small'
                                      color={iconColor}
                                      onClick={event => handleWarningOpen(event, index)}
                                      aria-label={`Ver ${rowWarnings.length} aviso${rowWarnings.length === 1 ? '' : 's'} del ítem ${index + 1}`}
                                      aria-haspopup='dialog'
                                      aria-expanded={warningIndex === index}
                                    >
                                      <i className={iconClass} style={{ fontSize: 18 }} />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )
                            })()
                          ) : null}
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
                          {line.lineItemId && canViewCostStackProp ? (
                            <Tooltip
                              title={
                                canOverrideCost
                                  ? GH_PRICING.costOverride.ctaLabel
                                  : GH_PRICING.costOverride.ctaDisabledTooltip
                              }
                              disableInteractive
                            >
                              <span>
                                <IconButton
                                  size='small'
                                  onClick={() => setOverrideDialogIndex(index)}
                                  disabled={saving || !canOverrideCost}
                                  aria-label={`${GH_PRICING.costOverride.ctaLabel} · ítem ${index + 1}`}
                                >
                                  <i className='tabler-hand-stop' style={{ fontSize: 18 }} />
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
                                  opacity: isHovered ? 1 : 0.68,
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
                      </Box>
                    </Box>

                    {isExpanded && showCostStack && simulationLine && outputCurrency ? (
                      <Box
                        role='row'
                        sx={theme => ({
                          py: 1.5,
                          px: { xs: 0, lg: 2 },
                          bgcolor: 'background.default',
                          borderBlockEnd: `1px solid ${theme.palette.divider}`
                        })}
                      >
                        <Box
                          role='cell'
                          sx={{
                            minWidth: 0,
                            pl: { xs: 1.5, lg: 2 }
                          }}
                        >
                          <QuoteLineCostStack lineOutput={simulationLine} outputCurrency={outputCurrency} />
                        </Box>
                      </Box>
                    ) : null}
                  </Fragment>
                )
              })}
          </Box>
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
              color='primary'
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
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              border: `1px solid ${theme.greenhouseElevation.floating.borderColor}`,
              boxShadow: theme.greenhouseElevation.floating.boxShadow
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
                <Button variant='tonal' color='primary' onClick={handleAdjustClose}>
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

      {/* Popover de warnings por fila (TASK-508) — reemplaza el Alert
          full-row con un ícono en la columna de acciones + popover con
          el detalle. Mantiene la grid de la tabla intacta. */}
      <Popover
        open={Boolean(warningAnchor) && currentWarnings.length > 0}
        anchorEl={warningAnchor}
        onClose={handleWarningClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: theme => ({
              mt: 1,
              width: 420,
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              border: `1px solid ${theme.greenhouseElevation.floating.borderColor}`,
              boxShadow: theme.greenhouseElevation.floating.boxShadow
            })
          }
        }}
      >
        {warningIndex !== null && currentWarnings.length > 0 ? (
          <Box sx={{ p: 2 }} role='dialog' aria-label={TASK407_ARIA_AVISOS_DEL_MOTOR_DE_PRICING}>
            <QuoteLineWarning warnings={currentWarnings} rowIndex={warningIndex} />
          </Box>
        ) : null}
      </Popover>

      {overrideDialogIndex !== null
        ? (() => {
            const line = draftLines[overrideDialogIndex]

            if (!line || !line.lineItemId) return null
            const simLine = simulationLines?.[overrideDialogIndex] ?? null

            const suggestedUsd =
              simLine?.costStack?.unitCostUsd !== undefined && simLine?.costStack?.unitCostUsd !== null
                ? simLine.costStack.unitCostUsd
                : null

            const sourceKind = simLine?.costStack?.costBasisKind ?? null

            
return (
              <CostOverrideDialog
                open
                onClose={() => setOverrideDialogIndex(null)}
                quotationId={quotationId}
                lineItemId={line.lineItemId}
                lineLabel={line.label}
                suggestedUnitCostUsd={suggestedUsd}
                suggestedCostBasisKind={sourceKind}
                canOverride={canOverrideCost}
                onSuccess={result => {
                  setOverrideDialogIndex(null)
                  onCostOverrideApplied?.(result)
                }}
              />
            )
          })()
        : null}

    </Box>
  )
})

export default QuoteLineItemsEditor
