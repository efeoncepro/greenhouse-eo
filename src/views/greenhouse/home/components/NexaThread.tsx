'use client'

import '@assistant-ui/react-markdown/styles/dot.css'
import { useCallback, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  useAui,
  useAuiState,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive
} from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'

import { alpha, useTheme, type Theme } from '@mui/material/styles'

import { getMicrocopy } from '@/lib/copy'


import { NexaGlowBorder } from '@/components/greenhouse/primitives'
import { GREENHOUSE_NEXA_BRAND_COLORS } from '@/components/greenhouse/primitives/greenhouse-nexa-brand-controller'
import CustomTextField from '@core/components/mui/TextField'

import type { NexaModelId } from '@/config/nexa-models'

import NexaModelSelector from './NexaModelSelector'
import NexaToolRenderer from './NexaToolRenderers'

const TASK407_ARIA_EDITAR_MENSAJE = "Editar mensaje"
const TASK407_ARIA_RESPUESTA_UTIL = "Respuesta util"
const TASK407_ARIA_RESPUESTA_NO_UTIL = "Respuesta no util"
const TASK407_ARIA_COPIAR_RESPUESTA = "Copiar respuesta"
const TASK407_ARIA_REGENERAR_RESPUESTA = "Regenerar respuesta"
const TASK407_ARIA_NEXA_ESTA_PENSANDO = "Nexa esta pensando"
const TASK407_ARIA_DETENER_GENERACION = "Detener generacion"
const TASK407_ARIA_HISTORIAL_DE_CONVERSACIONES = "Historial de conversaciones"
const TASK407_ARIA_IR_AL_FINAL = "Ir al final"
const TASK407_ARIA_ENVIAR_MENSAJE = "Enviar mensaje"


const GREENHOUSE_COPY = getMicrocopy()

export interface NexaThreadProps {
  onBack?: () => void
  selectedModel: NexaModelId
  onModelChange: (model: NexaModelId) => void
  compact?: boolean
  suggestions?: string[]
  onHistoryToggle?: () => void
  /**
   * Suprime el header interno (marca "Nexa AI" + selector de modelo). Para
   * embeber el thread dentro de un shell que ya provee su propio header
   * (ej. panel flotante TASK-1078). Opt-in; default conserva el header (Home).
   */
  hideHeader?: boolean
}

/* ── Subtle entrance animation ── */
const msgInSx = {
  '@keyframes nexa-msg-in': {
    '0%': { opacity: 0, transform: 'translateY(6px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' }
  },
  animation: 'nexa-msg-in 0.2s cubic-bezier(0.2, 0, 0, 1)',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
}

/* ── Wordmark "Nexa" inline (labels por-mensaje) ── Poppins (display SoT) a 16px/600:
   presencia de marca sin pesar como el header (h4 20px). El fontSize inline es una
   excepción deliberada del wordmark (la regla es warn); se centralizará cuando el
   NexaComposer/wordmark pase a primitive del Design System (TASK-1078 follow-up). */
const nexaWordmarkInlineSx = (theme: Theme) => ({
  fontFamily: theme.typography.h4.fontFamily,
  fontWeight: 600,
  fontSize: '1rem',
  lineHeight: 1,
  letterSpacing: 0.1
})

/* ── Avatar por-mensaje de Nexa ── Nexa Mark en disco navy circular con anillo teal:
   minimalista (un disco con el mark) + presencia (contraste navy/teal). El glyph va
   inline para controlar sus colores: sonrisa teal + sparkle BLANCO (sobre navy el
   sparkle azul se perdía) y tamaño generoso dentro del disco. */
const NexaSenderMark = () => {
  const theme = useTheme()

  return (
    <Box
      aria-hidden
      sx={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy,
        boxShadow: `0 0 0 1.5px ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.electricTeal, 0.35)}`
      }}
    >
      <Box component='svg' viewBox='0 0 48 48' sx={{ width: 19, height: 19, display: 'block' }}>
        <path d='M9 27 Q19 39 29 27' fill='none' stroke={GREENHOUSE_NEXA_BRAND_COLORS.electricTeal} strokeWidth={4} strokeLinecap='round' />
        <path d='M34 9 C35 12.5 36.5 14 40 15 C36.5 16 35 17.5 34 21 C33 17.5 31.5 16 28 15 C31.5 14 33 12.5 34 9 Z' fill={theme.palette.common.white} />
      </Box>
    </Box>
  )
}

