'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { ExecutiveMiniStatCard } from '@/components/greenhouse'
import type { EntitlementsGovernanceOverview } from '@/lib/admin/entitlements-governance'
import type { AdminGovernanceOverview } from '@/lib/admin/get-admin-view-access-governance'
import { SECTION_ACCENT } from '@/lib/admin/view-access-catalog'
import { ROLE_CODES } from '@/config/role-codes'
import EntitlementsGovernanceTab from '@/views/greenhouse/admin/EntitlementsGovernanceTab'
import PermissionSetsTab from '@/views/greenhouse/admin/permission-sets/PermissionSetsTab'

type Props = {
  data: AdminGovernanceOverview
  entitlementsData: EntitlementsGovernanceOverview
}

type RoleFilter = 'all' | 'efeonce_internal' | 'client'
type ActiveTab = 'entitlements' | 'permissions' | 'preview' | 'sets'
type OverrideMode = 'inherit' | 'grant' | 'revoke'
type PermissionsFocus = 'all' | 'changed' | 'fallback'
type PreviewFocus = 'all' | 'visible' | 'overrides' | 'impact'

const ACTION_LABELS: Record<string, string> = {
  grant_role: 'Acceso por rol concedido',
  revoke_role: 'Acceso por rol revocado',
  grant_user: 'Acceso individual concedido',
  revoke_user: 'Acceso individual revocado',
  expire_user: 'Acceso expirado',
  grant_set: 'Set asignado',
  revoke_set: 'Set revocado',
  create_set: 'Set creado',
  update_set: 'Set actualizado',
  delete_set: 'Set eliminado'
}

const PREVIEW_STATE_COPY = {
  active: {
    severity: 'success' as const,
    title: 'Persona con principal portal activo',
    description: 'El preview puede resolver persona canónica y mantener compatibilidad total con overrides y auditoría user-scoped.'
  },
  inactive: {
    severity: 'warning' as const,
    title: 'Principal portal inactivo',
    description: 'La persona conserva bridge portal, pero el principal operativo no está activo. Conviene revisar antes de usar este caso como referencia de acceso normal.'
  },
  missing_principal: {
    severity: 'warning' as const,
    title: 'Persona sin principal portal persistible',
    description: 'La persona existe canónicamente, pero todavía no tiene un principal compatible para guardar overrides o auditar acceso efectivo.'
  },
  degraded_link: {
    severity: 'warning' as const,
    title: 'Bridge humano degradado',
    description: 'El panel pudo resolver un principal portal, pero el vínculo completo hacia persona canónica sigue incompleto.'
  }
}

