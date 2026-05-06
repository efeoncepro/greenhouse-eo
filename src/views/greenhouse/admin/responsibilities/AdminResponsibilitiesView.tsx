'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomAvatar from '@core/components/mui/Avatar'

import EmptyState from '@components/greenhouse/EmptyState'
import {
  RESPONSIBILITY_TYPE_LABELS,
  RESPONSIBILITY_TYPES,
  SCOPE_TYPE_LABELS,
  SCOPE_TYPES
} from '@/config/responsibility-codes'
import type { ResponsibilityType, ScopeType } from '@/config/responsibility-codes'
import { getInitials } from '@/utils/getInitials'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

// ── Types ──

interface ResponsibilityRow {
  responsibilityId: string
  memberId: string
  memberName: string
  memberEmail: string | null
  scopeType: ScopeType
  scopeId: string
  scopeName: string | null
  responsibilityType: ResponsibilityType
  responsibilityLabel: string
  isPrimary: boolean
  effectiveFrom: string
  effectiveTo: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

interface MemberOption {
  memberId: string
  displayName: string
  email: string
  active: boolean
  avatarUrl: string | null
  roleTitle: string
}

interface SnackState {
  open: boolean
  message: string
  severity: 'success' | 'error'
}

type SortKey = 'member' | 'type' | 'scope' | 'primary' | 'effectiveFrom'
type SortDirection = 'asc' | 'desc'

// ── Helpers ──

const PAGE_SIZE = 10

const formatDate = (value: string | null) => {
  if (!value) return '—'

  return formatGreenhouseDate(new Date(value), {
  dateStyle: 'medium',
  timeZone: 'America/Santiago'
}, 'es-CL')
}

const sortComparators: Record<SortKey, (a: ResponsibilityRow, b: ResponsibilityRow) => number> = {
  member: (a, b) => a.memberName.localeCompare(b.memberName),
  type: (a, b) => a.responsibilityType.localeCompare(b.responsibilityType),
  scope: (a, b) => a.scopeType.localeCompare(b.scopeType) || a.scopeId.localeCompare(b.scopeId),
  primary: (a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1),
  effectiveFrom: (a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)
}

const columns: Array<{ key: SortKey; label: string; align: 'left' | 'center' | 'right' }> = [
  { key: 'member', label: 'Responsable', align: 'left' },
  { key: 'type', label: 'Tipo', align: 'left' },
  { key: 'scope', label: 'Scope', align: 'left' },
  { key: 'primary', label: 'Primario', align: 'center' },
  { key: 'effectiveFrom', label: 'Vigencia', align: 'left' }
]

// ── Component ──

const AdminResponsibilitiesView = () => {
  // Data state
  const [rows, setRows] = useState<ResponsibilityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Table state
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('member')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // Revoke state
  const [revoking, setRevoking] = useState<string | null>(null)

  // Snackbar
  const [snack, setSnack] = useState<SnackState>({ open: false, message: '', severity: 'success' })

  // Form state
  const [form, setForm] = useState({
    member: null as MemberOption | null,
    responsibilityType: '' as ResponsibilityType | '',
    scopeType: '' as ScopeType | '',
    scopeId: '',
    isPrimary: false
  })

  // ── Data fetching ──

  const fetchResponsibilities = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/responsibilities')

      if (!res.ok) throw new Error('Error al obtener responsabilidades')

      const data = await res.json()

      setRows(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true)

    try {
      const res = await fetch('/api/admin/team/members')

      if (!res.ok) return

      const data = await res.json()

      const active = (data.members ?? [])
        .filter((m: { active: boolean }) => m.active)
        .map((m: { memberId: string; displayName: string; email: string; avatarUrl: string | null; roleTitle: string }) => ({
          memberId: m.memberId,
          displayName: m.displayName,
          email: m.email,
          active: true,
          avatarUrl: m.avatarUrl,
          roleTitle: m.roleTitle
        }))

      setMembers(active)
    } catch {
      // silently fail — user will see an empty autocomplete
    } finally {
      setMembersLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResponsibilities()
  }, [fetchResponsibilities])

