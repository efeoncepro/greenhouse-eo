import localFont from 'next/font/local'

/**
 * TASK-1964 — Bricolage Grotesque, la voz `idea` de «La órbita», sólo para los titulares del escenario del login.
 * El resto del login usa la tipografía del portal (theme).
 */
export const bricolage = localFont({
  src: '../../assets/fonts/web/BricolageGrotesque-Latin-500.woff2',
  weight: '500',
  style: 'normal',
  display: 'swap',
  variable: '--font-bricolage',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
})
