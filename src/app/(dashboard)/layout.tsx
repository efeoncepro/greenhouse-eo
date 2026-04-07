// Next Imports
import { redirect } from 'next/navigation'

// MUI Imports
import Button from '@mui/material/Button'

// Third-party Imports
import { getServerSession } from 'next-auth'

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
import ChunkRecoveryClear from '@/components/ChunkRecoveryClear'

// Util Imports
import { getMode, getSystemMode } from '@core/utils/serverHelpers'

// Lib Imports
import { authOptions } from '@/lib/auth'

const Layout = async (props: ChildrenType) => {
  const { children } = props

  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Type guard to ensure lang is a valid Locale

  // Vars
  const direction = 'ltr'
  const mode = await getMode()
  const systemMode = await getSystemMode()

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
      <ChunkRecoveryClear />
    </Providers>
  )
}

export default Layout
