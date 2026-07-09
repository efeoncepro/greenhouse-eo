import 'server-only'

/**
 * TASK-1375 — Sube un asset entregable (ebook PDF) al bucket PRIVADO de Greenhouse
 * (`GREENHOUSE_PRIVATE_ASSETS_BUCKET`). Reusable para todos los ebook lead magnets
 * (playbook docs/reference/ebook-lead-magnet-playbook.md).
 *
 * El objeto queda privado: solo se sirve por la ruta gated
 * `/api/public/growth/forms/[slug]/asset/[handle]` tras un submit aceptado. NUNCA público.
 *
 * DRY-RUN por defecto; `--apply` sube de verdad.
 *
 *   set -a && source .env.local && set +a
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/growth/upload-form-asset.ts --file "<ruta.pdf>" --object "ebooks/<slug>/<archivo>.pdf" [--apply]
 */

import { readFile } from 'node:fs/promises'

import { getGreenhousePrivateAssetsBucket } from '@/lib/storage/greenhouse-assets'
import { uploadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'

const argValue = (flag: string): string | undefined => {
  const idx = process.argv.indexOf(flag)

  return idx >= 0 ? process.argv[idx + 1] : undefined
}

const APPLY = process.argv.includes('--apply')

const main = async (): Promise<void> => {
  const file = argValue('--file')
  const objectName = argValue('--object')
  const contentType = argValue('--content-type') ?? 'application/pdf'

  if (!file || !objectName) {
    console.error('Uso: --file <ruta local> --object <path/en/bucket> [--content-type <mime>] [--apply]')
    process.exit(1)
  }

  const bucket = getGreenhousePrivateAssetsBucket()
  const bytes = await readFile(file)

  console.log(`Upload asset — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`  file         : ${file} (${(bytes.byteLength / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`  bucket       : ${bucket} (PRIVADO)`)
  console.log(`  object_name  : ${objectName}`)
  console.log(`  content_type : ${contentType}`)

  if (!APPLY) {
    console.log('DRY-RUN: no se subió nada. Repite con --apply para subir.')

    return
  }

  const gsUri = await uploadGreenhouseStorageObject({
    bucketName: bucket,
    objectName,
    contentType,
    bytes,
    cacheControl: 'private, no-store',
  })

  console.log(`OK subido: ${gsUri}`)
}

main().catch(error => {
  console.error('FAIL:', error instanceof Error ? error.message : error)
  process.exit(1)
})
