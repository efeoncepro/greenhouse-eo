'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import type { CommercialModelCode } from '@/lib/commercial/pricing-governance-types'
import type { PricingOutputCurrency } from '@/lib/finance/pricing/contracts'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'

import CurrencySwitcher from '@/components/greenhouse/pricing/CurrencySwitcher'

const TASK407_ARIA_CONTEXTO_DE_LA_COTIZACION = "Contexto de la cotización"


export interface QuoteBuilderState {
  businessLineCode: string | null
  commercialModel: CommercialModelCode
  countryFactorCode: string
  outputCurrency: PricingOutputCurrency
  contractDurationMonths: number | null
  validUntil: string | null
  description: string
}

export interface QuoteBuilderActionsOptions {
  businessLines: Array<{ code: string; label: string }>
  commercialModels: Array<{ code: CommercialModelCode; label: string; multiplierPct: number }>
  countryFactors: Array<{ code: string; label: string; factor: number }>
}

export interface QuoteBuilderActionsProps {
  state: QuoteBuilderState
  onChange: (patch: Partial<QuoteBuilderState>) => void
  options: QuoteBuilderActionsOptions
  disabled?: boolean
}

const formatMultiplier = (pct: number): string => {
  const signed = pct >= 0 ? `+${pct}` : `${pct}`

  return `${signed}%`
}

const formatFactor = (factor: number): string => factor.toFixed(2)

/**
 * Sidebar del quote builder con los selectores de contexto del engine v2
 * (businessLine, commercialModel, countryFactor, outputCurrency) + campos
 * drawer-level (contract duration, valid until, description).
 *
 * State controlado: parent mantiene `QuoteBuilderState`, aquí solo se renderiza
 * y se emite `onChange` con patches parciales.
 */
const QuoteBuilderActions = ({ state, onChange, options, disabled = false }: QuoteBuilderActionsProps) => {
  const selectedCommercialModel = options.commercialModels.find(m => m.code === state.commercialModel)
  const selectedCountryFactor = options.countryFactors.find(c => c.code === state.countryFactorCode)

  return (
    <Stack spacing={3} component='aside' aria-label={TASK407_ARIA_CONTEXTO_DE_LA_COTIZACION}>
      <CustomTextField
        select
        fullWidth
        size='small'
        label='Business line'
        value={state.businessLineCode ?? ''}
        disabled={disabled}
        onChange={event => {
          const value = event.target.value

          onChange({ businessLineCode: value === '' ? null : value })
        }}
      >
        <MenuItem value=''>Sin BL</MenuItem>
        {options.businessLines.map(bl => (
          <MenuItem key={bl.code} value={bl.code}>
            {bl.label}
          </MenuItem>
        ))}
      </CustomTextField>

      <Box>
        <CustomTextField
          select
          fullWidth
          size='small'
          label={GH_PRICING.commercialModelLabel}
          value={state.commercialModel}
          disabled={disabled}
          onChange={event => onChange({ commercialModel: event.target.value as CommercialModelCode })}
        >
          {options.commercialModels.map(model => (
            <MenuItem key={model.code} value={model.code}>
              {model.label}
            </MenuItem>
          ))}
        </CustomTextField>
        {selectedCommercialModel ? (
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
            {selectedCommercialModel.label} · {formatMultiplier(selectedCommercialModel.multiplierPct)} sobre tarifa base
          </Typography>
        ) : null}
      </Box>

      <Box>
        <CustomTextField
          select
          fullWidth
          size='small'
          label={GH_PRICING.countryFactorLabel}
          value={state.countryFactorCode}
          disabled={disabled}
          onChange={event => onChange({ countryFactorCode: event.target.value })}
        >
          {options.countryFactors.map(factor => (
            <MenuItem key={factor.code} value={factor.code}>
              {factor.label}
            </MenuItem>
          ))}
        </CustomTextField>
        {selectedCountryFactor ? (
          <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 0.5 }}>
            <Typography variant='caption' color='text.secondary'>
              {selectedCountryFactor.label}
            </Typography>
            <Chip
              size='small'
              label={`factor ${formatFactor(selectedCountryFactor.factor)}`}
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          </Stack>
        ) : null}
      </Box>

      <CurrencySwitcher
        value={state.outputCurrency}
        onChange={value => onChange({ outputCurrency: value })}
        disabled={disabled}
        size='small'
        fullWidth
      />

      <CustomTextField
        fullWidth
        size='small'
        type='number'
        label='Duración del contrato (meses)'
        value={state.contractDurationMonths ?? ''}
        disabled={disabled}
        onChange={event => {
          const parsed = Number.parseInt(event.target.value, 10)

          onChange({ contractDurationMonths: Number.isFinite(parsed) ? parsed : null })
        }}
        inputProps={{ min: 1, max: 120, step: 1 }}
        helperText='Requerido para retainer o híbrido'
      />

      <CustomTextField
        fullWidth
        size='small'
        type='date'
        label='Válida hasta'
        value={state.validUntil ?? ''}
        disabled={disabled}
        onChange={event => onChange({ validUntil: event.target.value || null })}
        InputLabelProps={{ shrink: true }}
      />

      <CustomTextField
        fullWidth
        multiline
        minRows={3}
        size='small'
        label='Descripción'
        value={state.description}
        disabled={disabled}
        onChange={event => onChange({ description: event.target.value })}
        placeholder='Alcance del servicio, contexto, notas internas...'
      />
    </Stack>
  )
}

export default QuoteBuilderActions
