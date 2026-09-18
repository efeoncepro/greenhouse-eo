import 'server-only'

/**
 * TASK-1848 — reader público por token (sin sesión): `resolveSharedInsightEdition` y
 * `downloadSharedInsightOutput`. Contrato que consume Think (TASK-1875):
 *
 *   ok           → 200 con `InsightSharedEditionResponseV1` / bytes del PDF
 *   not_found    → 404: token desconocido, mal formado, EXPIRADO, flag OFF, org suspendida o sin
 *                  módulo (indistinguibles a propósito: anti-oracle)
 *   gone         → 410: revocado o edición retirada
 *   rate_limited → 429
 *
 * Cada lectura y cada descarga revalidan el grant contra la base ANTES de servir un byte (sin
 * cache): revocar corta la siguiente request. Lo ya descargado no es revocable y se declara así.
 * El token nunca se loguea: el access log guarda el grant id y un hash salado del sujeto.
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { downloadPrivateAsset } from '@/lib/storage/greenhouse-assets'

import { INSIGHT_WEB_MODEL_VERSION, type InsightSharedDownloadV1, type InsightSharedEditionResponseV1 } from '../contracts/web-model'
import { isInsightsSharingEnabled } from '../flags'
import { findInsightOutputsForEdition } from '../render/store'
import { getInsightEditionById } from '../stores/edition-store'
import { getInsightEditorialPlanByEdition } from '../stores/plan-store'
import { getInsightReportById } from '../stores/report-store'
import { getInsightEvidenceSnapshotByEdition } from '../stores/snapshot-store'

import { deriveInsightShareStatus, INSIGHT_SHARE_DOWNLOADABLE_OUTPUTS, isInsightShareDownloadableOutput, type InsightShareDownloadableOutput } from './contracts'
import {
  consumeInsightShareRateBucket,
  readInsightOrganizationName,
  recordInsightShareAccess,
  resolveInsightShareGrantByDigest,
  type InsightShareAccessOutcome,
  type InsightShareClientHint,
  type ResolvedInsightShareGrant
} from './store'
import { digestInsightShareToken, hashInsightShareSubject, isWellFormedInsightShareToken } from './token'
import { buildInsightWebModel, formatInsightPeriodLabel } from './web-model'

export type SharedInsightDenial = 'not_found' | 'gone' | 'rate_limited'

export interface SharedInsightRequestContext {
  token: string
  /** IP del visitante (o del proxy de Think): sólo se usa hasheada. */
  clientIp: string | null
  clientHint: InsightShareClientHint
  env?: NodeJS.ProcessEnv
}

const numberFromEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

const rateSalt = (env: NodeJS.ProcessEnv): string => env.INSIGHTS_SHARE_RATE_SALT?.trim() || 'insights-share-public-v1'

/**
 * Dos cubetas: por grant (protege un enlace filtrado) y por IP (protege la base de un barrido de
 * tokens). Think consulta server-side, así que la IP puede ser la de su runtime: por eso la cubeta
 * por IP es más holgada y la por grant es la que muerde. Falla CERRADO: sin base, 429.
 */
const allowRequest = async (context: SharedInsightRequestContext, action: 'view' | 'download', grantSubject: string | null): Promise<boolean> => {
  const env = context.env ?? process.env
  const salt = rateSalt(env)
  const ipLimit = numberFromEnv(action === 'view' ? env.INSIGHTS_SHARE_PUBLIC_VIEW_PER_IP_PER_MIN : env.INSIGHTS_SHARE_PUBLIC_DOWNLOAD_PER_IP_PER_MIN, action === 'view' ? 300 : 60)
  const grantLimit = numberFromEnv(action === 'view' ? env.INSIGHTS_SHARE_PUBLIC_VIEW_PER_GRANT_PER_MIN : env.INSIGHTS_SHARE_PUBLIC_DOWNLOAD_PER_GRANT_PER_MIN, action === 'view' ? 60 : 20)

  try {
    const ipSubject = hashInsightShareSubject(`ip:${context.clientIp?.trim().toLowerCase() || 'unknown'}`, salt)

    if (!(await consumeInsightShareRateBucket(ipSubject, action, ipLimit))) return false
    if (grantSubject && !(await consumeInsightShareRateBucket(hashInsightShareSubject(`grant:${grantSubject}`, salt), action, grantLimit))) return false

    return true
  } catch (error) {
    captureWithDomain(error, 'insights', { tags: { source: 'insights_share_rate_guard', action } })

    return false
  }
}

