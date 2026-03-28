'use client'

import { useState, useRef, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Fade from '@mui/material/Fade'

import CustomAvatar from '@core/components/mui/Avatar'

import { NEXA_SUGGESTIONS } from '@/config/home-suggestions'
import type { NexaMessage } from '@/types/home'

interface Props {
  initialMessage: string
}

const NexaPanel = ({ initialMessage }: Props) => {
  const [messages, setMessages] = useState<NexaMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: initialMessage,
      timestamp: new Date().toISOString()
    }
  ])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return

    const userMsg: NexaMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const recentHistory = messages.slice(-10)

      const response = await fetch('/api/home/nexa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, history: recentHistory }),
        signal: AbortSignal.timeout(15000)
      })

      if (!response.ok) throw new Error('Failed to chat')

      const data: NexaMessage = await response.json()

      setMessages(prev => [...prev, data])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Puedes intentar de nuevo?',
          timestamp: new Date().toISOString()
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className='flex flex-col h-full min-bs-[450px] shadow-lg border border-primary-100 dark:border-primary-900/20'>
      <CardHeader
        title={
          <Box className='flex items-center gap-2'>
            <CustomAvatar skin='light' color='primary' variant='rounded' className='bs-[36px] is-[36px]'>
              <i className='tabler-robot text-xl' />
            </CustomAvatar>
            <Box>
              <Typography variant='h6' className='font-bold'>Nexa AI</Typography>
              <Typography variant='caption' className='text-success-main'>En línea • Operating Assistant</Typography>
            </Box>
          </Box>
        }
      />
      <CardContent className='flex-1 flex flex-col gap-4 overflow-hidden'>
        {/* Chat Log */}
        <Box className='flex-1 overflow-y-auto pr-2 space-y-4 scroll-smooth'>
          {messages.map((msg) => (
            <Fade key={msg.id} in={true}>
              <Box className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <Box
                  className={`max-w-[85%] p-3 rounded-xl ${
                    msg.role === 'user'
                      ? 'bg-primary-main text-white rounded-tr-none'
                      : 'bg-actionHover text-text-primary rounded-tl-none border border-divider'
                  }`}
                >
                  <Typography variant='body2' className='leading-relaxed'>
                    {msg.content}
                  </Typography>
                </Box>
              </Box>
            </Fade>
          ))}
          {isLoading && (
            <Box className='flex justify-start'>
              <Box className='bg-actionHover p-3 rounded-xl rounded-tl-none border border-divider flex items-center gap-2'>
                <CircularProgress size={16} color='primary' />
                <Typography variant='caption'>Nexa está pensando...</Typography>
              </Box>
            </Box>
          )}
          <div ref={chatEndRef} />
        </Box>

        {/* Suggestions */}
        <Box className='flex flex-wrap gap-2'>
          {NEXA_SUGGESTIONS.slice(0, 3).map((suggestion, i) => (
            <Chip
              key={i}
              label={suggestion}
              size='small'
              variant='outlined'
              onClick={() => handleSend(suggestion)}
              disabled={isLoading}
              className='cursor-pointer hover:bg-primary-light transition-colors'
            />
          ))}
        </Box>

        {/* Input */}
        <TextField
          fullWidth
          size='small'
          placeholder='Pregunta algo sobre tu operación...'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className='mt-2'
          autoComplete='off'
          InputProps={{
            endAdornment: (
              <InputAdornment position='end'>
                <IconButton
                  color='primary'
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className='bg-primary-main text-white hover:bg-primary-dark p-1.5'
                >
                  {isLoading ? <CircularProgress size={20} color='inherit' /> : <i className='tabler-send text-lg' />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </CardContent>
    </Card>
  )
}

export default NexaPanel