const TextPart = ({ text }: { text: string }) => (
  <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
)

/* ── Markdown prose styles (document-quality) ── */
const proseSx = {
  fontSize: '0.9375rem',
  lineHeight: 1.8,
  color: 'text.primary',
  '& p': { m: 0, mb: 1.5, '&:last-child': { mb: 0 } },
  '& ul, & ol': { my: 1.5, pl: 3, '& li': { mb: 0.75 } },
  '& strong': { fontWeight: 700 },
  '& code': {
    fontSize: '0.8125rem',
    bgcolor: 'action.selected',
    px: 0.75,
    py: 0.25,
    borderRadius: 0.75,

    // Excepcion justificada (TASK-567): el tag <code> dentro de markdown
    // rendering del thread de Nexa muestra source code literal, no IDs ni
    // montos. Es el caso de excepcion documentado en la spec.
    // eslint-disable-next-line greenhouse/no-hardcoded-fontfamily
    fontFamily: 'monospace',
    border: '1px solid',
    borderColor: 'divider'
  },
  '& pre': {
    bgcolor: 'action.hover',
    p: 2,
    borderRadius: 2,
    overflow: 'auto',
    my: 2,
    border: '1px solid',
    borderColor: 'divider',
    '& code': { bgcolor: 'transparent', p: 0, border: 'none' }
  },
  '& a': { color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
  '& h1, & h2, & h3': { fontWeight: 700, mt: 2, mb: 1 },
  '& hr': { borderColor: 'divider', my: 2 }
}

/* ── User message — subtle query, not a chat bubble ── */
const UserMessage = () => (
  <MessagePrimitive.Root>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, ...msgInSx }}>
      <Box sx={{ maxWidth: '85%', position: 'relative' }}>
        <ComposerPrimitive.If editing={false}>
          <Box sx={{
            px: 2.5,
            py: 1.75,
            borderRadius: '12px 12px 2px 12px',
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            transition: 'background-color 0.15s ease',
            '&:hover': { bgcolor: 'action.selected' }
          }}>
            <Typography
              variant='body2'
              component='div'
              sx={{ lineHeight: 1.7, color: 'text.primary' }}
            >
              <MessagePrimitive.Content components={{ Text: TextPart }} />
            </Typography>
          </Box>

          <ActionBarPrimitive.Root
            autohide='always'
            style={{ position: 'absolute', bottom: -4, right: -4 }}
          >
            <ActionBarPrimitive.Edit asChild>
              <IconButton
                size='small'
                aria-label={TASK407_ARIA_EDITAR_MENSAJE}
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'background.default',
                  border: 1,
                  borderColor: 'divider',
                  boxShadow: 1,
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' }
                }}
              >
                <i className='tabler-pencil' style={{ fontSize: '0.8rem' }} />
              </IconButton>
            </ActionBarPrimitive.Edit>
          </ActionBarPrimitive.Root>
        </ComposerPrimitive.If>

        <ComposerPrimitive.If editing={true}>
          <ComposerPrimitive.Root>
            <Box sx={{
              border: 2,
              borderColor: 'primary.main',
              borderRadius: '12px',
              overflow: 'hidden',
              bgcolor: 'background.paper'
            }}>
              <ComposerPrimitive.Input asChild>
                <CustomTextField
                  id='nexa-message-edit-input'
                  fullWidth
                  multiline
                  minRows={1}
                  maxRows={4}
                  autoFocus
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      fontSize: '0.9375rem',
                      color: 'text.primary',
                      '& fieldset': { border: 'none' }
                    }
                  }}
                />
              </ComposerPrimitive.Input>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 1 }}>
                <ComposerPrimitive.Cancel asChild>
                  <Button size='small' variant='outlined' color='secondary'>{GREENHOUSE_COPY.actions.cancel}</Button>
                </ComposerPrimitive.Cancel>
                <ComposerPrimitive.Send asChild>
                  <Button size='small' variant='contained'>{GREENHOUSE_COPY.actions.save}</Button>
                </ComposerPrimitive.Send>
              </Box>
            </Box>
          </ComposerPrimitive.Root>
        </ComposerPrimitive.If>
      </Box>
    </Box>
  </MessagePrimitive.Root>
)

