// Type Imports
import type { Session } from 'next-auth'

import { Toaster } from 'sonner'

import type { ChildrenType, Direction } from '@core/types'

// Context Imports
import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import { OperatingEntityProvider } from '@/context/OperatingEntityContext'
import AuthSessionProvider from '@components/auth/AuthSessionProvider'
import ThemeProvider from '@components/theme'

// Toast Imports — TASK-512: sonner replaces react-toastify (zero-dep, ~4KB,
// matches the 2024-2026 enterprise toast UX shipped by Vercel/Linear/Resend).

// Lib Imports
import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'

// Util Imports
import { getMode, getSettingsFromCookie, getSystemMode } from '@core/utils/serverHelpers'

type Props = ChildrenType & {
  direction: Direction
  session?: Session | null
}

const Providers = async (props: Props) => {
  // Props
  const { children, direction, session = null } = props

  // Vars
  const mode = await getMode()
  const settingsCookie = await getSettingsFromCookie()
  const systemMode = await getSystemMode()

  let operatingEntity: Awaited<ReturnType<typeof getOperatingEntityIdentity>> = null

  if (session) {
    try {
      operatingEntity = await getOperatingEntityIdentity()
    } catch (error) {
      console.error('[Providers] getOperatingEntityIdentity failed — rendering with operatingEntity=null:', error)
    }
  }

  return (
    <AuthSessionProvider session={session}>
      <OperatingEntityProvider operatingEntity={operatingEntity}>
        <VerticalNavProvider>
          <SettingsProvider settingsCookie={settingsCookie} mode={mode}>
            <ThemeProvider direction={direction} systemMode={systemMode}>
              {children}
              {/*
                TASK-512: sonner Toaster.
                - position='top-right' preserves the placement convention
                  used since react-toastify (consumers never override it).
                - richColors tints success/error/warning/info backgrounds,
                  matching the semantic palette used across TASK-505 / 615.
                - closeButton ships the dismiss affordance per spec.
                - theme='system' lets sonner pick light/dark from the
                  prefers-color-scheme media query, aligned with the rest
                  of the portal's CSS variables.
              */}
              <Toaster
                position='top-right'
                richColors
                closeButton
                theme='system'
                duration={4000}
              />
            </ThemeProvider>
          </SettingsProvider>
        </VerticalNavProvider>
      </OperatingEntityProvider>
    </AuthSessionProvider>
  )
}

export default Providers
