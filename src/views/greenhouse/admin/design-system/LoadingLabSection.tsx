'use client'

import type { ComponentType } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import {
  GreenhouseCheckpointRailLoader,
  GreenhouseDocumentPipelineLoader,
  GreenhouseExternalHandoffLoader,
  GreenhouseInlineActionLoader,
  GreenhouseNexaReasoningLoader,
  GreenhousePageSkeletonLoader,
  GreenhousePanelSkeletonLoader,
  GreenhouseReconciliationMatchingLoader,
  GreenhouseSecureActionLoader,
  GreenhouseTableSkeletonLoader,
  GreenhouseUploadVerificationLoader,
  GreenhouseWorkspaceBootLoader
} from '@/components/greenhouse/primitives'
import type { GreenhouseLoadingStep, GreenhouseNamedLoadingSurfaceProps } from '@/components/greenhouse/primitives'

type LoadingLabItem = {
  componentName: string
  component: ComponentType<GreenhouseNamedLoadingSurfaceProps>
  title: string
  description: string
  job: string
  capture: string
  steps?: GreenhouseLoadingStep[]
}

const LAB_ITEMS: LoadingLabItem[] = [
  {
    componentName: 'GreenhouseWorkspaceBootLoader',
    component: GreenhouseWorkspaceBootLoader,
    title: 'Workspace boot',
    description: 'Transicion premium cuando la sesion entra al portal.',
    job: 'Auth redirect, startup policy, workspace handoff.',
    capture: 'loading-lab-brand-splash'
  },
  {
    componentName: 'GreenhouseNexaReasoningLoader',
    component: GreenhouseNexaReasoningLoader,
    title: 'Nexa reasoning',
    description: 'IA analizando senales sin caer en un spinner generico.',
    job: 'Drafting, insights, summaries and advisory states.',
    capture: 'loading-lab-ai-thinking'
  },
  {
    componentName: 'GreenhouseDocumentPipelineLoader',
    component: GreenhouseDocumentPipelineLoader,
    title: 'Document pipeline',
    description: 'Generacion de PDF, validacion y preparacion del artefacto.',
    job: 'Contratos, cartas oferta, comprobantes, quotes and receipts.',
    capture: 'loading-lab-document-pipeline',
    steps: [
      { label: 'Componer layout', status: 'done' },
      { label: 'Renderizar artefacto', status: 'active' },
      { label: 'Adjuntar y exponer', status: 'pending' }
    ]
  },
  {
    componentName: 'GreenhouseExternalHandoffLoader',
    component: GreenhouseExternalHandoffLoader,
    title: 'External handoff',
    description: 'Traspaso controlado hacia proveedores con espera honesta.',
    job: 'ZapSign, HubSpot, Notion, Teams, Entra, Vercel and GCP.',
    capture: 'loading-lab-external-handoff',
    steps: [
      { label: 'Preparar payload', status: 'done' },
      { label: 'Enviar solicitud', status: 'active' },
      { label: 'Esperar callback', status: 'pending' }
    ]
  },
  {
    componentName: 'GreenhouseSecureActionLoader',
    component: GreenhouseSecureActionLoader,
    title: 'Secure action',
    description: 'Acciones sensibles con permiso, auditoria y retry seguro.',
    job: 'Approvals, sensitive reveal, payment prep and admin mutations.',
    capture: 'loading-lab-secure-action',
    steps: [
      { label: 'Permisos verificados', status: 'done' },
      { label: 'Audit trail en curso', status: 'active' },
      { label: 'Confirmar idempotencia', status: 'pending' }
    ]
  },
  {
    componentName: 'GreenhouseUploadVerificationLoader',
    component: GreenhouseUploadVerificationLoader,
    title: 'Upload verification',
    description: 'Archivo subiendo, policy check y asociacion a evidencia.',
    job: 'Documentos de identidad, boletas, anexos and legal evidence.',
    capture: 'loading-lab-upload-verification',
    steps: [
      { label: 'Archivo recibido', status: 'done' },
      { label: 'Validar policy', status: 'active' },
      { label: 'Asociar evidencia', status: 'pending' }
    ]
  },
  {
    componentName: 'GreenhouseReconciliationMatchingLoader',
    component: GreenhouseReconciliationMatchingLoader,
    title: 'Reconciliation matching',
    description: 'Comparacion de fuentes con confianza y trazabilidad visible.',
    job: 'Bank matching, cost allocations, payment orders and ledgers.',
    capture: 'loading-lab-reconciliation-matching'
  },
  {
    componentName: 'GreenhousePageSkeletonLoader',
    component: GreenhousePageSkeletonLoader,
    title: 'Data weave page',
    description: 'Skeleton con estructura viva para dashboards y workbenches.',
    job: 'Route-level loading with CLS prevention.',
    capture: 'loading-lab-page-skeleton'
  },
  {
    componentName: 'GreenhouseTableSkeletonLoader',
    component: GreenhouseTableSkeletonLoader,
    title: 'Governance table',
    description: 'Carga de filas, filtros y comparacion sin tabla fantasma plana.',
    job: 'Admin lists, finance ledgers, approval queues.',
    capture: 'loading-lab-table-skeleton'
  },
  {
    componentName: 'GreenhousePanelSkeletonLoader',
    component: GreenhousePanelSkeletonLoader,
    title: 'Context panel',
    description: 'Carga compacta para drawers, sidecars, facets y cards densas.',
    job: 'Contextual surfaces that should not block the whole route.',
    capture: 'loading-lab-panel-skeleton'
  },
  {
    componentName: 'GreenhouseCheckpointRailLoader',
    component: GreenhouseCheckpointRailLoader,
    title: 'Checkpoint rail',
    description: 'Proceso por etapas, con progreso verificable y no magico.',
    job: 'Runbooks, generation pipelines, sync and recovery flows.',
    capture: 'loading-lab-progress-rail'
  }
]

