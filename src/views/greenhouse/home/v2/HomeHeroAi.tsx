'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'

import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import type { HomeHeroAiData } from '@/lib/home/contract'

interface HomeHeroAiProps {
  data: HomeHeroAiData
}

const formatRelativeTime = (timestampMs: number | null): string | null => {
  if (timestampMs == null) return null
  const seconds = Math.max(1, Math.floor((Date.now() - timestampMs) / 1000))

  if (seconds < 60) return `hace ${seconds}s`
  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `hace ${hours} h`

  return `hace ${Math.floor(hours / 24)} d`
}

export const HomeHeroAi = ({ data }: HomeHeroAiProps) => {
  const router = useRouter()
  const reduced = useReducedMotion()
  const [prompt, setPrompt] = useState('')

  const submitPrompt = (text: string) => {
    if (!text.trim()) return
    const target = `/home?nexa=${encodeURIComponent(text.trim())}`

    router.push(target)
  }

  const lastQueryLabel = formatRelativeTime(data.lastQueryAtMs)

  return (
    <Card
      component='section'
      aria-label='Asistente Nexa'
      sx={{
        background: theme =>
          `linear-gradient(135deg, ${theme.palette.background.paper} 0%, color-mix(in oklch, ${theme.palette.primary.main} 6%, ${theme.palette.background.paper}) 100%)`,
        overflow: 'visible'
      }}
    >
      <CardContent sx={{ py: { xs: 4, md: 6 } }}>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={reduced ? undefined : { duration: 0.32, ease: [0.2, 0, 0, 1] }}
        >
          <Stack spacing={3} alignItems='center' textAlign='center'>
            <CustomAvatar variant='rounded' skin='light' color='primary' size={56}>
              <i className='tabler-sparkles' style={{ fontSize: 30 }} />
            </CustomAvatar>
            <Stack spacing={0.5} alignItems='center'>
              <Typography variant='h4' component='h1' sx={{ fontWeight: 500 }}>
                {data.greeting}
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                {data.subtitle}
              </Typography>
            </Stack>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ color: 'text.secondary' }}>
              <Chip size='small' variant='outlined' label={`Modelo ${data.modelLabel}`} />
              {lastQueryLabel ? (
                <Typography variant='caption'>Última consulta {lastQueryLabel}</Typography>
              ) : null}
            </Stack>
            <Box
              component='form'
              onSubmit={event => {
                event.preventDefault()
                submitPrompt(prompt)
              }}
              sx={{
                width: '100%',
                maxWidth: 720,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                background: theme => theme.palette.background.paper,
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: theme => theme.shape.customBorderRadius?.lg ?? 8,
                boxShadow: theme => theme.shadows[1],
                px: 2,
                py: 1
              }}
            >
              <i className='tabler-search' style={{ fontSize: 20, opacity: 0.6 }} />
              <CustomTextField
                fullWidth
                value={prompt}
                onChange={event => setPrompt(event.target.value)}
                placeholder='Pregunta sobre nómina, OTD, equipo, finanzas...'
                aria-label='Pregunta para Nexa'
                slotProps={{
                  input: {
                    sx: {
                      border: 0,
                      backgroundColor: 'transparent',
                      '& fieldset': { border: 0 },
                      '& .MuiOutlinedInput-notchedOutline': { border: 0 }
                    }
                  }
                }}
                variant='outlined'
                size='small'
              />
              <IconButton
                type='submit'
                color='primary'
                aria-label='Enviar pregunta'
                disabled={!prompt.trim()}
              >
                <i className='tabler-send' />
              </IconButton>
            </Box>
            <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap justifyContent='center'>
              {data.suggestions.map(suggestion => (
                <Button
                  key={suggestion.intent}
                  size='small'
                  variant='outlined'
                  onClick={() => submitPrompt(suggestion.prompt)}
                  startIcon={<i className='tabler-sparkles' style={{ fontSize: 14 }} />}
                  sx={{
                    borderRadius: 9999,
                    fontWeight: 400,
                    color: 'text.primary',
                    borderColor: 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                >
                  {suggestion.shortLabel}
                </Button>
              ))}
            </Stack>
            <Typography variant='caption' color='text.secondary'>
              {data.disclaimer}
            </Typography>
          </Stack>
        </motion.div>
      </CardContent>
    </Card>
  )
}

export default HomeHeroAi
