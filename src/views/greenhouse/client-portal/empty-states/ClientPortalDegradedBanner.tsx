'use client'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'

import { GH_CLIENT_PORTAL_COMPOSITION } from '@/lib/copy/client-portal'

/**
 * TASK-827 Slice 5 — `<ClientPortalDegradedBanner>` component.
 *
 * Banner sticky-top que se renderiza cuando el resolver retorna parcial
 * (algunos modules failed silently, no todos) o cuando page guard cae a
 * `/home?error=resolver_unavailable`. Cliente ve los módulos que SÍ
 * resolvieron + este banner explicando degradación honesta.
 *
 * Estado canónico del 5-state contract (spec §13):
 *   - Severity: `warning` (MUI Alert color)
 *   - ARIA: `role='alert'` implícito vía MUI Alert (severity='warning' → role='status'
 *     polite; cambio a `role='alert'` cuando es error completo)
 *   - Retry CTA: `router.refresh()` para forzar re-fetch del resolver
 *
 * Diferencia con `<ModuleNotAssignedEmpty>` / `<ClientPortalZeroStateEmpty>`:
 * este banner NO reemplaza contenido — coexiste con el contenido parcial.
 * Se renderiza al top del page body, antes del menú/contenido.
 *
 * `error_cleared` mode: cuando `searchParams.error === 'resolver_unavailable'`
 * (page guard fallback completo), el banner es la ÚNICA UI mostrada
 * (renderizar `<ClientPortalDegradedBanner mode='fallback' />`).
 *
 * Validado por skills greenhouse-ux + greenhouse-ux-writing + greenhouse-dev.
 */

interface ClientPortalDegradedBannerProps {
  /**
   * `partial`: banner sticky encima del contenido parcial que sí resolvió.
   * `fallback`: banner es el contenido principal (resolver falló completo).
   * Default: `partial`.
   */
  readonly mode?: 'partial' | 'fallback'
}

const ClientPortalDegradedBanner = ({ mode = 'partial' }: ClientPortalDegradedBannerProps) => {
  const copy = GH_CLIENT_PORTAL_COMPOSITION.degraded
  const router = useRouter()

  const handleRetry = () => {
    router.refresh()
  }

  return (
    <Alert
      severity='warning'
      icon={<i className='tabler-alert-triangle' />}
      sx={{
        mb: mode === 'partial' ? 4 : 0,
        alignItems: 'flex-start'
      }}
      action={
        <Button
          color='warning'
          size='small'
          variant='tonal'
          onClick={handleRetry}
          startIcon={<i className='tabler-refresh' />}
        >
          {copy.retryCta}
        </Button>
      }
    >
      <AlertTitle sx={{ fontWeight: 500 }}>{copy.bannerTitle}</AlertTitle>
      {copy.bannerBody}
    </Alert>
  )
}

export default ClientPortalDegradedBanner
