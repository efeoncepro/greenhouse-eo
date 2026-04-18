'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

type PricingModel = 'staff_aug' | 'retainer' | 'project'

// Alineado con PricingOutputCurrency del engine v2 (TASK-464d).
// Antes: solo CLP/USD/CLF; extendido a 6 monedas LatAm para consistency con
// el engine y con CurrencySwitcher primitive (TASK-464e).
type Currency = 'CLP' | 'USD' | 'CLF' | 'COP' | 'MXN' | 'PEN'

type BillingFrequency = 'monthly' | 'milestone' | 'one_time'
type LineUnit = 'hour' | 'month' | 'unit' | 'project'

interface QuoteCreateTemplate {
  templateId: string
  templateName: string
  templateCode: string
  pricingModel: PricingModel
  businessLineCode: string | null
  usageCount: number
  defaults: {
    currency: string
    billingFrequency: string
    paymentTermsDays: number
    contractDurationMonths: number | null
  }
}

interface QuoteCreateOrganization {
  organizationId: string
  organizationName: string
}

interface QuoteCreateLineItem {
  label: string
  quantity: number
  unitPrice: number
  unit: LineUnit
}

export interface QuoteCreateDrawerProps {
  open: boolean
  submitting: boolean
  error: string | null
  templates: QuoteCreateTemplate[]
  organizations: QuoteCreateOrganization[]
  onClose: () => void
  onSubmit: (payload: {
    templateId: string | null
    organizationId: string | null
    description: string
    pricingModel: PricingModel
    currency: Currency
    billingFrequency: BillingFrequency
    contractDurationMonths: number | null
    validUntil: string | null
    lineItems: Array<{ label: string; quantity: number; unitPrice: number; unit: string }>
  }) => Promise<void>
}

type CreateMode = 'scratch' | 'template'

const PRICING_MODEL_OPTIONS: Array<{ value: PricingModel; label: string }> = [
  { value: 'staff_aug', label: 'Staff augmentation' },
  { value: 'retainer', label: 'Retainer mensual' },
  { value: 'project', label: 'Proyecto cerrado' }
]

const CURRENCY_OPTIONS: Array<{ value: Currency; label: string }> = [
  { value: 'CLP', label: 'CLP · Peso chileno' },
  { value: 'USD', label: 'USD · Dólar' },
  { value: 'CLF', label: 'CLF · UF' },
  { value: 'COP', label: 'COP · Peso colombiano' },
  { value: 'MXN', label: 'MXN · Peso mexicano' },
  { value: 'PEN', label: 'PEN · Sol peruano' }
]

const BILLING_FREQUENCY_OPTIONS: Array<{ value: BillingFrequency; label: string }> = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'milestone', label: 'Por hito' },
  { value: 'one_time', label: 'Único pago' }
]

const UNIT_OPTIONS: Array<{ value: LineUnit; label: string }> = [
  { value: 'hour', label: 'Hora' },
  { value: 'month', label: 'Mes' },
  { value: 'unit', label: 'Unidad' },
  { value: 'project', label: 'Proyecto' }
]

const coerceCurrency = (value: string): Currency => {
  if (value === 'USD' || value === 'CLF' || value === 'COP' || value === 'MXN' || value === 'PEN') return value

  return 'CLP'
}

const coerceBillingFrequency = (value: string): BillingFrequency => {
  if (value === 'milestone' || value === 'one_time') return value

  return 'monthly'
}

const emptyLineItem = (): QuoteCreateLineItem => ({
  label: '',
  quantity: 1,
  unitPrice: 0,
  unit: 'hour'
})

