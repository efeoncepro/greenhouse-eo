'use client'

import '@assistant-ui/react-markdown/styles/dot.css'

import { useCallback, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
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

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'

import type { NexaModelId } from '@/config/nexa-models'

import NexaModelSelector from './NexaModelSelector'
import NexaToolRenderer from './NexaToolRenderers'

export interface NexaThreadProps {
  onBack?: () => void
  selectedModel: NexaModelId
  onModelChange: (model: NexaModelId) => void
  compact?: boolean
  suggestions?: string[]
  onHistoryToggle?: () => void
}

/* ── Animation keyframes ── */
const msgInSx = {
  '@keyframes nexa-msg-in': {
    '0%': { opacity: 0, transform: 'translateY(8px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' }
  },
  animation: 'nexa-msg-in 0.3s ease-out'
}

const TextPart = ({ text }: { text: string }) => (
  <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
)

/* ── User message with Edit inline (Slice A) ── */
const UserMessage = () => (
  <MessagePrimitive.Root>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5, ...msgInSx }}>
      <Box sx={{ maxWidth: '75%', position: 'relative' }}>
        {/* Content mode */}
        <Box sx={{
          px: 2.5,
          py: 1.5,
          borderRadius: '20px 20px 4px 20px',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
        }}>
          <Typography variant='body2' component='div' sx={{ lineHeight: 1.7 }}>
            <MessagePrimitive.Content components={{ Text: TextPart }} />
          </Typography>
        </Box>

        {/* Edit trigger (hover-only) */}
        <ActionBarPrimitive.Root
          autohide='always'
          style={{ position: 'absolute', bottom: -4, right: -4 }}
        >
          <ActionBarPrimitive.Edit asChild>
            <IconButton
              size='small'
              aria-label='Editar mensaje'
              sx={{
                width: 28,
                height: 28,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                boxShadow: 1,
                color: 'text.secondary',
                '&:hover': { color: 'primary.main', bgcolor: 'background.paper' }
              }}
            >
              <i className='tabler-pencil' style={{ fontSize: '0.8rem' }} />
            </IconButton>
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>

        {/* Edit mode (ComposerPrimitive inside MessagePrimitive.Root = EditComposer) */}
        <ComposerPrimitive.Root>
          <Box sx={{
            mt: 1,
            border: 2,
            borderColor: 'primary.main',
            borderRadius: '12px',
            overflow: 'hidden'
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
                    fontSize: '0.875rem',
                    '& fieldset': { border: 'none' }
                  }
                }}
              />
            </ComposerPrimitive.Input>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 1 }}>
              <ComposerPrimitive.Cancel asChild>
                <Button size='small' variant='outlined' color='secondary'>
                  Cancelar
                </Button>
              </ComposerPrimitive.Cancel>
              <ComposerPrimitive.Send asChild>
                <Button size='small' variant='contained'>
                  Guardar
                </Button>
              </ComposerPrimitive.Send>
            </Box>
          </Box>
        </ComposerPrimitive.Root>
      </Box>
    </Box>
  </MessagePrimitive.Root>
)

/* ── Feedback thumbs (Slice B) ── */
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
        aria-label='Respuesta util'
        aria-pressed={sentiment === 'positive'}
        onClick={() => handleFeedback('positive')}
        sx={{
          width: 28,
          height: 28,
          color: sentiment === 'positive' ? 'success.main' : 'text.secondary',
          opacity: sentiment === 'negative' ? 0.3 : 1,
          '&:hover': { color: 'success.main' },
          transition: 'all 0.15s ease'
        }}
      >
        <i className={sentiment === 'positive' ? 'tabler-thumb-up-filled' : 'tabler-thumb-up'} style={{ fontSize: '0.875rem' }} />
      </IconButton>
      <IconButton
        size='small'
        aria-label='Respuesta no util'
        aria-pressed={sentiment === 'negative'}
        onClick={() => handleFeedback('negative')}
        sx={{
          width: 28,
          height: 28,
          color: sentiment === 'negative' ? 'error.main' : 'text.secondary',
          opacity: sentiment === 'positive' ? 0.3 : 1,
          '&:hover': { color: 'error.main' },
          transition: 'all 0.15s ease'
        }}
      >
        <i className={sentiment === 'negative' ? 'tabler-thumb-down-filled' : 'tabler-thumb-down'} style={{ fontSize: '0.875rem' }} />
      </IconButton>
    </>
  )
}

