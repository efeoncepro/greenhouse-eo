import { extname } from 'node:path'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

export interface ResolveOutputDirInput {
  batch: boolean
  out?: string
  outDir?: string
  conceptDir?: string | null
  defaultDir: string
  resolvePath: (path: string) => string
}

/**
 * Directorio de salida del CLI de imágenes.
 *
 * En `--batch` cada ítem trae su propio `filename`, así que `--out` sólo puede significar un directorio.
 * Antes se ignoraba en silencio y todo el lote caía en `public/images/generated` (dentro del repo), con el
 * operador creyendo que había escrito en otra parte. Ahora `--out` sin extensión de imagen se usa como
 * directorio, y cualquier combinación ambigua falla antes de gastar.
 */
export function resolveOutputDir({ batch, out, outDir, conceptDir, defaultDir, resolvePath }: ResolveOutputDirInput): string {
  if (batch && out) {
    if (IMAGE_EXTENSIONS.has(extname(out).toLowerCase())) {
      throw new Error(
        `--batch con --out "${out}": en un lote cada ítem define su filename, así que --out debe ser un directorio (sin extensión de imagen). Usa --out <dir> o --out-dir <dir>.`
      )
    }

    if (outDir && resolvePath(outDir) !== resolvePath(out)) {
      throw new Error('--batch recibió --out y --out-dir con directorios distintos: deja sólo uno.')
    }

    if (conceptDir) {
      throw new Error('--batch recibió --out y --concept: --concept ya fija el directorio (.captures/concepts/<loop>); deja sólo uno.')
    }

    return resolvePath(out)
  }

  if (conceptDir) return conceptDir

  return outDir ? resolvePath(outDir) : defaultDir
}
