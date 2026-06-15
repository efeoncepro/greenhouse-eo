'use client'

import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import type { SelectChangeEvent } from '@mui/material/Select'

import { NEXA_MODEL_OPTIONS } from '@/config/nexa-models'
import type { NexaModelSelectorValue } from '@/lib/nexa/use-nexa-runtime'

interface Props {
  selectedModel: NexaModelSelectorValue
  onChange: (value: NexaModelSelectorValue) => void
  compact?: boolean
}

const NexaModelSelector = ({ selectedModel, onChange, compact = false }: Props) => {
  const handleChange = (event: SelectChangeEvent<NexaModelSelectorValue>) => {
    onChange(event.target.value as NexaModelSelectorValue)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: compact ? 'row' : 'column', alignItems: compact ? 'center' : 'flex-start', gap: compact ? 1 : 0.75 }}>
      {!compact && (
        <Typography variant='caption' color='text.secondary' sx={{ letterSpacing: 0.4, textTransform: 'uppercase' }}>
          Modelo Nexa
        </Typography>
      )}

      <Select<NexaModelSelectorValue>
        size='small'
        value={selectedModel}
        onChange={handleChange}
        sx={{
          minWidth: compact ? 180 : 240,
          bgcolor: 'background.paper',
          borderRadius: 2,
          '& .MuiSelect-select': {
            py: compact ? 1 : 1.1,
            fontSize: compact ? '0.8125rem' : '0.875rem'
          }
        }}
      >
        <MenuItem value='auto'>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography variant='body2'>Automático</Typography>
            <Typography variant='caption' color='text.secondary'>
              Nexa elige el modelo según tu pregunta · Recomendado
            </Typography>
          </Box>
        </MenuItem>

        {NEXA_MODEL_OPTIONS.map(option => (
          <MenuItem key={option.id} value={option.id}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant='body2'>{option.label}</Typography>
              <Typography variant='caption' color='text.secondary'>
                {option.description}{option.badge ? ` · ${option.badge}` : ''}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </Box>
  )
}

export default NexaModelSelector
