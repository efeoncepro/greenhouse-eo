'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell } from '@/components/greenhouse'
import type { ReliabilitySeverity } from '@/types/reliability'

interface AiObservationView {
  observationId: string
  sweepRunId: string
  severity: ReliabilitySeverity
  summary: string
  recommendedAction: string | null
  model: string
  observedAt: string
}

interface AiModuleObservationView {
  moduleKey: string
  severity: ReliabilitySeverity
  summary: string
  recommendedAction: string | null
}

interface Props {

  /**
   * Última observación de scope='overview' (resumen ejecutivo). Cuando es
   * null el AI Observer no ha corrido aún o el kill-switch está OFF.
   */
  observation: AiObservationView | null

  /**
   * Observaciones per-módulo (scope='module') frescas (ventana 24h). Se
   * renderizan debajo del overview para dar contexto del *por qué* sin
   * tener que abrir cada `ReliabilityModuleCard` por separado.
   */
  moduleObservations?: AiModuleObservationView[]
}

const MODULE_LABELS: Record<string, string> = {
  finance: 'Finance',
  'integrations.notion': 'Notion sync',
  cloud: 'Cloud',
  delivery: 'Delivery'
}

const severityChipColor = (
  severity: ReliabilitySeverity
): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  if (severity === 'ok') return 'success'
  if (severity === 'warning') return 'warning'
  if (severity === 'error') return 'error'
  if (severity === 'awaiting_data' || severity === 'not_configured') return 'default'

  return 'info'
}

const severityLabel = (severity: ReliabilitySeverity): string => {
  if (severity === 'ok') return 'Óptimo'
  if (severity === 'warning') return 'Atención'
  if (severity === 'error') return 'Crítico'
  if (severity === 'awaiting_data') return 'Esperando datos'
  if (severity === 'not_configured') return 'Sin configurar'

  return 'Desconocido'
}

const formatAge = (iso: string): string => {
  const elapsed = Date.now() - Date.parse(iso)

  if (!Number.isFinite(elapsed) || elapsed < 0) return 'recién'

  const minutes = Math.round(elapsed / 60_000)

  if (minutes < 1) return 'recién'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.round(minutes / 60)

  if (hours < 24) return `hace ${hours} h`

  const days = Math.round(hours / 24)

  return `hace ${days} día${days === 1 ? '' : 's'}`
}

const SEVERITY_RANK: Record<ReliabilitySeverity, number> = {
  error: 0,
  warning: 1,
  not_configured: 2,
  unknown: 3,
  awaiting_data: 4,
  ok: 5
}

const ReliabilityAiWatcherCard = ({ observation, moduleObservations = [] }: Props) => {
  const sortedModules = [...moduleObservations].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  )

  
return (
    <ExecutiveCardShell
      title='AI Observer'
      subtitle='Resumen ejecutivo generado por Gemini Flash a partir del snapshot del Reliability Control Plane. No reemplaza señales determinísticas — agrega contexto narrativo.'
    >
      {observation === null ? (
        <Alert severity='info' variant='outlined'>
          AI Observer no activo todavía. Configura `RELIABILITY_AI_OBSERVER_ENABLED=true` en
          `ops-worker` para empezar a recibir resúmenes ejecutivos cada hora.
        </Alert>
      ) : (
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent='space-between'
          >
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <Chip
                size='small'
                color={severityChipColor(observation.severity)}
                variant='tonal'
                label={severityLabel(observation.severity)}
              />
              <Chip
                size='small'
                variant='outlined'
                label={`Modelo ${observation.model}`}
              />
              <Chip size='small' variant='outlined' label={formatAge(observation.observedAt)} />
            </Stack>
            <Typography variant='caption' color='text.secondary'>
              sweep {observation.sweepRunId}
            </Typography>
          </Stack>

          <Typography variant='body2' sx={{ lineHeight: 1.55 }}>
            {observation.summary}
          </Typography>

          {observation.recommendedAction && (
            <Alert severity='warning' variant='outlined'>
              <Typography variant='body2'>
                <strong>Acción sugerida:</strong> {observation.recommendedAction}
              </Typography>
            </Alert>
          )}

          {sortedModules.length > 0 && (
            <>
              <Divider />
              <Stack spacing={1.5}>
                <Typography
                  variant='caption'
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}
                >
                  Observaciones por módulo
                </Typography>
                {sortedModules.map(mod => (
                  <Box key={mod.moduleKey} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
                      <Chip
                        size='small'
                        color={severityChipColor(mod.severity)}
                        variant='tonal'
                        label={severityLabel(mod.severity)}
                      />
                      <Typography variant='subtitle2'>
                        {MODULE_LABELS[mod.moduleKey] ?? mod.moduleKey}
                      </Typography>
                    </Stack>
                    <Typography variant='body2' sx={{ lineHeight: 1.5 }}>
                      {mod.summary}
                    </Typography>
                    {mod.recommendedAction && (
                      <Typography variant='caption' color='text.secondary'>
                        <strong>Sugerencia:</strong> {mod.recommendedAction}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </>
          )}

          <Typography variant='caption' color='text.secondary'>
            Las observaciones IA se persisten en `greenhouse_ai.reliability_ai_observations` con
            dedup por fingerprint. Si el portal está estable, no se generan observaciones nuevas
            (costo cero hasta el siguiente cambio).
          </Typography>
        </Stack>
      )}
    </ExecutiveCardShell>
  )
}

export default ReliabilityAiWatcherCard
