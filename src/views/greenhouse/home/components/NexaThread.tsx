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

import { getMicrocopy } from '@/lib/copy'

import CustomAvatar from '@core/components/mui/Avatar'
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


const GREENHOUSE_COPY = getMicrocopy()

export interface NexaThreadProps {
  onBack?: () => void
  selectedModel: NexaModelId
  onModelChange: (model: NexaModelId) => void
  compact?: boolean
  suggestions?: string[]
  onHistoryToggle?: () => void
}

/* ── Subtle entrance animation ── */
const msgInSx = {
  '@keyframes nexa-msg-in': {
    '0%': { opacity: 0, transform: 'translateY(6px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' }
  },
  animation: 'nexa-msg-in 0.25s ease-out'
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
              sx={{ lineHeight: 1.7, fontSize: '0.9375rem', color: 'text.primary' }}
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
        {/* Sender label */}
        <Stack direction='row' spacing={0.75} alignItems='center' sx={{ mb: 1 }}>
          <CustomAvatar skin='light' color='primary' variant='circular' size={24}>
            <i className='tabler-sparkles' style={{ fontSize: '0.75rem' }} />
          </CustomAvatar>
          <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.secondary' }}>
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
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, maxWidth: 720, mx: 'auto', mt: 1, mb: 2, px: 2, ...msgInSx }}>
      {suggestions.map(suggestion => (
        <Box
          key={suggestion}
          onClick={() => {
            aui.thread().append({
              role: 'user',
              content: [{ type: 'text' as const, text: suggestion }]
            })
          }}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            px: 2,
            py: 1.5,
            cursor: 'pointer',
            maxWidth: 280,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            transition: 'all 0.15s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'primary.lighterOpacity'
            },
            '&:active': {
              transform: 'scale(0.98)'
            }
          }}
        >
          <i className='tabler-sparkles' style={{ fontSize: '0.875rem', color: 'var(--mui-palette-primary-main)', marginTop: 2, flexShrink: 0 }} />
          <Typography variant='body2' color='text.primary' sx={{ lineHeight: 1.5 }}>
            {suggestion}
          </Typography>
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
      <Stack direction='row' spacing={0.75} alignItems='center' sx={{ mb: 1 }}>
        <CustomAvatar skin='light' color='primary' variant='circular' size={24}>
          <i className='tabler-sparkles' style={{ fontSize: '0.75rem' }} />
        </CustomAvatar>
        <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.secondary' }}>
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
  const isRunning = useAuiState(s => s.thread.isRunning)

  return (
    <Box sx={{
      position: 'sticky',
      bottom: 0,
      bgcolor: 'background.default',
      borderTop: '1px solid',
      borderColor: 'divider',
      pt: 2.5,
      pb: 2,
      px: 1,
      maxWidth: 720,
      mx: 'auto',
      width: '100%'
    }}>
      <ComposerPrimitive.Root>
        <Box sx={{
          boxShadow: '0 1px 6px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
          borderRadius: '12px',
          bgcolor: 'background.paper',
          transition: 'box-shadow 0.15s ease',
          '&:focus-within': {
            boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0 0 2px var(--mui-palette-primary-main)'
          }
        }}>
          <ComposerPrimitive.Input asChild>
            <CustomTextField
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              placeholder='Pregunta sobre tu operacion...'
              autoComplete='off'
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  fontSize: '0.9375rem',
                  lineHeight: 1.6,
                  py: 0.5,
                  bgcolor: 'transparent',
                  '& fieldset': { border: 'none' }
                }
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end' sx={{ alignSelf: 'flex-end', mb: 0.5 }}>
                      {isRunning ? (
                        <ComposerPrimitive.Cancel asChild>
                          <IconButton
                            aria-label={TASK407_ARIA_DETENER_GENERACION}
                            sx={{
                              bgcolor: 'error.lighterOpacity',
                              color: 'error.main',
                              '&:hover': { bgcolor: 'error.lightOpacity' },
                              width: 36,
                              height: 36,
                              borderRadius: '50%'
                            }}
                          >
                            <i className='tabler-player-stop-filled' style={{ fontSize: '1.125rem' }} />
                          </IconButton>
                        </ComposerPrimitive.Cancel>
                      ) : (
                        <ComposerPrimitive.Send asChild>
                          <IconButton
                            color='primary'
                            sx={{
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              '&:hover': { bgcolor: 'primary.dark' },
                              '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
                              width: 36,
                              height: 36,
                              borderRadius: '50%'
                            }}
                          >
                            <i className='tabler-arrow-up' style={{ fontSize: '1.25rem' }} />
                          </IconButton>
                        </ComposerPrimitive.Send>
                      )}
                    </InputAdornment>
                  )
                }
              }}
            />
          </ComposerPrimitive.Input>
        </Box>
      </ComposerPrimitive.Root>
      <Typography variant='caption' color='text.disabled' sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
        Nexa puede cometer errores. Verifica la informacion.
      </Typography>
    </Box>
  )
}

/* ── Main thread ── */
const NexaThread = ({ onBack, selectedModel, onModelChange, compact, suggestions = [], onHistoryToggle }: NexaThreadProps) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: compact ? 'auto' : '60vh' }}>
    {/* Frosted header */}
    {!compact && (
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
          <Typography variant='subtitle2' sx={{ fontWeight: 600, color: 'text.primary' }}>
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
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 24
        }}
      >
        <ThreadPrimitive.Messages
          components={{ UserMessage, AssistantMessage }}
        />
        <ThinkingIndicator />
      </ThreadPrimitive.Viewport>

      <FollowupSuggestions suggestions={suggestions} />

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

      <ChatComposer />
    </ThreadPrimitive.Root>
  </Box>
)

export default NexaThread
