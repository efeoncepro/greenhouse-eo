'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import type { PersonDetail } from '@/types/people'
import PersonLeftSidebar from './PersonLeftSidebar'
import PersonTabs from './PersonTabs'

type Props = {
  memberId: string
}

const PersonView = ({ memberId }: Props) => {
  const [detail, setDetail] = useState<PersonDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/people/${memberId}`)

      if (res.ok) {
        setDetail(await res.json())
      }

      setLoading(false)
    }

    load()
  }, [memberId])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!detail) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color='text.secondary'>No se encontró este colaborador.</Typography>
        <Button component={Link} href='/people' variant='tonal' sx={{ mt: 2 }}>
          Volver al equipo
        </Button>
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 5, lg: 4 }}>
        <PersonLeftSidebar detail={detail} />
      </Grid>
      <Grid size={{ xs: 12, md: 7, lg: 8 }}>
        <PersonTabs detail={detail} />
      </Grid>
    </Grid>
  )
}

export default PersonView
