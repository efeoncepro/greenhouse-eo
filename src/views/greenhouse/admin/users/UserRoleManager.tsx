'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import { roleColorFor, roleIconFor, toTitleCase } from './helpers'

interface RoleCatalogEntry {
  roleCode: string
  roleName: string
  roleFamily: string | null
  description: string | null
  tenantType: string | null
  isAdmin: boolean
  isInternal: boolean
  routeGroupScope: string[]
}

interface UserRoleAssignment {
  assignmentId: string
  roleCode: string
  roleName: string
  roleFamily: string | null
  active: boolean
  routeGroupScope: string[]
}

interface Props {
  userId: string
  tenantType: string
  initialRoleCodes: string[]
}

const UserRoleManager = ({ userId, initialRoleCodes }: Props) => {
  const [availableRoles, setAvailableRoles] = useState<RoleCatalogEntry[]>([])
  const [currentAssignments, setCurrentAssignments] = useState<UserRoleAssignment[]>([])
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<string[]>(initialRoleCodes)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadRoleState = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/users/${userId}/roles`)

      if (!response.ok) throw new Error('No se pudieron cargar los roles.')

      const data = await response.json()

      setAvailableRoles(data.availableRoles || [])
      setCurrentAssignments(data.currentAssignments || [])
      setSelectedRoleCodes((data.currentAssignments || []).map((a: UserRoleAssignment) => a.roleCode))
    } catch {
      setError('Error al cargar los roles del usuario.')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadRoleState()
  }, [loadRoleState])

  const selectedRoleObjects = useMemo(
    () => availableRoles.filter(r => selectedRoleCodes.includes(r.roleCode)),
    [availableRoles, selectedRoleCodes]
  )

  const derivedRouteGroups = useMemo(() => {
    const groups = new Set<string>()

    for (const role of selectedRoleObjects) {
      for (const group of role.routeGroupScope) {
        groups.add(group)
      }
    }

    return Array.from(groups).sort()
  }, [selectedRoleObjects])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleCodes: selectedRoleCodes })
      })

      if (!response.ok) throw new Error('No se pudieron actualizar los roles.')

      const data = await response.json()

      setCurrentAssignments(data.currentAssignments || [])
      setSelectedRoleCodes((data.currentAssignments || []).map((a: UserRoleAssignment) => a.roleCode))
      setIsEditing(false)
      setSuccessMessage('Roles actualizados correctamente.')
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch {
      setError('No pudimos actualizar los roles. Intenta nuevamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setSelectedRoleCodes(currentAssignments.map(a => a.roleCode))
    setIsEditing(false)
    setError(null)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress aria-label='Cargando roles del usuario' />
        </CardContent>
      </Card>
    )
  }

  return (
    <Stack spacing={6}>
      <Card>
        <CardHeader
          title='Roles asignados'
          avatar={
            <CustomAvatar variant='rounded' skin='light' color='warning'>
              <i className='tabler-shield-check' aria-hidden='true' />
            </CustomAvatar>
          }
          action={
            !isEditing ? (
              <Button
                variant='tonal'
                color='warning'
                size='small'
                startIcon={<i className='tabler-edit' aria-hidden='true' />}
                onClick={() => setIsEditing(true)}
              >
                Editar roles
              </Button>
            ) : null
          }
        />
        <Divider />
        <CardContent>
          <div aria-live='polite' aria-atomic='true'>
            {successMessage && (
              <Alert severity='success' sx={{ mb: 4 }}>
                {successMessage}
              </Alert>
            )}
          </div>
          <div aria-live='assertive' aria-atomic='true'>
            {error && (
              <Alert severity='error' sx={{ mb: 4 }}>
                {error}
              </Alert>
            )}
          </div>

          {!isEditing ? (
            /* ── View mode ── */
            <Box role='list' aria-label='Roles actualmente asignados' sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {currentAssignments.length === 0 ? (
                <Typography variant='body2' color='text.secondary' role='status'>
                  Sin roles asignados.
                </Typography>
              ) : (
                currentAssignments.map(assignment => (
                  <Box component='span' role='listitem' key={assignment.roleCode}>
                    <Chip
                      icon={<i className={roleIconFor(assignment.roleCode)} aria-hidden='true' />}
                      label={assignment.roleName || toTitleCase(assignment.roleCode)}
                      color={roleColorFor(assignment.roleCode)}
                      variant='tonal'
                    />
                  </Box>
                ))
              )}
            </Box>
          ) : (
            /* ── Edit mode ── */
            <Stack spacing={4}>
              <CustomAutocomplete
                multiple
                disableCloseOnSelect
                options={availableRoles}
                value={selectedRoleObjects}
                groupBy={option => (option.isInternal ? 'Roles internos' : 'Roles de cliente')}
                getOptionLabel={option => option.roleName || toTitleCase(option.roleCode)}
                isOptionEqualToValue={(option, value) => option.roleCode === value.roleCode}
                onChange={(_, newValue) => setSelectedRoleCodes(newValue.map(r => r.roleCode))}
                renderInput={params => (
                  <CustomTextField
                    {...params}
                    label='Seleccionar roles'
                    placeholder='Buscar rol...'
                    helperText='Selecciona uno o mas roles para definir los permisos y el acceso del usuario.'
                    inputProps={{
                      ...params.inputProps,
                      'aria-describedby': 'role-selector-help'
                    }}
                    FormHelperTextProps={{ id: 'role-selector-help' }}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index })

                    return (
                      <Chip
                        key={key}
                        icon={<i className={roleIconFor(option.roleCode)} aria-hidden='true' />}
                        label={option.roleName || toTitleCase(option.roleCode)}
                        color={roleColorFor(option.roleCode)}
                        variant='tonal'
                        size='small'
                        sx={{ '& .MuiChip-deleteIcon': { minWidth: 24, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' } }}
                        {...tagProps}
                      />
                    )
                  })
                }
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props

                  return (
                    <li key={key} {...optionProps}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <CustomAvatar variant='rounded' skin='light' color={roleColorFor(option.roleCode)} size={28}>
                          <i className={roleIconFor(option.roleCode)} style={{ fontSize: 16 }} aria-hidden='true' />
                        </CustomAvatar>
                        <Box>
                          <Typography variant='body2'>{option.roleName || toTitleCase(option.roleCode)}</Typography>
                          {option.description && (
                            <Typography variant='caption' color='text.secondary'>
                              {option.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </li>
                  )
                }}
              />

              {/* Route groups preview */}
              {derivedRouteGroups.length > 0 && (
                <Box>
                  <Typography variant='caption' component='h3' id='access-preview-heading' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', mb: 1, display: 'block' }}>
                    Vista previa de acceso
                  </Typography>
                  <Box role='group' aria-labelledby='access-preview-heading' sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {derivedRouteGroups.map(group => (
                      <Chip key={group} label={toTitleCase(group)} size='small' variant='outlined' />
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant='outlined' onClick={handleCancel} disabled={isSaving} aria-label='Cancelar edicion de roles'>
                  Cancelar
                </Button>
                <Button variant='contained' onClick={handleSave} disabled={isSaving} aria-busy={isSaving} aria-label={isSaving ? 'Guardando roles, por favor espera' : 'Guardar cambios de roles'}>
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

export default UserRoleManager
