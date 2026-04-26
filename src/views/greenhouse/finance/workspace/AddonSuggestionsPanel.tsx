'use client'

import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import EmptyState from '@/components/greenhouse/EmptyState'
import { useListAnimation } from '@/hooks/useListAnimation'

import type { PricingAddonOutputV2, PricingOutputCurrency } from '@/lib/finance/pricing/contracts'

import { formatOutputMoney } from './QuoteTotalsFooter'

export interface AddonSuggestionsPanelProps {

  /** Addons visibles al cliente, mezclados: los ya aplicados (como línea) y
   *  las sugerencias aún no aplicadas. El checkbox representa si están
   *  tildados (incluidos como línea). */
  suggestions: PricingAddonOutputV2[]

  /** SKUs de addons que ya están incluidos como línea overhead_addon en la
   *  cotización. Determina el estado marcado/desmarcado del checkbox. */
  includedSkus: string[]

  /** Toggle: al tildar se promueve a línea overhead_addon; al destildar la
   *  línea se remueve del snapshot. */
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
  const [stackRef] = useListAnimation()

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
      <Typography variant='subtitle2' sx={{ mb: 0.5 }}>
        Addons para el cliente
      </Typography>
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1.5 }}>
        Tildar agrega el cargo como línea en la cotización.
      </Typography>

      {loading ? (
        <Typography variant='body2' color='text.secondary'>
          Calculando addons aplicables…
        </Typography>
      ) : suggestions.length === 0 ? (
        <EmptyState
          icon='tabler-checkbox'
          title='Sin addons sugeridos'
          description='No hay cargos adicionales aplicables a este contexto.'
        />
      ) : (
        <Stack ref={stackRef} spacing={1.5} divider={<Divider flexItem />}>
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
                      <Typography variant='body2' sx={{ fontWeight: 500 }}>
                        {suggestion.addonName}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatOutputMoney(suggestion.amountOutputCurrency, outputCurrency)}
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