/* ── Feedback thumbs ── */
const FeedbackThumbs = ({ messageId }: { messageId: string }) => {
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(null)

  const handleFeedback = useCallback(
    (value: 'positive' | 'negative') => {
      if (sentiment === value) return

      setSentiment(value)

      fetch('/api/home/nexa/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId: messageId, sentiment: value })
      }).catch(() => {})
    },
    [messageId, sentiment]
  )

  return (
    <>
      <IconButton
        size='small'
        aria-label={TASK407_ARIA_RESPUESTA_UTIL}
        aria-pressed={sentiment === 'positive'}
        onClick={() => handleFeedback('positive')}
        sx={{
          width: 28, height: 28, borderRadius: 1.5,
          color: sentiment === 'positive' ? 'success.main' : 'text.secondary',
          opacity: sentiment === 'negative' ? 0.3 : 1,
          '&:hover': { color: 'success.main', bgcolor: 'action.selected' },
          transition: 'all 0.15s ease'
        }}
      >
        <i className={sentiment === 'positive' ? 'tabler-thumb-up-filled' : 'tabler-thumb-up'} style={{ fontSize: '0.875rem' }} />
      </IconButton>
      <IconButton
        size='small'
        aria-label={TASK407_ARIA_RESPUESTA_NO_UTIL}
        aria-pressed={sentiment === 'negative'}
        onClick={() => handleFeedback('negative')}
        sx={{
          width: 28, height: 28, borderRadius: 1.5,
          color: sentiment === 'negative' ? 'error.main' : 'text.secondary',
          opacity: sentiment === 'positive' ? 0.3 : 1,
          '&:hover': { color: 'error.main', bgcolor: 'action.selected' },
          transition: 'all 0.15s ease'
        }}
      >
        <i className={sentiment === 'negative' ? 'tabler-thumb-down-filled' : 'tabler-thumb-down'} style={{ fontSize: '0.875rem' }} />
      </IconButton>
    </>
  )
}

/* ── Assistant message — open prose, no bubble ── */
const AssistantMessage = () => {
  const messageId = useAuiState(s => {
    const msgs = s.thread.messages

    const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant')

    return lastAssistant?.id ?? 'unknown'
  })

  return (
    <MessagePrimitive.Root>
      <Box sx={{ mb: 4, ...msgInSx }}>
        {/* Sender label — glyph en círculo outline: presencia liviana, content-first */}
        <Stack direction='row' spacing={1.25} alignItems='center' sx={{ mb: 1.5 }}>
          <NexaSenderMark />
          <Typography component='span' sx={[nexaWordmarkInlineSx, { color: 'text.secondary' }]}>
            Nexa
          </Typography>
        </Stack>

        {/* Prose content — no bubble, no border */}
        <Box sx={{ '& .aui-md': proseSx }}>
          <MessagePrimitive.Content
            components={{
              Text: MarkdownTextPrimitive as any,
              tools: { Fallback: NexaToolRenderer }
            }}
          />
        </Box>

        {/* Error state */}
        <MessagePrimitive.Error>
          <Box sx={{
            mt: 1.5,
            px: 2,
            py: 1.5,
            borderRadius: 2,
            bgcolor: 'error.lighterOpacity',
            border: 1,
            borderColor: 'error.main',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}>
            <i className='tabler-alert-circle' style={{ fontSize: '1rem', flexShrink: 0 }} />
            <Typography variant='body2' color='error.main' sx={{ flex: 1 }}>
              No se pudo generar una respuesta.
            </Typography>
            <ActionBarPrimitive.Reload asChild>
              <Button size='small' color='error' variant='outlined' sx={{ flexShrink: 0 }}>
                Reintentar
              </Button>
            </ActionBarPrimitive.Reload>
          </Box>
        </MessagePrimitive.Error>

        {/* Contained ActionBar */}
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide='not-last'
          style={{ marginTop: 12 }}
        >
          <Box sx={{
            display: 'inline-flex',
            gap: 0.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
            px: 1,
            py: 0.5
          }}>
            <ActionBarPrimitive.Copy asChild>
              <IconButton
                size='small'
                aria-label={TASK407_ARIA_COPIAR_RESPUESTA}
                sx={{
                  width: 28, height: 28, borderRadius: 1.5,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: 'action.selected' },
                  '&[data-copied]': { color: 'success.main' },
                  '& .aui-copy': { display: 'inline-flex' },
                  '& .aui-copied': { display: 'none' },
                  '&[data-copied] .aui-copy': { display: 'none' },
                  '&[data-copied] .aui-copied': { display: 'inline-flex' }
                }}
              >
                <i className='tabler-copy aui-copy' style={{ fontSize: '0.875rem' }} />
                <i className='tabler-check aui-copied' style={{ fontSize: '0.875rem' }} />
              </IconButton>
            </ActionBarPrimitive.Copy>
            <ActionBarPrimitive.Reload asChild>
              <IconButton
                size='small'
                aria-label={TASK407_ARIA_REGENERAR_RESPUESTA}
                sx={{
                  width: 28, height: 28, borderRadius: 1.5,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: 'action.selected' }
                }}
              >
                <i className='tabler-refresh' style={{ fontSize: '0.875rem' }} />
              </IconButton>
            </ActionBarPrimitive.Reload>
            <FeedbackThumbs messageId={messageId} />
          </Box>
        </ActionBarPrimitive.Root>
      </Box>
    </MessagePrimitive.Root>
  )
}

