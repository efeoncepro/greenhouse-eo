'use client'

import { useCallback, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import type { CompensationVersion, CreateCompensationVersionInput } from '@/types/payroll'
import { getInitials } from '@/utils/getInitials'
import CompensationDrawer from './CompensationDrawer'
import { formatCurrency, regimeLabel, regimeColor } from './helpers'

type Props = {
  compensations: CompensationVersion[]
  onRefresh: () => void
}

const PayrollCompensationTab = ({ compensations, onRefresh }: Props) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedComp, setSelectedComp] = useState<CompensationVersion | null>(null)

  const handleRowClick = (comp: CompensationVersion) => {
    setSelectedComp(comp)
    setDrawerOpen(true)
  }

  const handleSave = useCallback(
    async (input: CreateCompensationVersionInput) => {
      const res = await fetch('/api/hr/payroll/compensation', {
        method: 'POST',
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

  return (
    <>
      <Card>
        <CardHeader
          title='Compensaciones vigentes'
          subheader={`${compensations.length} colaborador${compensations.length !== 1 ? 'es' : ''} con compensación activa`}
        />
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Colaborador</TableCell>
                  <TableCell align='center'>Régimen</TableCell>
                  <TableCell align='right'>Salario base</TableCell>
                  <TableCell align='right'>Teletrabajo</TableCell>
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
                      <Chip
                        size='small'
                        label={regimeLabel[comp.payRegime]}
                        color={regimeColor[comp.payRegime]}
                        variant='tonal'
                        sx={{ height: 20 }}
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
                        {formatCurrency(comp.bonusOtdMin, comp.currency)} – {formatCurrency(comp.bonusOtdMax, comp.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(comp.bonusRpaMin, comp.currency)} – {formatCurrency(comp.bonusRpaMax, comp.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <Chip size='small' label={`v${comp.version}`} variant='tonal' sx={{ height: 20 }} />
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
                      <Typography color='text.secondary'>No hay compensaciones configuradas.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <CompensationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        existingVersion={selectedComp}
        memberId={selectedComp?.memberId ?? ''}
        memberName={selectedComp?.memberName ?? ''}
        onSave={handleSave}
      />
    </>
  )
}

export default PayrollCompensationTab