  // ── Sorting ──

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDir('asc')
      }

      setPage(0)
    },
    [sortKey]
  )

  const sortedRows = useMemo(() => {
    const comparator = sortComparators[sortKey]
    const sorted = [...rows].sort(comparator)

    return sortDir === 'desc' ? sorted.reverse() : sorted
  }, [rows, sortKey, sortDir])

  const paginatedRows = useMemo(
    () => sortedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [sortedRows, page]
  )

  // ── Dialog handlers ──

  const handleOpenDialog = useCallback(() => {
    setForm({
      member: null,
      responsibilityType: '',
      scopeType: '',
      scopeId: '',
      isPrimary: false
    })
    setDialogOpen(true)

    if (members.length === 0) {
      fetchMembers()
    }
  }, [members.length, fetchMembers])

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false)
  }, [])

  const handleCreate = useCallback(async () => {
    if (!form.member || !form.responsibilityType || !form.scopeType || !form.scopeId) return

    setSaving(true)

    try {
      const res = await fetch('/api/admin/responsibilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: form.member.memberId,
          responsibilityType: form.responsibilityType,
          scopeType: form.scopeType,
          scopeId: form.scopeId,
          isPrimary: form.isPrimary,
          effectiveFrom: new Date().toISOString().slice(0, 10)
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        throw new Error(data.error || 'Error al asignar responsabilidad')
      }

      setDialogOpen(false)
      setSnack({ open: true, message: 'Responsabilidad asignada.', severity: 'success' })
      await fetchResponsibilities()
    } catch (err) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Error al asignar responsabilidad.',
        severity: 'error'
      })
    } finally {
      setSaving(false)
    }
  }, [form, fetchResponsibilities])

  // ── Revoke handler ──

  const handleRevoke = useCallback(
    async (id: string) => {
      setRevoking(id)

      try {
        const res = await fetch(`/api/admin/responsibilities/${id}`, { method: 'DELETE' })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))

          throw new Error(data.error || 'Error al revocar responsabilidad')
        }

        setSnack({ open: true, message: 'Responsabilidad revocada.', severity: 'success' })
        await fetchResponsibilities()
      } catch (err) {
        setSnack({
          open: true,
          message: err instanceof Error ? err.message : 'Error al revocar responsabilidad.',
          severity: 'error'
        })
      } finally {
        setRevoking(null)
      }
    },
    [fetchResponsibilities]
  )

  // ── Form valid check ──

  const isFormValid = Boolean(
    form.member && form.responsibilityType && form.scopeType && form.scopeId.trim()
  )

  // ── Render ──

  return (
    <Box>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Responsabilidades operativas'
          subheader='Asigna lideres de cuenta, delivery, finanzas y operaciones por scope.'
          avatar={
            <CustomAvatar variant='rounded' skin='light' color='primary' size={42}>
              <i className='tabler-shield-check' />
            </CustomAvatar>
          }
          action={
            <Button
              variant='contained'
              size='small'
              startIcon={<i className='tabler-plus' />}
              onClick={handleOpenDialog}
            >
              Asignar
            </Button>
          }
        />
        <Divider />
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {/* Loading */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {/* Error */}
          {!loading && error && (
            <Box sx={{ p: 3 }}>
              <Alert
                severity='error'
                action={
                  <Button color='inherit' size='small' onClick={fetchResponsibilities}>
                    Reintentar
                  </Button>
                }
              >
                {error}
              </Alert>
            </Box>
          )}

          {/* Empty state */}
          {!loading && !error && rows.length === 0 && (
            <Box sx={{ p: 3 }}>
              <EmptyState
                icon='tabler-shield-off'
                title='Sin responsabilidades asignadas'
                description='Usa el boton "Asignar" para comenzar a definir quien lidera cada cuenta, proyecto o departamento.'
                action={
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<i className='tabler-plus' />}
                    onClick={handleOpenDialog}
                  >
                    Asignar responsabilidad
                  </Button>
                }
                minHeight={200}
              />
            </Box>
          )}

          {/* Table */}
          {!loading && !error && rows.length > 0 && (
            <>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      {columns.map(col => (
                        <TableCell key={col.key} align={col.align}>
                          <TableSortLabel
                            active={sortKey === col.key}
                            direction={sortKey === col.key ? sortDir : 'asc'}
                            onClick={() => handleSort(col.key)}
                          >
                            {col.label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                      <TableCell align='right'>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRows.map(row => (
                      <TableRow key={row.responsibilityId} hover>
                        {/* Responsable */}
                        <TableCell>
                          <Stack direction='row' spacing={2} alignItems='center'>
                            <CustomAvatar skin='light' color='info' size={34}>
                              {getInitials(row.memberName || '??')}
                            </CustomAvatar>
                            <Stack spacing={0.25}>
                              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                {row.memberName}
                              </Typography>
                              {row.memberEmail && (
                                <Typography variant='caption' color='text.secondary'>
                                  {row.memberEmail}
                                </Typography>
                              )}
                            </Stack>
                          </Stack>
                        </TableCell>

                        {/* Tipo */}
                        <TableCell>
                          <Chip
                            label={RESPONSIBILITY_TYPE_LABELS[row.responsibilityType] ?? row.responsibilityType}
                            size='small'
                            variant='tonal'
                            color='primary'
                          />
                        </TableCell>

                        {/* Scope */}
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant='body2'>
                              {SCOPE_TYPE_LABELS[row.scopeType] ?? row.scopeType}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ fontSize: '0.75rem' }}
                            >
                              {row.scopeName ?? row.scopeId}
                            </Typography>
                          </Stack>
                        </TableCell>

                        {/* Primario */}
                        <TableCell align='center'>
                          <Chip
                            label={row.isPrimary ? 'Si' : 'No'}
                            size='small'
                            variant='tonal'
                            color={row.isPrimary ? 'success' : 'secondary'}
                          />
                        </TableCell>

                        {/* Vigencia */}
                        <TableCell>
                          <Typography variant='body2'>
                            {formatDate(row.effectiveFrom)}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {row.effectiveTo ? `hasta ${formatDate(row.effectiveTo)}` : 'Vigente'}
                          </Typography>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell align='right'>
                          <Tooltip title='Revocar responsabilidad' arrow>
                            <span>
                              <Button
                                size='small'
                                color='error'
                                variant='text'
                                disabled={revoking === row.responsibilityId}
                                onClick={() => handleRevoke(row.responsibilityId)}
                                startIcon={
                                  revoking === row.responsibilityId ? (
                                    <CircularProgress size={14} color='inherit' />
                                  ) : (
                                    <i className='tabler-trash' />
                                  )
                                }
                                aria-label={`Revocar responsabilidad de ${row.memberName}`}
                              >
                                Revocar
                              </Button>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component='div'
                count={rows.length}
                rowsPerPage={PAGE_SIZE}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPageOptions={[PAGE_SIZE]}
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Create dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth='sm'
        fullWidth
        aria-labelledby='assign-responsibility-title'
      >
        <DialogTitle id='assign-responsibility-title'>Asignar responsabilidad</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} mt={1}>
            {/* Miembro */}
            <Autocomplete
              options={members}
              value={form.member}
              onChange={(_, value) => setForm(prev => ({ ...prev, member: value }))}
              getOptionLabel={option => option.displayName}
              isOptionEqualToValue={(option, value) => option.memberId === value.memberId}
              loading={membersLoading}
              renderOption={(props, option) => (
                <Box component='li' {...props} key={option.memberId}>
                  <Stack direction='row' spacing={1.5} alignItems='center'>
                    <CustomAvatar skin='light' color='info' size={28}>
                      {getInitials(option.displayName)}
                    </CustomAvatar>
                    <Stack spacing={0}>
                      <Typography variant='body2' sx={{ fontWeight: 500 }}>
                        {option.displayName}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {option.roleTitle} &middot; {option.email}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              )}
              renderInput={params => (
                <TextField
                  {...params}
                  label='Miembro'
                  placeholder='Buscar por nombre...'
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {membersLoading ? <CircularProgress size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      )
                    }
                  }}
                />
              )}
            />

            {/* Tipo de responsabilidad */}
            <TextField
              select
              fullWidth
              label='Tipo de responsabilidad'
              value={form.responsibilityType}
              onChange={e =>
                setForm(prev => ({ ...prev, responsibilityType: e.target.value as ResponsibilityType }))
              }
            >
              {RESPONSIBILITY_TYPES.map(type => (
                <MenuItem key={type} value={type}>
                  {RESPONSIBILITY_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </TextField>

            {/* Tipo de scope */}
            <TextField
              select
              fullWidth
              label='Tipo de scope'
              value={form.scopeType}
              onChange={e => setForm(prev => ({ ...prev, scopeType: e.target.value as ScopeType }))}
            >
              {SCOPE_TYPES.map(type => (
                <MenuItem key={type} value={type}>
                  {SCOPE_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </TextField>

            {/* ID del scope */}
            <TextField
              fullWidth
              label='ID del scope'
              placeholder='ej. space-abc123'
              value={form.scopeId}
              onChange={e => setForm(prev => ({ ...prev, scopeId: e.target.value }))}
              helperText='Identificador del espacio, proyecto, departamento u organizacion.'
            />

            {/* Primario */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isPrimary}
                  onChange={e => setForm(prev => ({ ...prev, isPrimary: e.target.checked }))}
                />
              }
              label='Responsable primario'
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} color='secondary'>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
            disabled={saving || !isFormValid}
            startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-check' />}
          >
            {saving ? 'Asignando...' : 'Asignar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          variant='filled'
          onClose={() => setSnack(prev => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default AdminResponsibilitiesView
