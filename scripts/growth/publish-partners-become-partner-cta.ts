/**
 * Publish the governed Growth CTA behind «Quiero ser partner» of the Partners landing (/partnership/,
 * rediseño 2026-10-23). Action `open_growth_form` with `presentation: 'dialog'` (TASK-2044/2045): the visitor's
 * click opens the Growth Form `efeonce-partner-application` in a modal dialog with the approved header. It is NOT
 * the interruptive `popup_modal` placement. One CTA and one WordPress surface for the landing.
 *
 * ⚠️ Activation: the renderer that draws the dialog (CTA 1.4.0) and the form fields (forms 1.1.0) reach the hosts
 * with the next Greenhouse release to `main`. Publishing before only leaves the contract ready; the WordPress page
 * keeps «Quiero ser partner» → /agenda/ until then.
 *
 * The one-time embed key is written to an ignored 0600 file and is never logged. Re-running ROTATES the key.
 *
 * Usage: npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-partners-become-partner-cta.ts
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

const CTA_SLUG = 'partners-become-partner'
const FORM_KEY = 'eb5c108d-05fc-427b-82b0-4bb161fdbac7'
const SURFACE_NAME = 'Efeonce Partners landing (WordPress)'
const SECRET_PATH = path.resolve('.auth/partners-cta-surface.json')
const ROUTE = '/partnership/'

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
      name: 'Quiero ser partner — Partners (popup)',
      purpose: 'Abrir el formulario «Quiero ser partner» en un diálogo desde el bloque «Sumémonos» de la landing Partners.',
      ownerTeam: 'growth',
      campaignSlug: 'partners',
      placement: 'embedded',
      styleVariant: 'minimal',
      content: {
        eyebrow: '¿Eres una plataforma?',
        headline: 'Sumémonos',
        body: 'Si tu tecnología encaja con lo que nuestros clientes necesitan, hablemos de cómo llevarla a más empresas en Latinoamérica.',
        ctaLabel: 'Quiero ser partner',
        dismissLabel: 'Cerrar'
      },
      actionPolicy: {
        kind: 'open_growth_form',
        formRef: FORM_KEY,
        presentation: 'dialog',
        dialog: {
          eyebrow: '¿Eres una plataforma?',
          title: 'Sumémonos',
          lead: 'Cuéntanos qué tecnología ofreces y a quién le sirve. Revisamos cada propuesta con el equipo de la línea que corresponda.'
        }
      },
      targetingPolicy: { routes: [ROUTE], excludeRoutes: [] },
      priorityPolicy: { score: 160 },
      createdBy: 'partners-landing'
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

  const render = await getArbitratedRenderContracts({ surfaceId, embedKey, origin: 'https://efeoncepro.com', route: ROUTE })

  if (render.outcome !== 'ok') throw new Error(`CTA render smoke failed: ${render.outcome}`)

  const contract = render.result.nonInterruptive.find(item => item.cta.slug === CTA_SLUG)

  if (!contract || contract.action.kind !== 'open_growth_form' || contract.action.presentation !== 'dialog') {
    throw new Error('CTA render smoke did not resolve the dialog form action')
  }

  console.log(
    JSON.stringify({
      ok: true,
      ctaSlug: CTA_SLUG,
      surfaceId,
      actionKind: contract.action.kind,
      presentation: contract.action.presentation,
      formSlug: contract.action.formSlug,
      dialogTitle: contract.action.dialog?.title,
      secretStored: true
    })
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
