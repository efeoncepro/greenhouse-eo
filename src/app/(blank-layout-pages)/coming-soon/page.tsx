// Third-party Imports
import { getLocale } from 'next-intl/server'

// Component Imports
import ComingSoon from '@views/ComingSoon'

// Util Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Config Imports
import {
  getComingSoonLaunchAtIso,
  getComingSoonRedirectPath,
  isComingSoonLaunchPlaceholder
} from '@/config/coming-soon'

// Auth Imports
import { getOptionalServerSession } from '@/lib/auth/require-server-session'

// Copy Imports
import { getMicrocopy } from '@/lib/copy'
import type { Locale } from '@/lib/copy/types'

// Public "We are launching soon" placeholder + countdown + launch-notify
// capture. Reachable anonymously (pre-launch surface) AND by authenticated
// users (feature-not-yet-live gate). The (blank-layout-pages) route group wraps
// Providers + BlankLayout, so this page only resolves locale + mode + copy +
// launch config + optional session email (for the one-click "Notify me").
export const dynamic = 'force-dynamic'

const ComingSoonPage = async () => {
  const mode = await getServerMode()

  // Resolve active locale (user > tenant > cookie > Accept-Language > es-CL)
  // and pass the matching copy down — the view is locale-agnostic.
  const locale = (await getLocale()) as Locale
  const copy = getMicrocopy(locale).comingSoon

  // Optional session — anonymous visitors get the required email box; logged-in
  // users get one-click notify + an optional override box.
  const session = await getOptionalServerSession()

  return (
    <ComingSoon
      mode={mode}
      copy={copy}
      locale={locale}
      launchAtIso={getComingSoonLaunchAtIso()}
      redirectPath={getComingSoonRedirectPath()}
      isPlaceholderLaunch={isComingSoonLaunchPlaceholder()}
      viewerEmail={session?.user?.email ?? null}
    />
  )
}

export default ComingSoonPage
