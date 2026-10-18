/**
 * Publish the governed meeting CTA behind «Agenda una reunión» of the Inbound Marketing landing
 * (/agencia-inbound-marketing/, 2026-10-18). Same contract as the influencer landing (TASK-1598):
 * native scheduler (`open_meeting_scheduler`, discovery binding), one CTA and one WordPress surface per landing.
 *
 * The one-time embed key is written to an ignored 0600 file and is never logged.
 * The WordPress publisher consumes that file as an input and embeds the key only
 * in the public host contract, where CTA surface keys are designed to live.
 */
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  authorDraftCta,
  publishCtaVersion,
  registerCtaSurface,
  rotateCtaSurfaceEmbedKey,
  submitCtaReview
} from '../../src/lib/growth/ctas/commands'
import { getArbitratedRenderContracts } from '../../src/lib/growth/ctas/readers'
import { getCtaDefinitionBySlug, listSurfaceBindings, listVersionsForCta } from '../../src/lib/growth/ctas/store'

const CTA_SLUG = 'inbound-discovery-meeting'
const SURFACE_NAME = 'Efeonce Inbound landing (WordPress)'
const SECRET_PATH = path.resolve('.auth/inbound-meeting-cta-surface.json')
const ROUTE = '/agencia-inbound-marketing/'

const writeSecret = async (payload: { surfaceId: string; embedKeyId: string; embedKey: string }) => {
  await mkdir(path.dirname(SECRET_PATH), { recursive: true, mode: 0o700 })
  await writeFile(SECRET_PATH, `${JSON.stringify(payload)}\n`, { mode: 0o600 })
  await chmod(SECRET_PATH, 0o600)
}

const main = async () => {
  const definition = await getCtaDefinitionBySlug(CTA_SLUG)
  const versions = definition ? await listVersionsForCta(definition.cta_id) : []

  if (!versions.some(version => version.status === 'published')) {
    const authored = await authorDraftCta({
      slug: CTA_SLUG,
      name: 'Agenda nativa — Inbound Marketing (cierre)',
      purpose: 'Abrir el scheduler nativo desde el bloque «¿Prefieres conversarlo en vivo?» de la landing de inbound sin exponer al provider.',
      ownerTeam: 'growth',
      campaignSlug: 'inbound-marketing',
      placement: 'embedded',
      styleVariant: 'minimal',
      content: {
        eyebrow: 'Diagnóstico en vivo',
        headline: 'Agenda una reunión',
        body: 'Elige un horario y revisamos juntos tu caso en una videollamada con alguien del equipo.',
        ctaLabel: 'Agenda una reunión',
        dismissLabel: 'Cerrar',
        footnote: 'Sin costo'
      },
      actionPolicy: {
        kind: 'open_meeting_scheduler',
        meetingSurfaceId: 'fhsf-efeonce-lead-gen-web',
        schedulerKey: 'discovery'
      },
      targetingPolicy: {
        routes: [ROUTE],
        excludeRoutes: []
      },
      priorityPolicy: { score: 180 },
      createdBy: 'inbound-landing'
    })

    if (!authored.ok) throw new Error(`CTA authoring failed: ${authored.details.join(', ')}`)

    const review = await submitCtaReview(authored.ctaVersionId)

    if (!review.ok) throw new Error(`CTA review failed: ${review.reason}`)

    const published = await publishCtaVersion(authored.ctaVersionId)

    if (!published.ok) {
      throw new Error(`CTA publish failed: ${published.reason} ${(published.blockingReasons ?? []).join(', ')}`)
    }
  }

  const bindings = await listSurfaceBindings()
  const existing = bindings.find(binding => binding.surface_name === SURFACE_NAME)
  let surfaceId: string
  let embedKeyId: string
  let embedKey: string

  if (existing) {
    const rotated = await rotateCtaSurfaceEmbedKey(existing.surface_id)

    if (!rotated.ok) throw new Error('CTA surface key rotation failed')

    surfaceId = existing.surface_id
    embedKeyId = rotated.embedKeyId
    embedKey = rotated.embedKeySecret
  } else {
    const registered = await registerCtaSurface({
      surfaceKind: 'wordpress',
      surfaceName: SURFACE_NAME,
      originAllowlist: ['https://efeoncepro.com', 'https://www.efeoncepro.com'],
      allowedCtaSlugs: [CTA_SLUG]
    })

    surfaceId = registered.surfaceId
    embedKeyId = registered.embedKeyId
    embedKey = registered.embedKeySecret
  }

  await writeSecret({ surfaceId, embedKeyId, embedKey })

  process.env.GROWTH_CTA_ENGINE_ENABLED = 'true'

  const render = await getArbitratedRenderContracts({
    surfaceId,
    embedKey,
    origin: 'https://efeoncepro.com',
    route: ROUTE
  })

  if (render.outcome !== 'ok') throw new Error(`CTA render smoke failed: ${render.outcome}`)

  const contract = render.result.nonInterruptive.find(item => item.cta.slug === CTA_SLUG)

  if (!contract || contract.action.kind !== 'open_meeting_scheduler') {
    throw new Error('CTA render smoke did not resolve the native meeting action')
  }

  console.log(
    JSON.stringify({
      ok: true,
      ctaSlug: CTA_SLUG,
      surfaceId,
      actionKind: contract.action.kind,
      schedulerKey: contract.action.schedulerKey,
      secretStored: true
    })
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
