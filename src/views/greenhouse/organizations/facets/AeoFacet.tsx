'use client'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import { GH_GROWTH_AEO_OPERATOR } from '@/lib/copy/growth'

import type { FacetContentProps } from '@/components/greenhouse/organization-workspace/types'

/**
 * TASK-1276 Slice 4 — Facet "AEO" del Organization Workspace (nodo S12, Account 360).
 *
 * Entrada CONTEXTUAL al mismo detalle operador (nodo S9): deep-link a
 * `/growth/aeo/[organizationId]`. Visible solo para el set operador (capability
 * `growth.ai_visibility.report.read_operator` vía FACET_TO_CAPABILITY_KEY) — un tenant
 * cliente jamás lo ve. Sin fetch propio en V1: el detalle es la fuente del dato
 * (un solo detalle por-cliente, dos entradas — cockpit global + Account 360 contextual).
 */

const F = GH_GROWTH_AEO_OPERATOR.facet

const AeoFacet = ({ organizationId }: FacetContentProps) => (
  <Card variant='outlined' sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.md}px` })}>
    <CardContent>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={4}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent='space-between'
      >
        <Stack direction='row' spacing={4} alignItems='center' sx={{ minWidth: 0 }}>
          <CustomAvatar skin='light' color='primary' variant='rounded' size={44}>
            <i className='tabler-radar-2' />
          </CustomAvatar>
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant='h5' component='h3'>
              {F.title}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {F.body}
            </Typography>
          </Stack>
        </Stack>
        <Button
          variant='contained'
          endIcon={<i className='tabler-arrow-right' />}
          href={`/growth/aeo/${organizationId}`}
          aria-label={F.ctaAria}
          sx={{ flexShrink: 0 }}
        >
          {F.cta}
        </Button>
      </Stack>
    </CardContent>
  </Card>
)

export default AeoFacet
