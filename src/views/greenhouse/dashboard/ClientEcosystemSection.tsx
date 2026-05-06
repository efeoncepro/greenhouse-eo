'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { GH_MESSAGES } from '@/lib/copy/client-portal'
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
                  {GH_MESSAGES.ecosystem_open_tool}
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
        title={GH_MESSAGES.ecosystem_stack_title}
        subtitle={GH_MESSAGES.ecosystem_stack_subtitle}
        emptyTitle={GH_MESSAGES.ecosystem_stack_empty_title}
        emptyDescription={GH_MESSAGES.ecosystem_stack_empty_description}
        requestLabel={GH_MESSAGES.ecosystem_stack_request}
        tools={configuredStack}
        onRequest={() => onRequest('una herramienta adicional')}
      />
      <EcosystemColumn
        title={GH_MESSAGES.ecosystem_ai_title}
        subtitle={GH_MESSAGES.ecosystem_ai_subtitle}
        emptyTitle={GH_MESSAGES.ecosystem_ai_empty_title}
        emptyDescription={GH_MESSAGES.ecosystem_ai_empty_description}
        requestLabel={GH_MESSAGES.ecosystem_ai_request}
        tools={configuredAi}
        onRequest={() => onRequest('otra capacidad AI')}
      />
    </Box>
  )
}

export default ClientEcosystemSection
