/**
 * GIF composition — opcional, requiere ffmpeg system binary.
 *
 * Estrategia: ffmpeg lee el .webm y produce un .gif a:
 * - 12 fps (default — balance entre fluidez y tamaño)
 * - max width 800px (downscale para keeping ~< 2MB)
 * - palette pre-computed para mejor color (2-pass)
 *
 * Si ffmpeg no está disponible, retorna null con warning a stdout.
 * NO falla la captura entera — el .webm + frames quedan intactos.
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export interface GifOptions {
  fps?: number
  maxWidth?: number
}

const isFfmpegAvailable = (): boolean => {
  const result = spawnSync('which', ['ffmpeg'], { encoding: 'utf8' })

  return result.status === 0 && Boolean(result.stdout?.trim())
}

export const composeGif = (
  webmPath: string,
  options: GifOptions = {}
): { gifPath: string | null; warning?: string } => {
  if (!isFfmpegAvailable()) {
    return {
      gifPath: null,
      warning: 'ffmpeg no instalado — GIF saltado. Instalá con `brew install ffmpeg` (macOS) o `apt install ffmpeg` (Linux).'
    }
  }

  if (!existsSync(webmPath)) {
    return { gifPath: null, warning: `webm no encontrado: ${webmPath}` }
  }

  const fps = options.fps ?? 12
  const maxWidth = options.maxWidth ?? 800
  const dir = dirname(webmPath)
  const gifPath = join(dir, 'flipbook.gif')
  const palettePath = join(dir, '_palette.png')

  // Pass 1: extract palette
  const pass1 = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      webmPath,
      '-vf',
      `fps=${fps},scale=${maxWidth}:-1:flags=lanczos,palettegen`,
      palettePath
    ],
    { encoding: 'utf8' }
  )

  if (pass1.status !== 0) {
    return { gifPath: null, warning: `ffmpeg palette pass failed: ${pass1.stderr?.slice(0, 200)}` }
  }

  // Pass 2: compose GIF with palette
  const pass2 = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      webmPath,
      '-i',
      palettePath,
      '-filter_complex',
      `fps=${fps},scale=${maxWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
      gifPath
    ],
    { encoding: 'utf8' }
  )

  if (pass2.status !== 0) {
    return { gifPath: null, warning: `ffmpeg gif pass failed: ${pass2.stderr?.slice(0, 200)}` }
  }

  // Cleanup palette intermediate
  try {
    spawnSync('rm', [palettePath])
  } catch {
    // ignore
  }

  return { gifPath }
}
