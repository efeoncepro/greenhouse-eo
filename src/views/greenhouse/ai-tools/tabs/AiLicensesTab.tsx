'use client'

import { useState } from 'react'

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
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type { AiTool, MemberToolLicense, AiToolingAdminMetadata } from '@/types/ai-tools'
import { licenseStatusConfig, accessLevelConfig, formatDate } from '../helpers'
import { getInitials } from '@/utils/getInitials'

type Props = {
  licenses: MemberToolLicense[]
  tools: AiTool[]
  meta: AiToolingAdminMetadata | null
  onRefresh: () => void
}

const AiLicensesTab = ({ licenses, tools, meta, onRefresh }: Props) => {
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

  const hasFilters = Boolean(filterStatus || search)

  return (
    <>
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Licencias de herramientas'
          subheader={licenses.length > 0 ? `${licenses.length} licencias asignadas` : undefined}
          avatar={
            <CustomAvatar variant='rounded' skin='light' color='info' size={40}>
              <i className='tabler-key' style={{ fontSize: 22 }} />
            </CustomAvatar>
          }
          action={
            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
              Asignar licencia
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {/* Filters */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <CustomTextField
                fullWidth size='small'
                placeholder='Buscar por nombre o herramienta...'
                value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: 'var(--mui-palette-text-disabled)' }} />
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField
                select fullWidth size='small' label='Estado'
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              >
                <MenuItem value=''>Todos los estados</MenuItem>
                {(meta?.licenseStatuses ?? Object.keys(licenseStatusConfig)).map(s => (
                  <MenuItem key={s} value={s}>
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <i className={licenseStatusConfig[s as keyof typeof licenseStatusConfig]?.icon ?? 'tabler-circle'} style={{ fontSize: 16 }} />
                      <span>{licenseStatusConfig[s as keyof typeof licenseStatusConfig]?.label ?? s}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              {hasFilters && (
                <Button
                  variant='tonal' color='secondary' size='small' fullWidth
                  onClick={() => { setSearch(''); setFilterStatus('') }}
                  startIcon={<i className='tabler-filter-off' />}
                  sx={{ height: 40 }}
                >
                  Limpiar
                </Button>
              )}
            </Grid>
          </Grid>

          {/* Table */}
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Colaborador</TableCell>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Herramienta</TableCell>
                  <TableCell align='center' sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Acceso</TableCell>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Email cuenta</TableCell>
                  <TableCell align='center' sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Asignado</TableCell>
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
                          <CustomAvatar skin='light' color='info' size={30}>
                            {getInitials(lic.memberName || '')}
                          </CustomAvatar>
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
                          round='true' size='small' variant='tonal'
                          icon={<i className={accessConf?.icon ?? 'tabler-shield'} />}
                          label={accessConf?.label ?? lic.accessLevel}
                          color={accessConf?.color === 'default' ? 'secondary' : accessConf?.color ?? 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary' sx={{ fontFamily: lic.accountEmail ? 'monospace' : undefined, fontSize: lic.accountEmail ? '0.8rem' : undefined }}>
                          {lic.accountEmail ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip
                          round='true' size='small' variant='tonal'
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
                    <TableCell colSpan={6} sx={{ py: 8, border: 0 }}>
                      <Stack alignItems='center' spacing={2}>
                        <CustomAvatar variant='rounded' skin='light' color='info' size={56}>
                          <i className='tabler-key' style={{ fontSize: 28 }} />
                        </CustomAvatar>
                        {hasFilters ? (
                          <>
                            <Typography variant='h6' color='text.secondary'>Sin resultados</Typography>
                            <Typography variant='body2' color='text.disabled'>
                              No hay licencias que coincidan con los filtros.
                            </Typography>
                            <Button
                              variant='tonal' size='small'
                              onClick={() => { setSearch(''); setFilterStatus('') }}
                              startIcon={<i className='tabler-filter-off' />}
                            >
                              Limpiar filtros
                            </Button>
                          </>
                        ) : (
                          <>
                            <Typography variant='h6' color='text.secondary'>Sin licencias asignadas</Typography>
                            <Typography variant='body2' color='text.disabled' sx={{ maxWidth: 360, textAlign: 'center' }}>
                              Asigna herramientas AI a los miembros del equipo para gestionar accesos y controlar el uso.
                            </Typography>
                            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
                              Asignar primera licencia
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

          {filtered.length > 0 && (
            <Typography variant='caption' color='text.disabled' sx={{ mt: 2, display: 'block' }}>
              Mostrando {filtered.length} de {licenses.length} licencias
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Assign License Dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth='sm' fullWidth closeAfterTransition={false}>
        <DialogTitle>
          <Stack direction='row' spacing={2} alignItems='center'>
            <CustomAvatar variant='rounded' skin='light' color='info' size={36}>
              <i className='tabler-key' style={{ fontSize: 20 }} />
            </CustomAvatar>
            <Box>
              <Typography variant='h6'>Asignar licencia</Typography>
              <Typography variant='caption' color='text.secondary'>Otorga acceso a una herramienta AI</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <CustomTextField
              select fullWidth size='small' label='Colaborador'
              value={formMember} onChange={e => setFormMember(e.target.value)}
              required
            >
              {(meta?.activeMembers ?? []).length === 0 && <MenuItem disabled value=''>Sin miembros disponibles</MenuItem>}
              {(meta?.activeMembers ?? []).map(m => (
                <MenuItem key={m.memberId} value={m.memberId}>{m.displayName}</MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              select fullWidth size='small' label='Herramienta'
              value={formTool} onChange={e => setFormTool(e.target.value)}
              required
            >
              {tools.length === 0 && <MenuItem value='' disabled>Sin herramientas disponibles</MenuItem>}
              {tools
                .filter(tool => tool.isActive)
                .map(tool => (
                  <MenuItem key={tool.toolId} value={tool.toolId}>{tool.toolName}</MenuItem>
                ))}
            </CustomTextField>
            <CustomTextField
              select fullWidth size='small' label='Nivel de acceso'
              value={formAccess} onChange={e => setFormAccess(e.target.value)}
            >
              {(meta?.accessLevels ?? ['full', 'limited', 'trial', 'viewer']).map(al => (
                <MenuItem key={al} value={al}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <i className={accessLevelConfig[al as keyof typeof accessLevelConfig]?.icon ?? 'tabler-shield'} style={{ fontSize: 16 }} />
                    <span>{accessLevelConfig[al as keyof typeof accessLevelConfig]?.label ?? al}</span>
                  </Stack>
                </MenuItem>
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
        <Divider />
        <DialogActions sx={{ px: 4, py: 2.5 }}>
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