/* ── Follow-up suggestions — mini cards, not chips ── */
const FollowupSuggestions = ({ suggestions }: { suggestions: string[] }) => {
  const aui = useAui()
  const isRunning = useAuiState(s => s.thread.isRunning)

  if (isRunning || suggestions.length === 0) return null

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, maxWidth: 720, mx: 'auto', mt: 1, mb: 2, px: 3, ...msgInSx }}>
      {suggestions.map(suggestion => (
        <Box
          key={suggestion}
          role='button'
          tabIndex={0}
          onClick={() => {
            aui.thread().append({
              role: 'user',
              content: [{ type: 'text' as const, text: suggestion }]
            })
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              aui.thread().append({ role: 'user', content: [{ type: 'text' as const, text: suggestion }] })
            }
          }}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            px: 2,
            py: 1.25,
            cursor: 'pointer',
            maxWidth: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            bgcolor: 'background.paper',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
            '& .nexa-suggestion-arrow': {
              opacity: 0,
              transform: 'translateX(-4px)',
              transition: 'opacity 0.15s ease, transform 0.15s ease',
              color: 'primary.main',
              flexShrink: 0
            },
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: theme => theme.greenhouseElevation.raised.boxShadow,
              transform: 'translateY(-1px)'
            },
            '&:hover .nexa-suggestion-arrow': { opacity: 1, transform: 'translateX(0)' },
            '&:focus-visible': {
              outline: '2px solid var(--mui-palette-primary-main)',
              outlineOffset: 2
            },
            '&:active': { transform: 'translateY(0)' },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } }
          }}
        >
          <Typography variant='body2' color='text.primary' sx={{ lineHeight: 1.45 }}>
            {suggestion}
          </Typography>
          <i className='tabler-arrow-up-right nexa-suggestion-arrow' style={{ fontSize: '0.9rem' }} />
        </Box>
      ))}
    </Box>
  )
}

/* ── Thinking indicator — shimmer skeleton ── */
const ThinkingIndicator = () => {
  const isRunning = useAuiState(s => s.thread.isRunning)

  if (!isRunning) return null

  return (
    <Box sx={{ mb: 4 }} aria-live='polite' aria-label={TASK407_ARIA_NEXA_ESTA_PENSANDO}>
      <Stack direction='row' spacing={1.25} alignItems='center' sx={{ mb: 1.5 }}>
        <NexaSenderMark />
        <Typography component='span' sx={[nexaWordmarkInlineSx, { color: 'text.secondary' }]}>
          Nexa
        </Typography>
      </Stack>
      <Stack spacing={1} sx={{ pt: 0.5 }}>
        <Skeleton variant='text' animation='wave' width='70%' height={16} sx={{ borderRadius: 1 }} />
        <Skeleton variant='text' animation='wave' width='50%' height={16} sx={{ borderRadius: 1 }} />
        <Skeleton variant='text' animation='wave' width='35%' height={16} sx={{ borderRadius: 1 }} />
      </Stack>
    </Box>
  )
}

