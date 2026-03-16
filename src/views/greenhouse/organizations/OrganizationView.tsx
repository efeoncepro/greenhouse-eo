'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import type { OrganizationDetailData } from './types'
import OrganizationLeftSidebar from './OrganizationLeftSidebar'
import OrganizationTabs from './OrganizationTabs'

type Props = {
  organizationId: string
}

const OrganizationView = ({ organizationId }: Props) => {
  const [detail, setDetail] = useState<OrganizationDetailData | null>(null)
  const [loading, setLoading] = useState(true)

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
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 5, lg: 4 }}>
        <OrganizationLeftSidebar detail={detail} />
      </Grid>
      <Grid size={{ xs: 12, md: 7, lg: 8 }}>
        <OrganizationTabs detail={detail} />
      </Grid>
    </Grid>
  )
}

export default OrganizationView