const LAB_STEPS = [
  { label: 'Resolver contexto', status: 'done' as const },
  { label: 'Componer evidencia', status: 'active' as const },
  { label: 'Entregar resultado', status: 'pending' as const }
]

const LabCard = ({ item }: { item: LoadingLabItem }) => {
  const LoadingComponent = item.component

  return (
    <Card
      variant='outlined'
      sx={theme => ({
        backgroundColor: alpha(theme.palette.background.paper, 0.94)
      })}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Stack spacing={0.75}>
          <Typography variant='h6' sx={{ fontWeight: 800 }}>
            {item.title}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {item.description}
          </Typography>
          <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700 }}>
            {item.job}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {item.componentName}
          </Typography>
        </Stack>
        <Box>
          <LoadingComponent
            title={item.title}
            description={item.description}
            compact
            rows={5}
            steps={item.steps ?? LAB_STEPS}
            dataCapture={item.capture}
          />
        </Box>
      </CardContent>
    </Card>
  )
}

const InlineActionDemo = () => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack spacing={0.75}>
        <Typography variant='h6' sx={{ fontWeight: 800 }}>
          Inline action
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Acciones chicas que no merecen bloquear la pantalla completa.
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700 }}>
          Save, send, reconcile, refresh, inline command.
        </Typography>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <GreenhouseInlineActionLoader
          title='Guardando cambios'
          description='Persistiendo una accion local.'
          dataCapture='loading-lab-inline-action'
        />
        <Typography variant='caption' color='text.secondary'>
          Sustituye el spinner suelto por una senal compacta con texto y ritmo.
        </Typography>
      </Stack>
    </CardContent>
  </Card>
)

const LoadingLabSection = () => (
  <Card variant='outlined' data-capture='loading-lab'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack spacing={1}>
        <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
          Loading Lab
        </Typography>
        <Typography variant='h5' sx={{ fontWeight: 800 }}>
          Carga moderna para Greenhouse
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
          Este laboratorio no canoniza spinners existentes. Explora loaders como experiencias de producto: estructura, brand,
          razonamiento IA, documentos, handoffs externos, acciones seguras, evidencia y conciliacion. La primitive reutiliza el stack
          Greenhouse, pero sube el nivel visual antes de migrar consumidores productivos.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }
        }}
      >
        {LAB_ITEMS.map(item => (
          <LabCard key={item.componentName} item={item} />
        ))}
      </Box>

      <InlineActionDemo />
    </CardContent>
  </Card>
)

export default LoadingLabSection
