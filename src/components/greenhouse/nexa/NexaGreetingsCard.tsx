'use client'

// Reusable Greenhouse "Greetings" hero card for Nexa (the AI operative agent).
// Implements the Figma "Greetings" component (Design System | Vuexy → AXIS,
// node 11919:15096): deep Greenhouse-blue surface with Nexa's avatar + chip on
// the left, and a personalized greeting + AI prompt field + quick-action chips
// on the right.
//
// Presentational + props-driven by design: it holds only the prompt input
// state and delegates submission via `onSubmitPrompt`. No data fetching, no
// `server-only` import — safe to reuse on any surface (home hero, Nexa landing,
// empty states, etc).

import { useEffect, useId, useState } from 'react'

import Image from 'next/image'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { keyframes } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import useReducedMotion from '@/hooks/useReducedMotion'

// Motion tokens (motion-design canonical): emphasized decelerated curve for
// state changes. All animations below are CSS-tier (lowest of the 6-tier
// pyramid) and gated by `prefers-reduced-motion`.
const EASE_EMPHASIZED = 'cubic-bezier(0.2, 0, 0, 1)'

// Ambient idle float — gives Nexa a subtle sign of life (Personality job).
const nexaFloat = keyframes({
  '0%, 100%': { transform: 'translateY(0)' },
  '50%': { transform: 'translateY(-4px)' }
})

// Sequential "en línea" pulse on the status dots (system-alive signal).
const dotPulse = keyframes({
  '0%, 100%': { opacity: 0.3 },
  '50%': { opacity: 1 }
})

// Stagger delays (s) + reduced-motion fallback opacities for the 3 status dots.
const STATUS_DOTS = [
  { delay: 0, restOpacity: 0.9 },
  { delay: 0.2, restOpacity: 0.55 },
  { delay: 0.4, restOpacity: 0.3 }
]

// Staggered entrance (choreography: hierarchy — avatar → greeting → prompt).
const entranceUp = keyframes({
  from: { opacity: 0, transform: 'translateY(10px)' },
  to: { opacity: 1, transform: 'translateY(0)' }
})

const entrance = (delayMs: number) => ({
  animation: `${entranceUp} 380ms ${EASE_EMPHASIZED} ${delayMs}ms backwards`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
})

// Greenhouse design-system color "Secundary/secundary-700" (Figma variable).
// Brand-blue surface for the Nexa greeting; not part of the MUI palette (whose
// `secondary` is the neutral gray), so it lives as a named constant here.
const GREENHOUSE_SECONDARY_700 = '#024c8f'

// Subtle filled overlay for the "¡Hola, soy Nexa!" chip. Figma uses an 8% dark
// fill; on the dark-blue surface we lift it to a low-opacity white so the chip
// stays legible (faithful intent: a quiet, filled chip — adapted for contrast).
const NEXA_CHIP_FILL = 'rgba(255, 255, 255, 0.14)'

const DEFAULT_NEXA_AVATAR = '/images/greenhouse/nexa/nexa-avatar.png'

const ARIA_PROMPT_INPUT = 'Pregunta para Nexa'
const ARIA_SUBMIT_PROMPT = 'Enviar pregunta'

export interface NexaGreetingsAction {
  /** Stable key for React lists. */
  key: string
  /** Visible chip label, e.g. "Mis tareas". */
  label: string
  /** Invoked when the chip is selected. */
  onSelect: () => void
  /** Optional leading Tabler icon class, e.g. "tabler-checklist". */
  iconClass?: string
}

