'use client'

import { forwardRef, useImperativeHandle, useState, useTransition } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { TenantCapabilityRecord } from '@/lib/admin/tenant-capability-types'

type CapabilityStateResponse = {
  businessLines: string[]
  serviceModules: string[]
  capabilities: TenantCapabilityRecord[]
}

type TenantCapabilityManagerProps = {
  clientId: string
  hubspotCompanyId: string | null
  initialCapabilities: TenantCapabilityRecord[]
  onCapabilitiesChange?: (capabilities: TenantCapabilityRecord[]) => void
}

export type TenantCapabilityManagerHandle = {
  submitManualSelection: () => void
}

const getSourceTone = (sourceSystem: string | null) => {
  if (sourceSystem === 'greenhouse_admin') return 'warning'
  if (sourceSystem === 'hubspot_crm') return 'info'

  return 'default'
}

const getSourceLabel = (capability: TenantCapabilityRecord) => {
  if (capability.assignmentSourceSystem === 'greenhouse_admin') {
    return capability.selected ? 'Controlled' : 'Admin off'
  }

  if (capability.assignmentSourceSystem === 'hubspot_crm') {
    return capability.selected ? 'HubSpot' : 'HubSpot off'
  }

  if (capability.selected) {
    return 'Active'
  }

  return 'Available'
}

