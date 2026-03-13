import type { Settings } from '@core/contexts/settingsContext'
import type { Layout, LayoutComponentWidth, Mode } from '@core/types'

import primaryColorConfig from '@configs/primaryColorConfig'
import themeConfig from '@configs/themeConfig'

const allowedModes = new Set<Mode>(['light', 'dark', 'system'])
const allowedLayouts = new Set<Layout>(['vertical', 'collapsed', 'horizontal'])
const allowedWidths = new Set<LayoutComponentWidth>(['compact', 'wide'])

export const getGreenhouseBrandSettings = (): Settings => ({
  mode: themeConfig.mode,
  skin: themeConfig.skin,
  semiDark: themeConfig.semiDark,
  layout: themeConfig.layout,
  navbarContentWidth: themeConfig.navbar.contentWidth,
  contentWidth: themeConfig.contentWidth,
  footerContentWidth: themeConfig.footer.contentWidth,
  primaryColor: primaryColorConfig[0].main
})

export const sanitizeBrandSettings = (settings?: Partial<Settings> | null): Settings => {
  const defaults = getGreenhouseBrandSettings()

  return {
    ...defaults,
    mode: allowedModes.has(settings?.mode as Mode) ? settings?.mode : defaults.mode,
    layout: allowedLayouts.has(settings?.layout as Layout) ? settings?.layout : defaults.layout,
    navbarContentWidth: allowedWidths.has(settings?.navbarContentWidth as LayoutComponentWidth)
      ? settings?.navbarContentWidth
      : defaults.navbarContentWidth,
    contentWidth: allowedWidths.has(settings?.contentWidth as LayoutComponentWidth)
      ? settings?.contentWidth
      : defaults.contentWidth,
    footerContentWidth: allowedWidths.has(settings?.footerContentWidth as LayoutComponentWidth)
      ? settings?.footerContentWidth
      : defaults.footerContentWidth
  }
}
