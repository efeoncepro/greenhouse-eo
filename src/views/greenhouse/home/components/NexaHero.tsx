'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'

import { ComposerPrimitive } from '@assistant-ui/react'

import { NEXA_SUGGESTIONS } from '@/config/home-suggestions'
import { HOME_SUBTITLE, HOME_DISCLAIMER } from '@/config/home-greetings'

interface Props {
  greeting: string
  onSuggestionClick: (text: string) => void
}

const NexaHero = ({ greeting, onSuggestionClick }: Props) => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    maxWidth: 720,
    mx: 'auto',
    px: 3,
    textAlign: 'center'
  }}>
    {/* Nexa avatar */}
    <CustomAvatar
      skin='light'
      color='primary'
      variant='rounded'
      sx={{ width: 56, height: 56, mb: 3, fontSize: '1.75rem' }}
    >
      <i className='tabler-sparkles' />
    </CustomAvatar>

    {/* Greeting */}
    <Typography variant='h4' sx={{ fontWeight: 700, mb: 1 }}>
      {greeting}
    </Typography>
    <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
      {HOME_SUBTITLE}
    </Typography>

    {/* Prompt input */}
    <ComposerPrimitive.Root asChild>
      <Box sx={{ width: '100%', mb: 3 }}>
        <ComposerPrimitive.Input asChild>
          <CustomTextField
            fullWidth
            placeholder='Pregunta sobre nómina, OTD, equipo, finanzas...'
            autoComplete='off'
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
                fontSize: '1rem',
                py: 0.5,
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderWidth: 2,
                  borderColor: 'primary.main'
                }
              }
            }}
            slotProps={{
              input: {
                'aria-label': 'Pregunta a Nexa sobre tu operación',
                endAdornment: (
                  <InputAdornment position='end'>
                    <ComposerPrimitive.Send asChild>
                      <IconButton
                        color='primary'
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': { bgcolor: 'primary.dark' },
                          width: 36,
                          height: 36
                        }}
                      >
                        <i className='tabler-arrow-up' style={{ fontSize: '1.25rem' }} />
                      </IconButton>
                    </ComposerPrimitive.Send>
                  </InputAdornment>
                )
              }
            }}
          />
        </ComposerPrimitive.Input>
      </Box>
    </ComposerPrimitive.Root>

    {/* Suggestion chips */}
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 4 }}>
      {NEXA_SUGGESTIONS.map((suggestion, i) => (
        <Chip
          key={i}
          label={suggestion}
          size='small'
          variant='outlined'
          onClick={() => onSuggestionClick(suggestion)}
          sx={{
            borderRadius: '20px',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'primary.lighterOpacity' }
          }}
        />
      ))}
    </Box>

    {/* Disclaimer */}
    <Typography variant='caption' color='text.disabled' role='note'>
      {HOME_DISCLAIMER}
    </Typography>
  </Box>
)

export default NexaHero
