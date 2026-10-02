/**
 * Marketing con Manzanitas — datos de marca del catálogo que no dependen de los catálogos (sin imports del motor), para
 * que el compilador de tokens y el de fuentes los lean sin ciclos (TASK-1939). Sólo piezas de MCM: el registro
 * complementa La órbita y nunca se mezcla con Glitch.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Carpeta de plantillas compartida por los dos catálogos de Marketing con Manzanitas. */
export const manzanitasCatalogDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * Extensión del brand pack `axis`: Bricolage variable (respuesta 760 con wdth 96 y opsz 88; numeral del paso en 300) y
 * Poppins 400/500. La base del pack aporta Poppins 300 (pregunta) y 600–900 con itálicas (eslogan).
 */
export const MANZANITAS_PACK_EXTENSIONS = ['manzanitas'] as const

/** Archivos compilados que sellan la marca del catálogo, en orden (relativos a la carpeta). */
export const MANZANITAS_COMPILED_FILES = ['deck-fonts.css', 'manzanitas-tokens.css'] as const

/** Las líneas de servicio que el catálogo sabe pintar (las de `efeonceGraphicLine.lines`). */
export const MANZANITAS_LINES = ['growth', 'brand', 'engine', 'voice', 'revenue-hubspot', 'revenue-salesforce'] as const

export type ManzanitasLine = (typeof MANZANITAS_LINES)[number]
