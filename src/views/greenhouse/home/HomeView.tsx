'use client'

import { Component, useCallback, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Fade from '@mui/material/Fade'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useAui,
  useAuiState
} from '@assistant-ui/react'
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react'

import NexaHero from './components/NexaHero'
import NexaThread from './components/NexaThread'
import QuickAccess from './components/QuickAccess'
import OperationStatus, { type StatusItem } from './components/OperationStatus'

import type { HomeSnapshot } from '@/types/home'

const SNAPSHOT_TIMEOUT_MS = 5000

// ── Nexa adapter ───────────────────────────────────────────────

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
          <Typography variant='body1'>Nexa no está disponible en este momento.</Typography>
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

const HomeContent = ({ snapshot, operationItems }: { snapshot: HomeSnapshot; operationItems: StatusItem[] }) => {
  const messageCount = useAuiState(s => s.thread.messages.length)
  const aui = useAui()
  const isChatActive = messageCount > INITIAL_MESSAGE_COUNT

  const handleSuggestionClick = useCallback((text: string) => {
    aui.thread().append({
      role: 'user',
      content: [{ type: 'text' as const, text }]
    })
  }, [aui])

  const handleBack = useCallback(() => {
    // Can't reset thread in LocalRuntime easily — reload the page
    window.location.reload()
  }, [])

  return (
    <>
      {/* Landing state */}
      {!isChatActive && (
        <Fade in timeout={400}>
          <Box>
            <NexaHero
              greeting={snapshot.greeting.title}
              onSuggestionClick={handleSuggestionClick}
            />

            {/* Secondary content below hero */}
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
            <NexaThread onBack={handleBack} />
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
          setError('Ocurrió un error al cargar tu centro de mando. Por favor, intenta de nuevo.')
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
  const nexaIntro = snapshot?.nexaIntro ?? 'Hola, soy Nexa. ¿En qué puedo ayudarte hoy?'

  const operationItems = useMemo((): StatusItem[] => {
    // Placeholder — will be enriched in Slice D with real payroll/OTD/email data
    return [
      { label: 'Nómina del mes', value: 'Sin datos', status: 'secondary', icon: 'tabler-file-invoice' },
      { label: 'OTD global', value: 'Sin datos', status: 'secondary', icon: 'tabler-target' },
      { label: 'Correos fallidos', value: '0', status: 'success', icon: 'tabler-mail-check' }
    ]
  }, [])

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
        <HomeContent snapshot={effectiveSnapshot} operationItems={operationItems} />
      </AssistantRuntimeProvider>
    </NexaBoundary>
  )
}

export default HomeView