/* ── Premium composer ── */
const ChatComposer = () => {
  const theme = useTheme()
  const isRunning = useAuiState(s => s.thread.isRunning)

  return (
    <Box sx={{
      position: 'sticky',
      bottom: 0,
      // Composer sobre blanco (paper), sin banda gris ni borde → experiencia
      // conversacional continua (UI moderna: el grey backing fragmenta el chat).
      bgcolor: 'background.paper',
      pt: 2,
      pb: 2.5,
      px: 4,
      maxWidth: 720,
      mx: 'auto',
      width: '100%'
    }} data-capture='nexa-composer'>
      <ComposerPrimitive.Root>
        <NexaGlowBorder radius={14} focusRingColor={theme.palette.primary.main}>
          <ComposerPrimitive.Input asChild>
            <CustomTextField
              id='nexa-floating-composer-input'
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              placeholder='Pregúntale a Nexa sobre tu operación…'
              autoComplete='off'
              sx={{
                // El CustomTextField usa la variante FILLED de Vuexy: el
                // .MuiFilledInput-root trae su propio radius=6px + sombra azul de foco
                // → ESE es el "box interno" de radio distinto. Lo anulamos por completo
                // (sin radius propio, sin sombra, sin underline, fondo transparente):
                // el input no dibuja ningún box, y el acento azul de foco lo pinta
                // NexaGlowBorder (focusRingColor) en la MISMA caja del glow (radio 14).
                '& .MuiFilledInput-root': {
                  borderRadius: '14px',
                  fontSize: '0.9375rem',
                  lineHeight: 1.6,
                  py: 0.5,
                  border: 'none !important',
                  backgroundColor: 'transparent !important',
                  boxShadow: 'none !important',
                  '&:before, &:after': { display: 'none' },
                  '&:hover': { border: 'none !important', backgroundColor: 'transparent !important', boxShadow: 'none !important' },
                  '&.Mui-focused': { border: 'none !important', backgroundColor: 'transparent !important', boxShadow: 'none !important' }
                }
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end' sx={{ alignSelf: 'flex-end', mb: '5px' }}>
                      {isRunning ? (
                        <ComposerPrimitive.Cancel asChild>
                          <IconButton
                            aria-label={TASK407_ARIA_DETENER_GENERACION}
                            sx={{
                              bgcolor: 'error.lighterOpacity',
                              color: 'error.main',
                              '&:hover': { bgcolor: 'error.lightOpacity' },
                              width: 30,
                              height: 30,
                              borderRadius: '50%'
                            }}
                          >
                            <i className='tabler-player-stop-filled' style={{ fontSize: '0.9375rem' }} />
                          </IconButton>
                        </ComposerPrimitive.Cancel>
                      ) : (
                        <ComposerPrimitive.Send asChild>
                          <Box
                            component='button'
                            type='button'
                            aria-label={TASK407_ARIA_ENVIAR_MENSAJE}
                            sx={{
                              width: 30,
                              height: 30,
                              flexShrink: 0,
                              p: 0,
                              border: 'none',
                              borderRadius: '50%',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy,
                              color: 'common.white',
                              boxShadow: `0 1px 3px ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy, 0.32)}`,
                              transition: theme => theme.transitions.create(['background-color', 'color', 'transform', 'box-shadow'], { duration: theme.transitions.duration.shortest }),
                              '&:hover': {
                                bgcolor: GREENHOUSE_NEXA_BRAND_COLORS.electricTeal,
                                color: GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy,
                                transform: 'translateY(-1px) scale(1.04)',
                                boxShadow: `0 2px 8px ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.electricTeal, 0.45)}`
                              },
                              '&:hover svg': { stroke: GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy },
                              '&:active': { transform: 'scale(0.94)' },
                              '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${alpha(GREENHOUSE_NEXA_BRAND_COLORS.electricTeal, 0.5)}` },
                              '&:disabled': { bgcolor: alpha(theme.palette.text.primary, 0.08), color: 'action.disabled', boxShadow: 'none', cursor: 'default', transform: 'none' },
                              '&:disabled svg': { stroke: theme.palette.action.disabled }
                            }}
                          >
                            <Box
                              component='svg'
                              aria-hidden
                              viewBox='0 0 24 24'
                              fill='none'
                              sx={{ width: 15, height: 15, stroke: theme.palette.common.white, strokeWidth: 2.25, strokeLinecap: 'round', strokeLinejoin: 'round' }}
                            >
                              <path d='M12 19V5' />
                              <path d='M5 12l7-7 7 7' />
                            </Box>
                          </Box>
                        </ComposerPrimitive.Send>
                      )}
                    </InputAdornment>
                  )
                }
              }}
            />
          </ComposerPrimitive.Input>
        </NexaGlowBorder>
      </ComposerPrimitive.Root>
      <Typography variant='caption' color='text.disabled' sx={{ textAlign: 'center', display: 'block', mt: 1, fontSize: '0.6875rem', letterSpacing: 0.1 }}>
        Nexa analiza tus datos en tiempo real. Verifica antes de una decisión crítica.
      </Typography>
    </Box>
  )
}

