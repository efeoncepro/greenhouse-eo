/**
 * Glitch — datos de marca del catálogo que no dependen de los catálogos (sin imports del motor), para que el
 * compilador de tokens y el de fuentes los lean sin ciclos. Sólo Glitch: nada de esto va en piezas de Efeonce.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Carpeta de plantillas compartida por los tres catálogos de Glitch. */
export const glitchCatalogDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * Extensión del brand pack `axis`: Bricolage variable con rango de pesos, Poppins 400/500 y Guttery (licenciada;
 * autorizada en el repo privado por el operador el 2026-09-27). La base del pack aporta Poppins 300/600/700/800/900.
 */
export const GLITCH_PACK_EXTENSIONS = ['glitch'] as const

/** Archivos compilados que sellan la marca del catálogo, en orden (relativos a la carpeta). */
export const GLITCH_COMPILED_FILES = ['deck-fonts.css', 'glitch-tokens.css'] as const