const QuoteCreateDrawer = ({
  open,
  submitting,
  error,
  templates,
  organizations,
  onClose,
  onSubmit
}: QuoteCreateDrawerProps) => {
  const [mode, setMode] = useState<CreateMode>('scratch')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [pricingModel, setPricingModel] = useState<PricingModel>('project')
  const [currency, setCurrency] = useState<Currency>('CLP')
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('monthly')
  const [contractDurationMonths, setContractDurationMonths] = useState<number | ''>('')
  const [validUntil, setValidUntil] = useState('')
  const [lineItems, setLineItems] = useState<QuoteCreateLineItem[]>([emptyLineItem()])
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setMode('scratch')
      setSelectedTemplateId(null)
      setOrganizationId(null)
      setDescription('')
      setPricingModel('project')
      setCurrency('CLP')
      setBillingFrequency('monthly')
      setContractDurationMonths('')
      setValidUntil('')
      setLineItems([emptyLineItem()])
      setLocalError(null)
    }
  }, [open])

  const selectedTemplate = useMemo(
    () => (selectedTemplateId ? templates.find(t => t.templateId === selectedTemplateId) ?? null : null),
    [selectedTemplateId, templates]
  )

  const selectedOrganization = useMemo(
    () => (organizationId ? organizations.find(o => o.organizationId === organizationId) ?? null : null),
    [organizationId, organizations]
  )

  const handleModeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, value: CreateMode | null) => {
      if (value === null) return
      setMode(value)
      setLocalError(null)

      if (value === 'scratch') {
        setSelectedTemplateId(null)
        setLineItems([emptyLineItem()])
      } else {
        setLineItems([])
      }
    },
    []
  )

  const applyTemplate = useCallback((template: QuoteCreateTemplate | null) => {
    setSelectedTemplateId(template ? template.templateId : null)

    if (!template) return

    setPricingModel(template.pricingModel)
    setCurrency(coerceCurrency(template.defaults.currency))
    setBillingFrequency(coerceBillingFrequency(template.defaults.billingFrequency))
    setContractDurationMonths(template.defaults.contractDurationMonths ?? '')
  }, [])

  const updateLineItem = useCallback((index: number, patch: Partial<QuoteCreateLineItem>) => {
    setLineItems(prev => {
      const next = prev.map(item => ({ ...item }))

      next[index] = { ...next[index], ...patch }

      return next
    })
  }, [])

  const handleAddLine = useCallback(() => {
    setLineItems(prev => [...prev, emptyLineItem()])
  }, [])

  const handleRemoveLine = useCallback((index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const validate = useCallback((): string | null => {
    if (!organizationId) return 'Selecciona un espacio para la cotización.'
    if (description.trim().length === 0) return 'Agrega una descripción breve del alcance.'

    if (mode === 'template' && !selectedTemplateId) {
      return 'Selecciona un template para continuar.'
    }

    if (mode === 'scratch') {
      if (lineItems.length === 0) return 'Agrega al menos un ítem a la cotización.'

      const hasInvalid = lineItems.some(item => item.label.trim().length === 0 || item.quantity <= 0)

      if (hasInvalid) return 'Cada ítem necesita un nombre y cantidad mayor a cero.'
    }

    return null
  }, [description, lineItems, mode, organizationId, selectedTemplateId])

  const handleSubmit = useCallback(async () => {
    const validation = validate()

    if (validation) {
      setLocalError(validation)

      return
    }

    setLocalError(null)

    const payload = {
      templateId: mode === 'template' ? selectedTemplateId : null,
      organizationId,
      description: description.trim(),
      pricingModel,
      currency,
      billingFrequency,
      contractDurationMonths:
        contractDurationMonths === '' ? null : Number.isFinite(Number(contractDurationMonths)) ? Number(contractDurationMonths) : null,
      validUntil: validUntil.trim() ? validUntil : null,
      lineItems:
        mode === 'scratch'
          ? lineItems.map(item => ({
              label: item.label.trim(),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unit: item.unit
            }))
          : []
    }

    await onSubmit(payload)
  }, [
    billingFrequency,
    contractDurationMonths,
    currency,
    description,
    lineItems,
    mode,
    onSubmit,
    organizationId,
    pricingModel,
    selectedTemplateId,
    validate,
    validUntil
  ])

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={submitting ? undefined : onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Nueva cotización</Typography>
          <Typography variant='caption' color='text.secondary'>
            Crea una cotización canónica desde cero o partiendo de un template existente.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size='small' aria-label='Cerrar' disabled={submitting}>
          <i className='tabler-x' />
        </IconButton>
      </Box>
      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        <Box>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
            Punto de partida
          </Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            fullWidth
            size='small'
            aria-label='Modo de creación de la cotización'
          >
            <ToggleButton value='scratch' aria-label='Crear desde cero'>
              <i className='tabler-pencil-plus' style={{ marginInlineEnd: 8 }} />
              Desde cero
            </ToggleButton>
            <ToggleButton value='template' aria-label='Crear desde template'>
              <i className='tabler-template' style={{ marginInlineEnd: 8 }} />
              Desde template
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
            {mode === 'scratch'
              ? 'Define los ítems manualmente. Ideal para alcances únicos o muy personalizados.'
              : 'Hereda ítems, términos y modelo desde un template aprobado. Puedes ajustarlos después.'}
          </Typography>
        </Box>

        {mode === 'template' && (
          <Autocomplete
            size='small'
            options={templates}
            value={selectedTemplate}
            onChange={(_event, value) => applyTemplate(value)}
            getOptionLabel={option => `${option.templateCode} · ${option.templateName}`}
            disabled={submitting}
            renderOption={(props, option) => (
              <li {...props} key={option.templateId}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    {option.templateName}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {option.templateCode}
                    {option.businessLineCode ? ` · ${option.businessLineCode}` : ''}
                    {option.usageCount > 0 ? ` · ${option.usageCount} usos` : ''}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={params => (
              <TextField
                {...params}
                size='small'
                label='Template'
                placeholder='Busca un template aprobado'
                aria-label='Template de cotización'
              />
            )}
          />
        )}

        {mode === 'template' && !selectedTemplate && templates.length === 0 && (
          <Alert severity='info'>
            Aún no hay templates disponibles. Guarda una cotización como template para reutilizarla después.
          </Alert>
        )}

        {mode === 'template' && selectedTemplate && (
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
              <CustomChip round='true' size='small' variant='tonal' color='primary' label={selectedTemplate.pricingModel} />
              {selectedTemplate.businessLineCode && (
                <CustomChip
                  round='true'
                  size='small'
                  variant='tonal'
                  color='info'
                  label={selectedTemplate.businessLineCode}
                />
              )}
              <Typography variant='caption' color='text.secondary'>
                {selectedTemplate.usageCount === 1
                  ? '1 cotización creada desde este template'
                  : `${selectedTemplate.usageCount} cotizaciones creadas desde este template`}
              </Typography>
            </Stack>
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
              Los ítems del template se crearán automáticamente al guardar.
            </Typography>
          </Box>
        )}

        <Autocomplete
          size='small'
          options={organizations}
          value={selectedOrganization}
          onChange={(_event, value) => setOrganizationId(value ? value.organizationId : null)}
          getOptionLabel={option => option.organizationName}
          disabled={submitting}
          renderInput={params => (
            <TextField
              {...params}
              size='small'
              label='Espacio'
              required
              placeholder='Busca por nombre'
              aria-label='Espacio de la cotización'
            />
          )}
        />

        <CustomTextField
          fullWidth
          size='small'
          label='Descripción'
          required
          value={description}
          onChange={event => setDescription(event.target.value)}
          multiline
          rows={2}
          helperText='Resumen del alcance que verá el cliente y el equipo de Finanzas.'
          disabled={submitting}
        />

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Modelo de pricing'
          value={pricingModel}
          onChange={event => setPricingModel(event.target.value as PricingModel)}
          disabled={submitting}
        >
          {PRICING_MODEL_OPTIONS.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </CustomTextField>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Moneda'
            value={currency}
            onChange={event => setCurrency(event.target.value as Currency)}
            disabled={submitting}
          >
            {CURRENCY_OPTIONS.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Frecuencia de facturación'
            value={billingFrequency}
            onChange={event => setBillingFrequency(event.target.value as BillingFrequency)}
            disabled={submitting}
          >
            {BILLING_FREQUENCY_OPTIONS.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </CustomTextField>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <CustomTextField
            fullWidth
            size='small'
            label='Duración del contrato (meses)'
            type='number'
            value={contractDurationMonths}
            onChange={event => {
              const raw = event.target.value

              setContractDurationMonths(raw === '' ? '' : Number(raw))
            }}
            inputProps={{ min: 0, step: 1 }}
            helperText='Opcional para proyectos o retainers cortos.'
            disabled={submitting}
          />
          <CustomTextField
            fullWidth
            size='small'
            label='Válida hasta'
            type='date'
            value={validUntil}
            onChange={event => setValidUntil(event.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText='Fecha en que expira la oferta comercial.'
            disabled={submitting}
          />
        </Stack>

        {mode === 'scratch' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant='subtitle2'>Ítems de la cotización</Typography>
              <Button
                size='small'
                variant='outlined'
                startIcon={<i className='tabler-plus' />}
                onClick={handleAddLine}
                disabled={submitting}
              >
                Agregar ítem
              </Button>
            </Box>
            {lineItems.length === 0 ? (
              <Alert severity='info' role='status'>
                Agrega al menos un ítem para estimar el precio y la salud de margen.
              </Alert>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 180 }}>Ítem</TableCell>
                      <TableCell sx={{ minWidth: 80 }} align='right'>Cantidad</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>Unidad</TableCell>
                      <TableCell sx={{ minWidth: 120 }} align='right'>Precio unitario</TableCell>
                      <TableCell sx={{ minWidth: 56 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineItems.map((line, index) => (
                      <TableRow key={`draft-line-${index}`}>
                        <TableCell>
                          <CustomTextField
                            size='small'
                            fullWidth
                            placeholder='Ej. Horas de desarrollo'
                            value={line.label}
                            onChange={event => updateLineItem(index, { label: event.target.value })}
                            disabled={submitting}
                            aria-label={`Etiqueta del ítem ${index + 1}`}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <CustomTextField
                            size='small'
                            type='number'
                            value={line.quantity}
                            onChange={event => {
                              const raw = event.target.value
                              const next = raw === '' ? 0 : Number(raw)

                              updateLineItem(index, { quantity: Number.isFinite(next) ? next : 0 })
                            }}
                            inputProps={{ min: 0, step: 'any' }}
                            disabled={submitting}
                            aria-label={`Cantidad del ítem ${index + 1}`}
                          />
                        </TableCell>
                        <TableCell>
                          <CustomTextField
                            select
                            size='small'
                            fullWidth
                            value={line.unit}
                            onChange={event => updateLineItem(index, { unit: event.target.value as LineUnit })}
                            disabled={submitting}
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
                            value={line.unitPrice}
                            onChange={event => {
                              const raw = event.target.value
                              const next = raw === '' ? 0 : Number(raw)

                              updateLineItem(index, { unitPrice: Number.isFinite(next) ? next : 0 })
                            }}
                            inputProps={{ min: 0, step: 'any' }}
                            disabled={submitting}
                            aria-label={`Precio unitario del ítem ${index + 1}`}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <Tooltip title='Eliminar ítem'>
                            <span>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleRemoveLine(index)}
                                disabled={submitting || lineItems.length === 1}
                                aria-label={`Eliminar ítem ${index + 1}`}
                              >
                                <i className='tabler-trash' />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        )}

        {(localError || error) && (
          <Alert severity='error' role='alert' onClose={() => setLocalError(null)}>
            {localError ?? error}
          </Alert>
        )}
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} fullWidth disabled={submitting}>
          Cancelar
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={submitting} fullWidth startIcon={<i className='tabler-device-floppy' />}>
          {submitting ? 'Creando…' : 'Crear cotización'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default QuoteCreateDrawer
