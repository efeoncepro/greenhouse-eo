'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

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

/**
 * Smart Home v2 Hero — port of Vuexy `Congratulations` widget shape.
 *
 * Layout:
 *   - Left side: title (h5) + subtitle + Nexa accent line + composer
 *   - Right side: brand isotipo as illustration (subtle, never decorative-only)
 *
 * Composer is built with `CustomTextField` + `InputAdornment` start/end —
 * NOT siblings. Chips below are role-aware suggestions.
 */
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
    <Card component='section' aria-label='Asistente Nexa'>
      <CardContent sx={{ position: 'relative', overflow: 'hidden', py: { xs: 4, md: 5 }, px: { xs: 3, md: 5 } }}>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={reduced ? undefined : { duration: 0.32, ease: [0.2, 0, 0, 1] }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={4}
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Stack spacing={3} sx={{ flex: 1, minWidth: 0 }}>
              {data.identity ? (
                <Stack direction='row' spacing={1.5} alignItems='center'>
                  <CustomAvatar
                    src={data.identity.avatarUrl ?? undefined}
                    skin='light'
                    color='primary'
                    size={32}
                  >
                    {data.identity.displayName.charAt(0).toUpperCase()}
                  </CustomAvatar>
                  <Stack direction='row' spacing={1} alignItems='center' divider={<Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />}>
                    <Typography variant='body2' sx={{ fontWeight: 500 }} color='text.primary'>
                      {data.identity.displayName}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {data.identity.role}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {data.identity.tenantLabel}
                    </Typography>
                  </Stack>
                </Stack>
              ) : null}
              <Stack spacing={0.5}>
                <Typography variant='overline' color='primary.main' sx={{ letterSpacing: 1, fontWeight: 600 }}>
                  Nexa · IA Operativa
                </Typography>
                <Typography variant='h5' component='h1' sx={{ fontWeight: 500 }}>
                  {data.greeting}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {data.subtitle}
                </Typography>
              </Stack>
              <Box
                component='form'
                onSubmit={event => {
                  event.preventDefault()
                  submitPrompt(prompt)
                }}
                sx={{ width: '100%', maxWidth: 720 }}
              >
                <CustomTextField
                  fullWidth
                  value={prompt}
                  onChange={event => setPrompt(event.target.value)}
                  placeholder='Pregunta sobre nómina, OTD, equipo, finanzas…'
                  aria-label='Pregunta para Nexa'
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <i className='tabler-sparkles text-xl text-primary' />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            type='submit'
                            color='primary'
                            aria-label='Enviar pregunta'
                            disabled={!prompt.trim()}
                            edge='end'
                          >
                            <i className='tabler-send text-xl' />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Box>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                {data.suggestions.slice(0, 4).map(suggestion => (
                  <Button
                    key={suggestion.intent}
                    size='small'
                    variant='outlined'
                    color='secondary'
                    onClick={() => submitPrompt(suggestion.prompt)}
                    sx={{
                      borderRadius: 9999,
                      fontWeight: 400,
                      color: 'text.primary',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      textTransform: 'none',
                      py: 0.5,
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lightOpacity' }
                    }}
                  >
                    {suggestion.shortLabel}
                  </Button>
                ))}
              </Stack>
              <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap'>
                <Chip size='small' variant='outlined' label={data.modelLabel} icon={<i className='tabler-brand-google text-base' />} />
                {lastQueryLabel ? (
                  <Typography variant='caption' color='text.secondary'>
                    Última consulta {lastQueryLabel}
                  </Typography>
                ) : (
                  <Typography variant='caption' color='text.secondary'>
                    Listo para tu primera pregunta del día
                  </Typography>
                )}
              </Stack>
              <Typography variant='caption' color='text.disabled'>
                {data.disclaimer}
              </Typography>
            </Stack>
            <Box
              aria-hidden
              sx={{
                position: 'relative',
                width: { xs: 96, md: 168 },
                height: { xs: 96, md: 168 },
                flexShrink: 0,
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: theme =>
                    `radial-gradient(circle, color-mix(in oklch, ${theme.palette.primary.main} 20%, transparent) 0%, transparent 70%)`
                }}
              />
              <Image
                src='/images/greenhouse/SVG/greenhouse-blue.svg'
                alt=''
                width={120}
                height={120}
                style={{ position: 'relative', zIndex: 1 }}
              />
            </Box>
          </Stack>
        </motion.div>
      </CardContent>
    </Card>
  )
}

export default HomeHeroAi
