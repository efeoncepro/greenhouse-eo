'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import type { PersonDetailAssignment } from '@/types/people'
import { formatFte } from '../helpers'

type Props = {
  assignments?: PersonDetailAssignment[]
  isAdmin?: boolean
  onNewAssignment?: () => void
  onEditAssignment?: (a: PersonDetailAssignment) => void
}

const PersonAssignmentsTab = ({ assignments, isAdmin, onNewAssignment, onEditAssignment }: Props) => {
  if (!assignments || assignments.length === 0) {
    return (
      <Card>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Typography color='text.secondary'>No hay asignaciones registradas para este colaborador.</Typography>
        </CardContent>
      </Card>
    )
  }

  const activeAssignments = assignments.filter(a => a.active)
  const closedAssignments = assignments.filter(a => !a.active)
  const totalFte = activeAssignments.reduce((s, a) => s + a.fteAllocation, 0)

  return (
    <Card>
      <CardHeader
        title='Asignaciones a cuentas'
        subheader={`${activeAssignments.length} activa${activeAssignments.length !== 1 ? 's' : ''} · FTE total: ${formatFte(totalFte)}`}
      />
      <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Space / Cuenta</TableCell>
                <TableCell align='right'>FTE</TableCell>
                <TableCell align='right'>Hrs/mes</TableCell>
                <TableCell>Rol en cuenta</TableCell>
                <TableCell>Desde</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeAssignments.map(a => (
                <TableRow
                  key={a.assignmentId}
                  hover
                  sx={isAdmin ? { cursor: 'pointer' } : undefined}
                  onClick={isAdmin && onEditAssignment ? () => onEditAssignment(a) : undefined}
                  onKeyDown={isAdmin && onEditAssignment ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEditAssignment(a) } } : undefined}
                  tabIndex={isAdmin ? 0 : undefined}
                  role={isAdmin ? 'button' : undefined}
                  aria-label={isAdmin ? `Editar asignación a ${a.clientName}` : undefined}
                >
                  <TableCell>
                    <Typography variant='body2' fontWeight={500}>{a.clientName}</Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatFte(a.fteAllocation)}</Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{a.hoursPerMonth ?? Math.round(a.fteAllocation * 160)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' color={a.roleTitleOverride ? 'text.primary' : 'text.secondary'}>
                      {a.roleTitleOverride ?? 'Mismo cargo'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>{a.startDate ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size='small' label='Activo' color='success' variant='tonal' />
                  </TableCell>
                </TableRow>
              ))}
              {closedAssignments.map(a => (
                <TableRow key={a.assignmentId} hover sx={{ opacity: 0.6 }}>
                  <TableCell>
                    <Typography variant='body2'>{a.clientName}</Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatFte(a.fteAllocation)}</Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{a.hoursPerMonth ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' color='text.secondary'>{a.roleTitleOverride ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>{a.startDate ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size='small' label={a.endDate ? `Cerrado ${a.endDate}` : 'Inactivo'} color='default' variant='tonal' />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {isAdmin && (
          <Box
            onClick={onNewAssignment}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && onNewAssignment) { e.preventDefault(); onNewAssignment() } }}
            tabIndex={0}
            role='button'
            aria-label='Asignar a nueva cuenta'
            sx={{
              mt: 2,
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
            <i className='tabler-plus' /> Asignar a nueva cuenta
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default PersonAssignmentsTab