export interface NexaGreetingsCardProps {
  /** Personalized greeting headline, e.g. "Hola, ¿cómo va el día Andrés?". */
  greeting: string
  /** Role + tenant line, e.g. "Colaborador · Efeonce Group". */
  roleLine: string
  /** Called with the trimmed prompt when the user submits the field. */
  onSubmitPrompt: (prompt: string) => void
  /** Quick-action chips below the prompt (e.g. Mis tareas / Mis horas / Mi nómina). */
  actions?: NexaGreetingsAction[]
  /** Label above the prompt field. */
  inputLabel?: string
  /** Prompt field placeholder (used when `placeholderExamples` is not provided). */
  placeholder?: string
  /**
   * Rotating example prompts. When 2+ are provided, the placeholder cycles
   * through them with a crossfade — teaching what to ask Nexa. Rotation pauses
   * on focus / while typing and is disabled under reduced motion.
   */
  placeholderExamples?: string[]
  /** Identity chip beside the avatar. */
  nexaChipLabel?: string
  /** Generative-AI disclaimer under the avatar. */
  disclaimer?: string
  /** Nexa avatar source (transparent cutout PNG). */
  avatarSrc?: string
  /** Accessible label for the avatar. */
  avatarAlt?: string
}

/**
 * Nexa "Greetings" hero card. Use on the home hero or any surface that opens
 * the Nexa operative experience with a greeting + prompt entry point.
 */
