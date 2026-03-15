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
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import { roleColorFor, roleIconFor, toTitleCase } from './helpers'

// ── Types ──

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

// ── Component ──

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
      setError('No fue posible cargar la configuracion de roles. Verifica tu conexion e intenta de nuevo.')
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
      setError('Debes asignar al menos un rol. Sin roles, el usuario no podra acceder al portal.')

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
      setSuccessMessage('Roles actualizados. Los cambios se aplicaran en el proximo inicio de sesion del usuario.')
      setTimeout(() => setSuccessMessage(null), 6000)
    } catch {
      setError('No fue posible guardar los cambios. Verifica tu conexion e intenta de nuevo.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSelectedRoleCodes(currentAssignments.map(a => a.roleCode))
    setError(null)
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
      {/* ── Card 1: Perfil de acceso (patron AboutOverview) ── */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-6'>
            <div className='flex flex-col gap-4'>
              <Typography className='uppercase' variant='body2' color='text.disabled'>
                Perfil de acceso
              </Typography>
              <Typography>
                Los roles definen que puede hacer este usuario en Greenhouse. Cada rol habilita modulos y
                funcionalidades especificas. Un usuario puede tener varios roles que se combinan para formar
                su perfil de acceso completo.
              </Typography>
            </div>
            <div className='flex flex-col gap-4'>
              <Typography className='uppercase' variant='body2' color='text.disabled'>
                Roles asignados
              </Typography>
              <Box role='list' aria-label='Roles asignados actualmente' className='flex flex-wrap gap-2'>
                {currentAssignments.length === 0 ? (
                  <Typography color='text.secondary' role='status'>
                    Este usuario no tiene roles asignados. Agrega al menos un rol para que pueda acceder al portal.
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
            </div>
            <div className='flex flex-col gap-4'>
              <Typography className='uppercase' variant='body2' color='text.disabled'>
                Modulos habilitados
              </Typography>
              {derivedRouteGroups.length > 0 ? (
                <>
                  <Typography color='text.secondary'>
                    La combinacion de roles habilita acceso a los siguientes modulos del portal.
                  </Typography>
                  <Box role='group' aria-label='Modulos habilitados' className='flex flex-wrap gap-2'>
                    {derivedRouteGroups.map(group => (
                      <div key={group} className='flex items-center gap-2'>
                        <i className='tabler-circle-filled text-[8px] text-textSecondary' aria-hidden='true' />
                        <Typography className='font-medium'>{toTitleCase(group)}</Typography>
                      </div>
                    ))}
                  </Box>
                </>
              ) : (
                <Typography color='text.secondary'>
                  Los roles actuales no habilitan modulos especificos del portal.
                </Typography>
              )}
            </div>
          </CardContent>
        </Card>
      </Grid>

      {/* ── Card 2: Asignar roles (patron ChangePasswordCard / AccountDetails) ── */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Asignar roles' />
          <CardContent>
            <div aria-live='polite' aria-atomic='true'>
              {successMessage && (
                <Alert severity='success' className='mbe-6' icon={<i className='tabler-circle-check' aria-hidden='true' />}>
                  {successMessage}
                </Alert>
              )}
            </div>
            <div aria-live='assertive' aria-atomic='true'>
              {error && (
                <Alert severity='error' className='mbe-6' icon={<i className='tabler-alert-circle' aria-hidden='true' />}>
                  {error}
                </Alert>
              )}
            </div>

            {!isEditing ? (
              <div className='flex flex-col items-start gap-6'>
                <div className='flex flex-col gap-4'>
                  <Typography variant='h5' color='text.secondary'>
                    La asignacion de roles esta desactivada
                  </Typography>
                  <Typography>
                    Haz clic en el boton para modificar los roles de este usuario. Los cambios se aplicaran
                    en su proximo inicio de sesion.
                  </Typography>
                </div>
                <Button
                  variant='contained'
                  onClick={() => setIsEditing(true)}
                >
                  Modificar asignacion de roles
                </Button>
              </div>
            ) : (
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
                      onChange={(_, newValue) => {
                        setSelectedRoleCodes(newValue.map(r => r.roleCode))
                        setError(null)
                      }}
                      renderInput={params => (
                        <CustomTextField
                          {...params}
                          label='Roles del usuario'
                          placeholder={selectedRoleObjects.length === 0 ? 'Escribe para buscar roles disponibles...' : ''}
                          helperText='Puedes combinar roles internos y de cliente. Cada rol agrega permisos adicionales.'
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
                            <Box className='flex items-center gap-2 is-full'>
                              <CustomAvatar variant='rounded' skin='light' color={roleColorFor(option.roleCode)} size={28}>
                                <i className={roleIconFor(option.roleCode)} style={{ fontSize: 16 }} aria-hidden='true' />
                              </CustomAvatar>
                              <div>
                                <Typography variant='body2' className='font-medium'>
                                  {option.roleName || toTitleCase(option.roleCode)}
                                </Typography>
                                {option.description && (
                                  <Typography variant='caption' color='text.secondary'>
                                    {option.description}
                                  </Typography>
                                )}
                              </div>
                            </Box>
                          </li>
                        )
                      }}
                    />
                  </Grid>

                  {/* Vista previa de acceso */}
                  {selectedRoleObjects.length > 0 && derivedRouteGroups.length > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant='h6' className='mbe-2'>Vista previa de acceso</Typography>
                      <Typography className='mbe-4' color='text.secondary'>
                        {`Con esta configuracion, el usuario tendra acceso a ${derivedRouteGroups.length} ${derivedRouteGroups.length === 1 ? 'modulo' : 'modulos'}:`}
                      </Typography>
                      <Box className='flex flex-wrap gap-2' role='group' aria-label='Modulos que se habilitaran'>
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
                    </Grid>
                  )}

                  {/* Botones patron AccountDetails: Save Changes + Reset */}
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
                      onClick={() => {
                        handleReset()
                        setIsEditing(false)
                      }}
                      aria-label='Cancelar la edicion de roles'
                    >
                      Cancelar
                    </Button>
                  </Grid>
                </Grid>
              </form>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default UserRoleManager
