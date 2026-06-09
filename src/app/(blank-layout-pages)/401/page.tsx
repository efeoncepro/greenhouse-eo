// Third-party Imports
import { getLocale } from 'next-intl/server'

// Component Imports
import NotAuthorized from '@views/NotAuthorized'

// Util Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Copy Imports
import { getMicrocopy } from '@/lib/copy'
import type { Locale } from '@/lib/copy/types'

// Generic 401 / not-authorized surface for an AUTHENTICATED user who lacks
// permission for an in-app view. Distinct from /auth/access-denied, which is
// the specialized SSO-rejection screen (account not provisioned → /login +
// account manager contact). The (blank-layout-pages) route group already wraps
// Providers + BlankLayout, so this page only resolves locale + mode + copy.
const NotAuthorizedPage = async () => {
  const mode = await getServerMode()

  // Resolve active locale (user > tenant > cookie > Accept-Language > es-CL)
  // and pass the matching copy down — the view is locale-agnostic.
  const locale = (await getLocale()) as Locale
  const copy = getMicrocopy(locale).notAuthorized

  return <NotAuthorized mode={mode} copy={copy} />
}

export default NotAuthorizedPage
