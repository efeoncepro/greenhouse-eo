import 'server-only'
import { getActiveFormAsset } from '@/lib/growth/forms/store'

const FORM_ID = 'fdef-3e05ff50-2abd-4cc1-ae5e-9280070ff43b' // efeonce-web-agentica-ebook

const main = async () => {
  const asset = await getActiveFormAsset(FORM_ID)

  if (!asset) { console.log('NO_ASSET_ROW'); process.exit(2) }
  console.log('FORM_ASSET_ROW:', JSON.stringify({
    bucket: (asset as any).bucket_name ?? (asset as any).bucketName,
    object: (asset as any).object_name ?? (asset as any).objectName,
    fileName: (asset as any).file_name ?? (asset as any).fileName,
    active: (asset as any).active ?? (asset as any).is_active,
    ttl: (asset as any).ttl_hours ?? (asset as any).ttlHours,
  }, null, 2))
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1) })
