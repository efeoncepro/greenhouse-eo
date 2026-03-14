'use client'

import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { PeopleListPayload } from '@/types/people'

import CreateMemberDrawer from './drawers/CreateMemberDrawer'
import PeopleListStats from './PeopleListStats'
import PeopleListTable from './PeopleListTable'

const PeopleList = () => {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<PeopleListPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const isAdmin = session?.user?.roleCodes?.includes('efeonce_admin') ?? false

  const loadData = useCallback(async () => {
    const res = await fetch('/api/people')

    if (res.ok) {
      setData(await res.json())
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      await loadData()
      setLoading(false)
    }

    load()
  }, [loadData])

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
    <>
      <Stack spacing={6}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant='h4'>Equipo</Typography>
            <Typography variant='body2' color='text.secondary'>
              Vista operativa del equipo Efeonce
            </Typography>
          </Box>
          {isAdmin && (
            <Button
              variant='contained'
              startIcon={<i className='tabler-plus' />}
              onClick={() => setCreateOpen(true)}
            >
              Nuevo colaborador
            </Button>
          )}
        </Box>
        <PeopleListStats summary={data.summary} />
        <PeopleListTable data={data.items} />
      </Stack>

      {isAdmin && (
        <CreateMemberDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={(memberId) => {
            loadData()
            router.push(`/people/${memberId}`)
          }}
        />
      )}
    </>
  )
}

export default PeopleList
