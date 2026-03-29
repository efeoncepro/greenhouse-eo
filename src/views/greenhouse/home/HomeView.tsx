'use client'

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type MutableRefObject, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Fade from '@mui/material/Fade'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useAuiState
} from '@assistant-ui/react'
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react'
import type { ReadonlyJSONObject, ReadonlyJSONValue } from 'assistant-stream/utils'

import NexaHero from './components/NexaHero'
import NexaThread from './components/NexaThread'
import NexaThreadSidebar from './components/NexaThreadSidebar'
import QuickAccess from './components/QuickAccess'
import OperationStatus, { type StatusItem } from './components/OperationStatus'

import { DEFAULT_NEXA_MODEL, resolveNexaModel, type NexaModelId } from '@/config/nexa-models'
import type { NexaResponse } from '@/lib/nexa/nexa-contract'
import type { HomeSnapshot } from '@/types/home'

const SNAPSHOT_TIMEOUT_MS = 5000
const NEXA_MODEL_STORAGE_KEY = 'greenhouse:nexa:model'

// ── Nexa adapter ───────────────────────────────────────────────

const toJsonValue = (value: unknown): ReadonlyJSONValue => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(item => toJsonValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonValue(item)])
    ) as ReadonlyJSONObject
  }

  return null
}

type AdapterRefs = {
  selectedModelRef: MutableRefObject<NexaModelId>
  threadIdRef: MutableRefObject<string | null>
  onSuggestionsChange: (suggestions: string[]) => void
  onThreadIdChange: (threadId: string) => void
}

const createNexaAdapter = (refs: AdapterRefs): ChatModelAdapter => ({
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

    let res: Response

    try {
      res = await fetch('/api/home/nexa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history,
          model: refs.selectedModelRef.current,
          threadId: refs.threadIdRef.current
        }),
        signal: abortSignal
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err

      throw new Error('No pude conectarme con Nexa. Verifica tu conexion e intenta de nuevo.')
    }

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null)

      throw new Error(errorBody?.error || `Error ${res.status}: no se pudo procesar tu mensaje.`)
    }

    const data = await res.json() as NexaResponse

    // Track threadId from response
    if (data.threadId) {
      refs.threadIdRef.current = data.threadId
      refs.onThreadIdChange(data.threadId)
    }

    // Track suggestions from response
    refs.onSuggestionsChange(data.suggestions ?? [])

    const toolParts = (data.toolInvocations || []).map(invocation => ({
      type: 'tool-call' as const,
      toolCallId: invocation.toolCallId,
      toolName: invocation.toolName,
      args: toJsonValue(invocation.args) as ReadonlyJSONObject,
      argsText: JSON.stringify(invocation.args ?? {}),
      result: toJsonValue(invocation.result)
    }))

    return {
      content: [
        ...toolParts,
        { type: 'text' as const, text: data.content || '' }
      ]
    }
  }
})

// ── Error boundary ─────────────────────────────────────────────

class NexaBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[NexaBoundary] crashed:', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
          <i className='tabler-robot-off' style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }} />
          <Typography variant='body1'>Nexa no esta disponible en este momento.</Typography>
        </Box>
      )
    }

    return this.props.children
  }
}

// ── Skeleton ───────────────────────────────────────────────────

const HomeViewSkeleton = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 3, px: 3 }}>
    <Skeleton variant='rounded' width={56} height={56} sx={{ borderRadius: 3 }} />
    <Skeleton width={300} height={40} />
    <Skeleton width={260} height={24} />
    <Skeleton variant='rounded' width='100%' height={56} sx={{ maxWidth: 720, borderRadius: 4 }} />
    <Box sx={{ display: 'flex', gap: 1 }}>
      {[1, 2, 3, 4].map(i => <Skeleton key={i} variant='rounded' width={140} height={32} sx={{ borderRadius: 5 }} />)}
    </Box>
  </Box>
)

// ── Chat state detector ────────────────────────────────────────

const INITIAL_MESSAGE_COUNT = 1

const HomeContent = ({
  snapshot,
  operationItems,
  selectedModel,
  onModelChange,
  suggestions,
  threadId,
  onSelectThread,
  onNewThread
}: {
  snapshot: HomeSnapshot
  operationItems: StatusItem[]
  selectedModel: NexaModelId
  onModelChange: (model: NexaModelId) => void
  suggestions: string[]
  threadId: string | null
  onSelectThread: (threadId: string) => void
  onNewThread: () => void
}) => {
  const messageCount = useAuiState(s => s.thread.messages.length)
  const isChatActive = messageCount > INITIAL_MESSAGE_COUNT

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleBack = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <>
      <NexaThreadSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeThreadId={threadId}
        onSelectThread={onSelectThread}
        onNewThread={onNewThread}
      />

      {/* Landing state */}
      {!isChatActive && (
        <Fade in timeout={400}>
          <Box>
            <NexaHero greeting={snapshot.greeting.title} selectedModel={selectedModel} onModelChange={onModelChange} />
            <Box sx={{ maxWidth: 720, mx: 'auto', px: 3, mt: 4, pb: 6 }}>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <QuickAccess modules={snapshot.modules} />
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <OperationStatus items={operationItems} />
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Fade>
      )}

      {/* Chat state */}
      {isChatActive && (
        <Fade in timeout={400}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <NexaThread
              onBack={handleBack}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              suggestions={suggestions}
              onHistoryToggle={() => setSidebarOpen(true)}
            />
          </Box>
        </Fade>
      )}
    </>
  )
}

