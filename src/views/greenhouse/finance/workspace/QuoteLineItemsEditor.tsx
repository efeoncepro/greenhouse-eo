'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
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
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

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
}

export interface QuoteLineItemsEditorProduct {
  productId: string
  productName: string
  productCode: string
  defaultUnitPrice: number | null
  defaultUnit: string
  suggestedRoleCode: string | null
}

export interface QuoteLineItemsEditorProps {
  quotationId: string
  currency: string
  editable: boolean
  lineItems: QuoteLineItem[]
  onSave: (lines: QuoteLineItem[]) => Promise<void>
  saving: boolean
  products: QuoteLineItemsEditorProduct[]
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

const emptyLine = (): QuoteLineItem => ({
  label: '',
  description: null,
  lineType: 'role',
  unit: 'hour',
  quantity: 1,
  unitPrice: null,
  subtotalPrice: null,
  subtotalAfterDiscount: null,
  productId: null,
  roleCode: null,
  memberId: null,
  discountType: null,
  discountValue: null
})

const QuoteLineItemsEditor = ({
  currency,
  editable,
  lineItems,
  onSave,
  saving,
  products
}: QuoteLineItemsEditorProps) => {
  const [draftLines, setDraftLines] = useState<QuoteLineItem[]>(() => cloneLineItems(lineItems))
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!dirty) {
      setDraftLines(cloneLineItems(lineItems))
    }
  }, [lineItems, dirty])

  const productById = useMemo(() => {
    const map = new Map<string, QuoteLineItemsEditorProduct>()

    products.forEach(product => map.set(product.productId, product))

    return map
  }, [products])

  const updateLine = useCallback((index: number, patch: Partial<QuoteLineItem>) => {
    setDraftLines(prev => {
      const next = cloneLineItems(prev)

      next[index] = { ...next[index], ...patch }

      return next
    })
    setDirty(true)
  }, [])

  const handleAddLine = useCallback(() => {
    setDraftLines(prev => [...prev, emptyLine()])
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

  const handleProductSelect = useCallback(
    (index: number, productId: string | null) => {
      if (productId === null) {
        updateLine(index, { productId: null })

        return
      }

      const product = productById.get(productId)

      if (!product) {
        updateLine(index, { productId })

        return
      }

      const currentLine = draftLines[index]

      const nextUnit: QuoteLineItem['unit'] = (['hour', 'month', 'unit', 'project'] as const).includes(
        product.defaultUnit as QuoteLineItem['unit']
      )
        ? (product.defaultUnit as QuoteLineItem['unit'])
        : currentLine.unit

      updateLine(index, {
        productId: product.productId,
        label: currentLine.label.trim() ? currentLine.label : product.productName,
        unit: nextUnit,
        unitPrice: currentLine.unitPrice ?? product.defaultUnitPrice,
        roleCode: product.suggestedRoleCode ?? currentLine.roleCode
      })
    },
    [draftLines, productById, updateLine]
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
                        <CustomChip round='true' size='small' variant='tonal' color={typeMeta.color} label={typeMeta.label} />
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
        subheader='Edita los ítems y guarda para recalcular precio y margen.'
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
            <i className='tabler-list-details' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
          </Avatar>
        }
        action={
          <Button
            variant='outlined'
            size='small'
            startIcon={<i className='tabler-plus' />}
            onClick={handleAddLine}
            disabled={saving}
          >
            Agregar ítem
          </Button>
        }
      />
      <Divider />
      <Box sx={{ overflowX: 'auto' }}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 220 }}>Ítem</TableCell>
              <TableCell sx={{ minWidth: 200 }}>Producto</TableCell>
              <TableCell sx={{ minWidth: 140 }}>Tipo</TableCell>
              <TableCell sx={{ minWidth: 90 }} align='right'>Cantidad</TableCell>
              <TableCell sx={{ minWidth: 110 }}>Unidad</TableCell>
              <TableCell sx={{ minWidth: 130 }} align='right'>Precio unitario</TableCell>
              <TableCell sx={{ minWidth: 100 }} align='right'>Descuento %</TableCell>
              <TableCell sx={{ minWidth: 110 }} align='right'>Subtotal</TableCell>
              <TableCell sx={{ minWidth: 60 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {draftLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                    <Typography variant='body2' color='text.secondary'>
                      Aún no agregaste ítems. Usa «Agregar ítem» para comenzar.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              draftLines.map((line, index) => {
                const selectedProduct = line.productId ? productById.get(line.productId) ?? null : null
                const subtotal = computeRowSubtotalAfterDiscount(line)

                const discountPct =
                  line.discountType === 'percentage' && line.discountValue !== null && line.discountValue !== undefined
                    ? line.discountValue
                    : null

                return (
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
                        <CustomTextField
                          size='small'
                          fullWidth
                          placeholder='Descripción (opcional)'
                          value={line.description ?? ''}
                          onChange={event =>
                            updateLine(index, { description: event.target.value.trim() ? event.target.value : null })
                          }
                          disabled={saving}
                          aria-label={`Descripción del ítem ${index + 1}`}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Autocomplete
                        size='small'
                        options={products}
                        getOptionLabel={option => `${option.productCode} · ${option.productName}`}
                        value={selectedProduct}
                        onChange={(_event, value) => handleProductSelect(index, value ? value.productId : null)}
                        disabled={saving}
                        renderInput={params => (
                          <TextField
                            {...params}
                            size='small'
                            placeholder='Producto (opcional)'
                            aria-label={`Producto del ítem ${index + 1}`}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <CustomTextField
                        select
                        size='small'
                        fullWidth
                        value={line.lineType}
                        onChange={event => updateLine(index, { lineType: event.target.value as QuoteLineItem['lineType'] })}
                        disabled={saving}
                        aria-label={`Tipo del ítem ${index + 1}`}
                      >
                        {LINE_TYPE_OPTIONS.map(option => (
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
                        value={line.quantity}
                        onChange={event => {
                          const raw = event.target.value
                          const next = raw === '' ? 0 : Number(raw)

                          updateLine(index, { quantity: Number.isFinite(next) ? next : 0 })
                        }}
                        inputProps={{ min: 0, step: 'any' }}
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
                        inputProps={{ min: 0, step: 'any' }}
                        disabled={saving}
                        aria-label={`Precio unitario del ítem ${index + 1}`}
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <CustomTextField
                        size='small'
                        type='number'
                        value={discountPct ?? ''}
                        onChange={event => {
                          const raw = event.target.value

                          if (raw === '') {
                            updateLine(index, { discountType: null, discountValue: null })

                            return
                          }

                          const parsed = Number(raw)

                          updateLine(index, {
                            discountType: 'percentage',
                            discountValue: Number.isFinite(parsed) ? parsed : null
                          })
                        }}
                        inputProps={{ min: 0, max: 100, step: 'any' }}
                        disabled={saving}
                        aria-label={`Descuento del ítem ${index + 1}`}
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
    </Card>
  )
}

export default QuoteLineItemsEditor
