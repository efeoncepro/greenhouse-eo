import 'server-only'

import { getGreenhousePrivateAssetsBucket } from '@/lib/storage/greenhouse-assets'

import { getActiveFormAsset, getSubmissionById } from './store'

/**
 * TASK-1375 — Entrega GATED del asset de un lead magnet (ebook PDF).
 *
 * El `handle` es el `submission_id` (no enumerable) que el submit aceptado devuelve al
 * browser; sin form completado no hay handle → no hay descarga. El gate valida que la
 * submission exista, esté aceptada y esté dentro del TTL del asset. El `object_name` y el
 * bucket son SERVER-ONLY: nunca cruzan al render contract ni al caller público; se
 * resuelven acá solo para que la ruta stremee desde el bucket privado (patrón proxy-stream,
 * no signed-URL). Primitive reusable para todos los ebooks (playbook
 * docs/reference/ebook-lead-magnet-playbook.md).
 */

// Estados de `form_submission` que significan "la submission fue aceptada" (post-accept;
// el dispatcher luego mueve accepted → routed/delivered/etc). Excluye received/validated
// (pre-accept transitorios) y rejected.
const ACCEPTED_STATUSES = new Set([
  'accepted',
  'routed',
  'delivered',
  'destination_failed',
  'retrying',
  'dead_letter',
])

export type FormAssetDeliveryOutcome =
  | { ok: true; bucketName: string; objectName: string; fileName: string; contentType: string }
  | { ok: false; reason: 'not_found' | 'not_ready' | 'expired' | 'no_asset' }

export const resolveFormAssetDelivery = async (handle: string): Promise<FormAssetDeliveryOutcome> => {
  if (!handle || handle.length > 200) return { ok: false, reason: 'not_found' }

  const submission = await getSubmissionById(handle)

  if (!submission) return { ok: false, reason: 'not_found' }
  if (!ACCEPTED_STATUSES.has(submission.status)) return { ok: false, reason: 'not_ready' }

  const asset = await getActiveFormAsset(submission.form_id)

  if (!asset) return { ok: false, reason: 'no_asset' }

  const ageMs = Date.now() - new Date(submission.created_at).getTime()
  const ttlMs = asset.ttl_hours * 60 * 60 * 1000

  if (ageMs > ttlMs) return { ok: false, reason: 'expired' }

  return {
    ok: true,
    bucketName: getGreenhousePrivateAssetsBucket(),
    objectName: asset.object_name,
    fileName: asset.file_name,
    contentType: asset.content_type,
  }
}
