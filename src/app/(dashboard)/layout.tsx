// MUI Imports
import Button from '@mui/material/Button'

// Type Imports
import type { ChildrenType } from '@core/types'

// Layout Imports
import LayoutWrapper from '@layouts/LayoutWrapper'
import VerticalLayout from '@layouts/VerticalLayout'
import HorizontalLayout from '@layouts/HorizontalLayout'

// Component Imports
import Providers from '@components/Providers'
import Navigation from '@components/layout/vertical/Navigation'
import Header from '@components/layout/horizontal/Header'
import Navbar from '@components/layout/vertical/Navbar'
import VerticalFooter from '@components/layout/vertical/Footer'
import HorizontalFooter from '@components/layout/horizontal/Footer'
import ScrollToTop from '@core/components/scroll-to-top'
import NexaFloatingButton from '@/components/greenhouse/NexaFloatingButton'
import RecentsTracker from '@/components/greenhouse/RecentsTracker'
import ChunkRecoveryClear from '@/components/ChunkRecoveryClear'

// Util Imports
import { getMode, getSystemMode } from '@core/utils/serverHelpers'

// Lib Imports
import { requireServerSession } from '@/lib/auth/require-server-session'

// El layout depende de cookies/headers via NextAuth — siempre dynamic.
// Evita que Next intente prerender bajo (dashboard) y emita warnings
// "Dynamic server usage" durante build.
export const dynamic = 'force-dynamic'

const Layout = async (props: ChildrenType) => {
  const { children } = props
  const session = await requireServerSession()

  // Vars
  const direction = 'ltr'
  let mode: Awaited<ReturnType<typeof getMode>> = 'light'
  let systemMode: Awaited<ReturnType<typeof getSystemMode>> = 'light'

  try {
    mode = await getMode()
    systemMode = await getSystemMode()
  } catch (error) {
    console.error('[DashboardLayout] getMode/getSystemMode failed:', error)
  }

  return (
    <Providers direction={direction} session={session}>
      <LayoutWrapper
        systemMode={systemMode}
        verticalLayout={
          <VerticalLayout navigation={<Navigation mode={mode} />} navbar={<Navbar />} footer={<VerticalFooter />}>
            {children}
          </VerticalLayout>
        }
        horizontalLayout={
          <HorizontalLayout header={<Header />} footer={<HorizontalFooter />}>
            {children}
          </HorizontalLayout>
        }
      />
      <ScrollToTop className='mui-fixed'>
        <Button variant='contained' className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'>
          <i className='tabler-arrow-up' />
        </Button>
      </ScrollToTop>
      <NexaFloatingButton />
      <RecentsTracker />
      <ChunkRecoveryClear />
    </Providers>
  )
}

export default Layout