const TenantCapabilityManager = forwardRef<TenantCapabilityManagerHandle, TenantCapabilityManagerProps>(({
  clientId,
  hubspotCompanyId,
  initialCapabilities,
  onCapabilitiesChange
}, ref) => {
  const [capabilities, setCapabilities] = useState(initialCapabilities)

  const [selectedCodes, setSelectedCodes] = useState<string[]>(
    initialCapabilities.filter(item => item.selected).map(item => item.moduleCode)
  )

  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showPolicyAlert, setShowPolicyAlert] = useState(false)

  const businessLines = capabilities.filter(item => item.moduleKind === 'business_line')
  const serviceModules = capabilities.filter(item => item.moduleKind === 'service_module')
  const selectedCodeSet = new Set(selectedCodes)
  const parentLabelByCode = new Map(businessLines.map(item => [item.moduleCode, item.moduleLabel]))
  const selectedBusinessLineCount = businessLines.filter(item => selectedCodeSet.has(item.moduleCode)).length
  const selectedServiceModuleCount = serviceModules.filter(item => selectedCodeSet.has(item.moduleCode)).length

  const applyState = (state: CapabilityStateResponse) => {
    setCapabilities(state.capabilities)
    setSelectedCodes(state.capabilities.filter(item => item.selected).map(item => item.moduleCode))
    onCapabilitiesChange?.(state.capabilities)
  }

  const toggleCode = (moduleCode: string) => {
    setSelectedCodes(current =>
      current.includes(moduleCode) ? current.filter(code => code !== moduleCode) : [...current, moduleCode]
    )
  }

  const submitManualSelection = () => {
    setFeedback(null)

    startTransition(async () => {
      const response = await fetch(`/api/admin/tenants/${clientId}/capabilities`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessLines: businessLines.filter(item => selectedCodeSet.has(item.moduleCode)).map(item => item.moduleCode),
          serviceModules: serviceModules.filter(item => selectedCodeSet.has(item.moduleCode)).map(item => item.moduleCode)
        })
      })

      const payload = (await response.json().catch(() => null)) as CapabilityStateResponse & { error?: string } | null

      if (!response.ok || !payload) {
        setFeedback({
          tone: 'error',
          message: payload?.error || 'No pudimos guardar las capabilities del tenant.'
        })

        return
      }

      applyState(payload)
      setFeedback({
        tone: 'success',
        message: 'Capabilities guardadas desde admin.'
      })
    })
  }

  useImperativeHandle(ref, () => ({
    submitManualSelection
  }))

  const renderCapabilityOption = (capability: TenantCapabilityRecord) => {
    const parentLabel = capability.parentModuleCode ? parentLabelByCode.get(capability.parentModuleCode) : null

    return (
      <Box
        key={capability.moduleCode}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: theme => `1px solid ${theme.palette.divider}`,
          backgroundColor: theme =>
            selectedCodeSet.has(capability.moduleCode) ? theme.palette.action.hover : theme.palette.background.paper
        }}
      >
        <FormControlLabel
          control={
            <Checkbox checked={selectedCodeSet.has(capability.moduleCode)} onChange={() => toggleCode(capability.moduleCode)} />
          }
          label={
            <Stack spacing={1.25} sx={{ width: '100%' }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                gap={1.25}
                justifyContent='space-between'
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Typography variant='subtitle1' color='text.primary'>
                  {capability.moduleLabel}
                </Typography>
                <Stack direction='row' gap={1} flexWrap='wrap'>
                  <Chip size='small' variant='tonal' color='secondary' label={capability.publicModuleId} />
                  {parentLabel ? <Chip size='small' variant='outlined' color='info' label={parentLabel} /> : null}
                  <Chip
                    size='small'
                    variant='outlined'
                    color={getSourceTone(capability.assignmentSourceSystem)}
                    label={getSourceLabel(capability)}
                  />
                </Stack>
              </Stack>
              {capability.description ? (
                <Typography variant='body2' color='text.secondary'>
                  {capability.description}
                </Typography>
              ) : null}
            </Stack>
          }
          sx={{
            alignItems: 'flex-start',
            m: 0,
            width: '100%',
            '& .MuiFormControlLabel-label': {
              width: '100%'
            }
          }}
        />
      </Box>
    )
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={4}>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                xl: 'minmax(0, 1.35fr) repeat(3, minmax(0, 0.55fr))'
              }
            }}
          >
            <Box>
              <Typography variant='overline' sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.08em' }}>
                Capability governance
              </Typography>
              <Typography variant='h5' sx={{ mt: 0.5 }}>
                Capabilities activas del space
              </Typography>
              <Typography variant='body1' color='text.secondary' sx={{ mt: 1.25, maxWidth: 760 }}>
                Define que lineas de negocio y modulos quedan habilitados para este cliente. Admin fija el estado
                operativo y las integraciones externas solo pueden actualizarlo si envian payload explicito desde el
                registro de empresa.
              </Typography>
            </Box>

            {[
              ['Business lines activas', selectedBusinessLineCount],
              ['Service modules activos', selectedServiceModuleCount],
              ['Registro de empresa', hubspotCompanyId ? 'Listo' : 'Pendiente']
            ].map(([label, value]) => (
              <Box
                key={label}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme => theme.palette.background.default
                }}
              >
                <Typography variant='body2' color='text.secondary'>
                  {label}
                </Typography>
                <Typography variant='h4' sx={{ mt: 1, color: 'text.primary' }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>

          <Stack spacing={1.5}>
            <Button
              variant='text'
              color='warning'
              onClick={() => setShowPolicyAlert(current => !current)}
              sx={{ width: 'fit-content', px: 0 }}
              endIcon={<i className={showPolicyAlert ? 'tabler-chevron-up' : 'tabler-chevron-down'} />}
            >
              Regla de precedencia manual
            </Button>
            <Collapse in={showPolicyAlert}>
              <Alert severity='info'>
                La edicion manual tiene precedencia. La sincronizacion externa se admite via API con `businessLines` y
                `serviceModules` explicitos; no se deriva desde deals.
              </Alert>
            </Collapse>
          </Stack>

          {feedback ? <Alert severity={feedback.tone}>{feedback.message}</Alert> : null}

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                xl: 'minmax(0, 0.85fr) minmax(0, 1.15fr)'
              }
            }}
          >
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                border: theme => `1px solid ${theme.palette.divider}`
              }}
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant='subtitle1'>Business lines</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                    Activa solo las familias comerciales que deben estar disponibles en este tenant.
                  </Typography>
                </Box>
                <Stack spacing={1.5}>
                  {businessLines.map(renderCapabilityOption)}
                </Stack>
              </Stack>
            </Box>

            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                border: theme => `1px solid ${theme.palette.divider}`
              }}
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant='subtitle1'>Service modules</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                    Habilita los modulos concretos que el space puede usar y reportar.
                  </Typography>
                </Box>
                <Stack spacing={1.5}>
                  {serviceModules.map(renderCapabilityOption)}
                </Stack>
              </Stack>
            </Box>
          </Box>

          <Divider />

          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            gap={3}
            justifyContent='space-between'
            alignItems={{ xs: 'stretch', lg: 'center' }}
          >
            <Stack spacing={0.5}>
              <Typography variant='body2' color='text.secondary'>
                Registro de empresa
              </Typography>
              <Typography variant='subtitle1' color='text.primary'>
                {hubspotCompanyId ? `EO-${hubspotCompanyId}` : 'Sin company mapping'}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {hubspotCompanyId
                  ? 'Las integraciones externas deben sincronizar capabilities desde el objeto empresa.'
                  : 'Sin una empresa asociada, este tenant solo puede gobernarse manualmente desde admin.'}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Typography variant='body2' color='text.secondary'>
                Tenant: {clientId}
              </Typography>
              <Button
                variant='contained'
                onClick={submitManualSelection}
                disabled={isPending}
                startIcon={isPending ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
              >
                Guardar seleccion manual
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
})

TenantCapabilityManager.displayName = 'TenantCapabilityManager'

export default TenantCapabilityManager
