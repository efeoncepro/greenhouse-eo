'use client'

// React Imports
import type { ReactNode } from 'react'
import { createContext, useEffect, useMemo, useState } from 'react'

// Type Imports
import type { Mode, Skin, Layout, LayoutComponentWidth } from '@core/types'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useObjectCookie } from '@core/hooks/useObjectCookie'
import { getGreenhouseBrandSettings, sanitizeBrandSettings } from '@core/utils/brandSettings'

// Settings type
export type Settings = {
  mode?: Mode
  skin?: Skin
  semiDark?: boolean
  layout?: Layout
  navbarContentWidth?: LayoutComponentWidth
  contentWidth?: LayoutComponentWidth
  footerContentWidth?: LayoutComponentWidth
  primaryColor?: string
}

// UpdateSettingsOptions type
type UpdateSettingsOptions = {
  updateCookie?: boolean
}

// SettingsContextProps type
type SettingsContextProps = {
  settings: Settings
  updateSettings: (settings: Partial<Settings>, options?: UpdateSettingsOptions) => void
  isSettingsChanged: boolean
  resetSettings: () => void
  updatePageSettings: (settings: Partial<Settings>) => () => void
}

type Props = {
  children: ReactNode
  settingsCookie: Settings | null
  mode?: Mode
}

// Initial Settings Context
export const SettingsContext = createContext<SettingsContextProps | null>(null)

// Settings Provider
export const SettingsProvider = (props: Props) => {
  // Initial Settings
  const initialSettings: Settings = getGreenhouseBrandSettings()

  const updatedInitialSettings = {
    ...initialSettings,
    mode: props.mode || themeConfig.mode
  }

  // Cookies
  const [rawSettingsCookie, updateSettingsCookie] = useObjectCookie<Settings>(
    themeConfig.settingsCookieName,
    sanitizeBrandSettings(JSON.stringify(props.settingsCookie) !== '{}' ? props.settingsCookie : updatedInitialSettings)
  )

  const settingsCookie = useMemo(() => sanitizeBrandSettings(rawSettingsCookie), [rawSettingsCookie])

  // State
  const [_settingsState, _updateSettingsState] = useState<Settings>(settingsCookie)

  useEffect(() => {
    if (JSON.stringify(rawSettingsCookie) !== JSON.stringify(settingsCookie)) {
      updateSettingsCookie(settingsCookie)
    }
  }, [rawSettingsCookie, settingsCookie, updateSettingsCookie])

  const updateSettings = (settings: Partial<Settings>, options?: UpdateSettingsOptions) => {
    const { updateCookie = true } = options || {}

    _updateSettingsState(prev => {
      const newSettings = sanitizeBrandSettings({ ...prev, ...settings })

      // Update cookie if needed
      if (updateCookie) updateSettingsCookie(newSettings)

      return newSettings
    })
  }

  /**
   * Updates the settings for page with the provided settings object.
   * Updated settings won't be saved to cookie hence will be reverted once navigating away from the page.
   *
   * @param settings - The partial settings object containing the properties to update.
   * @returns A function to reset the page settings.
   *
   * @example
   * useEffect(() => {
   *     return updatePageSettings({ theme: 'dark' });
   * }, []);
   */
  const updatePageSettings = (settings: Partial<Settings>): (() => void) => {
    updateSettings(settings, { updateCookie: false })

    // Returns a function to reset the page settings
    return () => updateSettings(settingsCookie, { updateCookie: false })
  }

  const resetSettings = () => {
    updateSettings(updatedInitialSettings)
  }

  const isSettingsChanged = useMemo(
    () => JSON.stringify(updatedInitialSettings) !== JSON.stringify(_settingsState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [_settingsState]
  )

  return (
    <SettingsContext.Provider
      value={{
        settings: _settingsState,
        updateSettings,
        isSettingsChanged,
        resetSettings,
        updatePageSettings
      }}
    >
      {props.children}
    </SettingsContext.Provider>
  )
}
