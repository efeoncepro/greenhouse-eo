import { EFEONCE_BRAND_NAME } from '@/config/efeonce-brand'

import type { Locale } from './types'

/** Efeonce leads the experience; Greenhouse identifies the platform. */
export const PORTAL_DEFAULT_TITLE = `${EFEONCE_BRAND_NAME} | Greenhouse`

export const getPortalPageTitle = (pageLabel: string) => `${EFEONCE_BRAND_NAME} | ${pageLabel}`

const accessCopy = {
  'es-CL': {
    label: 'Acceder',
    description: 'Accede a tu cuenta corporativa de Efeonce.'
  },
  'en-US': {
    label: 'Sign in',
    description: 'Sign in to your Efeonce corporate account.'
  }
} as const

export const getPortalAccessMetadata = (locale: Locale) => {
  const copy = accessCopy[locale]

  return { title: getPortalPageTitle(copy.label), description: copy.description }
}
