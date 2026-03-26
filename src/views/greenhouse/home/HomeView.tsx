'use client'

import { useEffect, useState } from 'react'

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

const HomeView = () => {
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const res = await fetch('/api/home/snapshot')

        if (!res.ok) throw new Error('Failed to load snapshot')

        const data = await res.json()

        setSnapshot(data)
      } catch {
        setError('Ocurrió un error al cargar tu centro de mando. Por favor, intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    fetchSnapshot()
  }, [])

  if (loading) return <HomeViewSkeleton />

  if (error || !snapshot) {
    return (
      <Box className='flex flex-col items-center justify-center p-12 text-center gap-4'>
        <i className='tabler-alert-triangle text-5xl text-warning-main' />
        <Typography variant='h6'>{error || 'Error al cargar datos.'}</Typography>
      </Box>
    )
  }

  return (
    <Fade in={true} timeout={800}>
      <Box className='space-y-8 pb-10'>
        {/* Top Section: Greeting + Nexa */}
        <Grid container spacing={6} className='items-stretch'>
          <Grid size={{ xs: 12, md: 8, lg: 9 }} className='flex flex-col gap-6'>
            <GreetingCard 
              title={snapshot.greeting.title} 
              subtitle={snapshot.greeting.subtitle} 
            />
            
            {/* Direct Modules Access */}
            <ModuleGrid modules={snapshot.modules} />
          </Grid>
          
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <NexaPanel initialMessage={snapshot.nexaIntro} />
          </Grid>
        </Grid>

        {/* Bottom Section: Tasks Shortlist */}
        <Box className='space-y-4 max-w-[1200px]'>
          <Typography variant='h6' className='font-bold ml-1'>
            Control de Pendientes
          </Typography>
          <Box className='max-w-[800px]'>
            <TaskShortlist tasks={snapshot.tasks} />
          </Box>
        </Box>
      </Box>
    </Fade>
  )
}

export default HomeView
