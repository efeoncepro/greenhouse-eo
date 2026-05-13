'use client'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_CLIENT_PORTAL_COMPOSITION } from '@/lib/copy/client-portal'

/**
 * TASK-827 Slice 5 — `<ModuleNotAssignedEmpty>` component.
 *
 * Renderiza el empty state cuando un cliente intentó acceder una ruta cuyo
 * `viewCode` NO está en su set de módulos asignados (Slice 4 page guard
 * redirige a `/home?denied=<slug>`).
 *
 * Anatomía 5-elementos canonical (spec §13 + greenhouse-ux skill):
 *   1. Icon: `tabler-lock` (visual anchor, decorativo, aria-hidden via canonical EmptyState)
 *   2. Title: nombre comercial del módulo (NUNCA module_key técnico)
 *   3. Description: bundle hint + recoverable action ("escríbele a tu account manager")
 *   4. Primary CTA: "Solicitar acceso" → `mailto:<accountManagerEmail>` con subject prefilled
 *   5. Secondary CTA: "Volver al inicio" → `/home`
 *
 * Lookup determinístico: `publicSlug` viene de `mapViewCodeToPublicSlug` (Slice 4).
 * Si el slug NO está en `modulePublicLabels`, cae a `defaultLabel` (degradación
 * honesta — NUNCA blank, NUNCA leak técnico).
 *
 * Props mínimos requeridos para renderizar:
 *   - publicSlug: viene de `?denied=<slug>` query param o explícito
 *   - accountManagerEmail: resuelto server-side via `resolveAccountManagerEmail()`
 *     (Slice 4 helper canónico) con fallback a `support@efeoncepro.com`
 *
 * ARIA: `<EmptyState>` canonical ya envuelve con semantic markup; el container
 * exterior NO necesita `role='status'` adicional (evitamos doble announcement
 * por screen readers).
 *
 * Mobile: stack vertical, CTAs full-width via `Stack direction={{ xs: 'column', sm: 'row' }}`.
 *
 * Validado por skills greenhouse-ux + greenhouse-ux-writing + greenhouse-dev.
 */

interface ModuleNotAssignedEmptyProps {
  /**
   * Slug user-facing del módulo denegado (output de `mapViewCodeToPublicSlug`).
   * Ej: `'brand-intelligence'`, `'csc-pipeline'`. Si no matchea ninguna entry
   * del dictionary, fallback a `defaultLabel` (degradación honesta).
   */
  readonly publicSlug?: string

  /**
   * Email del account manager para `mailto:` CTA. Server resuelve via
   * `resolveAccountManagerEmail(organizationId)` con fallback chain canónica
   * (organizations.account_manager → tenant_capabilities → support@efeoncepro.com).
   */
  readonly accountManagerEmail: string
}

const ModuleNotAssignedEmpty = ({ publicSlug, accountManagerEmail }: ModuleNotAssignedEmptyProps) => {
  const copy = GH_CLIENT_PORTAL_COMPOSITION.emptyState.notAssigned

  const labels = GH_CLIENT_PORTAL_COMPOSITION.modulePublicLabels as Record<
    string,
    { name: string; bundleHint: string } | undefined
  >

  const fallback = GH_CLIENT_PORTAL_COMPOSITION.defaultLabel

  const resolved = (publicSlug && labels[publicSlug]) || fallback

  const mailtoHref = `mailto:${accountManagerEmail}?subject=${encodeURIComponent(
    `${copy.mailtoSubjectPrefix} ${resolved.name}`
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
        href='/home'
        variant='tonal'
        color='secondary'
        startIcon={<i className='tabler-arrow-back' />}
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        {copy.secondaryCta}
      </Button>
    </Stack>
  )

  return (
    <EmptyState
      icon={copy.icon}
      title={copy.title(resolved.name)}
      description={copy.body(resolved.name, resolved.bundleHint)}
      action={action}
      minHeight={320}
    />
  )
}

export default ModuleNotAssignedEmpty
