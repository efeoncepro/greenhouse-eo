'use client'

import { useEffect, useState } from 'react'

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

import Button from '@mui/material/Button'

import CustomChip from '@core/components/mui/Chip'

import type { OrganizationPerson } from '../types'

type Props = {
  organizationId: string
  isAdmin?: boolean
  onAddMembership?: () => void
}

const TYPE_CONFIG: Record<string, { label: string; color: 'info' | 'secondary' | 'warning' }> = {
  team_member: { label: 'Equipo Efeonce', color: 'info' },
  client_user: { label: 'Usuario', color: 'secondary' },
  client_contact: { label: 'Contacto', color: 'secondary' },
  contact: { label: 'Contacto', color: 'secondary' },
  billing: { label: 'Facturación', color: 'warning' },
  contractor: { label: 'Contratista', color: 'secondary' },
  partner: { label: 'Partner', color: 'secondary' },
  advisor: { label: 'Asesor', color: 'secondary' }
}

const OrganizationPeopleTab = ({ organizationId, isAdmin, onAddMembership }: Props) => {
  const [memberships, setMemberships] = useState<OrganizationPerson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/organizations/${organizationId}/memberships`)

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
  }, [organizationId])

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
            title={`Personas (${memberships.length})`}
            subheader='Membresías de personas vinculadas a esta organización'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                <i className='tabler-users' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
              </Avatar>
            }
            action={
              isAdmin && onAddMembership ? (
                <Button variant='tonal' size='small' startIcon={<i className='tabler-user-plus' />} onClick={onAddMembership}>
                  Agregar persona
                </Button>
              ) : undefined
            }
          />
          <Divider />
          {memberships.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>Sin personas vinculadas</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Aún no hay membresías registradas para esta organización.
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Persona</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell>Departamento</TableCell>
                    <TableCell align='center'>Principal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {memberships.map(m => {
                    const cfg = TYPE_CONFIG[m.membershipType]

                    return (
                    <TableRow key={m.membershipId} hover>
                      <TableCell>
                        <Box>
                          <Typography variant='body2' fontWeight={600}>
                            {m.fullName ?? 'Sin nombre'}
                          </Typography>
                          {m.canonicalEmail && (
                            <Typography variant='caption' color='text.secondary'>
                              {m.canonicalEmail}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={cfg?.color ?? 'secondary'}
                          label={cfg?.label ?? m.membershipType}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {m.roleLabel ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {m.department ?? '—'}
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
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default OrganizationPeopleTab
