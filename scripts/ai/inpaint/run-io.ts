import { createHash } from 'node:crypto'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import sharp from 'sharp'

/** E/S de una corrida: hash, manifiesto, hoja de contacto (TASK-1965). */

/** Sube cuando cambia algo que altera la salida para las mismas entradas: invalida la caché. */
export const INPAINT_PIPELINE_VERSION = 1

export const sha256 = (data: Uint8Array | string): string => createHash('sha256').update(data).digest('hex')

/** JSON estable (claves ordenadas) para que el hash no dependa del orden de construcción. */
export const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

export const exists = async (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false
  )

export const writeFileEnsured = async (path: string, data: Buffer | string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, data)
}

export const writeJson = (path: string, value: unknown) => writeFileEnsured(path, JSON.stringify(value, null, 2) + '\n')

export const readJson = async <T>(path: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    return null
  }
}

/** Carpeta de la corrida: `<runRoot>/inpaint/<id corto del hash>`; misma entrada = misma carpeta. */
export const runDirFor = (runRoot: string, key: string) => join(runRoot, 'inpaint', key.slice(0, 12))

/** Fecha local YYYY-MM-DD para la carpeta por defecto de `ai-generations/`. */
export const localDate = (now = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0')

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const escapeXml = (text: string) => text.replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch] ?? ch)

/** Hoja de contacto horizontal: cada imagen a `height` px con su rótulo debajo. */
export const renderContactSheet = async (items: Array<{ png: Buffer; label: string }>, height = 512): Promise<Buffer> => {
  const gap = 16
  const labelHeight = 36

  const tiles = await Promise.all(
    items.map(async item => {
      const resized = await sharp(item.png).resize({ height }).png().toBuffer({ resolveWithObject: true })

      return { ...item, buffer: resized.data, width: resized.info.width }
    })
  )

  const width = tiles.reduce((sum, tile) => sum + tile.width, 0) + gap * (tiles.length + 1)
  const composites: sharp.OverlayOptions[] = []
  let x = gap

  for (const tile of tiles) {
    composites.push({ input: tile.buffer, left: x, top: gap })
    composites.push({
      input: Buffer.from(
        `<svg width="${tile.width}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="24" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#f2f2f2">${escapeXml(tile.label)}</text></svg>`
      ),
      left: x,
      top: gap + height + 4
    })
    x += tile.width + gap
  }

  return sharp({ create: { width, height: height + labelHeight + gap * 2, channels: 3, background: '#161616' } })
    .composite(composites)
    .png()
    .toBuffer()
}
