'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { useQueryClient } from '@tanstack/react-query'

import { ROLE_CODES } from '@/config/role-codes'
import usePeopleList from '@/hooks/usePeopleList'
import { qk } from '@/lib/react-query'

import CreateMemberDrawer from './drawers/CreateMemberDrawer'
import PeopleListStats from './PeopleListStats'
import PeopleListTable from './PeopleListTable'

const PeopleList = () => {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const isAdmin = session?.user?.roleCodes?.includes(ROLE_CODES.EFEONCE_ADMIN) ?? false

  /*
    TASK-513: usePeopleList reemplaza el useState+useEffect+useCallback
    manual. El refetch tras crear un colaborador es ahora una invalidacion
    coordinada (`invalidateQueries({ queryKey: qk.people.all })`) en vez
    de tener que pasarle `loadData` como prop al drawer.
  */
  const { data, isPending: loading } = usePeopleList()

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
            void queryClient.invalidateQueries({ queryKey: qk.people.all })
            router.push(`/people/${memberId}`)
          }}
        />
      )}
    </>
  )
}

export default PeopleList
