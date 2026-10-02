import 'server-only'

import { createHash } from 'node:crypto'

import { getAssetById, storeSystemGeneratedPrivateAsset, downloadPrivateAsset } from '@/lib/storage/greenhouse-assets'
import type { GreenhouseAssetRecord } from '@/types/assets'
import type { AxisAeoXrayManifest } from '@/lib/axis/aeo-xray/aeo-xray'
import { XrayError, type XrayAuthority, type XrayPublicResult } from './types'
import { xrayStore, readXrayByDigest } from './store'
import { digestXrayToken } from './token'
import { resolvePublicXray } from './public-reader'

export const XRAY_ASSET_MAX_BYTES = 10 * 1024 * 1024
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

type ProtectedRef = Extract<AxisAeoXrayManifest['assets'][number]['ref'], { kind: 'protected' }>

function boundAsset(asset: GreenhouseAssetRecord | null, organizationId: string, caseId: string, ref: ProtectedRef) {
  return (
    !!asset &&
    asset.visibility === 'private' &&
    asset.status === 'attached' &&
    asset.ownerAggregateType === 'xray_source' &&
    asset.ownerAggregateId === caseId &&
    asset.metadata.organizationId === organizationId &&
    asset.mimeType === 'image/webp' &&
    asset.sizeBytes <= XRAY_ASSET_MAX_BYTES &&
    typeof ref.sha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(ref.sha256) &&
    asset.metadata.sha256 === ref.sha256
  )
}

/** Issuance checks IDs, owner and immutable binary identity; a filename/URL is not authority. */
export async function assertXrayAssets(authority: XrayAuthority, caseId: string, manifest: AxisAeoXrayManifest) {
  for (const descriptor of manifest.assets) {
    if (descriptor.ref.kind !== 'protected') throw new XrayError('not_ready', 409)
    const asset = await getAssetById(descriptor.ref.assetId)

    if (
      !boundAsset(asset, authority.organizationId, caseId, descriptor.ref) ||
      asset!.metadata.width !== descriptor.width ||
      asset!.metadata.height !== descriptor.height
    ) {
      throw new XrayError('not_ready', 409)
    }
  }
}

/** Decode and re-encode approved original media. Fresh identity each time; no overwrite API. */
export async function uploadXrayAsset(authority: XrayAuthority, caseId: string, bytes: Uint8Array) {
  const exists = await xrayStore.transaction(authority, session => session.findCase(caseId))

  if (!exists) throw new XrayError('not_found', 404)
  if (bytes.byteLength === 0 || bytes.byteLength > XRAY_ASSET_MAX_BYTES) throw new XrayError('invalid_input', 400)
  const { default: sharp } = await import('sharp')
  let output: { data: Buffer; info: { width: number; height: number } }

  try {
    const source = sharp(bytes, { limitInputPixels: 40_000_000, animated: false })
    const metadata = await source.metadata()

    if (!['png', 'jpeg', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) throw new Error('format')
    output = await source.rotate().webp({ quality: 92 }).toBuffer({ resolveWithObject: true })
    if (output.data.byteLength > XRAY_ASSET_MAX_BYTES) throw new Error('size')
  } catch {
    throw new XrayError('invalid_input', 400)
  }

  const sha256 = hash(output.data)

  const asset = await storeSystemGeneratedPrivateAsset({
    ownerAggregateType: 'xray_source',
    ownerAggregateId: caseId,
    fileName: 'xray-original.webp',
    mimeType: 'image/webp',
    bytes: output.data,
    actorUserId: authority.actorUserId,
    metadata: { organizationId: authority.organizationId, sha256, width: output.info.width, height: output.info.height }
  })

  return {
    ref: { kind: 'protected' as const, assetId: asset.assetId, sha256 },
    width: output.info.width,
    height: output.info.height
  }
}

export type XrayAssetResult = Exclude<XrayPublicResult, { status: 'ok' }> | { status: 'ok'; bytes: ArrayBuffer }

export async function readPublicXrayAsset(input: {
  token: string
  assetId: string
  clientIp: string | null
}): Promise<XrayAssetResult> {
  const grant = await resolvePublicXray(input)

  if (grant.status !== 'ok') return grant
  const descriptor = grant.body.model.assets.find(asset => asset.id === input.assetId)

  if (!descriptor || descriptor.ref.kind !== 'protected') return { status: 'not_found' }

  try {
    // Internal scope is never projected into the shared page payload.
    const scope = await readXrayByDigest(digestXrayToken(input.token))

    if (
      !scope ||
      !scope.organizationActive ||
      scope.revokedAt ||
      scope.withdrawnAt ||
      Date.parse(scope.expiresAt) <= Date.now()
    ) {
      return { status: 'gone' }
    }

    const asset = await getAssetById(descriptor.ref.assetId)

    if (!boundAsset(asset, scope.organizationId, scope.caseId, descriptor.ref)) return { status: 'not_found' }

    const { file } = await downloadPrivateAsset({
      assetId: descriptor.ref.assetId,
      actorUserId: null,
      accessMetadata: { source: 'aeo_xray_share', editionId: grant.body.header.editionId }
    })

    if (
      file.arrayBuffer.byteLength > XRAY_ASSET_MAX_BYTES ||
      hash(new Uint8Array(file.arrayBuffer)) !== descriptor.ref.sha256
    ) {
      return { status: 'unavailable' }
    }

    return { status: 'ok', bytes: file.arrayBuffer }
  } catch {
    return { status: 'unavailable' }
  }
}
