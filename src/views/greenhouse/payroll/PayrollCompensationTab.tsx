'use client'

import { useCallback, useState } from 'react'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import type { CompensationVersion, PayrollCompensationMember } from '@/types/payroll'
import { getInitials } from '@/utils/getInitials'
import CompensationDrawer, { type CompensationSavePayload } from './CompensationDrawer'
import { formatCurrency, regimeLabel, regimeColor } from './helpers'

type Props = {
  compensations: CompensationVersion[]
  eligibleMembers: PayrollCompensationMember[]
  members: PayrollCompensationMember[]
  onRefresh: () => void
}

const PayrollCompensationTab = ({ compensations, eligibleMembers, members, onRefresh }: Props) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedComp, setSelectedComp] = useState<CompensationVersion | null>(null)
  const [newMemberId, setNewMemberId] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [selectorOpen, setSelectorOpen] = useState(false)

  const handleRowClick = (comp: CompensationVersion) => {
    setSelectedComp(comp)
    setNewMemberId('')
    setNewMemberName('')
    setDrawerOpen(true)
  }

  const handleNewCompensation = (member: PayrollCompensationMember) => {
    setSelectedComp(null)
    setNewMemberId(member.memberId)
    setNewMemberName(member.memberName)
    setSelectorOpen(false)
    setDrawerOpen(true)
  }

  const handleSave = useCallback(
    async ({ mode, input, versionId }: CompensationSavePayload) => {
      const isUpdate = mode === 'update' && versionId

      const res = await fetch(isUpdate ? `/api/hr/payroll/compensation/${versionId}` : '/api/hr/payroll/compensation', {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const data = await res.json()

        throw new Error(data.error || 'Error al guardar')
      }

      onRefresh()
    },
    [onRefresh]
  )

  const drawerMemberId = selectedComp?.memberId ?? newMemberId
  const drawerMemberName = selectedComp?.memberName ?? newMemberName

  return (
    <>
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Compensaciones vigentes'
          subheader={
            compensations.length > 0
              ? `${compensations.length} colaborador${compensations.length !== 1 ? 'es' : ''} con compensación activa`
              : 'Aquí defines salario base, conectividad, bonos y previsión para calcular nómina.'
          }
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-adjustments-dollar' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
          action={
            <Button
              variant='contained'
              size='small'
              startIcon={<i className='tabler-plus' />}
              disabled={eligibleMembers.length === 0}
              onClick={() => setSelectorOpen(true)}
            >
              Nueva compensación
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {eligibleMembers.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <CustomChip
                round='true'
                size='small'
                label={`${eligibleMembers.length} colaborador${eligibleMembers.length !== 1 ? 'es' : ''} sin compensación`}
                color='warning'
              />
            </Box>
          )}
          {compensations.length > 0 && eligibleMembers.length === 0 && (
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
              Todos los colaboradores activos ya tienen compensación vigente. Haz clic en una fila para crear una nueva versión.
            </Typography>
          )}
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Colaborador</TableCell>
                  <TableCell align='center'>Régimen</TableCell>
                  <TableCell align='right'>Salario base</TableCell>
                  <TableCell align='right'>Conectividad</TableCell>
                  <TableCell align='right'>Bono OTD</TableCell>
                  <TableCell align='right'>Bono RpA</TableCell>
                  <TableCell align='center'>Versión</TableCell>
                  <TableCell>Vigente desde</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {compensations.map(comp => (
                  <TableRow
                    key={comp.versionId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(comp)}
                  >
                    <TableCell>
                      <Stack direction='row' spacing={2} alignItems='center'>
                        <Avatar
                          src={comp.memberAvatarUrl || undefined}
                          sx={{ width: 32, height: 32, fontSize: '0.875rem' }}
                        >
                          {getInitials(comp.memberName)}
                        </Avatar>
                        <Typography variant='body2' fontWeight={500}>
                          {comp.memberName}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align='center'>
                      <CustomChip
                        round='true'
                        size='small'
                        label={regimeLabel[comp.payRegime]}
                        color={regimeColor[comp.payRegime]}
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(comp.baseSalary, comp.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(comp.remoteAllowance, comp.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(comp.bonusOtdMax, comp.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(comp.bonusRpaMax, comp.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <CustomChip round='true' size='small' label={`v${comp.version}`} color='default' />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {comp.effectiveFrom}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {compensations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align='center' sx={{ py: 6 }}>
                      <Stack alignItems='center' spacing={1}>
                        <i className='tabler-adjustments-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                        <Typography color='text.secondary'>No hay compensaciones configuradas.</Typography>
                        {members.length === 0 ? (
                          <>
                            <Typography variant='caption' color='text.disabled'>
                              Primero debes tener colaboradores activos en Admin {'>'} Equipo para habilitar nómina.
                            </Typography>
                            <Button component={Link} href='/admin/team' variant='tonal' size='small'>
                              Abrir equipo
                            </Button>
                          </>
                        ) : (
                          <>
                            <Typography variant='caption' color='text.disabled'>
                              Crea la primera compensación para comenzar a calcular nómina.
                            </Typography>
                            <Button
                              variant='contained'
                              size='small'
                              startIcon={<i className='tabler-plus' />}
                              disabled={eligibleMembers.length === 0}
                              onClick={() => setSelectorOpen(true)}
                            >
                              Configurar primera compensación
                            </Button>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Member selector dialog */}
      <Dialog
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        maxWidth='xs'
        fullWidth
        closeAfterTransition={false}
      >
        <DialogTitle>Selecciona colaborador</DialogTitle>
        <Divider />
        <DialogContent>
          {eligibleMembers.length === 0 ? (
            <Stack alignItems='center' spacing={1} sx={{ py: 3 }}>
              <i className='tabler-user-check' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
              <Typography color='text.secondary'>
                Todos los colaboradores activos ya tienen compensación vigente.
              </Typography>
            </Stack>
          ) : (
            <List>
              {eligibleMembers.map(member => (
                <ListItemButton key={member.memberId} onClick={() => handleNewCompensation(member)}>
                  <ListItemAvatar>
                    <Avatar
                      src={member.memberAvatarUrl || undefined}
                      sx={{ width: 36, height: 36, fontSize: '0.875rem' }}
                    >
                      {getInitials(member.memberName)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={member.memberName}
                    secondary={member.memberEmail}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>

      <CompensationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        existingVersion={selectedComp}
        memberId={drawerMemberId}
        memberName={drawerMemberName}
        onSave={handleSave}
      />
    </>
  )
}

export default PayrollCompensationTab
