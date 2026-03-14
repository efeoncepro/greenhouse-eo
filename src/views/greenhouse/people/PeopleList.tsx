'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { PeopleListPayload } from '@/types/people'
import PeopleListStats from './PeopleListStats'
import PeopleListTable from './PeopleListTable'

const PeopleList = () => {
  const [data, setData] = useState<PeopleListPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/people')

      if (res.ok) {
        setData(await res.json())
      }

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!data) {
    return (
      <Typography color='text.secondary' sx={{ py: 8, textAlign: 'center' }}>
        No se pudieron cargar los datos del equipo.
      </Typography>
    )
  }

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>Equipo</Typography>
        <Typography variant='body2' color='text.secondary'>
          Vista operativa del equipo Efeonce
        </Typography>
      </Box>
      <PeopleListStats summary={data.summary} />
      <PeopleListTable data={data.items} />
    </Stack>
  )
}

export default PeopleList
