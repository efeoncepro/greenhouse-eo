import { DM_Sans, Poppins } from 'next/font/google'

import type { Metadata } from 'next'

// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Style Imports
import '@/app/globals.css'
import '@/styles/greenhouse-sidebar.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'
import '@flaticon/flaticon-uicons/css/brands/all.css'
import '@flaticon/flaticon-uicons/css/regular/rounded.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans'
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-poppins'
})

export const metadata: Metadata = {
  title: 'Greenhouse Portal',
  description: 'Client portal for project visibility, delivery performance, and sprint health.',
  icons: {
    icon: [{ url: '/images/greenhouse/SVG/favicon-blue-negative.svg', type: 'image/svg+xml' }],
    shortcut: ['/images/greenhouse/SVG/favicon-blue-negative.svg'],
    apple: ['/images/greenhouse/SVG/favicon-blue-negative.svg']
  }
}

const RootLayout = async (props: ChildrenType) => {
  const { children } = props

  // Type guard to ensure lang is a valid Locale

  // Vars

  const systemMode = await getSystemMode()
  const direction = 'ltr'

  return (
    <html id='__next' lang='en' dir={direction} suppressHydrationWarning>
      <body className={`${dmSans.variable} ${poppins.variable} flex is-full min-bs-full flex-auto flex-col`}>
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        {children}
      </body>
    </html>
  )
}

export default RootLayout
