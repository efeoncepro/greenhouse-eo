'use client'

import { useState, useTransition } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
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

const TenantCapabilityManager = ({
  clientId,
  hubspotCompanyId,
  initialCapabilities,
  onCapabilitiesChange
}: TenantCapabilityManagerProps) => {
  const [capabilities, setCapabilities] = useState(initialCapabilities)

  const [selectedCodes, setSelectedCodes] = useState<string[]>(
    initialCapabilities.filter(item => item.selected).map(item => item.moduleCode)
  )

  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const businessLines = capabilities.filter(item => item.moduleKind === 'business_line')
  const serviceModules = capabilities.filter(item => item.moduleKind === 'service_module')
  const selectedCodeSet = new Set(selectedCodes)
  const parentLabelByCode = new Map(businessLines.map(item => [item.moduleCode, item.moduleLabel]))

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

  const syncHubSpotCapabilities = () => {
    setFeedback(null)

    startTransition(async () => {
      const response = await fetch(`/api/admin/tenants/${clientId}/capabilities/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceSystem: 'hubspot_crm'
        })
      })

      const payload = (await response.json().catch(() => null)) as CapabilityStateResponse & { error?: string } | null

      if (!response.ok || !payload) {
        setFeedback({
          tone: 'error',
          message: payload?.error || 'No pudimos sincronizar las capabilities desde HubSpot.'
        })

        return
      }

      applyState(payload)
      setFeedback({
        tone: 'success',
        message: 'Capabilities sincronizadas desde HubSpot.'
      })
    })
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Stack spacing={1.25}>
            <Typography variant='h6'>Capability governance</Typography>
            <Typography variant='body2' color='text.secondary'>
              Business lines y service modules ya pueden gobernarse desde admin. La precedencia operativa queda asi:
              seleccion manual de admin primero, sincronizacion externa despues.
            </Typography>
          </Stack>

          <Alert severity='info'>
            Usa <strong>Save admin selection</strong> para fijar la lectura del tenant y <strong>Sync HubSpot</strong> para
            derivar capabilities desde `closedwon` cuando exista `hubspot_company_id`.
          </Alert>

          {feedback ? <Alert severity={feedback.tone}>{feedback.message}</Alert> : null}

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                xl: 'minmax(0, 0.8fr) minmax(0, 1.2fr)'
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
              <Stack spacing={2}>
                <Typography variant='subtitle1'>Business lines</Typography>
                {businessLines.map(capability => (
                  <FormControlLabel
                    key={capability.moduleCode}
                    control={
                      <Checkbox
                        checked={selectedCodeSet.has(capability.moduleCode)}
                        onChange={() => toggleCode(capability.moduleCode)}
                      />
                    }
                    label={
                      <Stack spacing={0.5}>
                        <Stack direction='row' gap={1} alignItems='center' flexWrap='wrap'>
                          <Typography color='text.primary'>{capability.moduleLabel}</Typography>
                          <Chip
                            size='small'
                            variant='outlined'
                            color={getSourceTone(capability.assignmentSourceSystem)}
                            label={getSourceLabel(capability)}
                          />
                        </Stack>
                        {capability.description ? (
                          <Typography variant='body2' color='text.secondary'>
                            {capability.description}
                          </Typography>
                        ) : null}
                      </Stack>
                    }
                    sx={{ alignItems: 'flex-start', m: 0 }}
                  />
                ))}
              </Stack>
            </Box>

            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                border: theme => `1px solid ${theme.palette.divider}`
              }}
            >
              <Stack spacing={2}>
                <Typography variant='subtitle1'>Service modules</Typography>
                {serviceModules.map(capability => (
                  <FormControlLabel
                    key={capability.moduleCode}
                    control={
                      <Checkbox
                        checked={selectedCodeSet.has(capability.moduleCode)}
                        onChange={() => toggleCode(capability.moduleCode)}
                      />
                    }
                    label={
                      <Stack spacing={0.5}>
                        <Stack direction='row' gap={1} alignItems='center' flexWrap='wrap'>
                          <Typography color='text.primary'>{capability.moduleLabel}</Typography>
                          {capability.parentModuleCode ? (
                            <Chip
                              size='small'
                              variant='tonal'
                              color='info'
                              label={parentLabelByCode.get(capability.parentModuleCode) || capability.parentModuleCode}
                            />
                          ) : null}
                          <Chip
                            size='small'
                            variant='outlined'
                            color={getSourceTone(capability.assignmentSourceSystem)}
                            label={getSourceLabel(capability)}
                          />
                        </Stack>
                        {capability.description ? (
                          <Typography variant='body2' color='text.secondary'>
                            {capability.description}
                          </Typography>
                        ) : null}
                      </Stack>
                    }
                    sx={{ alignItems: 'flex-start', m: 0 }}
                  />
                ))}
              </Stack>
            </Box>
          </Box>

          <Divider />

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Stack spacing={0.5}>
              <Typography variant='body2' color='text.secondary'>
                HubSpot company
              </Typography>
              <Typography color='text.primary'>{hubspotCompanyId || 'Sin company mapping'}</Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <Button
                variant='outlined'
                onClick={syncHubSpotCapabilities}
                disabled={isPending || !hubspotCompanyId}
                startIcon={isPending ? <CircularProgress size={16} /> : <i className='tabler-refresh' />}
              >
                Sync HubSpot
              </Button>
              <Button
                variant='contained'
                onClick={submitManualSelection}
                disabled={isPending}
                startIcon={isPending ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
              >
                Save admin selection
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default TenantCapabilityManager