const logAccess = async (
  context: SharedInsightRequestContext,
  resolved: ResolvedInsightShareGrant | null,
  accessKind: 'view' | 'download',
  outcome: InsightShareAccessOutcome,
  output: string | null
) => {
  try {
    await recordInsightShareAccess({
      shareGrantId: resolved?.grant.shareGrantId ?? null,
      organizationId: resolved?.grant.organizationId ?? null,
      editionId: resolved?.grant.editionId ?? null,
      accessKind,
      outcome,
      output,
      clientHint: context.clientHint,
      subjectHash: context.clientIp ? hashInsightShareSubject(`ip:${context.clientIp.trim().toLowerCase()}`, rateSalt(context.env ?? process.env)) : null
    })
  } catch (error) {
    captureWithDomain(error, 'insights', { tags: { source: 'insights_share_access_log', outcome } })
  }
}

type GateResult =
  | { ok: true; resolved: ResolvedInsightShareGrant }
  | { ok: false; denial: SharedInsightDenial; resolved: ResolvedInsightShareGrant | null; outcome: InsightShareAccessOutcome }

/** El punto único de autorización del token. Se evalúa inmediatamente antes de servir. */
const gateSharedAccess = async (context: SharedInsightRequestContext, action: 'view' | 'download'): Promise<GateResult> => {
  if (!isInsightsSharingEnabled(context.env)) return { ok: false, denial: 'not_found', resolved: null, outcome: 'not_found' }

  const wellFormed = isWellFormedInsightShareToken(context.token)
  const digest = wellFormed ? digestInsightShareToken(context.token) : null

  if (!(await allowRequest(context, action, digest))) return { ok: false, denial: 'rate_limited', resolved: null, outcome: 'rate_limited' }
  if (!digest) return { ok: false, denial: 'not_found', resolved: null, outcome: 'not_found' }

  const resolved = await resolveInsightShareGrantByDigest(digest)

  if (!resolved) return { ok: false, denial: 'not_found', resolved: null, outcome: 'not_found' }

  // Organización suspendida o módulo retirado: falla cerrado sin revelar nada (404, no 410).
  if (!resolved.organizationActive || !resolved.moduleActive || resolved.editionAudience !== 'client') {
    return { ok: false, denial: 'not_found', resolved, outcome: 'unavailable' }
  }

  if (resolved.editionState === 'withdrawn') return { ok: false, denial: 'gone', resolved, outcome: 'withdrawn' }

  const status = deriveInsightShareStatus(resolved.grant)

  if (status === 'revoked') return { ok: false, denial: 'gone', resolved, outcome: 'revoked' }
  if (status === 'expired') return { ok: false, denial: 'not_found', resolved, outcome: 'expired' }
  if (resolved.editionState !== 'issued') return { ok: false, denial: 'not_found', resolved, outcome: 'unavailable' }

  return { ok: true, resolved }
}

const completedAssetFor = async (resolved: ResolvedInsightShareGrant, output: InsightShareDownloadableOutput): Promise<string | null> => {
  const outputs = await findInsightOutputsForEdition({ organizationId: resolved.grant.organizationId, editionId: resolved.grant.editionId, audience: 'client' })
  const match = outputs.find(row => row.output === output && row.state === 'completed' && row.outputAssetId)

  return match?.outputAssetId ?? null
}

export type ResolveSharedInsightResult = { status: 'ok'; body: InsightSharedEditionResponseV1 } | { status: SharedInsightDenial }

