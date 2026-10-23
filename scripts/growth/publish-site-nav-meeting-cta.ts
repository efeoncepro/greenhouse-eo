/**
 * TASK-2042 Slice 3 — Publish the governed meeting CTA behind «Agenda tu diagnóstico» of the global site navigation
 * (header, mega panels and onepage of efeoncepro.com). Same contract as the landing meeting CTAs (TASK-1598):
 * native scheduler (`open_meeting_scheduler`, discovery binding), with its own WordPress surface so the menu is
 * measured apart from the landings and its allowlist covers the whole site. The surface only allows this CTA, so it
 * never competes with a landing's CTA.
 *
 * The one-time embed key is written to an ignored 0600 file and is never logged. The theme receives it as a WordPress
 * option through WP-CLI and embeds it only in the public host contract, where CTA surface keys are designed to live.
 * Re-running rotates the key: the old key stops working, so the option must be updated in the same go.
 *
 * Usage (Cloud SQL proxy on 15432 + .env.local credentials):
 *   GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= \
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-site-nav-meeting-cta.ts [--dry-run]
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

const CTA_SLUG = 'site-nav-discovery-meeting'
const SURFACE_NAME = 'Efeonce global site navigation (WordPress)'
const SECRET_PATH = path.resolve('.auth/site-nav-meeting-cta-surface.json')
const DRY_RUN = process.argv.includes('--dry-run')

// Routes that prove the CTA resolves site-wide: the home, a landing with its own CTA and a blog post path.
const SMOKE_ROUTES = ['/', '/agencia-inbound-marketing/', '/blog/']

const writeSecret = async (payload: { surfaceId: string; embedKeyId: string; embedKey: string }) => {
  await mkdir(path.dirname(SECRET_PATH), { recursive: true, mode: 0o700 })
  await writeFile(SECRET_PATH, `${JSON.stringify(payload)}\n`, { mode: 0o600 })
  await chmod(SECRET_PATH, 0o600)
}

const main = async () => {
  const definition = await getCtaDefinitionBySlug(CTA_SLUG)
  const versions = definition ? await listVersionsForCta(definition.cta_id) : []
  const hasPublished = versions.some(version => version.status === 'published')
  const bindings = await listSurfaceBindings()
  const existing = bindings.find(binding => binding.surface_name === SURFACE_NAME)

  if (DRY_RUN) {
    console.log(
      JSON.stringify({
        dryRun: true,
        ctaSlug: CTA_SLUG,
        cta: hasPublished ? 'published (kept)' : definition ? 'exists without a published version (would author and publish)' : 'absent (would author and publish)',
        surface: existing ? `exists ${existing.surface_id} (would rotate its key)` : 'absent (would register)'
      })
    )

    return
  }

  if (!hasPublished) {
    const authored = await authorDraftCta({
      slug: CTA_SLUG,
      name: 'Agenda nativa — navegación global del sitio',
      purpose:
        'Abrir el scheduler nativo desde «Agenda tu diagnóstico» de la navegación global (cabecera, mega y onepage) sin exponer al provider.',
      ownerTeam: 'growth',
      campaignSlug: 'site-nav',
      placement: 'embedded',
      styleVariant: 'minimal',
      content: {
        eyebrow: 'Diagnóstico',
        headline: 'Agenda tu diagnóstico',
        body: 'Elige un horario y revisamos juntos tu caso en una videollamada con alguien del equipo.',
        ctaLabel: 'Agenda tu diagnóstico',
        dismissLabel: 'Cerrar',
        footnote: 'Sin costo'
      },
      actionPolicy: {
        kind: 'open_meeting_scheduler',
        meetingSurfaceId: 'fhsf-efeonce-lead-gen-web',
        schedulerKey: 'discovery'
      },
      targetingPolicy: { routes: ['/**'], excludeRoutes: [] },
      priorityPolicy: { score: 180 },
      createdBy: 'site-nav'
    })

    if (!authored.ok) throw new Error(`CTA authoring failed: ${authored.details.join(', ')}`)

    const review = await submitCtaReview(authored.ctaVersionId)

    if (!review.ok) throw new Error(`CTA review failed: ${review.reason}`)

    const published = await publishCtaVersion(authored.ctaVersionId)

    if (!published.ok) {
      throw new Error(`CTA publish failed: ${published.reason} ${(published.blockingReasons ?? []).join(', ')}`)
    }
  }

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

  const smoke: Record<string, string> = {}

  for (const route of SMOKE_ROUTES) {
    const render = await getArbitratedRenderContracts({ surfaceId, embedKey, origin: 'https://efeoncepro.com', route })

    if (render.outcome !== 'ok') throw new Error(`CTA render smoke failed on ${route}: ${render.outcome}`)

    const contract = render.result.nonInterruptive.find(item => item.cta.slug === CTA_SLUG)

    if (!contract || contract.action.kind !== 'open_meeting_scheduler') {
      throw new Error(`CTA render smoke did not resolve the native meeting action on ${route}`)
    }

    smoke[route] = `${contract.action.kind}:${contract.action.schedulerKey}`
  }

  console.log(JSON.stringify({ ok: true, ctaSlug: CTA_SLUG, surfaceId, smoke, secretStored: true }))
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
