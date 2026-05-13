'use client'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_CLIENT_PORTAL_COMPOSITION } from '@/lib/copy/client-portal'

/**
 * TASK-827 Slice 5 — `<ClientPortalZeroStateEmpty>` component.
 *
 * Renderiza el empty state cuando un cliente activo (`tenant_type='client'`,
 * `lifecycle_stage='active_client'`) entra al portal con `modules.length === 0`.
 * Estado VÁLIDO durante onboarding — el cliente acaba de ser activado pero
 * su account manager aún no provisionó assignments.
 *
 * Anatomía 5-elementos canonical:
 *   1. Icon: `tabler-seedling` (positivo, bienvenida)
 *   2. Title: "Bienvenido a Greenhouse"
 *   3. Description: explica que AM está configurando, te avisarán por email
 *   4. Primary CTA: "Hablar con mi account manager" → `mailto:` con subject
 *   5. Secondary CTA: "Ver mi cuenta" → `/settings` (o ruta canónica de cuenta)
 *
 * Reliability signal `client_portal.assignment.lifecycle_module_drift`
 * (TASK-829) detecta clientes activos con assignments=0 > 14 días — escalation
 * operativa cuando este empty state persiste sin acción.
 *
 * ARIA: `<EmptyState>` canonical wraps con semantic markup. No agregar
 * `role='status'` adicional al wrapper exterior.
 *
 * Mobile: stack vertical, CTAs full-width.
 *
 * Validado por skills greenhouse-ux + greenhouse-ux-writing + greenhouse-dev.
 */

interface ClientPortalZeroStateEmptyProps {
  /**
   * Email del account manager para `mailto:` CTA. Server resuelve via
   * `resolveAccountManagerEmail(organizationId)` (Slice 4 helper canónico)
   * con fallback chain a `support@efeoncepro.com`.
   */
  readonly accountManagerEmail: string
}

const ClientPortalZeroStateEmpty = ({ accountManagerEmail }: ClientPortalZeroStateEmptyProps) => {
  const copy = GH_CLIENT_PORTAL_COMPOSITION.emptyState.zeroState

  const mailtoHref = `mailto:${accountManagerEmail}?subject=${encodeURIComponent(
    'Activación de mi cuenta Greenhouse'
  )}`

  const action = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ mt: 2, width: { xs: '100%', sm: 'auto' } }}
    >
      <Button
        component='a'
        href={mailtoHref}
        variant='contained'
        color='primary'
        startIcon={<i className='tabler-mail-forward' />}
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        {copy.primaryCta}
      </Button>
      <Button
        component={Link}
        href='/settings'
        variant='tonal'
        color='secondary'
        startIcon={<i className='tabler-user-circle' />}
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        {copy.secondaryCta}
      </Button>
    </Stack>
  )

  return (
    <EmptyState
      icon={copy.icon}
      title={copy.title}
      description={copy.body}
      action={action}
      minHeight={360}
    />
  )
}

export default ClientPortalZeroStateEmpty
