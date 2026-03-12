'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { BrandLogo, EmptyState, ExecutiveCardShell } from '@/components/greenhouse'
import type { GreenhouseDashboardTooling } from '@/types/greenhouse-dashboard'

type ClientEcosystemSectionProps = {
  tooling: GreenhouseDashboardTooling
  onRequest: (intent: string) => void
}

type EcosystemColumnProps = {
  title: string
  subtitle: string
  emptyTitle: string
  emptyDescription: string
  requestLabel: string
  tools: Array<{
    key: string
    label: string
    category: string
    description: string
    href: string | null
  }>
  onRequest: () => void
}

const EcosystemColumn = ({
  title,
  subtitle,
  emptyTitle,
  emptyDescription,
  requestLabel,
  tools,
  onRequest
}: EcosystemColumnProps) => {
  const theme = useTheme()

  return (
    <ExecutiveCardShell title={title} subtitle={subtitle}>
      {tools.length === 0 ? (
        <EmptyState icon='tabler-box-seam' title={emptyTitle} description={emptyDescription} minHeight={250} />
      ) : (
        <Stack spacing={2}>
          {tools.map(tool => (
            <Box
              key={tool.key}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                display: 'grid',
                gap: 1.25
              }}
            >
              <Stack direction='row' spacing={2} alignItems='center'>
                <BrandLogo brand={tool.label} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='h6'>{tool.label}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {tool.description}
                  </Typography>
                </Box>
              </Stack>
              {tool.href ? (
                <Button component={Link} href={tool.href} target='_blank' rel='noreferrer' variant='text' sx={{ px: 0, width: 'fit-content' }}>
                  Abrir herramienta
                </Button>
              ) : (
                <Typography variant='caption' color='text.secondary'>
                  {tool.category}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      )}

      <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px dashed ${alpha(theme.palette.text.secondary, 0.18)}` }}>
        <Button variant='text' sx={{ px: 0 }} onClick={onRequest}>
          {requestLabel}
        </Button>
      </Box>
    </ExecutiveCardShell>
  )
}

const ClientEcosystemSection = ({ tooling, onRequest }: ClientEcosystemSectionProps) => {
  const configuredStack = tooling.technologyTools.filter(tool => Boolean(tool.href))
  const configuredAi = tooling.aiTools.filter(tool => tool.source === 'override' || Boolean(tool.href))

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' } }}>
      <EcosystemColumn
        title='Tu stack'
        subtitle='Herramientas activas en tu cuenta'
        emptyTitle='Tu stack está en configuración.'
        emptyDescription='Pronto tendrás acceso directo a tus herramientas desde aquí.'
        requestLabel='¿Necesitas una herramienta adicional? Solicitar'
        tools={configuredStack}
        onRequest={() => onRequest('una herramienta adicional')}
      />
      <EcosystemColumn
        title='AI en tu cuenta'
        subtitle='Inteligencia artificial activa en tu operación'
        emptyTitle='Las herramientas AI se activarán con tu primer proyecto creativo.'
        emptyDescription='Esta sección mostrará la capacidad AI activa de tu cuenta cuando esté habilitada.'
        requestLabel='¿Necesitas otra capacidad AI? Solicitar'
        tools={configuredAi}
        onRequest={() => onRequest('otra capacidad AI')}
      />
    </Box>
  )
}

export default ClientEcosystemSection
