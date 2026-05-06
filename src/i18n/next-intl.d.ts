import type { Locale } from '@/lib/copy'
import type { GreenhouseIntlMessages } from './messages'

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale
    Messages: GreenhouseIntlMessages
  }
}