const AdminViewAccessGovernanceView = ({ data, entitlementsData }: Props) => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ActiveTab>('entitlements')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('efeonce_internal')
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [permissionsFocus, setPermissionsFocus] = useState<PermissionsFocus>('all')
  const [bulkRoleCode, setBulkRoleCode] = useState<string>(data.roles[0]?.roleCode ?? '')
  const [previewSelectionKey, setPreviewSelectionKey] = useState<string>(data.users[0]?.previewKey ?? '')
  const [previewFocus, setPreviewFocus] = useState<PreviewFocus>('impact')
  const [editableViews, setEditableViews] = useState(data.views)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editableUserOverrides, setEditableUserOverrides] = useState(data.userOverrides)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('')
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null)
  const [savingOverrides, setSavingOverrides] = useState(false)
  const [resolvedEffectiveViewCodes, setResolvedEffectiveViewCodes] = useState<Set<string> | null>(null)

  useEffect(() => {
    setEditableViews(data.views)
  }, [data.views])

  useEffect(() => {
    setEditableUserOverrides(data.userOverrides)
  }, [data.userOverrides])

  const isDirty = useMemo(() => {
    return JSON.stringify(editableViews.map(view => view.roleAccess)) !== JSON.stringify(data.views.map(view => view.roleAccess))
  }, [data.views, editableViews])

  const originalViewsByCode = useMemo(
    () => new Map(data.views.map(view => [view.viewCode, view])),
    [data.views]
  )

  const changedViewCodes = useMemo(
    () =>
      new Set(
        editableViews
          .filter(view =>
            data.roles.some(
              role => Boolean(view.roleAccess[role.roleCode]) !== Boolean(originalViewsByCode.get(view.viewCode)?.roleAccess[role.roleCode])
            )
          )
          .map(view => view.viewCode)
      ),
    [data.roles, editableViews, originalViewsByCode]
  )

  const changedCellCount = useMemo(
    () =>
      editableViews.reduce(
        (count, view) =>
          count +
          data.roles.filter(
            role => Boolean(view.roleAccess[role.roleCode]) !== Boolean(originalViewsByCode.get(view.viewCode)?.roleAccess[role.roleCode])
          ).length,
        0
      ),
    [data.roles, editableViews, originalViewsByCode]
  )

  const fallbackViewCodes = useMemo(
    () =>
      new Set(
        editableViews
          .filter(view => Object.values(view.roleAccessSource ?? {}).includes('hardcoded_fallback'))
          .map(view => view.viewCode)
      ),
    [editableViews]
  )

  const fallbackCellCount = useMemo(
    () =>
      editableViews.reduce(
        (count, view) =>
          count + Object.values(view.roleAccessSource ?? {}).filter(source => source === 'hardcoded_fallback').length,
        0
      ),
    [editableViews]
  )

  const filteredRoles = useMemo(() => {
    if (roleFilter === 'all') return data.roles

    return data.roles.filter(role => role.tenantType === roleFilter)
  }, [data.roles, roleFilter])

  useEffect(() => {
    if (filteredRoles.length === 0) {
      setBulkRoleCode('')

      return
    }

    if (!filteredRoles.some(role => role.roleCode === bulkRoleCode)) {
      setBulkRoleCode(filteredRoles[0]?.roleCode ?? '')
    }
  }, [bulkRoleCode, filteredRoles])

  const filteredViews = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return editableViews.filter(view => {
      if (sectionFilter !== 'all' && view.section !== sectionFilter) return false
      if (permissionsFocus === 'changed' && !changedViewCodes.has(view.viewCode)) return false
      if (permissionsFocus === 'fallback' && !fallbackViewCodes.has(view.viewCode)) return false
      if (!normalizedQuery) return true

      return [view.label, view.description, view.routePath, view.viewCode].some(value => value.toLowerCase().includes(normalizedQuery))
    })
  }, [changedViewCodes, editableViews, fallbackViewCodes, permissionsFocus, query, sectionFilter])

  const visibleSections = useMemo(
    () =>
      data.sections
        .map(section => ({
          ...section,
          views: filteredViews.filter(view => view.section === section.key)
        }))
        .filter(section => section.views.length > 0),
    [data.sections, filteredViews]
  )

  const previewUser = useMemo(
    () => data.users.find(user => user.previewKey === previewSelectionKey) ?? data.users[0] ?? null,
    [data.users, previewSelectionKey]
  )

  const selectedUserOverrides = useMemo(
    () => editableUserOverrides.filter(override => override.userId === previewUser?.userId),
    [editableUserOverrides, previewUser?.userId]
  )

  useEffect(() => {
    const firstReason = data.userOverrides.find(override => override.userId === previewUser?.userId && override.reason)?.reason ?? ''
    const firstExpiresAt = data.userOverrides.find(override => override.userId === previewUser?.userId && override.expiresAt)?.expiresAt ?? ''

    setOverrideReason(firstReason)
    setOverrideExpiresAt(firstExpiresAt ? String(firstExpiresAt).slice(0, 16) : '')
    setOverrideError(null)
    setOverrideSuccess(null)
  }, [data.userOverrides, previewUser?.userId])

  useEffect(() => {
    if (!previewUser?.userId) {
      setResolvedEffectiveViewCodes(null)

      return
    }

    setResolvedEffectiveViewCodes(null)

    fetch(`/api/admin/team/roles/${previewUser.userId}/effective-views`)
      .then(res => (res.ok ? res.json() : null))
      .then((responseData: { effectiveViews?: Array<{ viewCode: string }> } | null) => {
        if (!responseData?.effectiveViews) return

        setResolvedEffectiveViewCodes(new Set(responseData.effectiveViews.map(v => v.viewCode)))
      })
      .catch(() => setResolvedEffectiveViewCodes(null))
  }, [previewUser?.userId])

  const previewViews = useMemo(() => {
    if (!previewUser) return []

    if (resolvedEffectiveViewCodes) {
      const resolved = editableViews.filter(view => resolvedEffectiveViewCodes.has(view.viewCode))

      const current = new Map(resolved.map(view => [view.viewCode, view]))

      for (const override of selectedUserOverrides) {
        const view = editableViews.find(candidate => candidate.viewCode === override.viewCode)

        if (!view) continue

        if (override.overrideType === 'grant') {
          current.set(view.viewCode, view)
        } else {
          current.delete(view.viewCode)
        }
      }

      return Array.from(current.values())
    }

    const baseVisibleViews = editableViews.filter(view => {
      const roleGranted = previewUser.roleCodes.some(roleCode => Boolean(view.roleAccess[roleCode]))

      if (roleGranted) return true
      if (previewUser.routeGroups.includes(view.routeGroup)) return true
      if (previewUser.routeGroups.includes('admin')) return ['admin', 'finance', 'hr', 'people', 'ai_tooling', 'internal'].includes(view.routeGroup)
      if (view.routeGroup === 'people') return previewUser.roleCodes.includes(ROLE_CODES.EFEONCE_OPERATIONS) || previewUser.roleCodes.includes(ROLE_CODES.HR_PAYROLL)
      if (view.routeGroup === 'internal') return previewUser.routeGroups.includes('internal')

      return false
    })

    const current = new Map(baseVisibleViews.map(view => [view.viewCode, view]))

    for (const override of selectedUserOverrides) {
      const view = editableViews.find(candidate => candidate.viewCode === override.viewCode)

      if (!view) continue

      if (override.overrideType === 'grant') {
        current.set(view.viewCode, view)
      } else {
        current.delete(view.viewCode)
      }
    }

    return Array.from(current.values())
  }, [editableViews, previewUser, selectedUserOverrides, resolvedEffectiveViewCodes])

  const previewBaselineViews = useMemo(() => {
    if (!previewUser) return []

    if (resolvedEffectiveViewCodes) {
      return editableViews.filter(view => resolvedEffectiveViewCodes.has(view.viewCode))
    }

    return editableViews.filter(view => {
      const roleGranted = previewUser.roleCodes.some(roleCode => Boolean(view.roleAccess[roleCode]))

      if (roleGranted) return true
      if (previewUser.routeGroups.includes(view.routeGroup)) return true
      if (previewUser.routeGroups.includes('admin')) return ['admin', 'finance', 'hr', 'people', 'ai_tooling', 'internal'].includes(view.routeGroup)
      if (view.routeGroup === 'people') return previewUser.roleCodes.includes(ROLE_CODES.EFEONCE_OPERATIONS) || previewUser.roleCodes.includes(ROLE_CODES.HR_PAYROLL)
      if (view.routeGroup === 'internal') return previewUser.routeGroups.includes('internal')

      return false
    })
  }, [editableViews, previewUser, resolvedEffectiveViewCodes])

  const previewGrantedByOverride = useMemo(() => {
    const baselineCodes = new Set(previewBaselineViews.map(view => view.viewCode))

    return previewViews.filter(view => !baselineCodes.has(view.viewCode))
  }, [previewBaselineViews, previewViews])

  const previewRevokedByOverride = useMemo(() => {
    const visibleCodes = new Set(previewViews.map(view => view.viewCode))

    return previewBaselineViews.filter(view => !visibleCodes.has(view.viewCode))
  }, [previewBaselineViews, previewViews])

  const previewOverrideCandidateViews = useMemo(() => {
    if (!previewUser) return []

    if (previewFocus === 'visible') {
      return previewViews
    }

    if (previewFocus === 'overrides') {
      const overrideCodes = new Set(selectedUserOverrides.map(override => override.viewCode))

      return editableViews.filter(view => overrideCodes.has(view.viewCode))
    }

    if (previewFocus === 'impact') {
      const impactCodes = new Set([
        ...previewGrantedByOverride.map(view => view.viewCode),
        ...previewRevokedByOverride.map(view => view.viewCode)
      ])

      return editableViews.filter(view => impactCodes.has(view.viewCode))
    }

    return editableViews
  }, [editableViews, previewFocus, previewGrantedByOverride, previewRevokedByOverride, previewUser, previewViews, selectedUserOverrides])

  const previewSections = useMemo(
    () =>
      data.sections
        .map(section => ({
          ...section,
          views: previewViews.filter(view => view.section === section.key)
        }))
        .filter(section => section.views.length > 0),
    [data.sections, previewViews]
  )

  const previewUserAuditLog = useMemo(
    () => data.auditLog.filter(entry => entry.targetUser === previewUser?.userId).slice(0, 10),
    [data.auditLog, previewUser?.userId]
  )

  const previewStateMeta = previewUser ? PREVIEW_STATE_COPY[previewUser.portalAccessState] : null

  const toggleRoleAccess = (viewCode: string, roleCode: string) => {
    setSaveError(null)
    setSaveSuccess(null)
    setEditableViews(current =>
      current.map(view =>
        view.viewCode === viewCode
          ? {
              ...view,
              roleAccess: {
                ...view.roleAccess,
                [roleCode]: !view.roleAccess[roleCode]
              },
              roleAccessSource: view.roleAccessSource
                ? {
                    ...view.roleAccessSource,
                    [roleCode]: 'persisted'
                  }
                : view.roleAccessSource
            }
          : view
      )
    )
  }

  const updateRoleAccessForViews = (roleCode: string, nextGrantedByViewCode: Map<string, boolean>) => {
    setSaveError(null)
    setSaveSuccess(null)
    setEditableViews(current =>
      current.map(view => {
        if (!nextGrantedByViewCode.has(view.viewCode)) return view

        return {
          ...view,
          roleAccess: {
            ...view.roleAccess,
            [roleCode]: Boolean(nextGrantedByViewCode.get(view.viewCode))
          },
          roleAccessSource: view.roleAccessSource
            ? {
                ...view.roleAccessSource,
                [roleCode]: 'persisted'
              }
            : view.roleAccessSource
        }
      })
    )
  }

  const applyBulkRoleAction = (mode: 'grant' | 'revoke' | 'reset') => {
    if (!bulkRoleCode || filteredViews.length === 0) return

    if (mode === 'reset') {
      const originalAssignments = new Map(
        filteredViews.map(view => [view.viewCode, Boolean(originalViewsByCode.get(view.viewCode)?.roleAccess[bulkRoleCode])])
      )

      updateRoleAccessForViews(bulkRoleCode, originalAssignments)

      return
    }

    updateRoleAccessForViews(
      bulkRoleCode,
      new Map(filteredViews.map(view => [view.viewCode, mode === 'grant']))
    )
  }

  const getUserOverrideMode = (viewCode: string): OverrideMode => {
    const override = selectedUserOverrides.find(candidate => candidate.viewCode === viewCode)

    if (!override) return 'inherit'

    return override.overrideType
  }

  const toggleUserOverride = (viewCode: string) => {
    if (!previewUser?.userId) {
      setOverrideError('Esta persona no tiene un principal portal compatible para guardar overrides todavía.')

      return
    }

    const previewUserId = previewUser.userId

    setOverrideError(null)
    setOverrideSuccess(null)

    setEditableUserOverrides(current => {
      const index = current.findIndex(override => override.userId === previewUserId && override.viewCode === viewCode)

      if (index === -1) {
        return [
          ...current,
          {
            userId: previewUserId,
            viewCode,
            overrideType: 'grant',
            reason: overrideReason || null,
            expiresAt: overrideExpiresAt || null
          }
        ]
      }

      const existing = current[index]

      if (existing.overrideType === 'grant') {
        return current.map((override, overrideIndex) =>
          overrideIndex === index
            ? {
                ...override,
                overrideType: 'revoke',
                reason: overrideReason || override.reason || null,
                expiresAt: overrideExpiresAt || override.expiresAt || null
              }
            : override
        )
      }

      return current.filter((_, overrideIndex) => overrideIndex !== index)
    })
  }

  const handleReset = () => {
    setEditableViews(data.views)
    setSaveError(null)
    setSaveSuccess(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)

    try {
      const assignments = editableViews.flatMap(view =>
        data.roles.map(role => ({
          roleCode: role.roleCode,
          viewCode: view.viewCode,
          granted: Boolean(view.roleAccess[role.roleCode])
        }))
      )

      const response = await fetch('/api/admin/views/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assignments })
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron guardar los permisos.')
      }

      setSaveSuccess('La matriz quedó guardada en la configuración persistida de vistas.')
      router.refresh()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudieron guardar los permisos.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOverrides = async () => {
    if (!previewUser?.userId) {
      setOverrideError('Esta persona no tiene un principal portal compatible para guardar overrides todavía.')

      return
    }

    const overridesForUser = editableUserOverrides
      .filter(override => override.userId === previewUser.userId)
      .map(override => ({
        ...override,
        reason: (overrideReason || override.reason || '').trim() || null,
        expiresAt: overrideExpiresAt || override.expiresAt || null
      }))

    if (overridesForUser.length > 0 && !overrideReason.trim()) {
      setOverrideError('Escribe una razón breve para guardar overrides por usuario.')

      return
    }

    setSavingOverrides(true)
    setOverrideError(null)
    setOverrideSuccess(null)

    try {
      const response = await fetch('/api/admin/views/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: previewUser.userId,
          overrides: overridesForUser
        })
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron guardar los overrides por usuario.')
      }

      setOverrideSuccess('Los overrides del usuario quedaron guardados.')
      router.refresh()
    } catch (error) {
      setOverrideError(error instanceof Error ? error.message : 'No se pudieron guardar los overrides por usuario.')
    } finally {
      setSavingOverrides(false)
    }
  }

  return (
    <Stack spacing={6}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent='space-between'>
          <Box>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 1.5 }}>
              <Chip size='small' variant='outlined' label='Gobernanza de acceso' />
            </Stack>
            <Typography variant='h4' sx={{ mb: 1 }}>
              Gobernanza de acceso
            </Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 920 }}>
              Administra capacidades, defaults por rol, excepciones y política de inicio sin perder la trazabilidad de
              vistas, permission sets y fallback heredado. La capa nueva convive con el modelo actual para que un admin
              pueda explicar la causa y el resultado efectivo desde el mismo shell.
            </Typography>
          </Box>
          <Alert severity={data.persistence?.rolesWithPersistedAssignments ? 'success' : 'info'} variant='outlined' sx={{ maxWidth: 460 }}>
            {data.persistence?.rolesWithPersistedAssignments
              ? `La persistencia está activa para ${data.persistence.rolesWithPersistedAssignments} rol(es). Las vistas restantes usan acceso por defecto del rol.`
              : 'Las vistas se asignan usando el acceso por defecto de cada rol. Persiste las asignaciones para control granular.'}
          </Alert>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard title='Vistas registradas' value={String(data.totals.registeredViews)} detail='Mapa inicial de superficies gobernables' icon='tabler-layout-grid' tone='info' />
        <ExecutiveMiniStatCard title='Roles configurados' value={String(data.totals.configuredRoles)} detail='Perfiles visibles en la matrix actual' icon='tabler-shield-lock' tone='info' />
        <ExecutiveMiniStatCard title='Personas previewables' value={String(data.totals.previewableUsers)} detail='Usuarios con acceso verificable al portal' icon='tabler-user-search' tone='success' />
        <ExecutiveMiniStatCard title='Secciones cubiertas' value={String(data.totals.sections)} detail='Gestión, equipo, finanzas y administración' icon='tabler-layout-kanban' tone='warning' />
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Tabs
              value={activeTab}
              onChange={(_, value: ActiveTab) => setActiveTab(value)}
              variant='scrollable'
              allowScrollButtonsMobile
            >
              <Tab value='entitlements' label='Entitlements' />
              <Tab value='permissions' label='Permisos' />
              <Tab value='preview' label='Preview' />
              <Tab value='sets' label='Sets de permisos' />
            </Tabs>

            {activeTab === 'entitlements' ? <EntitlementsGovernanceTab data={entitlementsData} /> : null}

            {activeTab === 'permissions' ? (
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }} justifyContent='space-between'>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap='wrap'>
                    <TextField
                      size='small'
                      label='Buscar vista'
                      placeholder='Nómina, Spaces, finanzas.dashboard...'
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                      sx={{ minWidth: { xs: '100%', md: 320 } }}
                    />
                    <TextField
                      select
                      size='small'
                      label='Sección'
                      value={sectionFilter}
                      onChange={event => setSectionFilter(event.target.value)}
                      sx={{ minWidth: 180 }}
                    >
                      <MenuItem value='all'>Todas</MenuItem>
                      {data.sections.map(section => (
                        <MenuItem key={section.key} value={section.key}>
                          {section.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      size='small'
                      label='Enfoque'
                      value={permissionsFocus}
                      onChange={event => setPermissionsFocus(event.target.value as PermissionsFocus)}
                      sx={{ minWidth: 220 }}
                    >
                      <MenuItem value='all'>Todas las vistas</MenuItem>
                      <MenuItem value='changed'>Solo vistas con cambios</MenuItem>
                      <MenuItem value='fallback'>Solo vistas con fallback</MenuItem>
                    </TextField>
                    <TextField
                      select
                      size='small'
                      label='Roles visibles'
                      value={roleFilter}
                      onChange={event => setRoleFilter(event.target.value as RoleFilter)}
                      sx={{ minWidth: 220 }}
                    >
                      <MenuItem value='efeonce_internal'>Solo internos</MenuItem>
                      <MenuItem value='client'>Solo cliente</MenuItem>
                      <MenuItem value='all'>Todos</MenuItem>
                    </TextField>
                  </Stack>
                  <Stack direction='row' spacing={1} flexWrap='wrap'>
                    <Chip size='small' color='success' variant='tonal' label='Concedido' />
                    <Chip size='small' color='info' variant='outlined' label='Persistido' />
                    <Chip size='small' variant='outlined' label='Fallback hardcoded' />
                  </Stack>
                </Stack>

                {saveError ? <Alert severity='error'>{saveError}</Alert> : null}
                {saveSuccess ? <Alert severity='success'>{saveSuccess}</Alert> : null}

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ md: 'center' }}>
                  <Typography color='text.secondary'>
                    Haz click en una celda para conceder o revocar una vista por rol y luego guarda la matriz completa.
                  </Typography>
                  <Stack direction='row' spacing={1}>
                    <Button variant='outlined' onClick={handleReset} disabled={!isDirty || saving}>
                      Restablecer
                    </Button>
                    <Button variant='contained' onClick={handleSave} disabled={!isDirty || saving}>
                      {saving ? 'Guardando...' : 'Guardar matriz'}
                    </Button>
                  </Stack>
                </Stack>

                <Card variant='outlined'>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ lg: 'center' }}>
                        <Box>
                          <Typography variant='h6'>Acciones masivas por rol</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            Aplica grant, revoke o reset sobre las vistas filtradas para no editar una por una cuando el cambio es de lote.
                          </Typography>
                        </Box>
                        <Chip
                          size='small'
                          variant='outlined'
                          label={`${filteredViews.length} vista(s) en el foco actual`}
                        />
                      </Stack>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                        <TextField
                          select
                          size='small'
                          label='Rol objetivo'
                          value={bulkRoleCode}
                          onChange={event => setBulkRoleCode(event.target.value)}
                          sx={{ minWidth: 260 }}
                          disabled={filteredRoles.length === 0}
                        >
                          {filteredRoles.map(role => (
                            <MenuItem key={role.roleCode} value={role.roleCode}>
                              {role.roleName} · {role.roleCode}
                            </MenuItem>
                          ))}
                        </TextField>
                        <Stack direction='row' spacing={1} flexWrap='wrap'>
                          <Button
                            variant='contained'
                            color='success'
                            onClick={() => applyBulkRoleAction('grant')}
                            disabled={!bulkRoleCode || filteredViews.length === 0 || saving}
                          >
                            Conceder filtradas
                          </Button>
                          <Button
                            variant='outlined'
                            color='error'
                            onClick={() => applyBulkRoleAction('revoke')}
                            disabled={!bulkRoleCode || filteredViews.length === 0 || saving}
                          >
                            Revocar filtradas
                          </Button>
                          <Button
                            variant='outlined'
                            onClick={() => applyBulkRoleAction('reset')}
                            disabled={!bulkRoleCode || filteredViews.length === 0 || saving}
                          >
                            Restablecer filtradas
                          </Button>
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }
                  }}
                >
                  <ExecutiveMiniStatCard title='Cambios pendientes' value={String(changedCellCount)} detail='Celdas distintas al estado persistido actual' icon='tabler-pencil-check' tone='warning' />
                  <ExecutiveMiniStatCard title='Vistas afectadas' value={String(changedViewCodes.size)} detail='Filas con al menos un rol cambiado' icon='tabler-table-options' tone='info' />
                  <ExecutiveMiniStatCard title='Fallback heredado' value={String(fallbackCellCount)} detail='Celdas aún soportadas por baseline hardcoded' icon='tabler-layers-subtract' tone='error' />
                </Box>

                {visibleSections.map(section => (
                  <Card key={section.key} variant='outlined'>
                    <CardContent>
                      <Stack spacing={2.5}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent='space-between'>
                          <Box>
                            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 0.75 }}>
                              <Chip size='small' color={SECTION_ACCENT[section.key] ?? 'primary'} variant='tonal' label={section.label} />
                              <Typography variant='body2' color='text.secondary'>
                                {section.views.length} vistas
                              </Typography>
                            </Stack>
                            <Typography color='text.secondary'>{section.description}</Typography>
                          </Box>
                        </Stack>

                        <Box sx={{ overflowX: 'auto' }}>
                          <Box component='table' sx={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <Box component='thead'>
                              <Box component='tr'>
                                <Box
                                  component='th'
                                  sx={{
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 2,
                                    textAlign: 'left',
                                    bgcolor: 'background.paper',
                                    p: 2,
                                    borderBottom: theme => `1px solid ${theme.palette.divider}`,
                                    minWidth: 280
                                  }}
                                >
                                  Vista
                                </Box>
                                {filteredRoles.map(role => (
                                  <Box
                                    key={role.roleCode}
                                    component='th'
                                    sx={{
                                      minWidth: 140,
                                      textAlign: 'center',
                                      p: 2,
                                      borderBottom: theme => `1px solid ${theme.palette.divider}`
                                    }}
                                  >
                                    <Stack spacing={0.5} alignItems='center'>
                                      <Typography variant='body2' color='text.primary'>
                                        {role.roleName}
                                      </Typography>
                                      <Typography variant='caption' color='text.secondary'>
                                        {role.roleCode}
                                      </Typography>
                                    </Stack>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                            <Box component='tbody'>
                              {section.views.map(view => (
                                <Box component='tr' key={view.viewCode}>
                                  <Box
                                    component='td'
                                    sx={{
                                      position: 'sticky',
                                      left: 0,
                                      zIndex: 1,
                                      bgcolor: 'background.paper',
                                      p: 2,
                                      borderBottom: theme => `1px solid ${theme.palette.divider}`,
                                      verticalAlign: 'top'
                                    }}
                                  >
                                    <Stack spacing={1}>
                                      <Box>
                                        <Typography color='text.primary' className='font-medium'>
                                          {view.label}
                                        </Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          {view.description}
                                        </Typography>
                                      </Box>
                                      <Stack direction='row' spacing={1} flexWrap='wrap'>
                                        <Chip size='small' variant='outlined' label={view.routeGroup} />
                                        <Chip size='small' variant='outlined' label={view.routePath} component={Link} clickable href={view.routePath} />
                                      </Stack>
                                    </Stack>
                                  </Box>
                                  {filteredRoles.map(role => {
                                    const granted = view.roleAccess[role.roleCode]
                                    const accessSource = view.roleAccessSource?.[role.roleCode]

                                    return (
                                      <Box
                                        component='td'
                                        key={`${view.viewCode}-${role.roleCode}`}
                                        sx={{
                                          p: 2,
                                          borderBottom: theme => `1px solid ${theme.palette.divider}`,
                                          textAlign: 'center',
                                          verticalAlign: 'middle'
                                        }}
                                      >
                                        <Chip
                                          size='small'
                                          color={granted ? 'success' : 'default'}
                                          variant={granted ? 'tonal' : 'outlined'}
                                          label={granted ? 'Concedido' : 'Sin acceso'}
                                          aria-label={`${view.label} para ${role.roleName}: ${granted ? 'concedido' : 'sin acceso'}`}
                                          onClick={() => toggleRoleAccess(view.viewCode, role.roleCode)}
                                          clickable
                                          sx={{ cursor: 'pointer' }}
                                        />
                                        {accessSource ? (
                                          <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 0.75 }}>
                                            {accessSource === 'persisted' ? 'Persistido' : 'Fallback'}
                                          </Typography>
                                        ) : null}
                                      </Box>
                                    )
                                  })}
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : null}

            {activeTab === 'preview' ? (
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }} justifyContent='space-between'>
                  <Box sx={{ minWidth: { xs: '100%', lg: 380 } }}>
                    <TextField
                      select
                      fullWidth
                      size='small'
                      label='Seleccionar persona previewable'
                      value={previewSelectionKey}
                      onChange={event => setPreviewSelectionKey(event.target.value)}
                    >
                      {data.users.map(user => (
                        <MenuItem key={user.previewKey} value={user.previewKey}>
                          {user.fullName} · {user.email} · {user.previewMode === 'person' ? 'persona' : 'principal'}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  <Alert severity='info' variant='outlined'>
                    El selector prioriza la persona canónica cuando existe perfil de identidad. Los overrides y la auditoría se aplican sobre el principal portal compatible del usuario.
                  </Alert>
                </Stack>

                {previewUser ? (
                  <Stack spacing={3}>
                    {previewStateMeta ? (
                      <Alert severity={previewStateMeta.severity} variant='outlined'>
                        <strong>{previewStateMeta.title}.</strong> {previewStateMeta.description}
                      </Alert>
                    ) : null}

                    {previewUser.portalPrincipalCount > 1 ? (
                      <Alert severity='info' variant='outlined'>
                        Esta persona consolida {previewUser.portalPrincipalCount} principales portal. El panel usa uno compatible para overrides, pero la lectura del preview ya es person-first.
                      </Alert>
                    ) : null}

                    <Box
                      sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }
                      }}
                    >
                      <ExecutiveMiniStatCard title='Baseline visible' value={String(previewBaselineViews.length)} detail='Vistas heredadas por rol antes del override' icon='tabler-layers-linked' tone='info' />
                      <ExecutiveMiniStatCard title='Overrides activos' value={String(selectedUserOverrides.length)} detail={previewUser.userId ? 'Grant o revoke sobre el principal portal seleccionado' : 'Sin principal portal compatible para persistir overrides'} icon='tabler-adjustments-horizontal' tone='warning' />
                      <ExecutiveMiniStatCard title='Grant extra' value={String(previewGrantedByOverride.length)} detail='Vistas añadidas sobre la baseline del rol' icon='tabler-circle-plus' tone='success' />
                      <ExecutiveMiniStatCard title='Principal portal' value={String(previewUser.portalPrincipalCount)} detail={previewUser.portalPrincipalCount > 1 ? 'La persona consolida más de un principal portal' : 'La persona consolida un principal portal'} icon='tabler-user-shield' tone='error' />
                    </Box>

                    <Card variant='outlined'>
                      <CardContent>
                        <Stack spacing={3}>
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between'>
                          <Stack direction='row' spacing={2} alignItems='center'>
                            <Avatar>{previewUser.fullName.slice(0, 1).toUpperCase()}</Avatar>
                            <Box>
                              <Typography variant='h6'>{previewUser.fullName}</Typography>
                              <Typography color='text.secondary'>{previewUser.email}</Typography>
                              <Typography variant='body2' color='text.secondary'>
                              {previewUser.previewMode === 'person' ? 'Persona previewable' : 'Principal portal sin bridge persona completo'}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction='row' spacing={1} flexWrap='wrap'>
                            <Chip size='small' color='info' variant='tonal' label={previewUser.tenantType} />
                            <Chip
                              size='small'
                              color={previewUser.previewMode === 'person' ? 'secondary' : 'default'}
                              variant='tonal'
                              label={previewUser.previewMode === 'person' ? 'persona canónica' : 'principal portal'}
                            />
                            <Chip
                              size='small'
                              color={previewUser.portalAccessState === 'active' ? 'success' : previewUser.portalAccessState === 'inactive' ? 'default' : 'warning'}
                              variant='tonal'
                              label={previewUser.portalAccessState === 'active' ? 'Portal activo' : previewUser.portalAccessState === 'inactive' ? 'Portal inactivo' : 'Sin portal'}
                            />
                            <Chip size='small' variant='outlined' label={`Vínculo: ${previewUser.resolutionSource.replace(/_/g, ' ')}`} />
                            <Chip size='small' variant='outlined' label={`${previewViews.length} vistas visibles`} />
                          </Stack>
                        </Stack>

                        <Stack spacing={1}>
                          <Typography variant='body2' color='text.secondary'>
                            Contrato canónico
                          </Typography>
                          <Stack direction='row' spacing={1} flexWrap='wrap'>
                            {previewUser.userId ? <Chip size='small' variant='outlined' label={`user:${previewUser.userId}`} /> : null}
                            {previewUser.identityProfileId ? <Chip size='small' color='secondary' variant='tonal' label={`person:${previewUser.identityProfileId}`} /> : null}
                            {previewUser.memberId ? <Chip size='small' color='warning' variant='tonal' label={`member:${previewUser.memberId}`} /> : null}
                          </Stack>
                          {previewUser.linkedUserIds.length > 1 ? (
                            <Typography variant='caption' color='text.secondary'>
                              Principales portal enlazados: {previewUser.linkedUserIds.join(', ')}
                            </Typography>
                          ) : null}
                        </Stack>

                        <Stack spacing={1}>
                          <Typography variant='body2' color='text.secondary'>
                            Roles activos
                          </Typography>
                          <Stack direction='row' spacing={1} flexWrap='wrap'>
                            {previewUser.roleCodes.map(roleCode => (
                              <Chip key={roleCode} size='small' label={roleCode} variant='outlined' />
                            ))}
                          </Stack>
                        </Stack>

                        <Stack spacing={1}>
                          <Typography variant='body2' color='text.secondary'>
                            Route groups actuales
                          </Typography>
                          <Stack direction='row' spacing={1} flexWrap='wrap'>
                            {previewUser.routeGroups.map(routeGroup => (
                              <Chip key={routeGroup} size='small' color='success' variant='tonal' label={routeGroup} />
                            ))}
                          </Stack>
                        </Stack>

                          <Card variant='outlined'>
                            <CardContent>
                              <Stack spacing={2}>
                              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ md: 'center' }}>
                                <Box>
                                  <Typography variant='h6'>Overrides del principal portal</Typography>
                                  <Typography variant='body2' color='text.secondary'>
                                    Cambia una vista entre heredar del rol, conceder acceso y revocar acceso. La persona es la raíz del preview, pero la persistencia sigue usando el principal portal compatible para mantener la auditoría.
                                  </Typography>
                                </Box>
                                <Stack direction='row' spacing={1}>
                                  <Button variant='outlined' disabled={savingOverrides || !previewUser.userId} onClick={() => {
                                    if (!previewUser.userId) return

                                    setEditableUserOverrides(current => current.filter(override => override.userId !== previewUser.userId))
                                    setOverrideError(null)
                                    setOverrideSuccess(null)
                                  }}>
                                    Limpiar principal
                                  </Button>
                                  <Button variant='contained' disabled={savingOverrides || !previewUser.userId} onClick={handleSaveOverrides}>
                                    {savingOverrides ? 'Guardando...' : 'Guardar overrides'}
                                  </Button>
                                </Stack>
                              </Stack>

                              {!previewUser.userId ? (
                                <Alert severity='warning' variant='outlined'>
                                  Esta persona todavía no tiene un principal portal persistible. Puedes revisar el acceso efectivo, pero no guardar overrides hasta que exista un identificador de usuario compatible.
                                </Alert>
                              ) : null}

                              <TextField
                                size='small'
                                fullWidth
                                label='Razón del override'
                                placeholder='Ej: acceso temporal para revisión financiera del cierre mensual'
                                value={overrideReason}
                                onChange={event => setOverrideReason(event.target.value)}
                                helperText='Obligatoria si el usuario tiene al menos un override activo.'
                              />

                              <TextField
                                size='small'
                                fullWidth
                                type='datetime-local'
                                label='Expira el'
                                value={overrideExpiresAt}
                                onChange={event => setOverrideExpiresAt(event.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                helperText='Opcional. Se aplica al batch de overrides que guardes para este usuario.'
                              />

                              <TextField
                                select
                                size='small'
                                label='Qué revisar en el panel'
                                value={previewFocus}
                                onChange={event => setPreviewFocus(event.target.value as PreviewFocus)}
                                sx={{ maxWidth: 320 }}
                              >
                                <MenuItem value='impact'>Solo impacto efectivo</MenuItem>
                                <MenuItem value='overrides'>Solo vistas con override</MenuItem>
                                <MenuItem value='visible'>Solo vistas visibles</MenuItem>
                                <MenuItem value='all'>Todas las vistas</MenuItem>
                              </TextField>

                              {overrideError ? <Alert severity='error'>{overrideError}</Alert> : null}
                              {overrideSuccess ? <Alert severity='success'>{overrideSuccess}</Alert> : null}

                              <Box
                                sx={{
                                  display: 'grid',
                                  gap: 1.25,
                                  gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }
                                }}
                              >
                                {previewOverrideCandidateViews.length === 0 ? (
                                  <Alert severity='info' variant='outlined'>
                                    No hay vistas para este enfoque. Cambia el filtro para revisar baseline completa, overrides activos o impacto efectivo.
                                  </Alert>
                                ) : previewOverrideCandidateViews.map(view => {
                                  const mode = getUserOverrideMode(view.viewCode)

                                  return (
                                    <Box
                                      key={`${previewUser.previewKey}-${view.viewCode}`}
                                      sx={{
                                        border: theme => `1px solid ${theme.palette.divider}`,
                                        borderRadius: 1,
                                        p: 1.5
                                      }}
                                    >
                                      <Stack spacing={1}>
                                        <Stack direction='row' spacing={1} justifyContent='space-between' alignItems='center'>
                                          <Box>
                                            <Typography variant='body2' color='text.primary' className='font-medium'>
                                              {view.label}
                                            </Typography>
                                            <Typography variant='caption' color='text.secondary'>
                                              {view.routePath}
                                            </Typography>
                                          </Box>
                                          <Chip
                                            size='small'
                                            clickable
                                            onClick={() => toggleUserOverride(view.viewCode)}
                                            color={mode === 'grant' ? 'success' : mode === 'revoke' ? 'error' : 'default'}
                                            variant={mode === 'inherit' ? 'outlined' : 'tonal'}
                                            label={mode === 'inherit' ? 'Heredar' : mode === 'grant' ? 'Conceder' : 'Revocar'}
                                          />
                                        </Stack>
                                        {mode !== 'inherit' ? (
                                          <Stack direction='row' spacing={1} flexWrap='wrap'>
                                            {overrideReason ? <Chip size='small' variant='outlined' label={overrideReason} /> : null}
                                            {overrideExpiresAt ? <Chip size='small' color='warning' variant='tonal' label={`Expira ${overrideExpiresAt.replace('T', ' ')}`} /> : null}
                                          </Stack>
                                        ) : null}
                                      </Stack>
                                    </Box>
                                  )
                                })}
                              </Box>
                              </Stack>
                            </CardContent>
                          </Card>

                          <Divider />

                          <Card variant='outlined'>
                            <CardContent>
                              <Stack spacing={2}>
                              <Typography variant='h6'>Auditoría reciente</Typography>
                              <Typography variant='body2' color='text.secondary'>
                                Últimos eventos visibles de access governance para el principal portal compatible de esta persona.
                              </Typography>
                              {previewUserAuditLog.length === 0 ? (
                                <Alert severity='info' variant='outlined'>
                                  Aún no hay actividad reciente registrada para este principal portal.
                                </Alert>
                              ) : (
                                <Stack spacing={1.25}>
                                  {previewUserAuditLog.map((entry, index) => (
                                    <Box
                                      key={`${entry.createdAt}-${entry.viewCode}-${index}`}
                                      sx={{
                                        border: theme => `1px solid ${theme.palette.divider}`,
                                        borderRadius: 1,
                                        p: 1.5
                                      }}
                                    >
                                      <Stack spacing={0.75}>
                                        <Stack direction='row' spacing={1} flexWrap='wrap'>
                                          <Chip
                                            size='small'
                                            color={entry.action.includes('grant') ? 'success' : entry.action.includes('revoke') ? 'error' : 'warning'}
                                            variant='tonal'
                                            label={ACTION_LABELS[entry.action] ?? entry.action}
                                          />
                                          <Chip size='small' variant='outlined' label={entry.viewCode} />
                                          <Chip size='small' variant='outlined' label={String(entry.createdAt).replace('T', ' ').slice(0, 16)} />
                                        </Stack>
                                        <Typography variant='body2' color='text.secondary'>
                                          Actor: {entry.performedBy}
                                        </Typography>
                                        {entry.reason ? (
                                          <Typography variant='body2' color='text.secondary'>
                                            Razón: {entry.reason}
                                          </Typography>
                                        ) : null}
                                      </Stack>
                                    </Box>
                                  ))}
                                </Stack>
                              )}
                              </Stack>
                            </CardContent>
                          </Card>

                          <Box
                            sx={{
                              display: 'grid',
                              gap: 3,
                              gridTemplateColumns: { xs: '1fr', xl: '340px minmax(0, 1fr)' }
                            }}
                          >
                            <Card variant='outlined'>
                              <CardContent>
                                <Stack spacing={2}>
                                <Typography variant='h6'>Sidebar simulada</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Lectura resumida de lo que vería este usuario en navegación.
                                </Typography>
                                {previewSections.map(section => (
                                  <Stack key={section.key} spacing={1}>
                                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                      {section.label}
                                    </Typography>
                                    {section.views.map(view => (
                                      <Box
                                        key={view.viewCode}
                                        sx={{
                                          border: theme => `1px solid ${theme.palette.divider}`,
                                          borderRadius: 1,
                                          px: 1.5,
                                          py: 1
                                        }}
                                      >
                                        <Typography variant='body2'>{view.label}</Typography>
                                      </Box>
                                    ))}
                                  </Stack>
                                ))}
                                </Stack>
                              </CardContent>
                            </Card>

                            <Card variant='outlined'>
                              <CardContent>
                                <Stack spacing={2}>
                                <Typography variant='h6'>Detalle de vistas visibles</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Aquí ya se ve la lectura efectiva entre baseline por rol y overrides por usuario.
                                </Typography>
                                {previewGrantedByOverride.length > 0 ? (
                                  <Alert severity='success' variant='outlined'>
                                    {previewGrantedByOverride.length} vista(s) quedan visibles solo por override grant.
                                  </Alert>
                                ) : null}
                                {previewRevokedByOverride.length > 0 ? (
                                  <Alert severity='warning' variant='outlined'>
                                    {previewRevokedByOverride.length} vista(s) salen del menú efectivo por override revoke.
                                  </Alert>
                                ) : null}
                                {previewSections.map(section => (
                                  <Stack key={section.key} spacing={1.25}>
                                    <Stack direction='row' spacing={1} alignItems='center'>
                                      <Chip size='small' color={SECTION_ACCENT[section.key] ?? 'primary'} variant='tonal' label={section.label} />
                                      <Typography variant='body2' color='text.secondary'>
                                        {section.views.length} vistas
                                      </Typography>
                                    </Stack>
                                    {section.views.map(view => (
                                      <Box
                                        key={view.viewCode}
                                        sx={{
                                          border: theme => `1px solid ${theme.palette.divider}`,
                                          borderRadius: 1,
                                          p: 1.5
                                        }}
                                      >
                                        <Stack spacing={0.75}>
                                          <Typography color='text.primary' className='font-medium'>
                                            {view.label}
                                          </Typography>
                                          <Typography variant='body2' color='text.secondary'>
                                            {view.description}
                                          </Typography>
                                          <Stack direction='row' spacing={1} flexWrap='wrap'>
                                            <Chip size='small' variant='outlined' label={view.routePath} />
                                            <Chip size='small' color={previewGrantedByOverride.some(candidate => candidate.viewCode === view.viewCode) ? 'success' : 'info'} variant='tonal' label={previewGrantedByOverride.some(candidate => candidate.viewCode === view.viewCode) ? 'Grant extra' : 'Baseline por rol'} />
                                          </Stack>
                                        </Stack>
                                      </Box>
                                    ))}
                                  </Stack>
                                ))}
                                {previewRevokedByOverride.length > 0 ? (
                                  <Stack spacing={1.25}>
                                    <Typography variant='h6'>Vistas ocultas por revoke</Typography>
                                    {previewRevokedByOverride.map(view => (
                                      <Box
                                        key={`revoked-${view.viewCode}`}
                                        sx={{
                                          border: theme => `1px solid ${theme.palette.divider}`,
                                          borderRadius: 1,
                                          p: 1.5
                                        }}
                                      >
                                        <Stack spacing={0.75}>
                                          <Typography color='text.primary' className='font-medium'>
                                            {view.label}
                                          </Typography>
                                          <Typography variant='body2' color='text.secondary'>
                                            {view.description}
                                          </Typography>
                                          <Stack direction='row' spacing={1} flexWrap='wrap'>
                                            <Chip size='small' variant='outlined' label={view.routePath} />
                                            <Chip size='small' color='error' variant='tonal' label='Oculta por override revoke' />
                                          </Stack>
                                        </Stack>
                                      </Box>
                                    ))}
                                  </Stack>
                                ) : null}
                                </Stack>
                              </CardContent>
                            </Card>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Stack>
                ) : null}
              </Stack>
            ) : null}

            {activeTab === 'sets' ? <PermissionSetsTab /> : null}

          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default AdminViewAccessGovernanceView