/* ── Assistant message with ActionBar + Feedback ── */
const AssistantMessage = () => {
  const messageId = useAuiState(s => {
    const msgs = s.thread.messages

    const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant')

    return lastAssistant?.id ?? 'unknown'
  })

  return (
    <MessagePrimitive.Root>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, ...msgInSx }}>
        <CustomAvatar skin='light' color='primary' variant='rounded' sx={{ width: 32, height: 32, mt: 0.5, flexShrink: 0 }}>
          <i className='tabler-sparkles' style={{ fontSize: '1rem' }} />
        </CustomAvatar>
        <Box sx={{ maxWidth: '80%' }}>
          <Box sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: '4px 20px 20px 20px',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            '& .aui-md': {
              fontSize: '0.875rem',
              lineHeight: 1.7,
              '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
              '& ul, & ol': { my: 1, pl: 2.5, '& li': { mb: 0.5 } },
              '& strong': { fontWeight: 600 },
              '& code': {
                fontSize: '0.8rem',
                bgcolor: 'action.selected',
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                fontFamily: 'monospace'
              },
              '& pre': {
                bgcolor: 'action.hover',
                p: 1.5,
                borderRadius: 1,
                overflow: 'auto',
                my: 1,
                '& code': { bgcolor: 'transparent', p: 0 }
              },
              '& a': { color: 'primary.main', textDecoration: 'underline' }
            }
          }}>
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
              borderRadius: 1.5,
              bgcolor: 'error.lighterOpacity',
              border: 1,
              borderColor: 'error.main',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}>
              <i className='tabler-alert-circle' style={{ fontSize: '1rem', color: 'inherit', flexShrink: 0 }} />
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

          {/* ActionBar: Copy + Reload + Feedback */}
          <ActionBarPrimitive.Root
            hideWhenRunning
            autohide='not-last'
            style={{ display: 'flex', gap: 4, marginTop: 6 }}
          >
            <ActionBarPrimitive.Copy asChild>
              <IconButton
                size='small'
                aria-label='Copiar respuesta'
                sx={{
                  width: 28,
                  height: 28,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' },
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
                aria-label='Regenerar respuesta'
                sx={{ width: 28, height: 28, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              >
                <i className='tabler-refresh' style={{ fontSize: '0.875rem' }} />
              </IconButton>
            </ActionBarPrimitive.Reload>
            <FeedbackThumbs messageId={messageId} />
          </ActionBarPrimitive.Root>
        </Box>
      </Box>
    </MessagePrimitive.Root>
  )
}

/* ── Follow-up suggestions (Slice B) ── */
const FollowupSuggestions = ({ suggestions }: { suggestions: string[] }) => {
  const aui = useAui()
  const isRunning = useAuiState(s => s.thread.isRunning)

  if (isRunning || suggestions.length === 0) return null

  return (
    <Box sx={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 1,
      maxWidth: 720,
      mx: 'auto',
      mt: 1,
      mb: 2,
      px: 1.5,
      ...msgInSx
    }}>
      {suggestions.map(suggestion => (
        <Chip
          key={suggestion}
          label={suggestion}
          size='small'
          variant='outlined'
          onClick={() => {
            aui.thread().append({
              role: 'user',
              content: [{ type: 'text' as const, text: suggestion }]
            })
          }}
          sx={{
            borderRadius: '20px',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'primary.lighterOpacity' }
          }}
        />
      ))}
    </Box>
  )
}

