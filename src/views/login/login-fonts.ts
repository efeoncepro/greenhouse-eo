import { Bricolage_Grotesque } from 'next/font/google'

/**
 * TASK-1964 — Bricolage Grotesque, la voz `idea` de «La órbita», sólo para los titulares del escenario del login.
 * El resto del login usa la tipografía del portal (theme).
 */
export const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500'],
  display: 'swap',
  variable: '--font-bricolage',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
})
