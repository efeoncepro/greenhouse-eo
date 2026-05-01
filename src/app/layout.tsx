import { Inter, Poppins } from 'next/font/google'

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

// Typography foundation — TASK-566 / EPIC-004
// Inter = product UI base (body, controls, tables, KPIs, IDs, amounts via tabular-nums)
// Poppins = display only, restricted to h1-h4 in mergedTheme.ts
// Source of truth: docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md §3
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
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
      <body className={`${inter.variable} ${poppins.variable} flex is-full min-bs-full flex-auto flex-col`}>
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        {children}
      </body>
    </html>
  )
}

export default RootLayout