/* ── Main thread ── */
const NexaThread = ({ onBack, selectedModel, onModelChange, compact, suggestions = [], onHistoryToggle, hideHeader }: NexaThreadProps) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: compact ? 'auto' : '60vh' }}>
    {/* Frosted header */}
    {!compact && !hideHeader && (
      <Box sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        maxWidth: 720,
        mx: 'auto',
        width: '100%'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
          {onHistoryToggle ? (
            <IconButton
              size='small'
              aria-label={TASK407_ARIA_HISTORIAL_DE_CONVERSACIONES}
              onClick={onHistoryToggle}
              sx={{ width: 36, height: 36, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <i className='tabler-history' style={{ fontSize: '1.125rem' }} />
            </IconButton>
          ) : null}
          {onBack ? (
            <Button
              startIcon={<i className='tabler-arrow-left' />}
              onClick={onBack}
              size='small'
              color='secondary'
            >
              Inicio
            </Button>
          ) : null}
        </Box>
        <Stack direction='row' spacing={0.75} alignItems='center'>
          <i className='tabler-sparkles' style={{ fontSize: '1rem', color: 'var(--mui-palette-primary-main)' }} />
          <Typography component='span' sx={[nexaWordmarkInlineSx, { color: 'text.primary' }]}>
            Nexa AI
          </Typography>
        </Stack>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <NexaModelSelector compact selectedModel={selectedModel} onChange={onModelChange} />
        </Box>
      </Box>
    )}

    {/* Thread */}
    <ThreadPrimitive.Root style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
      <ThreadPrimitive.Viewport
        style={{
          flex: 1,
          overflowY: 'auto',
          maxWidth: compact ? undefined : 720,
          margin: '0 auto',
          width: '100%',
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 24
        }}
      >
        <ThreadPrimitive.Messages
          components={{ UserMessage, AssistantMessage }}
        />
        <ThinkingIndicator />
      </ThreadPrimitive.Viewport>

      <FollowupSuggestions suggestions={suggestions} />

      {!hideHeader && (
        <ThreadPrimitive.ScrollToBottom asChild>
          <IconButton
            aria-label={TASK407_ARIA_IR_AL_FINAL}
            sx={{
              position: 'absolute',
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              boxShadow: 2,
              '&:hover': { bgcolor: 'action.hover' },
              width: 36,
              height: 36,
              zIndex: 10
            }}
          >
            <i className='tabler-arrow-down' style={{ fontSize: '1.25rem' }} />
          </IconButton>
        </ThreadPrimitive.ScrollToBottom>
      )}

      <ChatComposer />
    </ThreadPrimitive.Root>
  </Box>
)

export default NexaThread
