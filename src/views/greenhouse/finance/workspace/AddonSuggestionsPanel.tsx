'use client'

import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import EmptyState from '@/components/greenhouse/EmptyState'

import type { PricingAddonOutputV2, PricingOutputCurrency } from '@/lib/finance/pricing/contracts'

import { formatOutputMoney } from './QuoteTotalsFooter'

export interface AddonSuggestionsPanelProps {

  /** Addons auto-resueltos por el engine v2 (output.addons) */
  suggestions: PricingAddonOutputV2[]

  /** SKUs actualmente incluidos en la quote (active) */
  includedSkus: string[]

  /** Toggle de un addon: incluirlo o excluirlo */
  onToggle: (sku: string, include: boolean) => void

  /** Moneda output de la quote */
  outputCurrency: PricingOutputCurrency
  loading?: boolean
}

/**
 * Panel sticky-right con los addons auto-resueltos por el engine v2. El usuario
 * puede toggle on/off cada addon — el parent decide si reenvía el input al engine
 * con los includedSkus actualizados (marcándolos como línea overhead_addon
 * explícita vs dejar que el engine los auto-resuelva).
 */
const AddonSuggestionsPanel = ({
  suggestions,
  includedSkus,
  onToggle,
  outputCurrency,
  loading = false
}: AddonSuggestionsPanelProps) => {
  const includedSet = new Set(includedSkus)

  return (
    <Box
      component='aside'
      aria-label='Addons sugeridos'
      sx={theme => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        p: 2,
        minWidth: 280
      })}
    >
      <Typography variant='subtitle2' sx={{ mb: 1 }}>
        Addons sugeridos
      </Typography>

      {loading ? (
        <Typography variant='body2' color='text.secondary'>
          Calculando addons aplicables...
        </Typography>
      ) : suggestions.length === 0 ? (
        <EmptyState
          icon='tabler-checkbox'
          title='Ningún addon sugerido'
          description='El engine no encontró addons aplicables para este contexto.'
        />
      ) : (
        <Stack spacing={1.5} divider={<Divider flexItem />}>
          {suggestions.map(suggestion => {
            const isIncluded = includedSet.has(suggestion.sku)

            return (
              <Box key={suggestion.sku}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isIncluded}
                      onChange={event => onToggle(suggestion.sku, event.target.checked)}
                      inputProps={{ 'aria-label': `Incluir ${suggestion.addonName}` }}
                    />
                  }
                  label={
                    <Stack spacing={0.25} sx={{ flex: 1 }}>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {suggestion.addonName}
                        </Typography>
                        <Chip
                          size='small'
                          label={suggestion.visibleToClient ? 'Cliente' : 'Interno'}
                          color={suggestion.visibleToClient ? 'primary' : 'default'}
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Stack>
                      <Typography variant='caption' color='text.secondary'>
                        {suggestion.appliedReason}
                      </Typography>
                      <Typography variant='caption' sx={{ fontFamily: 'monospace' }}>
                        {formatOutputMoney(suggestion.amountOutputCurrency, outputCurrency)}
                        {' · '}
                        {formatOutputMoney(suggestion.amountUsd, 'USD')}
                      </Typography>
                    </Stack>
                  }
                  sx={{ alignItems: 'flex-start', m: 0, gap: 1, '& .MuiFormControlLabel-label': { flex: 1 } }}
                />
              </Box>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}

export default AddonSuggestionsPanel
