import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Artifact Composer — catálogo de íconos Solar Bold.
 *
 * ⚠️ SIN `import 'server-only'` a propósito (TASK-1393 Slice 1): es un Next-ism que no resuelve
 * fuera de Next y obligaba al CLI a cargar un shim (`server-only-shim.cjs`) que habría viajado a
 * cualquier consumer del paquete (Creative Studio, tender-worker). El motor es un primitive
 * portable: el boundary server/client se marca en el CONSUMER, no acá. Que esto no corre en un
 * browser lo garantiza la realidad (lee del filesystem y el motor entero depende de Playwright),
 * no una marca de framework.
 *
 * Las plantillas usan los íconos de dos formas distintas, y el resolver tiene que saber cuál:
 * - `<img src="assets/solar/target-bold.svg">` → se cambia el `src`.
 * - `<svg><path d="…"></svg>` inline → hay que cambiar el `d` del path (el `src` no existe).
 *
 * Este módulo lee el SVG del disco y extrae su `d`, para no tener miles de caracteres de path
 * pegados a mano en el código (y desincronizados del asset real la primera vez que alguien
 * actualice un ícono).
 */

// Module-relative, NUNCA relativo al cwd. Desde Slice 2 este módulo vive DENTRO del catálogo
// deck-axis (el icon set es semántica del deck, no del motor): sus assets están al lado.
const SOLAR_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'assets/solar')

const cache = new Map<string, string>()

export class UnknownSolarIconError extends Error {
  constructor(name: string) {
    super(`El ícono Solar "${name}-bold.svg" no existe en assets/solar/. No se inventa un sustituto.`)
    this.name = 'UnknownSolarIconError'
  }
}

/** Devuelve el `d` del path de un ícono Solar Bold (`target` → el path de `target-bold.svg`). */
export const solarIconPath = (name: string): string => {
  const cached = cache.get(name)

  if (cached) return cached

  const file = path.join(SOLAR_DIR, `${name}-bold.svg`)

  if (!fs.existsSync(file)) {
    throw new UnknownSolarIconError(name)
  }

  const svg = fs.readFileSync(file, 'utf8')

  // Los Solar Bold traen un único path con todo el glyph (a veces con `fill-rule`).
  const matches = [...svg.matchAll(/\sd="([^"]+)"/g)].map(match => match[1]!)

  if (matches.length === 0) {
    throw new Error(`El ícono Solar "${name}" no tiene ningún path con atributo "d".`)
  }

  const merged = matches.join(' ')

  cache.set(name, merged)

  return merged
}

/** `assets/solar/<name>-bold.svg` — para las plantillas que usan `<img src>`. */
export const solarIconSrc = (name: string): string => `assets/solar/${name}-bold.svg`
