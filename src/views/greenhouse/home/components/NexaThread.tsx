'use client'

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
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
      <Box sx={{
        maxWidth: '80%',
        px: 2.5,
        py: 1.5,
        borderRadius: '16px 4px 16px 16px',
        bgcolor: 'primary.main',
        color: 'primary.contrastText'
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
    <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1.5, mb: 2 }}>
      <CustomAvatar skin='light' color='primary' variant='rounded' sx={{ width: 28, height: 28, mt: 0.5, flexShrink: 0 }}>
        <i className='tabler-sparkles' style={{ fontSize: '0.875rem' }} />
      </CustomAvatar>
      <Box sx={{
        maxWidth: '80%',
        px: 2.5,
        py: 1.5,
        borderRadius: '4px 16px 16px 16px',
        border: 1,
        borderColor: 'divider',
        '& p': { m: 0 },
        '& ul, & ol': { my: 0.5, pl: 2 },
        '& code': { fontSize: '0.75rem', bgcolor: 'action.selected', px: 0.5, borderRadius: 0.5 }
      }}>
        <Typography variant='body2' component='div' sx={{ lineHeight: 1.7 }}>
          <MessagePrimitive.Content components={{ Text: TextPart }} />
        </Typography>
      </Box>
    </Box>
  </MessagePrimitive.Root>
)

const ThinkingIndicator = () => {
  const isRunning = useAuiState(s => s.thread.isRunning)

  if (!isRunning) return null

  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
      <CustomAvatar skin='light' color='primary' variant='rounded' sx={{ width: 28, height: 28, flexShrink: 0 }}>
        <i className='tabler-sparkles' style={{ fontSize: '0.875rem' }} />
      </CustomAvatar>
      <Box sx={{
        px: 2.5,
        py: 1.5,
        borderRadius: '4px 16px 16px 16px',
        border: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5
      }}>
        {[0, 1, 2].map(i => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'text.disabled',
              animation: 'pulse 1.4s infinite ease-in-out',
              animationDelay: `${i * 0.2}s`,
              '@keyframes pulse': {
                '0%, 80%, 100%': { opacity: 0.3, transform: 'scale(0.8)' },
                '40%': { opacity: 1, transform: 'scale(1)' }
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
    <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', py: 2, maxWidth: 720, mx: 'auto', width: '100%' }}>
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
                          '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
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
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, maxWidth: 720, mx: 'auto', width: '100%', px: 1 }}>
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
        style={{ flex: 1, overflowY: 'auto', maxWidth: 720, margin: '0 auto', width: '100%', paddingLeft: 8, paddingRight: 8 }}
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
