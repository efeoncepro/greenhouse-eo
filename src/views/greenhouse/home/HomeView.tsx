'use client'

import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'

// MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import Fade from '@mui/material/Fade'

// Component Imports
import GreetingCard from './components/GreetingCard'
import NexaPanel from './components/NexaPanel'
import TaskShortlist from './components/TaskShortlist'
import ModuleGrid from './components/ModuleGrid'

// Type Imports
import type { HomeSnapshot } from '@/types/home'

const SNAPSHOT_TIMEOUT_MS = 5000

const HomeViewSkeleton = () => (
  <Box className='space-y-8'>
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Skeleton variant='rounded' height={200} className='rounded-xl' />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Skeleton variant='rounded' height={450} className='rounded-xl' />
      </Grid>
    </Grid>
    <Box className='space-y-4'>
      <Skeleton width={150} height={32} />
      <Grid container spacing={4}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant='rounded' height={150} className='rounded-xl' />
          </Grid>
        ))}
      </Grid>
    </Box>
  </Box>
)

class NexaBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[NexaBoundary] Nexa panel crashed:', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          <i className='tabler-robot-off' style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
          <Typography variant='body2'>Nexa no está disponible en este momento.</Typography>
        </Box>
      )
    }

    return this.props.children
  }
}

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

        const data = await res.json()

        setSnapshot(data)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Timeout — show Home with empty tasks instead of error page
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

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  if (loading) return <HomeViewSkeleton />

  if (error && !snapshot) {
    return (
      <Box className='flex flex-col items-center justify-center p-12 text-center gap-4'>
        <i className='tabler-alert-triangle text-5xl text-warning-main' />
        <Typography variant='h6'>{error}</Typography>
      </Box>
    )
  }

  // Graceful degradation: if snapshot timed out, show greeting + empty state
  const greeting = snapshot?.greeting ?? { title: 'Bienvenido a Greenhouse', subtitle: 'Tu centro de mando operativo.' }
  const modules = snapshot?.modules ?? []
  const tasks = snapshot?.tasks ?? []
  const nexaIntro = snapshot?.nexaIntro ?? 'Hola, soy Nexa. ¿En qué puedo ayudarte hoy?'

  return (
    <Fade in={true} timeout={800}>
      <Box className='space-y-8 pb-10'>
        {/* Top Section: Greeting + Nexa */}
        <Grid container spacing={6} className='items-stretch'>
          <Grid size={{ xs: 12, md: 8, lg: 9 }} className='flex flex-col gap-6'>
            <GreetingCard
              title={greeting.title}
              subtitle={greeting.subtitle}
            />

            {/* Direct Modules Access */}
            {modules.length > 0 && <ModuleGrid modules={modules} />}
          </Grid>

          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <NexaBoundary>
              <NexaPanel initialMessage={nexaIntro} />
            </NexaBoundary>
          </Grid>
        </Grid>

        {/* Bottom Section: Tasks Shortlist */}
        {tasks.length > 0 && (
          <Box className='space-y-4 max-w-[1200px]'>
            <Typography variant='h6' className='font-bold ml-1'>
              Control de Pendientes
            </Typography>
            <Box className='max-w-[800px]'>
              <TaskShortlist tasks={tasks} />
            </Box>
          </Box>
        )}
      </Box>
    </Fade>
  )
}

export default HomeView
