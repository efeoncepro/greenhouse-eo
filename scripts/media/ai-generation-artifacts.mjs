// Primitivas compartidas del archivo de corridas de `ai-generations/` en GCS.
//
// Las consumen `pnpm media:archive-ai-generation` (sube los binarios de UNA corrida y escribe su
// `artifacts.remote.json`) y `pnpm ai-gen:archive|pull|where` (scripts/ai-generations/), que agregan
// readback, guardas y borrado local encima. Un solo lugar para: qué es binario, cuál es el bucket por
// defecto, cómo se hashea, cómo se sincroniza y qué forma tiene el inventario.
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

export const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.mp4',
  '.webm',
  '.mov',
  '.m4v',
  // Audio, video sin comprimir y comprimidos: tampoco se versionan. Faltaban aquí y en `.gitignore`, y el
  // 2026-09-25 un checkpoint arrastró 91 de ellos (985 MB, un MKV de 470 MB) y GitHub cortó el push.
  '.mkv',
  '.avi',
  '.wav',
  '.aif',
  '.aiff',
  '.flac',
  '.mp3',
  '.m4a',
  '.aac',
  '.ogg',
  '.zip'
])

export const ARTIFACTS_MANIFEST_NAME = 'artifacts.remote.json'
export const ARTIFACTS_SCHEMA = 'greenhouse.aiGenerationArtifacts.v1'
export const DEFAULT_PREFIX = 'ai-generations'

/** Bucket del archivo: `GREENHOUSE_AI_GENERATIONS_BUCKET` o el default. Única fuente del literal. */
export function resolveArchiveBucket(env = process.env) {
  return env.GREENHOUSE_AI_GENERATIONS_BUCKET || 'efeonce-group-greenhouse-private-assets-prod'
}

export const isBinary = name => BINARY_EXTENSIONS.has(path.extname(name).toLowerCase())

export async function collectFiles(rootDir, currentDir = rootDir) {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue
    const fullPath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...await collectFiles(rootDir, fullPath))
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()

    if (!BINARY_EXTENSIONS.has(ext)) continue

    const relativePath = path.relative(rootDir, fullPath)

    files.push({ fullPath, relativePath })
  }

  return files
}

/**
 * `{ path, sizeBytes, sha256 }` de un archivo. Con `{ verification: true }` agrega `md5` (hex), el que
 * GCS calcula del lado del servidor: es lo que permite un readback que pruebe el CONTENIDO subido.
 */
export async function describeFile(file, { verification = false } = {}) {
  const bytes = await readFile(file.fullPath)
  const info = await stat(file.fullPath)

  const out = {
    path: file.relativePath,
    sizeBytes: info.size,
    sha256: createHash('sha256').update(bytes).digest('hex')
  }

  if (verification) out.md5 = createHash('md5').update(bytes).digest('hex')

  return out
}

export function runGcloud(args, { stream = false } = {}) {
  // `stream`: la salida va directo a la terminal. Una sincronización de miles de archivos imprime más de
  // 1 MB y `spawnSync` con buffer mata al proceso (ENOBUFS) a mitad de la subida.
  const result = spawnSync('gcloud', args, stream ? { stdio: ['ignore', 'inherit', 'inherit'] } : { encoding: 'utf8' })

  if (result.status !== 0) {
    throw new Error(`gcloud ${args.join(' ')} failed (status ${result.status}, ${result.error?.code ?? 'sin código'}):\n${result.stderr || result.stdout || ''}`)
  }


return result.stdout
}

export const objectPrefixFor = (prefix, runName) => `${prefix.replace(/^\/+|\/+$/g, '')}/${runName}`

/**
 * Una sola sincronización paralela en vez de un `gcloud` por archivo: una corrida de video tiene miles de
 * frames y subirlos uno a uno tomaba horas. `rsync` conserva las rutas relativas, omite lo ya subido
 * (reanudable) y sólo considera las extensiones del archivo: todo lo demás queda excluido por regex.
 */
export function syncBinaries({ rootDir, bucket, objectPrefix }) {
  const onlyBinaries = `(?i)^(?!.*\\.(${[...BINARY_EXTENSIONS].map(ext => ext.slice(1)).join('|')})$).*$`

  runGcloud(['storage', 'rsync', rootDir, `gs://${bucket}/${objectPrefix}`, '--recursive', '--quiet', `--exclude=${onlyBinaries}`], { stream: true })
}

/** Inventario `artifacts.remote.json` (schema v1). `files`: [{ path, sizeBytes, sha256, gsUri }]. */
export function buildArtifactsManifest({ run, bucket, objectPrefix, files, generatedAt = new Date().toISOString() }) {
  return {
    schema: ARTIFACTS_SCHEMA,
    generatedAt,
    run,
    bucket,
    prefix: objectPrefix,
    totalBytes: files.reduce((sum, item) => sum + item.sizeBytes, 0),
    fileCount: files.length,
    files
  }
}
