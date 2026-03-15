'use client'

import { useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type { MemberToolLicense, AiToolingAdminMetadata } from '@/types/ai-tools'
import { licenseStatusConfig, accessLevelConfig, formatDate } from '../helpers'
import { getInitials } from '@/utils/getInitials'

type Props = {
  licenses: MemberToolLicense[]
  meta: AiToolingAdminMetadata | null
  onRefresh: () => void
}

const AiLicensesTab = ({ licenses, meta, onRefresh }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  // Form state
  const [formMember, setFormMember] = useState('')
  const [formTool, setFormTool] = useState('')
  const [formAccess, setFormAccess] = useState('full')
  const [formEmail, setFormEmail] = useState('')
  const [formExpires, setFormExpires] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const openCreate = () => {
    setFormMember('')
    setFormTool('')
    setFormAccess('full')
    setFormEmail('')
    setFormExpires('')
    setFormNotes('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const res = await fetch('/api/admin/ai-tools/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: formMember,
          toolId: formTool,
          accessLevel: formAccess,
          accountEmail: formEmail || null,
          expiresAt: formExpires || null,
          notes: formNotes || null
        })
      })

      if (res.ok) {
        setDialogOpen(false)
        onRefresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const filtered = licenses.filter(lic => {
    if (filterStatus && lic.licenseStatus !== filterStatus) return false
    if (search && !(lic.memberName ?? '').toLowerCase().includes(search.toLowerCase()) && !lic.toolId.toLowerCase().includes(search.toLowerCase())) return false

    return true
  })

  return (
    <>
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Licencias de herramientas'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
              <i className='tabler-key' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
            </Avatar>
          }
          action={
            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
              Asignar licencia
            </Button>
          }
        />
        <Divider />
        <CardContent>
          <Stack direction='row' spacing={2} sx={{ mb: 3 }} flexWrap='wrap'>
            <CustomTextField
              size='small'
              placeholder='Buscar por nombre o herramienta...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ width: 260 }}
              InputProps={{
                startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: 'var(--mui-palette-text-disabled)' }} />
              }}
            />
            <CustomTextField
              select size='small' label='Estado'
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value=''>Todos</MenuItem>
              {(meta?.licenseStatuses ?? []).map(s => (
                <MenuItem key={s} value={s}>{licenseStatusConfig[s]?.label ?? s}</MenuItem>
              ))}
            </CustomTextField>
          </Stack>

          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Colaborador</TableCell>
                  <TableCell>Herramienta</TableCell>
                  <TableCell align='center'>Acceso</TableCell>
                  <TableCell>Email cuenta</TableCell>
                  <TableCell align='center'>Estado</TableCell>
                  <TableCell>Asignado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(lic => {
                  const statusConf = licenseStatusConfig[lic.licenseStatus]
                  const accessConf = accessLevelConfig[lic.accessLevel]

                  return (
                    <TableRow key={lic.licenseId} hover>
                      <TableCell>
                        <Stack direction='row' spacing={1.5} alignItems='center'>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                            {getInitials(lic.memberName || '')}
                          </Avatar>
                          <Box>
                            <Typography variant='body2' fontWeight={500}>{lic.memberName ?? '—'}</Typography>
                            {lic.memberEmail && (
                              <Typography variant='caption' color='text.disabled'>{lic.memberEmail}</Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{lic.tool?.toolName ?? lic.toolId}</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip
                          round='true' size='small'
                          icon={<i className={accessConf?.icon ?? 'tabler-shield'} />}
                          label={accessConf?.label ?? lic.accessLevel}
                          color={accessConf?.color === 'default' ? 'secondary' : accessConf?.color ?? 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {lic.accountEmail ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip
                          round='true' size='small'
                          icon={<i className={statusConf?.icon ?? 'tabler-circle'} />}
                          label={statusConf?.label ?? lic.licenseStatus}
                          color={statusConf?.color === 'default' ? 'secondary' : statusConf?.color ?? 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {formatDate(lic.activatedAt ?? lic.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align='center' sx={{ py: 6 }}>
                      <Stack alignItems='center' spacing={1}>
                        <i className='tabler-key' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                        <Typography color='text.secondary'>No hay licencias asignadas.</Typography>
                        <Typography variant='caption' color='text.disabled'>
                          Asigna herramientas AI a los miembros del equipo.
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Assign License Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth='sm'
        fullWidth
        closeAfterTransition={false}
      >
        <DialogTitle>Asignar licencia</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <CustomTextField
              select fullWidth size='small' label='Colaborador'
              value={formMember} onChange={e => setFormMember(e.target.value)}
              required
            >
              {(meta?.activeMembers ?? []).map(m => (
                <MenuItem key={m.memberId} value={m.memberId}>{m.displayName}</MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              select fullWidth size='small' label='Herramienta'
              value={formTool} onChange={e => setFormTool(e.target.value)}
              required
            >
              {(meta?.providers ?? []).length === 0 && <MenuItem value='' disabled>Cargando...</MenuItem>}
              {/* We'd ideally fetch tools list here, but we can use toolCategories as proxy for now */}
            </CustomTextField>
            <CustomTextField
              select fullWidth size='small' label='Nivel de acceso'
              value={formAccess} onChange={e => setFormAccess(e.target.value)}
            >
              {(meta?.accessLevels ?? ['full', 'limited', 'trial', 'viewer']).map(al => (
                <MenuItem key={al} value={al}>{accessLevelConfig[al]?.label ?? al}</MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              fullWidth size='small' label='Email de cuenta'
              value={formEmail} onChange={e => setFormEmail(e.target.value)}
              helperText='Email asociado a la cuenta de la herramienta'
            />
            <CustomTextField
              fullWidth size='small' label='Fecha expiración' type='date'
              value={formExpires} onChange={e => setFormExpires(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <CustomTextField
              fullWidth size='small' label='Notas'
              value={formNotes} onChange={e => setFormNotes(e.target.value)}
              multiline rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant='contained' onClick={handleSave} disabled={saving || !formMember || !formTool}>
            {saving ? 'Asignando...' : 'Asignar licencia'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AiLicensesTab
