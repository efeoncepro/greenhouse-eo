'use client'

import { useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
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
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { ExecutiveMiniStatCard } from '@/components/greenhouse'
import type {
  EntitlementsGovernanceOverview,
  RoleEntitlementDefaultInput
} from '@/lib/admin/entitlements-governance'

type Props = {
  data: EntitlementsGovernanceOverview
}

type LocalEffect = 'inherit' | 'grant' | 'revoke'

const EntitlementsGovernanceTab = ({ data }: Props) => {
  const router = useRouter()
  const [selectedRoleCode, setSelectedRoleCode] = useState(data.roles[0]?.roleCode ?? '')
  const [draftMatrix, setDraftMatrix] = useState<Record<string, LocalEffect>>({})
  const [saveReason, setSaveReason] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!selectedRoleCode && data.roles[0]?.roleCode) {
      setSelectedRoleCode(data.roles[0].roleCode)
    }
  }, [data.roles, selectedRoleCode])

  useEffect(() => {
    const nextDraft: Record<string, LocalEffect> = {}

    for (const row of data.roleDefaults.filter(item => item.roleCode === selectedRoleCode)) {
      nextDraft[`${row.capability}:${row.action}:${row.scope}`] = row.effect
    }

    setDraftMatrix(nextDraft)
    setSaveReason('')
    setSaveError(null)
    setSaveSuccess(null)
  }, [data.roleDefaults, selectedRoleCode])

  const selectedRoleName = useMemo(
    () => data.roles.find(item => item.roleCode === selectedRoleCode)?.roleName ?? selectedRoleCode,
    [data.roles, selectedRoleCode]
  )

  const capabilityRows = useMemo(
    () =>
      data.capabilities.flatMap(capability =>
        capability.actions.map(action => ({
          key: `${capability.capability}:${action}:${capability.defaultScope}`,
          capability: capability.capability,
          module: capability.module,
          action,
          scope: capability.defaultScope,
          linkedViews: capability.linkedViews
        }))
      ),
    [data.capabilities]
  )

  const handleEffectChange = (key: string, value: LocalEffect) => {
    setSaveError(null)
    setSaveSuccess(null)
    setDraftMatrix(current => ({
      ...current,
      [key]: value
    }))
  }

  const handleSaveRoleDefaults = async () => {
    if (!selectedRoleCode) {
      setSaveError('Selecciona un rol antes de guardar.')

      return
    }

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)

    try {
      const defaults: RoleEntitlementDefaultInput[] = capabilityRows
        .map(row => ({
          capability: row.capability,
          action: row.action,
          scope: row.scope,
          effect: draftMatrix[row.key],
          reason: saveReason.trim() || null
        }))
        .filter(row => row.effect === 'grant' || row.effect === 'revoke')
        .map(row => ({
          capability: row.capability,
          action: row.action,
          scope: row.scope,
          effect: row.effect as 'grant' | 'revoke',
          reason: row.reason
        }))

      const response = await fetch('/api/admin/entitlements/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roleCode: selectedRoleCode,
          defaults
        })
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo guardar la política por rol.')
      }

      setSaveSuccess('Los defaults por rol quedaron guardados.')
      router.refresh()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar la política por rol.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={6}>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard title='Capabilities activas' value={String(data.summary.capabilitiesActive)} detail='Catálogo canónico reutilizable por Admin Center y Home' icon='tabler-keyframe' tone='info' />
        <ExecutiveMiniStatCard title='Roles configurados' value={String(data.summary.rolesConfigured)} detail='Roles disponibles para aplicar defaults por capability' icon='tabler-shield-lock' tone='success' />
        <ExecutiveMiniStatCard title='Usuarios con excepciones' value={String(data.summary.usersWithExceptions)} detail='Personas con grants o revokes individuales vigentes' icon='tabler-adjustments-horizontal' tone='warning' />
        <ExecutiveMiniStatCard title='Cambios recientes' value={String(data.summary.recentChanges)} detail='Auditoría reciente de gobernanza de acceso' icon='tabler-history' tone='info' />
      </Box>

      <Alert severity='info' variant='outlined'>
        Administra capacidades, defaults por rol, excepciones y política de inicio. Esta surface gobierna la causa; la ficha del usuario muestra el resultado efectivo.
      </Alert>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Capabilities'
          subheader='Catálogo canónico code-versioned sobre el que se apoyan Home, Nexa y la gobernanza administrativa.'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity', color: 'info.main' }}>
              <i className='tabler-keyframe' />
            </Avatar>
          }
        />
        <Divider />
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Capability</TableCell>
                  <TableCell>Módulo</TableCell>
                  <TableCell>Acciones</TableCell>
                  <TableCell>Scope base</TableCell>
                  <TableCell>Uso</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.capabilities.map(item => (
                  <TableRow key={item.capability}>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {item.capability}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.module}</TableCell>
                    <TableCell>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        {item.actions.map(action => (
                          <Chip key={action} size='small' variant='outlined' label={action} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>{item.defaultScope}</TableCell>
                    <TableCell>{item.linkedViews} vistas vinculadas</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Defaults por rol'
          subheader='Edita la política base de capabilities para un rol concreto sin abrir una matriz inmanejable.'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity', color: 'primary.main' }}>
              <i className='tabler-shield-check' />
            </Avatar>
          }
        />
        <Divider />
        <CardContent>
          <Stack spacing={3}>
            {saveError && <Alert severity='error'>{saveError}</Alert>}
            {saveSuccess && <Alert severity='success'>{saveSuccess}</Alert>}

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField select fullWidth label='Rol' value={selectedRoleCode} onChange={event => setSelectedRoleCode(event.target.value)}>
                  {data.roles.map(item => (
                    <MenuItem key={item.roleCode} value={item.roleCode}>
                      {item.roleName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  fullWidth
                  label='Motivo del cambio'
                  value={saveReason}
                  onChange={event => setSaveReason(event.target.value)}
                  helperText={selectedRoleCode ? `Se aplicará al rol ${selectedRoleName}.` : 'Selecciona un rol para editar la política.'}
                />
              </Grid>
            </Grid>

            <TableContainer>
              <Table size='small' aria-label='Defaults por rol'>
                <TableHead>
                  <TableRow>
                    <TableCell>Capability</TableCell>
                    <TableCell>Módulo</TableCell>
                    <TableCell>Acción</TableCell>
                    <TableCell>Scope</TableCell>
                    <TableCell>Default</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {capabilityRows.map(row => (
                    <TableRow key={row.key}>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {row.capability}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.module}</TableCell>
                      <TableCell>{row.action}</TableCell>
                      <TableCell>{row.scope}</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <TextField
                          select
                          fullWidth
                          size='small'
                          value={draftMatrix[row.key] ?? 'inherit'}
                          onChange={event => handleEffectChange(row.key, event.target.value as LocalEffect)}
                        >
                          <MenuItem value='inherit'>Heredar runtime</MenuItem>
                          <MenuItem value='grant'>Grant</MenuItem>
                          <MenuItem value='revoke'>Revoke</MenuItem>
                        </TextField>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant='contained' onClick={handleSaveRoleDefaults} disabled={saving || !selectedRoleCode}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Mapa vista -> capability'
          subheader='Ayuda a explicar por qué una surface visible depende de una capability concreta.'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity', color: 'success.main' }}>
              <i className='tabler-route-square' />
            </Avatar>
          }
        />
        <Divider />
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Vista</TableCell>
                  <TableCell>Path</TableCell>
                  <TableCell>Capability</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.viewMappings.map(binding => (
                  <TableRow key={`${binding.viewCode}:${binding.capability}:${binding.scope}`}>
                    <TableCell>{binding.viewLabel}</TableCell>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {binding.routePath}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {binding.capability}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        {binding.actions.map(action => (
                          <Chip key={action} size='small' variant='outlined' label={action} />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Políticas de Home'
          subheader='Conecta startup policy con la realidad de roles y con las excepciones individuales ya guardadas.'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity', color: 'secondary.main' }}>
              <i className='tabler-home' />
            </Avatar>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            {data.homePolicies.map(policy => (
              <Grid key={policy.policyKey} size={{ xs: 12, md: 6 }}>
                <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                      <Typography variant='subtitle1' fontWeight={600}>
                        {policy.label}
                      </Typography>
                      <Chip size='small' variant='tonal' color='primary' label={policy.policyKey} />
                    </Stack>
                    <Typography variant='body2' color='text.secondary'>
                      Path base: {policy.defaultPath}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {policy.usersOnPolicy} usuarios en esta policy, {policy.usersWithCustomPath} con excepción individual.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Auditoría'
          subheader='Actor, fecha, motivo y alcance de los cambios administrativos recientes.'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity', color: 'warning.main' }}>
              <i className='tabler-history' />
            </Avatar>
          }
        />
        <Divider />
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Evento</TableCell>
                  <TableCell>Destino</TableCell>
                  <TableCell>Detalle</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Fecha</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.auditLog.map(item => (
                  <TableRow key={item.auditId}>
                    <TableCell>{item.changeType}</TableCell>
                    <TableCell>{item.targetRole || item.targetUserPublicId || '-'}</TableCell>
                    <TableCell>
                      {item.capability ? `${item.capability} · ${item.action} · ${item.scope}` : item.policyKey ? `Startup policy · ${item.policyKey}` : '-'}
                    </TableCell>
                    <TableCell>{item.reason || 'Sin motivo registrado'}</TableCell>
                    <TableCell>{String(item.createdAt).slice(0, 16).replace('T', ' ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default EntitlementsGovernanceTab
