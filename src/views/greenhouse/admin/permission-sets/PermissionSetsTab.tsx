'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import { GOVERNANCE_SECTIONS, SECTION_ACCENT, VIEW_REGISTRY, type GovernanceSection } from '@/lib/admin/view-access-catalog'
import type { PermissionSetSummary, PermissionSetDetail, PermissionSetUserAssignment } from '@/types/permission-sets'

const GREENHOUSE_COPY = getMicrocopy()

// ── Constants ──

const SECTION_LABEL_MAP = new Map<string, string>(GOVERNANCE_SECTIONS.map(s => [s.key, s.label]))

const VIEWS_BY_SECTION = GOVERNANCE_SECTIONS.map(section => ({
  key: section.key as GovernanceSection,
  label: section.label,
  views: VIEW_REGISTRY.filter(v => v.section === section.key)
})).filter(group => group.views.length > 0)

// ── Component ──

const PermissionSetsTab = () => {
  const [sets, setSets] = useState<PermissionSetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createSection, setCreateSection] = useState('')
  const [createViewCodes, setCreateViewCodes] = useState<Set<string>>(new Set())
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PermissionSetDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editViewCodes, setEditViewCodes] = useState<Set<string>>(new Set())
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [removeTargetUserId, setRemoveTargetUserId] = useState<string | null>(null)
  const [removeTargetName, setRemoveTargetName] = useState<string>('')
  const [removing, setRemoving] = useState(false)

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)

  const [availableUsers, setAvailableUsers] = useState<Array<{ userId: string; fullName: string; email: string }>>([])
  const [availableUsersLoading, setAvailableUsersLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Array<{ userId: string; fullName: string; email: string }>>([])

  // ── Fetch sets ──

  const fetchSets = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/views/sets')
      const data = (await response.json()) as { sets?: PermissionSetSummary[]; error?: string }

      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los sets de permisos.')

      setSets(data.sets ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar sets de permisos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSets()
  }, [fetchSets])

  // ── Fetch detail ──

  const fetchDetail = useCallback(async (setId: string) => {
    setDetailLoading(true)
    setDetailError(null)
    setSaveError(null)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/admin/views/sets/${setId}`)
      const data = (await response.json()) as PermissionSetDetail & { error?: string }

      if (!response.ok) throw new Error(data.error || 'No se pudo cargar el detalle.')

      setDetail(data)
      setEditName(data.setName)
      setEditDescription(data.description ?? '')
      setEditViewCodes(new Set(data.viewCodes))
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Error al cargar detalle.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSetId) {
      fetchDetail(selectedSetId)
    } else {
      setDetail(null)
    }
  }, [selectedSetId, fetchDetail])

  // ── Filtered sets ──

  const filteredSets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    if (!q) return sets

    return sets.filter(s =>
      s.setName.toLowerCase().includes(q) ||
      (s.description ?? '').toLowerCase().includes(q) ||
      (s.section ?? '').toLowerCase().includes(q)
    )
  }, [sets, searchQuery])

  // ── Create ──

  const handleCreateOpen = () => {
    setCreateName('')
    setCreateDescription('')
    setCreateSection('')
    setCreateViewCodes(new Set())
    setCreateError(null)
    setCreateOpen(true)
  }

  const handleCreateSubmit = async () => {
    if (!createName.trim()) {
      setCreateError('El nombre es requerido.')

      return
    }

    if (createViewCodes.size === 0) {
      setCreateError('Selecciona al menos una vista.')

      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/admin/views/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim() || undefined,
          section: createSection || undefined,
          viewCodes: Array.from(createViewCodes)
        })
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) throw new Error(data.error || 'No se pudo crear el set de permisos.')

      setCreateOpen(false)
      toast.success('Set de permisos creado.')
      await fetchSets()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear set de permisos.')
    } finally {
      setCreating(false)
    }
  }

  // ── Save detail ──

  const detailIsDirty = useMemo(() => {
    if (!detail) return false

    if (editName !== detail.setName) return true
    if (editDescription !== (detail.description ?? '')) return true

    const originalCodes = new Set(detail.viewCodes)

    if (editViewCodes.size !== originalCodes.size) return true

    for (const code of editViewCodes) {
      if (!originalCodes.has(code)) return true
    }

    return false
  }, [detail, editName, editDescription, editViewCodes])

  const handleSaveDetail = async () => {
    if (!detail) return

    if (editViewCodes.size === 0) {
      setSaveError('Debe incluir al menos una vista.')

      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const body: Record<string, unknown> = { viewCodes: Array.from(editViewCodes) }

      if (!detail.isSystem) {
        body.name = editName.trim()
        body.description = editDescription.trim()
      }

      const response = await fetch(`/api/admin/views/sets/${detail.setId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar.')

      toast.success('Cambios guardados.')
      await fetchSets()
      await fetchDetail(detail.setId)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──

  const handleDeleteClick = () => {
    if (!detail || detail.isSystem) return
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!detail || detail.isSystem) return

    setDeleteConfirmOpen(false)
    setDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/admin/views/sets/${detail.setId}`, { method: 'DELETE' })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar.')

      toast.success('Set de permisos eliminado.')
      setSelectedSetId(null)
      await fetchSets()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar.')
    } finally {
      setDeleting(false)
    }
  }

  // ── Assign users ──

  const fetchAvailableUsers = useCallback(async () => {
    if (!detail) return
    setAvailableUsersLoading(true)

    try {
      const response = await fetch(`/api/admin/views/sets/${detail.setId}/users?scope=assignable`)
      const data = (await response.json()) as { users?: Array<{ userId: string; fullName: string; email: string }>; error?: string }

      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los usuarios.')

      const assignedIds = new Set(detail.users.map(u => u.userId))
      const filtered = (data.users ?? []).filter(u => !assignedIds.has(u.userId))

      setAvailableUsers(filtered)
    } catch {
      setAvailableUsers([])
    } finally {
      setAvailableUsersLoading(false)
    }
  }, [detail])

  useEffect(() => {
    if (assignDialogOpen) {
      fetchAvailableUsers()
    }
  }, [assignDialogOpen, fetchAvailableUsers])

  const handleAssignSubmit = async () => {
    if (!detail) return

    const ids = selectedUsers.map(u => u.userId)

    if (ids.length === 0) {
      setAssignError('Selecciona al menos un usuario.')

      return
    }

    setAssigning(true)
    setAssignError(null)

    try {
      const response = await fetch(`/api/admin/views/sets/${detail.setId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: ids })
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) throw new Error(data.error || 'No se pudieron asignar los usuarios.')

      setAssignDialogOpen(false)
      setSelectedUsers([])
      toast.success('Usuarios asignados.')
      await fetchDetail(detail.setId)
      await fetchSets()
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Error al asignar usuarios.')
    } finally {
      setAssigning(false)
    }
  }

  // ── Remove user ──

  const handleRemoveUserClick = (userId: string, displayName: string) => {
    setRemoveTargetUserId(userId)
    setRemoveTargetName(displayName)
    setRemoveConfirmOpen(true)
  }

  const handleRemoveUserConfirm = async () => {
    if (!detail || !removeTargetUserId) return

    setRemoveConfirmOpen(false)
    setRemoving(true)

    try {
      const response = await fetch(`/api/admin/views/sets/${detail.setId}/users/${removeTargetUserId}`, { method: 'DELETE' })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) throw new Error(data.error || 'No se pudo revocar al usuario.')

      toast.success('Usuario revocado del set.')
      await fetchDetail(detail.setId)
      await fetchSets()
    } catch {
      setSaveError('No se pudo revocar al usuario del set.')
    } finally {
      setRemoving(false)
      setRemoveTargetUserId(null)
      setRemoveTargetName('')
    }
  }

  // ── View code toggle helpers ──

  const toggleCreateViewCode = (code: string) => {
    setCreateViewCodes(prev => {
      const next = new Set(prev)

      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }

      return next
    })
  }

  const toggleEditViewCode = (code: string) => {
    setEditViewCodes(prev => {
      const next = new Set(prev)

      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }

      return next
    })
  }

  // ── Render: view code checkboxes grouped by section ──

  const renderViewCodeCheckboxes = (
    selectedCodes: Set<string>,
    onToggle: (code: string) => void,
    filterSection?: string
  ) => {
    const groups = filterSection
      ? VIEWS_BY_SECTION.filter(g => g.key === filterSection)
      : VIEWS_BY_SECTION

    return (
      <Stack spacing={3}>
        {groups.map(group => (
          <Box key={group.key}>
            <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
              <Chip
                size='small'
                color={SECTION_ACCENT[group.key] ?? 'primary'}
                variant='tonal'
                label={group.label}
              />
              <Typography variant='caption' color='text.secondary'>
                {group.views.filter(v => selectedCodes.has(v.viewCode)).length} de {group.views.length}
              </Typography>
            </Stack>
            <FormGroup sx={{ pl: 1 }} role='group' aria-label={`Vistas de ${group.label}`}>
              {group.views.map(view => (
                <FormControlLabel
                  key={view.viewCode}
                  control={
                    <Checkbox
                      size='small'
                      checked={selectedCodes.has(view.viewCode)}
                      onChange={() => onToggle(view.viewCode)}
                    />
                  }
                  label={
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <Typography variant='body2'>{view.label}</Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.75rem' }}>
                        {view.viewCode}
                      </Typography>
                    </Stack>
                  }
                />
              ))}
            </FormGroup>
          </Box>
        ))}
      </Stack>
    )
  }

  // ── Render: set card ──

  const renderSetCard = (set: PermissionSetSummary) => {
    const isSelected = selectedSetId === set.setId

    return (
      <Card
        key={set.setId}
        variant='outlined'
        role='button'
        tabIndex={0}
        aria-label={`Ver detalle de ${set.setName}`}
        sx={{
          cursor: 'pointer',
          transition: 'box-shadow 0.15s',
          ...(isSelected && {
            borderColor: 'primary.main',
            borderWidth: 2
          }),
          '&:hover': { boxShadow: theme => theme.shadows[4] },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 }
        }}
        onClick={() => setSelectedSetId(isSelected ? null : set.setId)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setSelectedSetId(isSelected ? null : set.setId)
          }
        }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between'>
              <Stack direction='row' spacing={1} alignItems='center' sx={{ minWidth: 0 }}>
                <Typography variant='subtitle1' noWrap>{set.setName}</Typography>
                {set.isSystem ? (
                  <Tooltip title='Creado por el sistema. No se puede eliminar.'>
                    <Chip size='small' variant='tonal' color='secondary' label='Sistema' />
                  </Tooltip>
                ) : null}
              </Stack>
              {set.section ? (
                <Chip
                  size='small'
                  variant='tonal'
                  color={SECTION_ACCENT[set.section] ?? 'primary'}
                  label={SECTION_LABEL_MAP.get(set.section) ?? set.section}
                />
              ) : null}
            </Stack>
            {set.description ? (
              <Typography variant='body2' color='text.secondary' sx={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                {set.description}
              </Typography>
            ) : null}
            <Stack direction='row' spacing={1.5}>
              <Chip size='small' variant='outlined' icon={<i className='tabler-eye' aria-hidden='true' />} label={`${set.viewCodes.length} vistas`} />
              <Chip size='small' variant='outlined' icon={<i className='tabler-users' aria-hidden='true' />} label={`${set.userCount} usuarios`} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  // ── Render: detail panel ──

  const renderDetailPanel = () => {
    if (!selectedSetId) return null

    if (detailLoading) {
      return (
        <Card variant='outlined'>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          </CardContent>
        </Card>
      )
    }

    if (detailError) {
      return (
        <Card variant='outlined'>
          <CardContent>
            <Alert severity='error'>{detailError}</Alert>
          </CardContent>
        </Card>
      )
    }

    if (!detail) return null

    return (
      <Card variant='outlined'>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction='row' spacing={1.5} alignItems='center' justifyContent='space-between'>
              <Stack direction='row' spacing={1} alignItems='center'>
                <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity', color: 'primary.main', width: 36, height: 36 }}>
                  <i className='tabler-shield-check' style={{ fontSize: '1.2rem' }} />
                </Avatar>
                <Typography variant='h6'>{detail.setName}</Typography>
                {detail.isSystem ? (
                  <Tooltip title='Creado por el sistema. No se puede eliminar.'>
                    <Chip size='small' variant='tonal' color='secondary' label='Sistema' />
                  </Tooltip>
                ) : null}
              </Stack>
              <IconButton size='small' onClick={() => setSelectedSetId(null)} aria-label='Cerrar panel'>
                <i className='tabler-x' />
              </IconButton>
            </Stack>

            <Divider />

            <Stack spacing={2}>
              <TextField
                label='Nombre'
                size='small'
                fullWidth
                value={editName}
                onChange={e => setEditName(e.target.value)}
                disabled={detail.isSystem}
              />
              <TextField
                label='Descripción'
                size='small'
                fullWidth
                multiline
                minRows={2}
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                disabled={detail.isSystem}
              />
            </Stack>

            <Divider />

            <Box>
              <Typography variant='subtitle2' component='h3' sx={{ mb: 2 }}>Vistas incluidas</Typography>
              {renderViewCodeCheckboxes(editViewCodes, toggleEditViewCode)}
            </Box>

            {saveError ? <Alert severity='error'>{saveError}</Alert> : null}

            <Stack direction='row' spacing={1.5}>
              <Button
                variant='contained'
                onClick={handleSaveDetail}
                disabled={!detailIsDirty || saving}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
              {!detail.isSystem ? (
                <Button
                  variant='outlined'
                  color='error'
                  onClick={handleDeleteClick}
                  disabled={deleting}
                >
                  {deleting ? 'Eliminando...' : 'Eliminar set'}
                </Button>
              ) : null}
            </Stack>

            {deleteError ? <Alert severity='error' sx={{ mt: 1 }}>{deleteError}</Alert> : null}

            <Divider />

            <Stack spacing={2}>
              <Stack direction='row' spacing={1.5} alignItems='center' justifyContent='space-between'>
                <Typography variant='subtitle2' component='h3'>Usuarios asignados</Typography>
                <Button
                  size='small'
                  variant='outlined'
                  startIcon={<i className='tabler-user-plus' />}
                  onClick={() => {
                    setSelectedUsers([])
                    setAssignError(null)
                    setAssignDialogOpen(true)
                  }}
                >
                  Asignar usuarios
                </Button>
              </Stack>

              {detail.users.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                  Este set de permisos no tiene usuarios asignados.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {detail.users.map((user: PermissionSetUserAssignment) => (
                    <Card key={user.assignmentId} variant='outlined'>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction='row' spacing={1.5} alignItems='center' justifyContent='space-between'>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant='body2' noWrap>
                              {user.fullName ?? user.userId}
                            </Typography>
                            {user.email ? (
                              <Typography variant='caption' color='text.secondary' noWrap>
                                {user.email}
                              </Typography>
                            ) : null}
                          </Box>
                          <IconButton
                            size='small'
                            color='error'
                            disabled={removing && removeTargetUserId === user.userId}
                            onClick={e => {
                              e.stopPropagation()
                              handleRemoveUserClick(user.userId, user.fullName ?? user.userId)
                            }}
                            aria-label={`Revocar ${user.fullName ?? user.userId}`}
                          >
                            <i className='tabler-user-minus' />
                          </IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>

            <Box>
              <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.75rem' }}>
                {detail.setId}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  // ── Main render ──

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent='space-between'>
        <Box>
          <Typography variant='h6' sx={{ mb: 0.5 }}>Sets de permisos</Typography>
          <Typography variant='body2' color='text.secondary'>
            Agrupa vistas en conjuntos reutilizables y asigna a usuarios para gobierno de acceso granular.
          </Typography>
        </Box>
        <Button
          variant='contained'
          startIcon={<i className='tabler-plus' />}
          onClick={handleCreateOpen}
        >
          Crear set de permisos
        </Button>
      </Stack>

      <TextField
        size='small'
        label='Buscar por nombre'
        placeholder='ej. Finanzas, Operaciones...'
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        sx={{ maxWidth: 400 }}
      />

      {error ? <Alert severity='error'>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredSets.length === 0 ? (
        <Card variant='outlined'>
          <CardContent>
            <Typography color='text.secondary'>
              {searchQuery.trim()
                ? `No hay sets de permisos que coincidan con "${searchQuery}".`
                : 'No hay sets de permisos creados. Crea el primero para empezar a gobernar acceso por conjuntos de vistas.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              md: selectedSetId ? '1fr 1fr' : 'repeat(2, minmax(0, 1fr))',
              lg: selectedSetId ? '1fr 1.2fr' : 'repeat(3, minmax(0, 1fr))'
            }
          }}
        >
          <Stack spacing={2} sx={{ order: 1 }}>
            {filteredSets.map(set => renderSetCard(set))}
          </Stack>

          {selectedSetId ? (
            <Box sx={{ order: 2 }}>
              {renderDetailPanel()}
            </Box>
          ) : null}
        </Box>
      )}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth='sm'
        fullWidth
        aria-labelledby='create-permission-set-title'
      >
        <DialogTitle id='create-permission-set-title'>Crear set de permisos</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label='Nombre'
              size='small'
              fullWidth
              required
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              placeholder='ej. Acceso operaciones'
            />
            <TextField
              label='Descripción'
              size='small'
              fullWidth
              multiline
              minRows={2}
              value={createDescription}
              onChange={e => setCreateDescription(e.target.value)}
              placeholder='Describe brevemente qué acceso otorga este set'
            />
            <TextField
              select
              label='Sección'
              size='small'
              fullWidth
              value={createSection}
              onChange={e => setCreateSection(e.target.value)}
            >
              <MenuItem value=''>Sin sección</MenuItem>
              {GOVERNANCE_SECTIONS.map(section => (
                <MenuItem key={section.key} value={section.key}>
                  {section.label}
                </MenuItem>
              ))}
            </TextField>

            <Divider />

            <Box>
              <Typography variant='subtitle2' component='h3' sx={{ mb: 1 }}>Vistas incluidas</Typography>
              {renderViewCodeCheckboxes(createViewCodes, toggleCreateViewCode, createSection || undefined)}
            </Box>

            {createError ? <Alert severity='error'>{createError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button
            variant='contained'
            onClick={handleCreateSubmit}
            disabled={creating}
          >
            {creating ? 'Creando...' : 'Crear set de permisos'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign users dialog */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        maxWidth='sm'
        fullWidth
        aria-labelledby='assign-users-title'
      >
        <DialogTitle id='assign-users-title'>Asignar usuarios</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              Busca y selecciona los usuarios que quieres agregar a este set de permisos.
            </Typography>
            {availableUsersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Autocomplete
                multiple
                options={availableUsers}
                getOptionLabel={opt => `${opt.fullName} (${opt.email})`}
                isOptionEqualToValue={(opt, val) => opt.userId === val.userId}
                value={selectedUsers}
                onChange={(_, newVal) => setSelectedUsers(newVal)}
                renderInput={params => (
                  <TextField
                    {...params}
                    label='Buscar usuarios'
                    placeholder='Escribe un nombre...'
                    size='small'
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((opt, index) => (
                    <Chip {...getTagProps({ index })} key={opt.userId} label={opt.fullName} size='small' />
                  ))
                }
                noOptionsText='No se encontraron usuarios disponibles'
              />
            )}
            {assignError ? <Alert severity='error'>{assignError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button
            variant='contained'
            onClick={handleAssignSubmit}
            disabled={assigning || selectedUsers.length === 0}
          >
            {assigning ? 'Asignando...' : 'Asignar usuarios'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth='xs'
        fullWidth
        aria-labelledby='delete-confirm-title'
      >
        <DialogTitle id='delete-confirm-title'>
          {detail ? `¿Eliminar «${detail.setName}»?` : '¿Eliminar este set de permisos?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta acción no se puede deshacer. Los usuarios asignados perderán el acceso que este set otorga.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' color='error' onClick={handleDeleteConfirm}>
            Eliminar set
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove user confirmation dialog */}
      <Dialog
        open={removeConfirmOpen}
        onClose={() => setRemoveConfirmOpen(false)}
        maxWidth='xs'
        fullWidth
        aria-labelledby='remove-user-confirm-title'
      >
        <DialogTitle id='remove-user-confirm-title'>
          {'¿Revocar acceso de este usuario?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {removeTargetName
              ? `El usuario ${removeTargetName} perderá las vistas que obtiene de este set de permisos. El usuario debe iniciar sesión de nuevo para que el cambio sea visible.`
              : 'El usuario perderá las vistas que obtiene de este set de permisos. El usuario debe iniciar sesión de nuevo para que el cambio sea visible.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConfirmOpen(false)}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' color='error' onClick={handleRemoveUserConfirm}>
            Revocar acceso
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default PermissionSetsTab
