import type { Metadata } from 'next'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import { SAMPLE_CLIENT_REPORT } from '@/components/growth/ai-visibility/report-artifact/fixtures'
import { modelFromClientReport } from '@/components/growth/ai-visibility/report-artifact/model'
import { GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT } from '@/lib/copy/growth'
import AeoLockedCard from '@/views/greenhouse/growth/ai-visibility/client/AeoLockedCard'
import AeoTierBanner from '@/views/greenhouse/growth/ai-visibility/client/AeoTierBanner'
import AiVisibilityClientReportView from '@/views/greenhouse/growth/ai-visibility/client/AiVisibilityClientReportView'

/**
 * TASK-1278 — AEO client tiering (nodo S6, EPIC-020) GVC harness.
 *
 * Mockup route (bajo `mockup/`, excluido de route-reachability) que renderiza los estados de tier de
 * forma DETERMINISTA — la ruta real `/aeo` resuelve por entitlement per-org (sin data no muestra tiers).
 *
 *   - sin `?state` → GALERÍA de los 4 estados apilados (`data-capture="tier-gallery-*"`) para la captura GVC
 *     de un solo scenario (un mark clip por estado).
 *   - `?state=contracted|trial|exhausted|locked` → un estado aislado (preview manual / revisión).
 *
 * El run CTA del banner se renderiza enabled (`runAvailable`) para capturar el affordance; en el harness no
 * se hace POST. Alimenta el workbench con el fixture canónico `SAMPLE_CLIENT_REPORT` (mismo
 * `modelFromClientReport` que TASK-1248, sin fork).
 */

export const metadata: Metadata = {
  title: 'AEO — tiering (mockup)'
}

const C = GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT

const model = modelFromClientReport(SAMPLE_CLIENT_REPORT)

type TierState = 'contracted' | 'trial' | 'exhausted' | 'locked'

const isTierState = (raw: string | undefined): raw is TierState =>
  raw === 'contracted' || raw === 'trial' || raw === 'exhausted' || raw === 'locked'

const Workbench = () => (
  <AiVisibilityClientReportView model={model} organizationName='Grupo Berel' asOfLabel='28 de junio de 2026' />
)

const TrialFrame = ({ blocked }: { blocked: boolean }) => (
  <>
    <Stack spacing={5} sx={{ px: { xs: 4, md: 6 }, pt: { xs: 4, md: 6 } }}>
      <GreenhouseBreadcrumbs
        items={[
          { label: C.page.breadcrumbRoot, href: '/home' },
          { label: C.page.breadcrumbLeaf }
        ]}
      />
      <AeoTierBanner
        allowanceRemaining={blocked ? 0 : 2}
        allowanceCap={3}
        resetDateLabel='1 de julio'
        blocked={blocked}
        runAvailable
      />
    </Stack>
    <Workbench />
  </>
)

const LockedFrame = () => (
  <Box sx={{ p: 6, maxWidth: 720, mx: 'auto' }}>
    <AeoLockedCard />
  </Box>
)

const StateView = ({ state }: { state: TierState }) => {
  if (state === 'locked') return <LockedFrame />
  if (state === 'contracted') return <Workbench />

  return <TrialFrame blocked={state === 'exhausted'} />
}

const GALLERY: Array<{ state: TierState; label: string }> = [
  { state: 'contracted', label: 'Contratado — workbench completo' },
  { state: 'trial', label: 'Trial con cupo — banner "Te quedan N de 3" + generar revisión' },
  { state: 'exhausted', label: 'Trial agotado — upsell (no es error)' },
  { state: 'locked', label: 'Sin acceso — teaser/locked gratis' }
]

const Page = async ({ searchParams }: { searchParams: Promise<{ state?: string }> }) => {
  const { state: rawState } = await searchParams

  if (isTierState(rawState)) {
    return <StateView state={rawState} />
  }

  return (
    <Stack spacing={10} sx={{ py: 6 }} data-capture='aeo-tiering-gallery'>
      {GALLERY.map(({ state, label }) => (
        <Box key={state} data-capture={`tier-gallery-${state}`}>
          <Typography variant='overline' color='text.secondary' sx={{ px: { xs: 4, md: 6 }, display: 'block', mb: 2 }}>
            {label}
          </Typography>
          <StateView state={state} />
        </Box>
      ))}
    </Stack>
  )
}

export default Page
