'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

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

import CustomChip from '@core/components/mui/Chip'

interface PersonMembership {
  membershipId: string
  publicId: string
  organizationId: string
  organizationName: string
  spaceId: string | null
  membershipType: string
  roleLabel: string | null
  isPrimary: boolean
}

const TYPE_LABEL: Record<string, string> = {
  team_member: 'Equipo',
  client_user: 'Usuario',
  contact: 'Contacto',
  billing: 'Facturación'
}

type Props = {
  memberId: string
}

const PersonMembershipsTab = ({ memberId }: Props) => {
  const [memberships, setMemberships] = useState<PersonMembership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/people/${memberId}/memberships`)

        if (res.ok) {
          const json = await res.json()

          setMemberships(json.items ?? [])
        }
      } catch {
        // Non-blocking
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [memberId])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title={`Organizaciones (${memberships.length})`}
            subheader='Membresías de esta persona en organizaciones del sistema'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-building' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          {memberships.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>Sin membresías de organización</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Esta persona aún no está vinculada a ninguna organización.
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Organización</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell align='center'>Principal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {memberships.map(m => (
                    <TableRow key={m.membershipId} hover>
                      <TableCell>
                        <Typography
                          component={Link}
                          href={`/agency/organizations/${m.organizationId}`}
                          variant='body2'
                          fontWeight={600}
                          sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                          {m.organizationName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color='secondary'
                          label={TYPE_LABEL[m.membershipType] ?? m.membershipType}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {m.roleLabel ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        {m.isPrimary ? (
                          <i className='tabler-star-filled' style={{ fontSize: 16, color: 'var(--mui-palette-warning-main)' }} aria-label='Contacto principal' />
                        ) : (
                          <Typography variant='body2' color='text.secondary'>—</Typography>
                        )}
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

export default PersonMembershipsTab
