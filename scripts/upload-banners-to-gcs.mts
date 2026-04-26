/**
 * Upload profile banners from public/images/banners/ to GCS.
 * Run: npx tsx scripts/upload-banners-to-gcs.mts
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { GoogleAuth } from 'google-auth-library'

const BUCKET = process.env.GREENHOUSE_MEDIA_BUCKET || 'efeonce-group-greenhouse-media'
const BANNERS_DIR = join(process.cwd(), 'public', 'images', 'banners')
const GCS_PREFIX = 'banners'
const STORAGE_SCOPE = 'https://www.googleapis.com/auth/devstorage.read_write'

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({ scopes: [STORAGE_SCOPE] })
  const token = await auth.getAccessToken()

  if (!token) throw new Error('Failed to get access token')

  return token
}

async function uploadFile(token: string, fileName: string, bytes: Buffer): Promise<string> {
  const objectName = `${GCS_PREFIX}/${fileName}`
  const contentType = fileName.endsWith('.webp') ? 'image/webp' : 'image/png'
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(BUCKET)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable'
    },
    body: bytes as unknown as BodyInit
  })

  if (!response.ok) {
    const err = await response.text().catch(() => '')

    throw new Error(`Upload failed for ${fileName}: ${response.status} ${err}`)
  }

  return `gs://${BUCKET}/${objectName}`
}

async function main() {
  const token = await getAccessToken()
  const files = await readdir(BANNERS_DIR)
  const pngFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.webp'))

  console.log(`Uploading ${pngFiles.length} banners to gs://${BUCKET}/${GCS_PREFIX}/\n`)

  for (const file of pngFiles) {
    const bytes = await readFile(join(BANNERS_DIR, file))
    const gsUri = await uploadFile(token, file, bytes)

    console.log(`  ✅ ${file} (${(bytes.length / 1024).toFixed(0)} KB) → ${gsUri}`)
  }

  console.log('\n✅ All banners uploaded.')
  console.log('\nServed via: /api/media/banners/{category}')
  console.log('Example:    /api/media/banners/leadership')
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
