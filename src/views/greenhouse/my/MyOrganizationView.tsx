'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

interface OrgData {
  organizationName: string
  legalName: string | null
  industry: string | null
  country: string | null
  spaceCount: number
  memberCount: number
}

interface MemberItem {
  membershipId: string
  fullName: string
  email: string | null
  membershipType: string
  roleLabel: string | null
  department: string | null
  isPrimary: boolean
}

const TYPE_COLORS: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'secondary'> = {
  team_member: 'primary',
  client_user: 'info',
  client_contact: 'success',
  billing: 'warning',
  contractor: 'secondary',
  partner: 'secondary',
  advisor: 'secondary',
  contact: 'secondary'
}

const TYPE_LABELS: Record<string, string> = {
  team_member: 'Equipo',
  client_user: 'Usuario del portal',
  client_contact: 'Contacto',
  billing: 'Facturación',
  contractor: 'Contratista',
  partner: 'Partner',
  advisor: 'Asesor',
  contact: 'Contacto'
}

const MyOrganizationView = () => {
  const [org, setOrg] = useState<OrgData | null>(null)
  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [orgRes, memRes] = await Promise.allSettled([
        fetch('/api/my/organization'),
        fetch('/api/my/organization/members')
      ])

      if (orgRes.status === 'fulfilled' && orgRes.value.ok) setOrg(await orgRes.value.json())

      if (memRes.status === 'fulfilled' && memRes.value.ok) {
        const data = await memRes.value.json()

        setMembers(data.items ?? [])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  if (!org) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <i className='tabler-building-off' style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)' }} />
          <Typography variant='h6' sx={{ mt: 2 }}>Sin organización vinculada</Typography>
          <Typography variant='body2' color='text.secondary'>
            Tu cuenta no está asociada a una organización en Greenhouse.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title={org.organizationName}
            subheader={[org.industry, org.country].filter(Boolean).join(' · ') || 'Organización'}
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity', width: 48, height: 48 }}>
                <i className='tabler-building' style={{ fontSize: 26, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
          />
        </Card>
      </Grid>

      {/* KPIs */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <HorizontalWithSubtitle title='Miembros' stats={String(org.memberCount)} avatarIcon='tabler-users' avatarColor='info' subtitle='En la organización' />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <HorizontalWithSubtitle title='Spaces' stats={String(org.spaceCount)} avatarIcon='tabler-layout-grid' avatarColor='primary' subtitle='Espacios activos' />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <HorizontalWithSubtitle title='Usuarios portal' stats={String(members.filter(m => m.membershipType === 'client_user').length)} avatarIcon='tabler-device-laptop' avatarColor='success' subtitle='Con acceso a Greenhouse' />
      </Grid>

      {/* Members directory */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Directorio' subheader='Personas vinculadas a tu organización' />
          <Divider />
          {members.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant='body2' color='text.secondary'>Sin miembros registrados</Typography>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align='center'>Tipo</TableCell>
                    <TableCell>Rol / Departamento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.membershipId} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <CustomAvatar color='primary' skin='light-static' size={32}>
                            {m.fullName[0]?.toUpperCase() || '?'}
                          </CustomAvatar>
                          <Box>
                            <Typography variant='body2' fontWeight={600}>{m.fullName}</Typography>
                            {m.isPrimary && (
                              <Typography variant='caption' color='warning.main'>Principal</Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>{m.email || '—'}</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={TYPE_COLORS[m.membershipType] || 'secondary'}
                          label={TYPE_LABELS[m.membershipType] || m.membershipType}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {[m.roleLabel, m.department].filter(Boolean).join(' · ') || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default MyOrganizationView
