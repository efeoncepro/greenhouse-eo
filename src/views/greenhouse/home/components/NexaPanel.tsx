'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useAuiState,
  useAui,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive
} from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react'

import { NEXA_SUGGESTIONS } from '@/config/home-suggestions'

interface Props {
  initialMessage: string
}

const nexaAdapter: ChatModelAdapter = {
  async run({ messages, abortSignal }): Promise<ChatModelRunResult> {
    const lastMessage = messages[messages.length - 1]
    const prompt = lastMessage?.content
      ?.filter(part => part.type === 'text')
      .map(part => (part as { type: 'text'; text: string }).text)
      .join('') ?? ''

    const history = messages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
        ?.filter(part => part.type === 'text')
        .map(part => (part as { type: 'text'; text: string }).text)
        .join('') ?? ''
    }))

    const res = await fetch('/api/home/nexa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history }),
      signal: abortSignal
    })

    if (!res.ok) throw new Error('Failed to get Nexa response')

    const data = await res.json()

    return {
      content: [{ type: 'text' as const, text: data.content || 'No pude procesar tu solicitud.' }]
    }
  }
}

// ── Custom message bubbles ─────────────────────────────────────

const UserMessage = () => (
  <Box className='flex justify-end mb-3'>
    <Box className='max-w-[85%] p-3 rounded-xl rounded-tr-none bg-primary text-white'>
      <Typography variant='body2' component='div' className='leading-relaxed'>
        <MessagePrimitive.Content
          components={{
            Text: ({ text }: { text: string }) => <span>{text}</span>
          }}
        />
      </Typography>
    </Box>
  </Box>
)

const AssistantMessage = () => (
  <Box className='flex justify-start mb-3'>
    <Box className='max-w-[85%] p-3 rounded-xl rounded-tl-none bg-actionHover text-text-primary border border-divider'>
      <Typography variant='body2' component='div' className='leading-relaxed [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:ml-4 [&_code]:text-xs [&_code]:bg-action-selected [&_code]:px-1 [&_code]:rounded'>
        <MessagePrimitive.Content
          components={{
            Text: MarkdownTextPrimitive as any
          }}
        />
      </Typography>
    </Box>
  </Box>
)

// ── Loading indicator ──────────────────────────────────────────

const LoadingIndicator = () => {
  const isRunning = useAuiState(s => s.thread.isRunning)

  if (!isRunning) return null

  return (
    <Box className='flex justify-start mb-3'>
      <Box className='bg-actionHover p-3 rounded-xl rounded-tl-none border border-divider flex items-center gap-2'>
        <CircularProgress size={16} color='primary' />
        <Typography variant='caption'>Nexa está pensando...</Typography>
      </Box>
    </Box>
  )
}

// ── Suggestion chips ───────────────────────────────────────────

const SuggestionChips = () => {
  const isRunning = useAuiState(s => s.thread.isRunning)
  const aui = useAui()

  const handleSuggestion = (text: string) => {
    aui.thread().append({
      role: 'user',
      content: [{ type: 'text' as const, text }]
    })
  }

  return (
    <Box className='flex flex-wrap gap-2'>
      {NEXA_SUGGESTIONS.slice(0, 3).map((suggestion, i) => (
        <Chip
          key={i}
          label={suggestion}
          size='small'
          variant='outlined'
          onClick={() => handleSuggestion(suggestion)}
          disabled={isRunning}
          className='cursor-pointer hover:bg-primary-light transition-colors'
        />
      ))}
    </Box>
  )
}

// ── Composer (input area) ──────────────────────────────────────

const NexaComposer = () => {
  const isRunning = useAuiState(s => s.thread.isRunning)

  return (
    <ComposerPrimitive.Root>
      <ComposerPrimitive.Input asChild>
        <TextField
          fullWidth
          size='small'
          placeholder='Pregunta algo sobre tu operación...'
          autoComplete='off'
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position='end'>
                  <ComposerPrimitive.Send asChild>
                    <IconButton
                      color='primary'
                      className='bg-primary-main text-white hover:bg-primary-dark p-1.5'
                      disabled={isRunning}
                    >
                      {isRunning
                        ? <CircularProgress size={20} color='inherit' />
                        : <i className='tabler-send text-lg' />}
                    </IconButton>
                  </ComposerPrimitive.Send>
                </InputAdornment>
              )
            }
          }}
        />
      </ComposerPrimitive.Input>
    </ComposerPrimitive.Root>
  )
}

// ── Main Thread ────────────────────────────────────────────────

const NexaThread = () => (
  <ThreadPrimitive.Root className='flex flex-col h-full'>
    <ThreadPrimitive.Viewport className='flex-1 overflow-y-auto pr-2 scroll-smooth'>
      <ThreadPrimitive.Messages
        components={{
          UserMessage,
          AssistantMessage
        }}
      />
      <LoadingIndicator />
    </ThreadPrimitive.Viewport>

    <Box className='flex flex-col gap-3 mt-3'>
      <SuggestionChips />
      <NexaComposer />
    </Box>
  </ThreadPrimitive.Root>
)

// ── Panel wrapper ──────────────────────────────────────────────

const NexaPanel = ({ initialMessage }: Props) => {
  const runtime = useLocalRuntime(nexaAdapter, {
    initialMessages: [
      {
        role: 'assistant',
        content: [{ type: 'text' as const, text: initialMessage }]
      }
    ]
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Card className='flex flex-col h-full min-bs-[450px] shadow-lg border border-primary-100 dark:border-primary-900/20'>
        <CardHeader
          title={
            <Box className='flex items-center gap-2'>
              <CustomAvatar skin='light' color='primary' variant='rounded' className='bs-[36px] is-[36px]'>
                <i className='tabler-robot text-xl' />
              </CustomAvatar>
              <Box>
                <Typography variant='h6' className='font-bold'>Nexa AI</Typography>
                <Typography variant='caption' className='text-success-main'>En línea · Operating Assistant</Typography>
              </Box>
            </Box>
          }
        />
        <CardContent className='flex-1 flex flex-col overflow-hidden'>
          <NexaThread />
        </CardContent>
      </Card>
    </AssistantRuntimeProvider>
  )
}

export default NexaPanel