/* ── Thinking indicator ── */
const ThinkingIndicator = () => {
  const isRunning = useAuiState(s => s.thread.isRunning)

  if (!isRunning) return null

  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
      <CustomAvatar skin='light' color='primary' variant='rounded' sx={{ width: 32, height: 32, flexShrink: 0 }}>
        <i className='tabler-sparkles' style={{ fontSize: '1rem' }} />
      </CustomAvatar>
      <Box sx={{
        px: 2.5,
        py: 2,
        borderRadius: '4px 20px 20px 20px',
        border: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 0.75
      }}>
        {[0, 1, 2].map(i => (
          <Box
            key={i}
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              opacity: 0.4,
              animation: 'nexa-dot 1.4s infinite ease-in-out',
              animationDelay: `${i * 0.16}s`,
              '@keyframes nexa-dot': {
                '0%, 80%, 100%': { opacity: 0.3, transform: 'scale(0.85)' },
                '40%': { opacity: 1, transform: 'scale(1.1)' }
              }
            }}
          />
        ))}
      </Box>
    </Box>
  )
}

/* ── Composer with Send ↔ Cancel toggle ── */
const ChatComposer = () => {
  const isRunning = useAuiState(s => s.thread.isRunning)

  return (
    <Box sx={{
      position: 'sticky',
      bottom: 0,
      bgcolor: 'background.default',
      pt: 2,
      pb: 1,
      maxWidth: 720,
      mx: 'auto',
      width: '100%'
    }}>
      <ComposerPrimitive.Root>
        <ComposerPrimitive.Input asChild>
          <CustomTextField
            fullWidth
            placeholder='Escribe tu siguiente pregunta...'
            autoComplete='off'
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
                fontSize: '1rem',
                py: 0.5,
                bgcolor: 'background.paper',
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderWidth: 2,
                  borderColor: 'primary.main'
                }
              }
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position='end'>
                    {isRunning ? (
                      <ComposerPrimitive.Cancel asChild>
                        <IconButton
                          aria-label='Detener generacion'
                          sx={{
                            bgcolor: 'error.lighterOpacity',
                            color: 'error.main',
                            '&:hover': { bgcolor: 'error.lightOpacity' },
                            width: 36,
                            height: 36
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
                            height: 36
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
      </ComposerPrimitive.Root>
    </Box>
  )
}

/* ── Main thread ── */
const NexaThread = ({ onBack, selectedModel, onModelChange, compact, suggestions = [], onHistoryToggle }: NexaThreadProps) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: compact ? 'auto' : '60vh' }}>
    {/* Header (hidden in compact mode) */}
    {!compact && (
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        maxWidth: 720,
        mx: 'auto',
        width: '100%',
        px: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {onHistoryToggle ? (
            <IconButton
              size='small'
              aria-label='Historial de conversaciones'
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
              aria-label='Volver al inicio de Nexa'
            >
              Inicio
            </Button>
          ) : null}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CustomAvatar skin='light' color='primary' variant='rounded' sx={{ width: 24, height: 24 }}>
            <i className='tabler-sparkles' style={{ fontSize: '0.75rem' }} />
          </CustomAvatar>
          <Typography variant='subtitle2' color='text.secondary'>Nexa AI</Typography>
        </Box>
        <NexaModelSelector compact selectedModel={selectedModel} onChange={onModelChange} />
      </Box>
    )}

    {/* Thread with ScrollToBottom */}
    <ThreadPrimitive.Root style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
      <ThreadPrimitive.Viewport
        style={{
          flex: 1,
          overflowY: 'auto',
          maxWidth: compact ? undefined : 720,
          margin: '0 auto',
          width: '100%',
          paddingLeft: 12,
          paddingRight: 12
        }}
      >
        <ThreadPrimitive.Messages
          components={{ UserMessage, AssistantMessage }}
        />
        <ThinkingIndicator />
      </ThreadPrimitive.Viewport>

      {/* Follow-up suggestions */}
      <FollowupSuggestions suggestions={suggestions} />

      {/* Floating scroll-to-bottom */}
      <ThreadPrimitive.ScrollToBottom asChild>
        <IconButton
          aria-label='Ir al final'
          sx={{
            position: 'absolute',
            bottom: 80,
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
