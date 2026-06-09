'use client'

// TASK-1009 — Mockup del panel de preflight Notion (verify_notion_flowing) para el
// loop GVC. Data 100% ficticia, NO toca clientes reales. Muestra el panel real en
// idle + la vista de resultado (fluye / no fluye) reusando NotionPreflightResultView
// (sin duplicar JSX). Ruta excluida del route-reachability gate (**/mockup/**).

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import { OperationalPanel } from '@/components/greenhouse/primitives'
import {
  NotionPreflightPanel,
  NotionPreflightResultView,
  type PreflightResult
} from '@/views/greenhouse/agency/clients/NotionPreflightPanel'

const READY: PreflightResult = {
  readyToOnboard: true,
  summary: 'ok',
  checks: [
    { id: 'token_resolves', label: 'Token Notion resuelve', status: 'ok', detail: 'Token scoped resuelve desde Secret Manager.', critical: false },
    { id: 'sync_enabled', label: 'Sync habilitado + data sources', status: 'ok', detail: 'sync_enabled = TRUE con Tareas + Proyectos configurados.', critical: true },
    { id: 'raw_landed', label: 'Raw aterrizó en BigQuery', status: 'ok', detail: 'Raw con 80 tarea(s), 4 proyecto(s).', critical: true },
    { id: 'client_id_attributed', label: 'client_id atribuido', status: 'ok', detail: 'client_id atribuido en 80/80 tarea(s).', critical: true },
    { id: 'readiness_gate', label: 'Gate de readiness (tareas+proyectos)', status: 'ok', detail: 'Tareas + proyectos listos (sprints opcional).', critical: true },
    { id: 'template_l1', label: 'Template L1 (Estado mapeable)', status: 'ok', detail: 'Título + 5 estado(s) distinto(s) mapean a vocabulario V1.', critical: true },
    { id: 'conformed_flowing', label: 'Conformed fluye', status: 'ok', detail: '80 tarea(s) en conformed.', critical: true },
    { id: 'portal_pg', label: 'Tareas en el portal (PostgreSQL)', status: 'ok', detail: '80 tarea(s) visibles en el portal.', critical: true },
    { id: 'freshness', label: 'Sync reciente', status: 'ok', detail: 'Último sync: hace 2 horas.', critical: false }
  ]
}

const NOT_READY: PreflightResult = {
  readyToOnboard: false,
  summary: 'fail',
  checks: [
    { id: 'token_resolves', label: 'Token Notion resuelve', status: 'ok', detail: 'Token scoped resuelve desde Secret Manager.', critical: false },
    { id: 'sync_enabled', label: 'Sync habilitado + data sources', status: 'ok', detail: 'sync_enabled = TRUE con Tareas + Proyectos configurados.', critical: true },
    { id: 'raw_landed', label: 'Raw aterrizó en BigQuery', status: 'ok', detail: 'Raw con 64 tarea(s), 3 proyecto(s).', critical: true },
    { id: 'client_id_attributed', label: 'client_id atribuido', status: 'ok', detail: 'client_id atribuido en 64/64 tarea(s).', critical: true },
    { id: 'readiness_gate', label: 'Gate de readiness (tareas+proyectos)', status: 'ok', detail: 'Tareas + proyectos listos (sprints opcional).', critical: true },
    { id: 'template_l1', label: 'Template L1 (Estado mapeable)', status: 'fail', detail: 'Estados no mapeables a V1: Pendiente cliente. Alinear el template L1 en Notion (no agregar aliases por cliente).', critical: true },
    { id: 'conformed_flowing', label: 'Conformed fluye', status: 'ok', detail: '64 tarea(s) en conformed.', critical: true },
    { id: 'portal_pg', label: 'Tareas en el portal (PostgreSQL)', status: 'fail', detail: 'greenhouse_delivery.tasks sin filas — las tareas no llegaron al portal.', critical: true },
    { id: 'freshness', label: 'Sync reciente', status: 'degraded', detail: 'last_synced_at NULL (ver TASK-1007).', critical: false }
  ]
}

const ItemRow = () => {
  const theme = useTheme()

  return (
  <Stack
    direction='row'
    spacing={2}
    alignItems='flex-start'
    sx={{ p: 2.5, borderRadius: `${theme.shape.customBorderRadius.md}px`, border: `1px solid ${theme.palette.divider}` }}
  >
    <CustomAvatar skin='light' color='secondary' size={32} variant='rounded'>
      <i className='tabler-circle' style={{ fontSize: 16 }} />
    </CustomAvatar>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction='row' spacing={1} alignItems='center' sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          11. Verificar que el cliente fluye al portal (preflight Notion)
        </Typography>
        <CustomChip round='true' size='small' variant='tonal' color='secondary' label='Requerido' />
        <CustomChip round='true' size='small' variant='tonal' color='warning' label='Bloqueante' />
      </Stack>
      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
        Operaciones
      </Typography>
    </Box>
    <CustomChip round='true' size='small' variant='tonal' color='secondary' icon={<i className='tabler-circle' />} label='Pendiente' />
  </Stack>
  )
}

const PanelShell = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        mt: 3,
        p: 4,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper
      }}
    >
      <Stack direction='row' spacing={3} alignItems='center'>
        <i className='tabler-route-2' style={{ fontSize: 28, color: theme.palette.primary.main }} aria-hidden />
        <Box>
          <Typography variant='body1' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            Verificar flujo al portal
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            Confirma que las tareas del cliente llegan al portal antes de cerrar el onboarding.
          </Typography>
        </Box>
      </Stack>
      {children}
    </Box>
  )
}

const NotionPreflightMockupView = () => {
  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1120, mx: 'auto' }} data-capture='notion-preflight-mockup'>
      <Stack spacing={1} sx={{ mb: 5 }}>
        <Typography variant='h4' sx={{ fontWeight: 700 }}>
          Preflight Notion · estados
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          Mockup GVC del ítem bloqueante verify_notion_flowing — data ficticia.
        </Typography>
      </Stack>

      <Stack spacing={6}>
        <Box data-capture='preflight-idle'>
          <OperationalPanel title='Idle — antes de correr' icon='tabler-player-play' iconColor='primary'>
            <Stack spacing={0}>
              <ItemRow />
              <NotionPreflightPanel caseId='mock-case-id' />
            </Stack>
          </OperationalPanel>
        </Box>

        <Box data-capture='preflight-ready'>
          <OperationalPanel title='Resultado — el cliente fluye' icon='tabler-circle-check' iconColor='success'>
            <Stack spacing={0}>
              <ItemRow />
              <PanelShell>
                <NotionPreflightResultView result={READY} advanced />
              </PanelShell>
            </Stack>
          </OperationalPanel>
        </Box>

        <Box data-capture='preflight-notready'>
          <OperationalPanel title='Resultado — todavía no fluye' icon='tabler-progress-alert' iconColor='warning'>
            <Stack spacing={0}>
              <ItemRow />
              <PanelShell>
                <NotionPreflightResultView result={NOT_READY} advanced={false} />
              </PanelShell>
            </Stack>
          </OperationalPanel>
        </Box>
      </Stack>
    </Box>
  )
}

export default NotionPreflightMockupView
