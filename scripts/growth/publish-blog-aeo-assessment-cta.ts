/**
 * Publish the governed Growth CTA «Efeonce AEO Assessment» for blog posts (block «Growth CTA» of
 * efeonce-editorial-blocks 0.7.0, 2026-10-25). Action `open_growth_form` with `presentation: 'inline'`: the visitor's
 * click opens, inside the card, the Growth Form `efeonce-aeo-diagnostic` — the same one of /aeo-2/, whose submission
 * runs the AI Visibility Grader and emails the Efeonce AI Visibility Report (TASK-1321). One CTA and one WordPress
 * surface for the blog; the block chooses where it appears, so the targeting is every route of the site.
 *
 * The one-time embed key is written to an ignored 0600 file and is never logged. Re-running ROTATES the key: then
 * run `scripts/public-website/set-blog-growth-cta.php` again with the new file, or the block prints nothing.
 *
 * Usage: npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-blog-aeo-assessment-cta.ts
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
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const CTA_SLUG = 'blog-aeo-assessment'
/** Growth Form `efeonce-aeo-diagnostic` (the /aeo-2/ form: grader + report by email + HubSpot). */
const FORM_KEY = 'b120566a-dd1a-43c8-956a-4e0121e805b8'
const FORM_SURFACE = 'fhsf-efeonce-aeo-diagnostic'
const SURFACE_NAME = 'Efeonce blog — Growth CTA en artículos (WordPress)'
const SECRET_PATH = path.resolve('.auth/blog-growth-cta-surface.json')
const SMOKE_ROUTE = '/aeo/seo-y-aeo/'

const writeSecret = async (payload: { surface: string; embedKeyId: string; key: string; ctas: string[]; formSurface: string }) => {
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
      name: 'Efeonce AEO Assessment — artículos del blog',
      purpose: 'Invitar a quien lee un artículo a pedir su Efeonce AEO Assessment; el formulario corre el informe.',
      ownerTeam: 'growth',
      campaignSlug: 'aeo-assessment',
      placement: 'embedded',
      styleVariant: 'spotlight',
      content: {
        eyebrow: 'Efeonce AEO Assessment',
        headline: 'Cuando le preguntan a la IA, ¿aparece tu marca?',
        body: 'Revisamos cómo responden ChatGPT, Gemini, Perplexity y Google cuando alguien busca lo que vendes, frente a qué marcas apareces y qué conviene arreglar primero.',
        footnote: 'Sin costo · El informe llega a tu correo',
        ctaLabel: 'Hacer mi assessment',
        dismissLabel: 'Ahora no'
      },
      actionPolicy: { kind: 'open_growth_form', formRef: FORM_KEY, presentation: 'inline' },
      targetingPolicy: { routes: ['/**'], excludeRoutes: [] },
      priorityPolicy: { score: 150 },
      createdBy: 'blog-growth-cta'
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

  await writeSecret({ surface: surfaceId, embedKeyId, key: embedKey, ctas: [CTA_SLUG], formSurface: FORM_SURFACE })

  process.env.GROWTH_CTA_ENGINE_ENABLED = 'true'

  const render = await getArbitratedRenderContracts({ surfaceId, embedKey, origin: 'https://efeoncepro.com', route: SMOKE_ROUTE })

  if (render.outcome !== 'ok') throw new Error(`CTA render smoke failed: ${render.outcome}`)

  const contract = render.result.nonInterruptive.find(item => item.cta.slug === CTA_SLUG)

  if (!contract || contract.action.kind !== 'open_growth_form' || contract.action.formKey !== FORM_KEY) {
    throw new Error('CTA render smoke did not resolve the AEO form action')
  }

  console.log(
    JSON.stringify({
      ok: true,
      ctaSlug: CTA_SLUG,
      surfaceId,
      actionKind: contract.action.kind,
      presentation: contract.action.presentation ?? 'inline',
      formSlug: contract.action.formSlug,
      secretStored: true
    })
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
