import { spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'

/**
 * ffmpeg/ffprobe del equipo para `pnpm ai:inpaint video` (TASK-1965). Binario externo, no dependencia del build:
 * se detecta al arrancar y el error dice cómo instalarlo.
 */
export interface VideoProbe {
  width: number
  height: number
  /** Cuadros por segundo como fracción exacta (`30000/1001`) y como número. */
  fpsFraction: string
  fps: number
  durationSeconds: number
  frames: number | null
  hasAudio: boolean
  codec: string | null
  sizeBytes: number | null
}

const run = (command: string, args: string[]): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', chunk => (stdout += chunk))
    child.stderr.on('data', chunk => (stderr += chunk))
    child.on('error', error =>
      reject(
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? new Error(`No se encontró ${command}. Instálalo con: brew install ffmpeg`)
          : error
      )
    )
    child.on('close', code => (code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} salió con ${code}: ${stderr.trim().split('\n').slice(-3).join(' · ')}`))))
  })

export const assertFfmpeg = async (): Promise<void> => {
  await run('ffmpeg', ['-version'])
  await run('ffprobe', ['-version'])
}

const parseFraction = (raw: string | undefined): number => {
  if (!raw) return 0

  const [num, den] = raw.split('/').map(Number)

  return den ? num / den : num
}

export const probeVideo = async (path: string): Promise<VideoProbe> => {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', path])

  const json = JSON.parse(stdout) as {
    streams?: Array<Record<string, string | number | undefined>>
    format?: { duration?: string; size?: string }
  }

  const video = json.streams?.find(stream => stream.codec_type === 'video')

  if (!video) throw new Error(`${path} no tiene pista de video.`)

  const fpsFraction = String(video.avg_frame_rate && video.avg_frame_rate !== '0/0' ? video.avg_frame_rate : video.r_frame_rate)
  const duration = Number(video.duration ?? json.format?.duration ?? 0)
  const frames = video.nb_frames !== undefined ? Number(video.nb_frames) : null

  return {
    width: Number(video.width),
    height: Number(video.height),
    fpsFraction,
    fps: parseFraction(fpsFraction),
    durationSeconds: duration,
    frames: Number.isFinite(frames) ? frames : null,
    hasAudio: Boolean(json.streams?.some(stream => stream.codec_type === 'audio')),
    codec: typeof video.codec_name === 'string' ? video.codec_name : null,
    sizeBytes: json.format?.size ? Number(json.format.size) : null
  }
}

/** Extrae todos los cuadros como PNG `%06d.png`; con `scale`/`fps` normaliza la salida del motor al original. */
export const extractFrames = async (
  video: string,
  outDir: string,
  options: { width?: number; height?: number; fpsFraction?: string } = {}
): Promise<string[]> => {
  const filters: string[] = []

  if (options.width && options.height) filters.push(`scale=${options.width}:${options.height}:flags=lanczos`)
  if (options.fpsFraction) filters.push(`fps=${options.fpsFraction}`)

  await run('ffmpeg', ['-v', 'error', '-y', '-i', video, ...(filters.length ? ['-vf', filters.join(',')] : []), '-vsync', 'passthrough', '-pix_fmt', 'rgb24', `${outDir}/%06d.png`])

  return (await readdir(outDir)).filter(name => /^\d{6}\.png$/.test(name)).sort()
}

/** Un cuadro en el segundo `t`. */
export const extractFrameAt = (video: string, seconds: number, out: string) =>
  run('ffmpeg', ['-v', 'error', '-y', '-ss', String(seconds), '-i', video, '-frames:v', '1', out])

/**
 * Codifica la secuencia final en H.264 alta calidad (CRF 12, yuv420p) y copia el audio del ORIGINAL, si tiene.
 * El códec pierde: por eso la verificación exacta se hace sobre la secuencia PNG, antes de este paso.
 */
export const encodeFrames = (framesDir: string, fpsFraction: string, out: string, audioFrom: string | null) =>
  run('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-framerate',
    fpsFraction,
    '-i',
    `${framesDir}/%06d.png`,
    ...(audioFrom ? ['-i', audioFrom, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'copy', '-shortest'] : []),
    '-c:v',
    'libx264',
    '-crf',
    '12',
    '-preset',
    'slow',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    out
  ])
