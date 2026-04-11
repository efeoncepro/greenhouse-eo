// Type Imports
import type { Session } from 'next-auth'

import type { ChildrenType, Direction } from '@core/types'

// Context Imports
import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import { OperatingEntityProvider } from '@/context/OperatingEntityContext'
import AuthSessionProvider from '@components/auth/AuthSessionProvider'
import ThemeProvider from '@components/theme'

// Styled Component Imports
import AppReactToastify from '@/libs/styles/AppReactToastify'

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
              <AppReactToastify hideProgressBar />
            </ThemeProvider>
          </SettingsProvider>
        </VerticalNavProvider>
      </OperatingEntityProvider>
    </AuthSessionProvider>
  )
}

export default Providers
