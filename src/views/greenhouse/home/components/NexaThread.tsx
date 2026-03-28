'use client'

import '@assistant-ui/react-markdown/styles/dot.css'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'

import {
  useAuiState,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive
} from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'

interface Props {
  onBack: () => void
}

const TextPart = ({ text }: { text: string }) => (
  <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
)

const UserMessage = () => (
  <MessagePrimitive.Root>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5 }}>
      <Box sx={{
        maxWidth: '75%',
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
    </Box>
  </MessagePrimitive.Root>
)

const AssistantMessage = () => (
  <MessagePrimitive.Root>
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
      <CustomAvatar skin='light' color='primary' variant='rounded' sx={{ width: 32, height: 32, mt: 0.5, flexShrink: 0 }}>
        <i className='tabler-sparkles' style={{ fontSize: '1rem' }} />
      </CustomAvatar>
      <Box sx={{
        maxWidth: '80%',
        px: 2.5,
        py: 1.5,
        borderRadius: '4px 20px 20px 20px',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        // Markdown prose styles
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
            Text: MarkdownTextPrimitive as any
          }}
        />
      </Box>
    </Box>
  </MessagePrimitive.Root>
)

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
                    <ComposerPrimitive.Send asChild>
                      <IconButton
                        color='primary'
                        disabled={isRunning}
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

const NexaThread = ({ onBack }: Props) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '60vh' }}>
    {/* Header */}
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
      <Button
        startIcon={<i className='tabler-arrow-left' />}
        onClick={onBack}
        size='small'
        color='secondary'
        aria-label='Volver al inicio de Nexa'
      >
        Inicio
      </Button>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CustomAvatar skin='light' color='primary' variant='rounded' sx={{ width: 24, height: 24 }}>
          <i className='tabler-sparkles' style={{ fontSize: '0.75rem' }} />
        </CustomAvatar>
        <Typography variant='subtitle2' color='text.secondary'>Nexa AI</Typography>
      </Box>
    </Box>

    {/* Thread */}
    <ThreadPrimitive.Root style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <ThreadPrimitive.Viewport
        style={{
          flex: 1,
          overflowY: 'auto',
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
          paddingLeft: 12,
          paddingRight: 12
        }}
      >
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage
          }}
        />
        <ThinkingIndicator />
      </ThreadPrimitive.Viewport>

      <ChatComposer />
    </ThreadPrimitive.Root>
  </Box>
)

export default NexaThread
