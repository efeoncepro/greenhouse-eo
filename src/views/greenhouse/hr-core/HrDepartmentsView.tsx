'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import { useForm, Controller } from 'react-hook-form'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
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
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { BusinessLineMetadata } from '@/types/business-line'
import type { HrDepartment, HrDepartmentsResponse } from '@/types/hr-core'
import type { PersonListItem } from '@/types/people'

// ── Form types ──

interface DepartmentFormValues {
  name: string
  businessUnit: string
  description: string
  parentDepartmentId: string
  headMemberId: string
  sortOrder: number
  active: boolean
}

const FORM_DEFAULTS: DepartmentFormValues = {
  name: '',
  businessUnit: '',
  description: '',
  parentDepartmentId: '',
  headMemberId: '',
  sortOrder: 0,
  active: true
}

// ── Lightweight member option for autocomplete ──

interface MemberOption {
  memberId: string
  displayName: string
  roleTitle: string
}

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

  // Reference data for selects
  const [businessLines, setBusinessLines] = useState<BusinessLineMetadata[]>([])
  const [members, setMembers] = useState<MemberOption[]>([])
  const [loadingBL, setLoadingBL] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)

  const { control, handleSubmit, reset, formState: { isValid } } = useForm<DepartmentFormValues>({
    defaultValues: FORM_DEFAULTS,
    mode: 'onChange'
  })

  // ── Data fetching ──

  const fetchDepts = useCallback(async () => {
    const res = await fetch('/api/hr/core/departments')

    if (res.ok) setData(await res.json())
    else setError('Error cargando departamentos')
    setLoading(false)
  }, [])

  useEffect(() => { fetchDepts() }, [fetchDepts])

  const fetchBusinessLines = useCallback(async () => {
    if (businessLines.length > 0) return
    setLoadingBL(true)

    try {
      const res = await fetch('/api/admin/business-lines', { signal: AbortSignal.timeout(5000) })

      if (res.ok) {
        const payload = await res.json()

        setBusinessLines(payload.businessLines ?? [])
      }
    } catch {
      // silently fail — field remains usable with existing values
    } finally {
      setLoadingBL(false)
    }
  }, [businessLines.length])

  const fetchMembers = useCallback(async () => {
    if (members.length > 0) return
    setLoadingMembers(true)

    try {
      const res = await fetch('/api/people', { signal: AbortSignal.timeout(5000) })

      if (res.ok) {
        const payload = await res.json()

        setMembers(
          (payload.items ?? [])
            .filter((p: PersonListItem) => p.active)
            .map((p: PersonListItem) => ({
              memberId: p.memberId,
              displayName: p.displayName,
              roleTitle: p.roleTitle
            }))
        )
      }
    } catch {
      // silently fail
    } finally {
      setLoadingMembers(false)
    }
  }, [members.length])

  // ── Computed ──

  const departments = data?.departments ?? []
  const uniqueBUs = new Set(departments.map(d => d.businessUnit))

  const nextSortOrder = useMemo(() => {
    if (departments.length === 0) return 1

    return Math.max(...departments.map(d => d.sortOrder)) + 1
  }, [departments])

  // ── Dialog helpers ──

  const openCreate = () => {
    setEditDept(null)
    reset({ ...FORM_DEFAULTS, sortOrder: nextSortOrder })
    setDialogOpen(true)
    void fetchBusinessLines()
    void fetchMembers()
  }

  const openEdit = (dept: HrDepartment) => {
    setEditDept(dept)
    reset({
      name: dept.name,
      businessUnit: dept.businessUnit,
      description: dept.description ?? '',
      parentDepartmentId: dept.parentDepartmentId ?? '',
      headMemberId: dept.headMemberId ?? '',
      sortOrder: dept.sortOrder,
      active: dept.active
    })
    setDialogOpen(true)
    void fetchBusinessLines()
    void fetchMembers()
  }

  const handleClose = () => {
    if (!saving) setDialogOpen(false)
  }

  const onSubmit = async (values: DepartmentFormValues) => {
    setSaving(true)
    setError(null)

    try {
      const body = {
        name: values.name,
        businessUnit: values.businessUnit,
        description: values.description || null,
        parentDepartmentId: values.parentDepartmentId || null,
        headMemberId: values.headMemberId || null,
        sortOrder: values.sortOrder,
        active: values.active
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
      toast.success(editDept ? 'Departamento actualizado' : 'Departamento creado')
      fetchDepts()
    } finally {
      setSaving(false)
    }
  }

  // ── Autocomplete selected value ──

  const selectedMember = useCallback(
    (memberId: string) => members.find(m => m.memberId === memberId) ?? null,
    [members]
  )

  // ── Parent department options (filter self in edit mode) ──

  const parentDeptOptions = useMemo(() => {
    if (!editDept) return departments

    return departments.filter(d => d.departmentId !== editDept.departmentId)
  }, [departments, editDept])

  // ── Render ──

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
                  <TableCell>Línea de negocio</TableCell>
                  <TableCell>Responsable</TableCell>
                  <TableCell align='center'>Posición</TableCell>
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
        onClose={handleClose}
        maxWidth='sm'
        fullWidth
        closeAfterTransition={false}
        aria-labelledby='dept-dialog-title'
      >
        <DialogTitle id='dept-dialog-title'>
          {editDept ? 'Editar departamento' : 'Nuevo departamento'}
        </DialogTitle>
        <Divider />
        <DialogContent>
          <form id='dept-form' onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* ── Identidad ── */}
              <Typography variant='overline' color='text.secondary'>Identidad</Typography>

              <Controller
                name='name'
                control={control}
                rules={{ required: 'El nombre es obligatorio', minLength: { value: 2, message: 'Mínimo 2 caracteres' } }}
                render={({ field, fieldState }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    size='small'
                    label='Nombre'
                    required
                    inputProps={{ 'aria-required': true }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    FormHelperTextProps={fieldState.error ? { role: 'alert' } : undefined}
                  />
                )}
              />

              <Controller
                name='businessUnit'
                control={control}
                rules={{ required: 'La línea de negocio es obligatoria' }}
                render={({ field, fieldState }) => (
                  <CustomTextField
                    {...field}
                    select
                    fullWidth
                    size='small'
                    label='Línea de negocio'
                    required
                    inputProps={{ 'aria-required': true }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    FormHelperTextProps={fieldState.error ? { role: 'alert' } : undefined}
                    disabled={loadingBL}
                  >
                    {businessLines.filter(bl => bl.isActive).map(bl => (
                      <MenuItem key={bl.moduleCode} value={bl.moduleCode}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: bl.colorHex,
                              flexShrink: 0
                            }}
                          />
                          {bl.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />

              <Controller
                name='description'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    size='small'
                    label='Descripción'
                    multiline
                    rows={2}
                    placeholder='Propósito y alcance del departamento'
                  />
                )}
              />

              {/* ── Organización ── */}
              <Typography variant='overline' color='text.secondary' sx={{ pt: 1 }}>Organización</Typography>

              <Controller
                name='parentDepartmentId'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    select
                    fullWidth
                    size='small'
                    label='Departamento padre'
                    helperText='Dejar vacío para departamento raíz'
                  >
                    <MenuItem value=''>
                      <Typography color='text.secondary' variant='body2'>Ninguno (raíz)</Typography>
                    </MenuItem>
                    {parentDeptOptions.map(d => (
                      <MenuItem key={d.departmentId} value={d.departmentId}>
                        {d.name}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />

              <Controller
                name='headMemberId'
                control={control}
                render={({ field: { onChange, value, ...field } }) => (
                  <Autocomplete
                    {...field}
                    options={members}
                    value={selectedMember(value)}
                    onChange={(_, option) => onChange(option?.memberId ?? '')}
                    getOptionLabel={o => o.displayName}
                    isOptionEqualToValue={(opt, val) => opt.memberId === val.memberId}
                    loading={loadingMembers}
                    renderOption={(props, option) => (
                      <li {...props} key={option.memberId}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant='body2' fontWeight={500}>{option.displayName}</Typography>
                          <Typography variant='caption' color='text.secondary'>{option.roleTitle}</Typography>
                        </Box>
                      </li>
                    )}
                    renderInput={params => (
                      <CustomTextField
                        {...params}
                        size='small'
                        label='Responsable'
                        placeholder='Buscar por nombre…'
                        helperText='Persona que lidera este departamento'
                      />
                    )}
                  />
                )}
              />

              {/* ── Configuración (solo en edición) ── */}
              {editDept && (
                <>
                  <Typography variant='overline' color='text.secondary' sx={{ pt: 1 }}>Configuración</Typography>

                  <Controller
                    name='sortOrder'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                        fullWidth
                        size='small'
                        label='Posición'
                        type='number'
                        helperText={`Valor actual: ${editDept.sortOrder}`}
                      />
                    )}
                  />

                  <Controller
                    name='active'
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={field.value} onChange={field.onChange} />}
                        label='Departamento activo'
                      />
                    )}
                  />
                </>
              )}
            </Stack>
          </form>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type='submit'
            form='dept-form'
            variant='contained'
            disabled={saving || !isValid}
          >
            {saving ? 'Guardando...' : editDept ? 'Guardar cambios' : 'Crear departamento'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default HrDepartmentsView
