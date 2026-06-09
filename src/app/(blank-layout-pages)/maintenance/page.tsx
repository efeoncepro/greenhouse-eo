// Third-party Imports
import { getLocale } from 'next-intl/server'

// Component Imports
import UnderMaintenance from '@views/UnderMaintenance'

// Util Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Copy Imports
import { getMicrocopy } from '@/lib/copy'
import type { Locale } from '@/lib/copy/types'

// Full-page "En mantenimiento" surface for a planned maintenance window —
// distinct from 404 (missing resource) and 401 (no permission). Reachable
// anonymously and by authenticated users; can serve as a standalone route or
// gate a section that is temporarily down. The (blank-layout-pages) route group
// already wraps Providers + BlankLayout, so this page only resolves locale +
// mode + copy and hands them to the locale-agnostic view.
export const dynamic = 'force-dynamic'

const UnderMaintenancePage = async () => {
  const mode = await getServerMode()

  // Resolve active locale (user > tenant > cookie > Accept-Language > es-CL)
  // and pass the matching copy down — the view is locale-agnostic.
  const locale = (await getLocale()) as Locale
  const copy = getMicrocopy(locale).underMaintenance

  return <UnderMaintenance mode={mode} copy={copy} />
}

export default UnderMaintenancePage
