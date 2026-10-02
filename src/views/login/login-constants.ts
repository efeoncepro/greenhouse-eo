/**
 * TASK-1964 — Constantes del login V4 premium («La órbita»).
 *
 * Los valores de marca (lente, colores, curvas) salen de `efeonceGraphicLine` vía
 * `@/components/greenhouse/motion/orbit-geometry`; aquí sólo vive lo propio de esta pantalla.
 */
import type { LoginAnnouncementDto } from '@/lib/login-announcements/types'

/** Desde este ancho el escenario fotográfico acompaña al formulario; debajo, la novedad baja como tarjeta. */
export const LOGIN_STAGE_BREAKPOINT = 1024

/** Tiempo de cada novedad en el carrusel. */
export const LOGIN_CAROUSEL_INTERVAL_MS = 9000

/** Paso del reloj del carrusel (progreso de la pestaña). */
export const LOGIN_CAROUSEL_TICK_MS = 100

/**
 * Escenario sin novedades vigentes: foto por defecto con su lente, sin texto ni pestañas. Foto de referencia del set
 * curado de «La órbita»; se reemplaza por una foto producida antes de producción (bloqueo de release de TASK-1964).
 */
export const LOGIN_STAGE_FALLBACK: Pick<LoginAnnouncementDto, 'image' | 'lens'> = {
  image: { path: '/images/login/stage-default.webp', alt: 'Dos personas trazan un plan sobre un vidrio' },
  lens: { x: 52, y: 32, radiusRatio: 0.24 }
}

/**
 * Tipografía de marca del escenario (titular de la novedad). Escala de la familia `idea` de «La órbita»
 * (Bricolage Grotesque, `ideaMedium` 56 px / 620 en el sistema; aquí 500 para el registro premium aprobado).
 * Excepción declarada al lint de tipografía: en «La órbita» el tamaño de la voz `idea` lo fija el soporte
 * (`axisAdvertising.recipes` no trae tamaño) y la escala del portal no llega a un titular de escenario.
 */
export const LOGIN_STAGE_TYPE = {
  headline: { fontSize: 'clamp(2rem, 3.4vw, 3.25rem)', lineHeight: 0.98, letterSpacing: '-0.035em', fontWeight: 500 }, // ui-code-lint-disable-line
  headlineCard: { fontSize: '1.75rem', lineHeight: 1, letterSpacing: '-0.03em', fontWeight: 500 } // ui-code-lint-disable-line
} as const