export const NexaGreetingsCard = ({
  greeting,
  roleLine,
  onSubmitPrompt,
  actions = [],
  inputLabel = 'Comienza tu operación con una pregunta',
  placeholder = 'Pregunta sobre RpA, Cycle Time…',
  placeholderExamples,
  nexaChipLabel = '¡Hola, soy Nexa!',
  disclaimer = 'Nexa usa IA generativa. Verifica la información importante.',
  avatarSrc = DEFAULT_NEXA_AVATAR,
  avatarAlt = 'Nexa, asistente de IA de Greenhouse'
}: NexaGreetingsCardProps) => {
  const [prompt, setPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [focused, setFocused] = useState(false)
  const [exampleIndex, setExampleIndex] = useState(0)
  const [placeholderVisible, setPlaceholderVisible] = useState(true)
  const inputId = useId()
  const reducedMotion = useReducedMotion()
  const canSend = prompt.trim().length > 0

  const hasExamples = Boolean(placeholderExamples && placeholderExamples.length > 0)

  const isRotating = Boolean(
    !reducedMotion && placeholderExamples && placeholderExamples.length > 1 && !focused && prompt.length === 0
  )

  const activePlaceholder = hasExamples
    ? placeholderExamples![exampleIndex % placeholderExamples!.length]
    : placeholder

  // Crossfade rotation: fade the placeholder out, swap the example, fade back in.
  useEffect(() => {
    if (!isRotating) {
      setPlaceholderVisible(true)

      return
    }

    const FADE_MS = 220
    const HOLD_MS = 3800

    const interval = window.setInterval(() => {
      setPlaceholderVisible(false)
      window.setTimeout(() => {
        setExampleIndex(index => index + 1)
        setPlaceholderVisible(true)
      }, FADE_MS)
    }, HOLD_MS)

    return () => window.clearInterval(interval)
  }, [isRotating])

  const handleSubmit = () => {
    const trimmed = prompt.trim()

    if (!trimmed || submitting) return
    setSubmitting(true)
    onSubmitPrompt(trimmed)
    // Fallback reset for reusable consumers that don't navigate away.
    window.setTimeout(() => setSubmitting(false), 1800)
  }

  return (
    <Card
      component='section'
      aria-label={nexaChipLabel}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        borderRadius: 'var(--mui-shape-borderRadius)',
        // Crafted brand-blue surface (depth, not a flat block).
        background: `linear-gradient(125deg, #0a5cab 0%, ${GREENHOUSE_SECONDARY_700} 56%, #023f73 100%)`,
        // Subtle "lit from above" top edge — premium surface cue.
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.16)',
          pointerEvents: 'none',
          zIndex: 2
        }
      }}
    >
      {/* Ambient brand aurora — subtle depth in the negative space, no clutter. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(46% 90% at 84% 12%, rgba(0, 186, 209, 0.26) 0%, transparent 60%), radial-gradient(44% 82% at 102% 104%, rgba(115, 103, 240, 0.20) 0%, transparent 58%)'
        }}
      />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 3, sm: 4 }}
        alignItems='center'
        sx={{ position: 'relative', zIndex: 1, p: 6 }}
      >
        {/* Left: Nexa avatar + identity chip + disclaimer */}
        <Stack
          spacing={1.25}
          alignItems='center'
          sx={{ width: { xs: 116, sm: 124, md: 139 }, flexShrink: 0, ...entrance(0) }}
        >
          <Box
            sx={{
              position: 'relative',
              width: { xs: 104, sm: 112, md: 128 },
              aspectRatio: '1 / 1',
              animation: `${nexaFloat} 5s ${EASE_EMPHASIZED} infinite`,
              willChange: 'transform',
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
            }}
          >
            {/* Soft halo grounds Nexa on the surface. */}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: '-14%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, transparent 68%)'
              }}
            />
            <Image
              src={avatarSrc}
              alt={avatarAlt}
              fill
              sizes='128px'
              style={{ objectFit: 'contain' }}
              priority
            />
          </Box>
          <Stack spacing={0.5} alignItems='center' sx={{ width: '100%' }}>
            <Chip
              size='small'
              label={nexaChipLabel}
              sx={{
                bgcolor: NEXA_CHIP_FILL,
                color: 'common.white',
                fontWeight: 500,
                borderRadius: 'var(--mui-shape-customBorderRadius-sm)',
                '& .MuiChip-label': { px: 2.5 }
              }}
            />
            <Typography
              variant='disclosureText'
              sx={{
                color: 'common.white',
                opacity: 0.75,
                textAlign: 'center',
                display: 'block'
              }}
            >
              {disclaimer}
            </Typography>
          </Stack>
        </Stack>

        {/* Right: greeting, role, prompt, quick actions */}
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Stack direction='row' alignItems='flex-start' spacing={1} sx={entrance(80)}>
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                component='h1'
                sx={{
                  color: 'common.white',
                  fontWeight: 600,
                  fontSize: { xs: '1.125rem', md: '1.375rem' },
                  lineHeight: 1.22,
                  letterSpacing: '-0.01em'
                }}
              >
                {greeting}
              </Typography>
              <Typography variant='caption' sx={{ color: 'common.white', opacity: 0.82, letterSpacing: '0.02em' }}>
                {roleLine}
              </Typography>
            </Stack>
            {/* Decorative status dots (matches Figma masthead affordance) */}
            <Stack aria-hidden direction='row' spacing={0.75} sx={{ pt: 1, flexShrink: 0 }}>
              {STATUS_DOTS.map(dot => (
                <Box
                  key={dot.delay}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'common.white',
                    opacity: 0.5,
                    animation: `${dotPulse} 1.4s linear ${dot.delay}s infinite`,
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: dot.restOpacity }
                  }}
                />
              ))}
            </Stack>
          </Stack>

          <Stack spacing={1} sx={{ width: '100%', ...entrance(160) }}>
            {/* Label rendered as a controlled element (full color control on the
                blue surface) + associated to the input via htmlFor/id. */}
            <Typography
              component='label'
              htmlFor={inputId}
              variant='body2'
              sx={{ color: 'common.white', fontWeight: 500 }}
            >
              {inputLabel}
            </Typography>
            <Box component='form' onSubmit={event => { event.preventDefault(); handleSubmit() }} sx={{ width: '100%' }}>
              <CustomTextField
                id={inputId}
                fullWidth
                value={prompt}
                onChange={event => setPrompt(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={activePlaceholder}
                aria-label={ARIA_PROMPT_INPUT}
                sx={{
                  // CustomTextField forces `transparent !important`; on this blue
                  // surface that makes the field disappear and the inherited white
                  // text vanish. Force an opaque white field + dark, legible text.
                  '& .MuiInputBase-root': {
                    backgroundColor: 'var(--mui-palette-background-paper) !important',
                    color: 'var(--mui-palette-text-primary)',
                    borderColor: 'transparent',
                    borderRadius: 'var(--mui-shape-customBorderRadius-lg)',
                    boxShadow: '0 8px 28px rgba(2, 28, 56, 0.28)',
                    transition: `box-shadow 150ms ${EASE_EMPHASIZED}`,
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
                  },
                  '& .MuiInputBase-root:hover:not(.Mui-focused)': { borderColor: 'transparent' },
                  '& .MuiInputBase-root.Mui-focused': {
                    borderColor: 'transparent',
                    boxShadow: '0 0 0 2px var(--mui-palette-primary-main), 0 8px 28px rgba(2, 28, 56, 0.28)'
                  },
                  // Typed text + caret: dark; placeholder: muted but readable,
                  // with a crossfade for the rotating examples.
                  '& .MuiInputBase-input': { color: 'var(--mui-palette-text-primary)', caretColor: 'var(--mui-palette-primary-main)' },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'var(--mui-palette-text-secondary)',
                    opacity: placeholderVisible ? 1 : 0,
                    transition: reducedMotion ? 'none' : `opacity 220ms ${EASE_EMPHASIZED}`
                  }
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start' sx={{ color: 'text.secondary' }}>
                        <i className='tabler-search text-xl' />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          type='submit'
                          aria-label={ARIA_SUBMIT_PROMPT}
                          disabled={!canSend || submitting}
                          edge='end'
                          sx={{
                            // Filled accent circle when there's a prompt; ghost when empty.
                            bgcolor: canSend ? 'primary.main' : 'transparent',
                            color: canSend ? 'common.white' : 'text.disabled',
                            transition: `transform 150ms ${EASE_EMPHASIZED}, background-color 150ms ${EASE_EMPHASIZED}, color 150ms ${EASE_EMPHASIZED}`,
                            '&:hover': { bgcolor: canSend ? 'primary.dark' : 'action.hover', transform: 'scale(1.06)' },
                            '&:active': { transform: 'scale(0.92)' },
                            '&.Mui-disabled': { bgcolor: 'transparent', color: 'text.disabled', opacity: 1 },
                            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                            '@media (prefers-reduced-motion: reduce)': {
                              transition: 'background-color 150ms linear, color 150ms linear',
                              '&:hover, &:active': { transform: 'none' }
                            }
                          }}
                        >
                          {submitting ? (
                            <CircularProgress size={18} thickness={5} sx={{ color: 'common.white' }} />
                          ) : (
                            <i className='tabler-send text-xl' />
                          )}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Box>

            {actions.length > 0 ? (
              <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
                {actions.map(action => (
                  <Chip
                    key={action.key}
                    label={action.label}
                    variant='outlined'
                    clickable
                    onClick={action.onSelect}
                    icon={action.iconClass ? <i className={action.iconClass} /> : undefined}
                    sx={{
                      color: 'common.white',
                      borderColor: 'rgba(255, 255, 255, 0.65)',
                      bgcolor: 'transparent',
                      fontWeight: 500,
                      borderRadius: 'var(--mui-shape-customBorderRadius-sm)',
                      transition: `background-color 150ms ${EASE_EMPHASIZED}, border-color 150ms ${EASE_EMPHASIZED}, transform 150ms ${EASE_EMPHASIZED}`,
                      '& .MuiChip-icon': { color: 'common.white', fontSize: '1rem', ml: 0.75, mr: -0.25 },
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.14)', borderColor: 'common.white', transform: 'translateY(-1px)' },
                      '&:active': { transform: 'translateY(0) scale(0.97)' },
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'common.white', outlineOffset: 2 },
                      '@media (prefers-reduced-motion: reduce)': {
                        transition: `background-color 150ms linear, border-color 150ms linear`,
                        '&:hover, &:active': { transform: 'none' }
                      }
                    }}
                  />
                ))}
              </Stack>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </Card>
  )
}

export default NexaGreetingsCard
