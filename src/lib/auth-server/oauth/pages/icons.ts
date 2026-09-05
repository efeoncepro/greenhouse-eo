/**
 * Iconografía inline de las páginas de Efeonce ID (TASK-1835).
 *
 * Por qué inline y no un sprite ni un icon font: la CSP del emisor es `default-src 'none'` con
 * `img-src 'self' data:` y `style-src` por hash. Un `<svg>` incrustado en el HTML no es un recurso
 * externo ni un estilo, así que pasa sin ampliar la política. Ningún icono lleva `style=`
 * (la CSP no permite atributos de estilo) ni color propio: heredan `currentColor`, de modo que el
 * color siempre sale del token que pinta el texto o el botón que los contiene.
 *
 * Geometría: caja 24, trazo 1.5, extremos redondeados — la misma familia visual que el resto del
 * producto. Se dibujan a 24 y se escalan por CSS (`.id-icon`), nunca al revés.
 *
 * Los iconos son decorativos: siempre acompañan a un texto visible que ya nombra la acción, por eso
 * llevan `aria-hidden="true"` y `focusable="false"` y NUNCA son el único portador del significado.
 */

const icon = (paths: string): string =>
  `<svg class="id-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`

/** Correo: pedir el enlace de acceso y confirmar que salió. */
export const ICON_MAIL = icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7.5 7.6 5.1a1.6 1.6 0 0 0 1.8 0l7.6-5.1"/>')

/** Escudo con visto: verificación adicional (step-up) superada o requerida. */
export const ICON_SHIELD_CHECK = icon('<path d="M12 3.2 5.4 5.6v5.2c0 4 2.7 7.7 6.6 9 3.9-1.3 6.6-5 6.6-9V5.6Z"/><path d="m9.4 11.9 1.9 1.9 3.4-3.7"/>')

/** Llave: passkey / clave de acceso del dispositivo. */
export const ICON_KEY = icon('<circle cx="8.2" cy="12" r="3.2"/><path d="M11.4 12h9"/><path d="M17.6 12v3"/><path d="M20.4 12v2.2"/>')

/** Teléfono: app de códigos temporales (TOTP). */
export const ICON_DEVICE = icon('<rect x="7" y="3" width="10" height="18" rx="2.4"/><path d="M11 18h2"/>')

/** Ojo: permiso de lectura en la pantalla de consentimiento. */
export const ICON_EYE = icon('<path d="M2.8 12S6.4 6.4 12 6.4 21.2 12 21.2 12 17.6 17.6 12 17.6 2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.6"/>')

/** Lápiz: permiso de escritura en la pantalla de consentimiento — el que hay que mirar dos veces. */
export const ICON_PENCIL = icon('<path d="M4.5 19.5h3l10-10a2.1 2.1 0 0 0-3-3l-10 10Z"/><path d="m14.2 6.8 3 3"/>')

/** Triángulo de alerta: error del protocolo o dato inválido en el formulario. */
export const ICON_ALERT = icon('<path d="M10.7 4.4 3.2 17.3A1.5 1.5 0 0 0 4.5 19.6h15a1.5 1.5 0 0 0 1.3-2.3L13.3 4.4a1.5 1.5 0 0 0-2.6 0Z"/><path d="M12 9.6v3.6"/><path d="M12 16.4h.01"/>')

/** Reloj: espera obligada (límite de intentos, enlace vencido). */
export const ICON_CLOCK = icon('<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l2.9 1.8"/>')

/** Flecha: continuar hacia el paso siguiente del flujo. */
export const ICON_ARROW_RIGHT = icon('<path d="M5 12h13"/><path d="m12.5 6 6 6-6 6"/>')

/** Candado: la línea de confianza del panel de acceso (enlace de un solo uso, sin contraseñas). */
export const ICON_LOCK = icon('<rect x="4.8" y="10.4" width="14.4" height="9.8" rx="2"/><path d="M8.4 10.4V7.9a3.6 3.6 0 0 1 7.2 0v2.5"/>')

/** Edificio: la organización a la que se entra en el consentimiento. */
export const ICON_BUILDING = icon('<path d="M4.5 20.5V5.3a1.4 1.4 0 0 1 1-1.3l6.6-1.9a1 1 0 0 1 1.3 1v17.4"/><path d="M13.4 8.4h4.7a1.4 1.4 0 0 1 1.4 1.4v10.7"/><path d="M3.2 20.5h17.6"/><path d="M8 8.2h1.8M8 12h1.8M8 15.8h1.8"/>')

/**
 * Logo oficial de Microsoft para el botón de acceso del equipo interno.
 *
 * Es el ÚNICO lugar del emisor con colores literales, y es deliberado: son los colores de marca de
 * un tercero (#F25022 · #7FBA00 · #00A4EF · #FFB900), fijados por las Microsoft Brand Guidelines
 * para el botón "Iniciar sesión con Microsoft". Tokenizarlos sería reescribir la marca ajena, así
 * que aquí el valor correcto es el literal. No cambiar la geometría, las proporciones ni los colores.
 */
export const MICROSOFT_MARK_SVG =
  '<svg class="id-icon id-icon-brand" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#F25022" d="M2.4 2.4h9v9h-9z"/><path fill="#7FBA00" d="M12.6 2.4h9v9h-9z"/><path fill="#00A4EF" d="M2.4 12.6h9v9h-9z"/><path fill="#FFB900" d="M12.6 12.6h9v9h-9z"/></svg>'
