'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import { usePathname } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Fab from '@mui/material/Fab'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import Drawer from '@mui/material/Drawer'

import {
  AssistantRuntimeProvider,
  useLocalRuntime
} from '@assistant-ui/react'
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react'
import type { ReadonlyJSONObject, ReadonlyJSONValue } from 'assistant-stream/utils'

import { DEFAULT_NEXA_MODEL, resolveNexaModel, type NexaModelId } from '@/config/nexa-models'
import type { NexaResponse } from '@/lib/nexa/nexa-contract'

import NexaThread from '@/views/greenhouse/home/components/NexaThread'

const TASK407_ARIA_CERRAR_NEXA = "Cerrar Nexa"
const TASK407_ARIA_ABRIR_NEXA_AI = "Abrir Nexa AI"


const toJsonValue = (value: unknown): ReadonlyJSONValue => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value

  if (Array.isArray(value)) return value.map(item => toJsonValue(item))

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toJsonValue(v)])) as ReadonlyJSONObject
  }

  return null
}

const createFloatingAdapter = (modelRef: React.MutableRefObject<NexaModelId>): ChatModelAdapter => ({
  async run({ messages, abortSignal }): Promise<ChatModelRunResult> {
    const lastMessage = messages[messages.length - 1]

    const prompt = lastMessage?.content
      ?.filter(p => p.type === 'text')
      .map(p => (p as { type: 'text'; text: string }).text)
      .join('') ?? ''

    const history = messages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content?.filter(p => p.type === 'text').map(p => (p as { type: 'text'; text: string }).text).join('') ?? ''
    }))

    const res = await fetch('/api/home/nexa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history, model: modelRef.current }),
      signal: abortSignal
    })

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null)

      throw new Error(errorBody?.error || `Error ${res.status}`)
    }

    const data = await res.json() as NexaResponse

    const toolParts = (data.toolInvocations || []).map(inv => ({
      type: 'tool-call' as const,
      toolCallId: inv.toolCallId,
      toolName: inv.toolName,
      args: toJsonValue(inv.args) as ReadonlyJSONObject,
      argsText: JSON.stringify(inv.args ?? {}),
      result: toJsonValue(inv.result)
    }))

    return {
      content: [...toolParts, { type: 'text' as const, text: data.content || '' }]
    }
  }
})

const NexaFloatingButton = () => {
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [open, setOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<NexaModelId>(DEFAULT_NEXA_MODEL)
  const modelRef = useRef<NexaModelId>(DEFAULT_NEXA_MODEL)

  const handleModelChange = useCallback((model: NexaModelId) => {
    const resolved = resolveNexaModel({ requestedModel: model })

    setSelectedModel(resolved)
    modelRef.current = resolved
  }, [])

  const adapter = useMemo(() => createFloatingAdapter(modelRef), [])

  const runtime = useLocalRuntime(adapter, {
    initialMessages: [
      { role: 'assistant', content: [{ type: 'text' as const, text: 'Hola, soy Nexa. ¿En que puedo ayudarte?' }] }
    ]
  })

  // Hide on /home (Nexa is inline there)
  if (pathname === '/home') return null

  const panelContent = (
    <AssistantRuntimeProvider runtime={runtime}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mini header */}
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction='row' spacing={1} alignItems='center'>
            <i className='tabler-sparkles' style={{ fontSize: '1rem', color: theme.palette.primary.main }} />
            <Typography variant='subtitle2'>Nexa AI</Typography>
          </Stack>
          <IconButton size='small' onClick={() => setOpen(false)} aria-label={TASK407_ARIA_CERRAR_NEXA}>
            <i className='tabler-x' style={{ fontSize: '1rem' }} />
          </IconButton>
        </Stack>

        {/* Thread */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <NexaThread
            compact
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
          />
        </Box>
      </Card>
    </AssistantRuntimeProvider>
  )

  return (
    <>
      {/* FAB trigger */}
      <Fab
        color='primary'
        size='medium'
        aria-label={TASK407_ARIA_ABRIR_NEXA_AI}
        aria-expanded={open}
        onClick={() => setOpen(prev => !prev)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: theme.zIndex.speedDial,
          boxShadow: open ? 'none' : 6
        }}
      >
        <i className={open ? 'tabler-x' : 'tabler-sparkles'} style={{ fontSize: '1.25rem' }} />
      </Fab>

      {/* Panel: Drawer on mobile, positioned Card on desktop */}
      {isMobile ? (
        <Drawer
          anchor='bottom'
          open={open}
          onClose={() => setOpen(false)}
          PaperProps={{ sx: { height: '85vh', borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}
        >
          {panelContent}
        </Drawer>
      ) : (
        <Fade in={open}>
          <Box
            sx={{
              position: 'fixed',
              bottom: 88,
              right: 24,
              width: 400,
              height: 550,
              zIndex: theme.zIndex.speedDial - 1,
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: 24
            }}
          >
            {panelContent}
          </Box>
        </Fade>
      )}
    </>
  )
}

export default NexaFloatingButton
