'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
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
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
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

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { HrDepartment, HrDepartmentsResponse } from '@/types/hr-core'

type Props = {
  isAdmin?: boolean
}

const HrDepartmentsView = ({ isAdmin }: Props) => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<HrDepartmentsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDept, setEditDept] = useState<HrDepartment | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formBU, setFormBU] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formHead, setFormHead] = useState('')
  const [formSort, setFormSort] = useState<number | ''>(0)

  const fetchDepts = useCallback(async () => {
    const res = await fetch('/api/hr/core/departments')

    if (res.ok) setData(await res.json())
    else setError('Error cargando departamentos')
    setLoading(false)
  }, [])

  useEffect(() => { fetchDepts() }, [fetchDepts])

  const openCreate = () => {
    setEditDept(null)
    setFormName('')
    setFormBU('')
    setFormDesc('')
    setFormHead('')
    setFormSort(0)
    setDialogOpen(true)
  }

  const openEdit = (dept: HrDepartment) => {
    setEditDept(dept)
    setFormName(dept.name)
    setFormBU(dept.businessUnit)
    setFormDesc(dept.description ?? '')
    setFormHead(dept.headMemberId ?? '')
    setFormSort(dept.sortOrder)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const body = {
        name: formName,
        businessUnit: formBU,
        description: formDesc || null,
        headMemberId: formHead || null,
        sortOrder: formSort === '' ? 0 : formSort
      }

      const url = editDept ? `/api/hr/core/departments/${editDept.departmentId}` : '/api/hr/core/departments'
      const method = editDept ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const d = await res.json()

        setError(d.error || 'Error al guardar')

        return
      }

      setDialogOpen(false)
      fetchDepts()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={48} />
        <Grid container spacing={6}>
          {[0, 1, 2].map(i => (
            <Grid size={{ xs: 12, sm: 4 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={400} />
      </Stack>
    )
  }

  const departments = data?.departments ?? []
  const uniqueBUs = new Set(departments.map(d => d.businessUnit))

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
        <Stack direction='row' spacing={2} alignItems='center'>
          <Button component={Link} href='/hr' variant='tonal' color='secondary' size='small'>
            <i className='tabler-arrow-left' />
          </Button>
          <Box>
            <Typography variant='h4'>Departamentos</Typography>
            <Typography variant='body2' color='text.secondary'>
              Estructura organizacional
            </Typography>
          </Box>
        </Stack>
        {isAdmin && (
          <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
            Nuevo departamento
          </Button>
        )}
      </Stack>

      {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <HorizontalWithSubtitle
            title='Total departamentos'
            stats={String(data?.summary.total ?? 0)}
            avatarIcon='tabler-sitemap'
            avatarColor='primary'
            subtitle='Registrados en el sistema'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <HorizontalWithSubtitle
            title='Activos'
            stats={String(data?.summary.active ?? 0)}
            avatarIcon='tabler-check'
            avatarColor='success'
            subtitle='Con operación vigente'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <HorizontalWithSubtitle
            title='Unidades de negocio'
            stats={String(uniqueBUs.size)}
            avatarIcon='tabler-building'
            avatarColor='info'
            subtitle='Líneas de servicio únicas'
          />
        </Grid>
      </Grid>

      {/* Departments Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Departamentos'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-sitemap' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Unidad de negocio</TableCell>
                  <TableCell>Responsable</TableCell>
                  <TableCell align='center'>Orden</TableCell>
                  <TableCell align='center'>Estado</TableCell>
                  {isAdmin && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {departments.map(dept => (
                  <TableRow key={dept.departmentId} hover>
                    <TableCell>
                      <Typography variant='body2' fontWeight={500}>{dept.name}</Typography>
                      {dept.description && (
                        <Typography variant='caption' color='text.disabled' sx={{ display: 'block', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dept.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomChip round='true' size='small' label={dept.businessUnit} color='info' />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {dept.headMemberName ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{dept.sortOrder}</Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <CustomChip
                        round='true'
                        size='small'
                        icon={<i className={dept.active ? 'tabler-check' : 'tabler-x'} />}
                        label={dept.active ? 'Activo' : 'Inactivo'}
                        color={dept.active ? 'success' : 'secondary'}
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell align='right'>
                        <Button variant='tonal' size='small' color='secondary' onClick={() => openEdit(dept)}>
                          Editar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {departments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} align='center' sx={{ py: 6 }}>
                      <Stack alignItems='center' spacing={1}>
                        <i className='tabler-sitemap' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                        <Typography color='text.secondary'>No hay departamentos configurados.</Typography>
                        <Typography variant='caption' color='text.disabled'>
                          Crea el primer departamento para organizar tu equipo.
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

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth='sm'
        fullWidth
        closeAfterTransition={false}
      >
        <DialogTitle>{editDept ? 'Editar departamento' : 'Nuevo departamento'}</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Nombre'
              value={formName}
              onChange={e => setFormName(e.target.value)}
              required
            />
            <CustomTextField
              fullWidth
              size='small'
              label='Unidad de negocio'
              value={formBU}
              onChange={e => setFormBU(e.target.value)}
              required
              helperText='Ej: globe, efeonce_digital, reach, wave'
            />
            <CustomTextField
              fullWidth
              size='small'
              label='Descripción'
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              multiline
              rows={2}
            />
            <CustomTextField
              fullWidth
              size='small'
              label='ID responsable (member_id)'
              value={formHead}
              onChange={e => setFormHead(e.target.value)}
              helperText='Opcional. ID del miembro que lidera este departamento.'
            />
            <CustomTextField
              fullWidth
              size='small'
              label='Orden de visualización'
              type='number'
              value={formSort}
              onChange={e => setFormSort(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant='contained' onClick={handleSave} disabled={saving || !formName || !formBU}>
            {saving ? 'Guardando...' : editDept ? 'Guardar cambios' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default HrDepartmentsView
