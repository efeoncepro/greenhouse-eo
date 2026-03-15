'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
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

      if (!response.ok) throw new Error()

      const data = await response.json()

      setAvailableRoles(data.availableRoles || [])
      setCurrentAssignments(data.currentAssignments || [])
      setSelectedRoleCodes((data.currentAssignments || []).map((a: UserRoleAssignment) => a.roleCode))
    } catch {
      setError('No fue posible cargar la configuracion de roles. Verifica la conexion e intenta de nuevo.')
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

  const hasChanges = useMemo(() => {
    const current = currentAssignments.map(a => a.roleCode).sort().join(',')
    const selected = [...selectedRoleCodes].sort().join(',')

    return current !== selected
  }, [currentAssignments, selectedRoleCodes])

  const handleSave = async () => {
    if (selectedRoleCodes.length === 0) {
      setError('Selecciona al menos un rol antes de guardar. Un usuario sin roles no podra acceder al portal.')

      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleCodes: selectedRoleCodes })
      })

      if (!response.ok) throw new Error()

      const data = await response.json()

      setCurrentAssignments(data.currentAssignments || [])
      setSelectedRoleCodes((data.currentAssignments || []).map((a: UserRoleAssignment) => a.roleCode))
      setIsEditing(false)
      setSuccessMessage('Los roles fueron actualizados. Los cambios se aplicaran en el proximo inicio de sesion del usuario.')
      setTimeout(() => setSuccessMessage(null), 6000)
    } catch {
      setError('No fue posible guardar los cambios. Verifica la conexion e intenta de nuevo.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSelectedRoleCodes(currentAssignments.map(a => a.roleCode))
    setError(null)
  }

  const handleCancel = () => {
    handleReset()
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress aria-label='Cargando configuracion de roles' />
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={6}>
      {/* ── Card 1: Roles activos ── */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-6'>
            <div className='flex flex-col gap-4'>
              <Typography className='uppercase' variant='body2' color='text.disabled'>
                Roles activos
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Los roles determinan a que modulos y funcionalidades tiene acceso este usuario dentro del portal.
                Un usuario puede tener multiples roles que se combinan para formar su perfil de acceso.
              </Typography>
            </div>

            <div aria-live='polite' aria-atomic='true'>
              {successMessage && (
                <Alert severity='success' icon={<i className='tabler-circle-check' aria-hidden='true' />}>
                  {successMessage}
                </Alert>
              )}
            </div>
            <div aria-live='assertive' aria-atomic='true'>
              {error && (
                <Alert severity='error' icon={<i className='tabler-alert-circle' aria-hidden='true' />}>
                  {error}
                </Alert>
              )}
            </div>

            <Box role='list' aria-label='Roles asignados actualmente' sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {currentAssignments.length === 0 ? (
                <Typography variant='body2' color='text.secondary' role='status'>
                  Este usuario no tiene roles asignados. Sin al menos un rol, no podra acceder a ninguna seccion del portal.
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

            {currentAssignments.length > 0 && (
              <div className='flex flex-col gap-4'>
                <Typography className='uppercase' variant='body2' color='text.disabled'>
                  Modulos habilitados
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Acceso derivado de la combinacion de roles asignados. Cada rol habilita uno o mas modulos del portal.
                </Typography>
                <Box role='group' aria-label='Modulos de acceso derivados de los roles' sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {derivedRouteGroups.length > 0 ? (
                    derivedRouteGroups.map(group => (
                      <Chip key={group} label={toTitleCase(group)} size='small' variant='outlined' />
                    ))
                  ) : (
                    <Typography variant='body2' color='text.secondary'>
                      Los roles actuales no habilitan modulos especificos.
                    </Typography>
                  )}
                </Box>
              </div>
            )}

            {!isEditing && (
              <div>
                <Button
                  variant='contained'
                  startIcon={<i className='tabler-edit' aria-hidden='true' />}
                  onClick={() => setIsEditing(true)}
                >
                  Modificar roles
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* ── Card 2: Formulario de edicion (patron AccountDetails) ── */}
      {isEditing && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent className='flex flex-col gap-6'>
              <div className='flex flex-col gap-4'>
                <Typography className='uppercase' variant='body2' color='text.disabled'>
                  Asignar roles
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Selecciona los roles que correspondan a las responsabilidades de este usuario.
                  Puedes combinar roles internos y de cliente segun sea necesario.
                </Typography>
              </div>

              <form onSubmit={e => e.preventDefault()}>
                <Grid container spacing={6}>
                  <Grid size={{ xs: 12 }}>
                    <CustomAutocomplete
                      multiple
                      disableCloseOnSelect
                      options={availableRoles}
                      value={selectedRoleObjects}
                      groupBy={option => (option.isInternal ? 'Roles internos (Efeonce)' : 'Roles de cliente')}
                      getOptionLabel={option => option.roleName || toTitleCase(option.roleCode)}
                      isOptionEqualToValue={(option, value) => option.roleCode === value.roleCode}
                      onChange={(_, newValue) => setSelectedRoleCodes(newValue.map(r => r.roleCode))}
                      renderInput={params => (
                        <CustomTextField
                          {...params}
                          label='Roles del usuario'
                          placeholder={selectedRoleObjects.length === 0 ? 'Escribe para buscar roles disponibles...' : ''}
                          helperText='Cada rol otorga acceso a modulos especificos. La combinacion de roles define el perfil de acceso completo.'
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
                                <Typography variant='body2' className='font-medium'>
                                  {option.roleName || toTitleCase(option.roleCode)}
                                </Typography>
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
                  </Grid>

                  {/* Vista previa de acceso resultante */}
                  {selectedRoleObjects.length > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <div className='flex flex-col gap-4'>
                        <Typography className='uppercase' variant='body2' color='text.disabled'>
                          Vista previa de acceso
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {derivedRouteGroups.length > 0
                            ? `Con los roles seleccionados, este usuario tendra acceso a ${derivedRouteGroups.length} ${derivedRouteGroups.length === 1 ? 'modulo' : 'modulos'} del portal.`
                            : 'Los roles seleccionados no habilitan modulos especificos del portal.'}
                        </Typography>
                        {derivedRouteGroups.length > 0 && (
                          <Box role='group' aria-label='Modulos que se habilitaran con los roles seleccionados' sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {derivedRouteGroups.map(group => (
                              <Chip
                                key={group}
                                icon={<i className='tabler-lock-open' aria-hidden='true' style={{ fontSize: 14 }} />}
                                label={toTitleCase(group)}
                                size='small'
                                color='success'
                                variant='tonal'
                              />
                            ))}
                          </Box>
                        )}
                      </div>
                    </Grid>
                  )}

                  {/* Botones estilo AccountDetails: Save Changes + Reset */}
                  <Grid size={{ xs: 12 }} className='flex gap-4 flex-wrap'>
                    <Button
                      variant='contained'
                      type='submit'
                      disabled={isSaving || !hasChanges}
                      aria-busy={isSaving}
                      onClick={handleSave}
                    >
                      {isSaving ? 'Guardando cambios...' : 'Guardar cambios'}
                    </Button>
                    <Button
                      variant='tonal'
                      color='secondary'
                      type='reset'
                      disabled={isSaving}
                      onClick={handleReset}
                    >
                      Restablecer
                    </Button>
                    <Button
                      variant='tonal'
                      color='error'
                      disabled={isSaving}
                      onClick={handleCancel}
                      aria-label='Cancelar la edicion y volver a la vista de roles'
                    >
                      Cancelar
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default UserRoleManager