// ── Main view ──────────────────────────────────────────────────

const HomeView = () => {
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<NexaModelId>(DEFAULT_NEXA_MODEL)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)

  const selectedModelRef = useRef<NexaModelId>(DEFAULT_NEXA_MODEL)
  const threadIdRef = useRef<string | null>(null)

  useEffect(() => {
    const storedModel = typeof window !== 'undefined' ? window.localStorage.getItem(NEXA_MODEL_STORAGE_KEY) : null

    const resolved = resolveNexaModel({ requestedModel: storedModel })

    setSelectedModel(resolved)
    selectedModelRef.current = resolved
  }, [])

  const handleModelChange = useCallback((model: NexaModelId) => {
    const resolved = resolveNexaModel({ requestedModel: model })

    setSelectedModel(resolved)
    selectedModelRef.current = resolved
    window.localStorage.setItem(NEXA_MODEL_STORAGE_KEY, resolved)
  }, [])

  const handleThreadIdChange = useCallback((id: string) => {
    setThreadId(id)
    threadIdRef.current = id
  }, [])

  const handleSelectThread = useCallback(async (selectedThreadId: string) => {
    // For now, navigate to reload with the thread — full thread loading requires
    // resetting the LocalRuntime which isn't cleanly supported. Reload with param.
    threadIdRef.current = selectedThreadId
    setThreadId(selectedThreadId)
    window.location.href = `/home?thread=${selectedThreadId}`
  }, [])

  const handleNewThread = useCallback(() => {
    threadIdRef.current = null
    setThreadId(null)
    window.location.href = '/home'
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), SNAPSHOT_TIMEOUT_MS)

    const fetchSnapshot = async () => {
      try {
        const res = await fetch('/api/home/snapshot', { signal: controller.signal })

        if (!res.ok) throw new Error('Failed to load snapshot')

        setSnapshot(await res.json())
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setSnapshot(null)
          setError(null)
        } else {
          setError('Ocurrio un error al cargar tu centro de mando. Por favor, intenta de nuevo.')
        }
      } finally {
        clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    fetchSnapshot()

    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [])

  const greeting = snapshot?.greeting ?? { title: 'Bienvenido a Greenhouse', subtitle: 'Tu centro de mando operativo.' }
  const modules = snapshot?.modules ?? []
  const nexaIntro = snapshot?.nexaIntro ?? 'Hola, soy Nexa. ¿En que puedo ayudarte hoy?'

  const operationItems = useMemo((): StatusItem[] => {
    return [
      { label: 'Nomina del mes', value: 'Sin datos', status: 'secondary', icon: 'tabler-file-invoice' },
      { label: 'OTD global', value: 'Sin datos', status: 'secondary', icon: 'tabler-target' },
      { label: 'Correos fallidos', value: '0', status: 'success', icon: 'tabler-mail-check' }
    ]
  }, [])

  const nexaAdapter = useMemo(() => createNexaAdapter({
    selectedModelRef,
    threadIdRef,
    onSuggestionsChange: setSuggestions,
    onThreadIdChange: handleThreadIdChange
  }), [handleThreadIdChange])

  const runtime = useLocalRuntime(nexaAdapter, {
    initialMessages: [
      { role: 'assistant', content: [{ type: 'text' as const, text: nexaIntro }] }
    ]
  })

  if (loading) return <HomeViewSkeleton />

  if (error && !snapshot) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 6, textAlign: 'center', gap: 2 }}>
        <i className='tabler-alert-triangle' style={{ fontSize: '3rem', color: 'var(--mui-palette-warning-main)' }} />
        <Typography variant='h6'>{error}</Typography>
      </Box>
    )
  }

  const effectiveSnapshot: HomeSnapshot = snapshot ?? {
    user: { firstName: 'Usuario', lastName: null, role: '' },
    greeting,
    modules,
    tasks: [],
    nexaIntro,
    computedAt: new Date().toISOString()
  }

  return (
    <NexaBoundary>
      <AssistantRuntimeProvider runtime={runtime}>
        <HomeContent
          snapshot={effectiveSnapshot}
          operationItems={operationItems}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          suggestions={suggestions}
          threadId={threadId}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
        />
      </AssistantRuntimeProvider>
    </NexaBoundary>
  )
}

export default HomeView
