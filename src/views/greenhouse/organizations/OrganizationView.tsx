'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import type { OrganizationDetailData } from './types'
import OrganizationLeftSidebar from './OrganizationLeftSidebar'
import OrganizationTabs from './OrganizationTabs'
import EditOrganizationDrawer from './drawers/EditOrganizationDrawer'
import AddMembershipDrawer from './drawers/AddMembershipDrawer'

type Props = {
  organizationId: string
}

const OrganizationView = ({ organizationId }: Props) => {
  const { data: session } = useSession()
  const isAdmin = session?.user?.roleCodes?.includes('efeonce_admin') ?? false

  const [detail, setDetail] = useState<OrganizationDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [addMembershipOpen, setAddMembershipOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const loadDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}`)

      if (res.ok) setDetail(await res.json())
    } catch {
      // Non-blocking
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const handleEditSuccess = () => {
    toast.success('Organización actualizada.')
    void loadDetail()
  }

  const handleSyncHubspot = async () => {
    if (!detail) return

    setSyncing(true)

    try {
      const res = await fetch(`/api/organizations/${detail.organizationId}/hubspot-sync`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al sincronizar con HubSpot')

        return
      }

      const parts: string[] = []

      if (data.fieldsUpdated?.length > 0) parts.push(`${data.fieldsUpdated.length} campo${data.fieldsUpdated.length !== 1 ? 's' : ''} actualizado${data.fieldsUpdated.length !== 1 ? 's' : ''}`)
      if (data.contactsSynced > 0) parts.push(`${data.contactsSynced} contacto${data.contactsSynced !== 1 ? 's' : ''} vinculado${data.contactsSynced !== 1 ? 's' : ''}`)

      toast.success(parts.length > 0 ? `Sincronizado: ${parts.join(', ')}.` : 'Todo al día con HubSpot.')
      void loadDetail()
    } catch {
      toast.error('Error de conexión con HubSpot')
    } finally {
      setSyncing(false)
    }
  }

  const handleMembershipSuccess = () => {
    toast.success('Persona agregada a la organización.')
    void loadDetail()
  }

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
        <Typography color='text.secondary'>No se encontró esta organización.</Typography>
        <Button component={Link} href='/agency/organizations' variant='tonal' sx={{ mt: 2 }}>
          Volver a organizaciones
        </Button>
      </Box>
    )
  }

  return (
    <>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <OrganizationLeftSidebar
            detail={detail}
            isAdmin={isAdmin}
            syncing={syncing}
            onEditOrganization={() => setEditDrawerOpen(true)}
            onSyncHubspot={handleSyncHubspot}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          <OrganizationTabs
            detail={detail}
            isAdmin={isAdmin}
            onAddMembership={() => setAddMembershipOpen(true)}
          />
        </Grid>
      </Grid>

      <EditOrganizationDrawer
        open={editDrawerOpen}
        detail={detail}
        onClose={() => setEditDrawerOpen(false)}
        onSuccess={handleEditSuccess}
      />

      <AddMembershipDrawer
        open={addMembershipOpen}
        organizationId={detail.organizationId}
        spaces={detail.spaces}
        onClose={() => setAddMembershipOpen(false)}
        onSuccess={handleMembershipSuccess}
      />
    </>
  )
}

export default OrganizationView
