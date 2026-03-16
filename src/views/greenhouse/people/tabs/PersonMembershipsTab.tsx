'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
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

import type { PersonDetailAssignment } from '@/types/people'
import { formatFte } from '../helpers'

interface PersonMembership {
  membershipId: string
  publicId: string
  organizationId: string
  organizationName: string
  spaceId: string | null
  clientId: string | null
  membershipType: string
  roleLabel: string | null
  isPrimary: boolean
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

type Props = {
  memberId: string
  assignments?: PersonDetailAssignment[]
  isAdmin?: boolean
  onAddMembership?: () => void
}

const PersonMembershipsTab = ({ memberId, assignments, isAdmin, onAddMembership }: Props) => {
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

  // Build assignment lookup by clientId for fast matching
  const assignmentMap = new Map<string, PersonDetailAssignment>()

  if (assignments) {
    for (const a of assignments) {
      assignmentMap.set(a.clientId, a)
    }
  }

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
            subheader='Membresías y asignaciones operativas en organizaciones'
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
                    <TableCell align='right'>FTE</TableCell>
                    <TableCell>Desde</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align='center'>Principal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {memberships.map(m => {
                    const cfg = TYPE_CONFIG[m.membershipType]
                    const assignment = m.clientId ? assignmentMap.get(m.clientId) : undefined

                    return (
                      <TableRow key={m.membershipId} hover sx={assignment && !assignment.active ? { opacity: 0.6 } : undefined}>
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
                            color={cfg?.color ?? 'secondary'}
                            label={cfg?.label ?? m.membershipType}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' color='text.secondary'>
                            {m.roleLabel ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          {assignment ? (
                            <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                              {formatFte(assignment.fteAllocation)}
                            </Typography>
                          ) : (
                            <Typography variant='body2' color='text.secondary'>—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>
                            {assignment?.startDate ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {assignment ? (
                            assignment.active ? (
                              <Chip size='small' label='Activo' color='success' variant='tonal' />
                            ) : (
                              <Chip size='small' label={assignment.endDate ? `Cerrado ${assignment.endDate}` : 'Inactivo'} color='default' variant='tonal' />
                            )
                          ) : (
                            <Typography variant='body2' color='text.secondary'>—</Typography>
                          )}
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

          {/* Ghost slot — admin only */}
          {isAdmin && onAddMembership && (
            <CardContent sx={{ pt: memberships.length > 0 ? 2 : 0 }}>
              <Box
                onClick={onAddMembership}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && onAddMembership) {
                    e.preventDefault()
                    onAddMembership()
                  }
                }}
                tabIndex={0}
                role='button'
                aria-label='Vincular a organización'
                sx={{
                  p: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  textAlign: 'center',
                  color: 'text.secondary',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main', color: 'primary.main' }
                }}
              >
                <i className='tabler-plus' style={{ fontSize: 16, marginRight: 6 }} />
                Vincular a organización
              </Box>
            </CardContent>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default PersonMembershipsTab
