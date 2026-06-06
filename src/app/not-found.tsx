// Third-party Imports
import { getLocale } from 'next-intl/server'

// Component Imports
import Providers from '@components/Providers'
import BlankLayout from '@layouts/BlankLayout'
import NotFound from '@views/NotFound'

// Util Imports
import { getServerMode, getSystemMode } from '@core/utils/serverHelpers'

// Copy Imports
import { getMicrocopy } from '@/lib/copy'
import type { Locale } from '@/lib/copy/types'

// Canonical Next.js App Router not-found boundary. Unmatched routes (and any
// `notFound()` call without a closer boundary) render here with a real HTTP
// 404 status — unlike the previous `[...not-found]` catch-all page that
// returned 200 (soft 404). The root layout is minimal (just <html><body>), so
// this boundary wraps its own Providers + BlankLayout shell, same as the
// (blank-layout-pages) route group.
const NotFoundPage = async () => {
  // Vars
  const direction = 'ltr'
  const mode = await getServerMode()
  const systemMode = await getSystemMode()

  // Resolve active locale (user > tenant > cookie > Accept-Language > es-CL)
  // and pass the matching copy down — the view is locale-agnostic.
  const locale = (await getLocale()) as Locale
  const copy = getMicrocopy(locale).notFound

  return (
    <Providers direction={direction}>
      <BlankLayout systemMode={systemMode}>
        <NotFound mode={mode} copy={copy} />
      </BlankLayout>
    </Providers>
  )
}

export default NotFoundPage