export const resolveSharedInsightEdition = async (context: SharedInsightRequestContext): Promise<ResolveSharedInsightResult> => {
  const gate = await gateSharedAccess(context, 'view')

  if (!gate.ok) {
    await logAccess(context, gate.resolved, 'view', gate.outcome, null)

    return { status: gate.denial }
  }

  const { grant } = gate.resolved

  const [edition, snapshot, plan, organizationName] = await Promise.all([
    getInsightEditionById(undefined, grant.organizationId, grant.editionId),
    getInsightEvidenceSnapshotByEdition(undefined, grant.organizationId, grant.editionId),
    getInsightEditorialPlanByEdition(undefined, grant.organizationId, grant.editionId),
    readInsightOrganizationName(grant.organizationId)
  ])

  // Una edición emitida siempre tiene snapshot sellado y plan congelado; si no, no se inventa nada.
  if (!edition || !snapshot?.sealedAt || !plan?.frozenAt || !edition.issuedAt) {
    captureWithDomain(new Error('insights_shared_edition_incomplete'), 'insights', { tags: { source: 'insights_share_resolve' }, extra: { shareGrantId: grant.shareGrantId } })
    await logAccess(context, gate.resolved, 'view', 'unavailable', null)

    return { status: 'not_found' }
  }

  const report = await getInsightReportById(undefined, grant.organizationId, edition.reportId)
  const locale = edition.request.locale ?? plan.plan.locale

  const downloads: InsightSharedDownloadV1[] = []

  for (const output of INSIGHT_SHARE_DOWNLOADABLE_OUTPUTS) {
    if (!edition.outputs.includes(output) || !grant.downloadOutputs.includes(output)) continue

    const assetId = await completedAssetFor(gate.resolved, output)

    downloads.push(
      assetId
        ? { output, status: 'available', href: `/api/public/insights/shared/${context.token}/outputs/${output}` }
        : { output, status: 'unavailable' }
    )
  }

  await logAccess(context, gate.resolved, 'view', 'served', null)

  return {
    status: 'ok',
    body: {
      modelVersion: INSIGHT_WEB_MODEL_VERSION,
      header: {
        organizationName: organizationName ?? '',
        reportCode: report?.reportCode ?? '',
        reportTitle: report?.title ?? '',
        editionVersion: edition.version,
        periodLabel: formatInsightPeriodLabel(edition.request.period.start, edition.request.period.endExclusive, locale),
        periodStart: edition.request.period.start,
        periodEndExclusive: edition.request.period.endExclusive,
        timeZone: edition.periodTimeZone,
        issuedAt: edition.issuedAt,
        asOfMax: snapshot.asOfMax
      },
      model: buildInsightWebModel({ plan: plan.plan, facts: snapshot.facts }),
      downloads,
      expiresAt: grant.expiresAt
    }
  }
}

export type DownloadSharedInsightResult =
  | { status: 'ok'; bytes: ArrayBuffer; contentType: string; filename: string }
  | { status: SharedInsightDenial }

export const downloadSharedInsightOutput = async (context: SharedInsightRequestContext & { output: unknown }): Promise<DownloadSharedInsightResult> => {
  if (!isInsightShareDownloadableOutput(context.output)) return { status: 'not_found' }

  const output = context.output
  const gate = await gateSharedAccess(context, 'download')

  if (!gate.ok) {
    await logAccess(context, gate.resolved, 'download', gate.outcome, output)

    return { status: gate.denial }
  }

  if (!gate.resolved.grant.downloadOutputs.includes(output)) {
    await logAccess(context, gate.resolved, 'download', 'unavailable', output)

    return { status: 'not_found' }
  }

  const assetId = await completedAssetFor(gate.resolved, output)

  if (!assetId) {
    await logAccess(context, gate.resolved, 'download', 'unavailable', output)

    return { status: 'not_found' }
  }

  try {
    const { file } = await downloadPrivateAsset({
      assetId,
      actorUserId: null,
      accessMetadata: { accessChannel: 'insights_share_grant', shareGrantId: gate.resolved.grant.shareGrantId }
    })

    await logAccess(context, gate.resolved, 'download', 'served', output)

    return { status: 'ok', bytes: file.arrayBuffer, contentType: file.contentType || 'application/pdf', filename: `${output.replace('_', '-')}.pdf` }
  } catch (error) {
    captureWithDomain(error, 'insights', { tags: { source: 'insights_share_download', output }, extra: { shareGrantId: gate.resolved.grant.shareGrantId } })
    await logAccess(context, gate.resolved, 'download', 'unavailable', output)

    return { status: 'not_found' }
  }
}
