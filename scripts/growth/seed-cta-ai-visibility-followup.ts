/**
 * TASK-1339 — Seed del primer CTA real: follow-up del reporte AI Visibility.
 *
 * Autora + publica el CTA `ai-visibility-report-followup` vía los COMMANDS canónicos
 * (nunca SQL directo — el seed es un consumer más del primitive, Full API Parity) y
 * registra los surface bindings de las DOS surfaces co-iguales (arch §18):
 * WordPress público + Think. Idempotente: si el CTA ya tiene versión published y las
 * surfaces existen, no duplica.
 *
 * Los embed key secrets se imprimen UNA sola vez (config server-side del host,
 * TASK-1340); solo el hash queda en DB. NUNCA committear los secretos.
 *
 * Uso (proxy Cloud SQL en 15432 + credenciales de .env.local):
 *   GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= \
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/seed-cta-ai-visibility-followup.ts
 *
 * Con `--smoke` corre además el smoke end-to-end (render arbitrado + ingest + forja
 * rechazada) usando GROWTH_CTA_ENGINE_ENABLED=true en-proceso.
 */
import { authorDraftCta, publishCtaVersion, registerCtaSurface, submitCtaReview } from '../../src/lib/growth/ctas/commands'
import { ingestCtaEvent } from '../../src/lib/growth/ctas/ingest'
import { getArbitratedRenderContracts } from '../../src/lib/growth/ctas/readers'
import { getCtaDefinitionBySlug, listSurfaceBindings, listVersionsForCta } from '../../src/lib/growth/ctas/store'

const CTA_SLUG = 'ai-visibility-report-followup'

/** Copy de campaña (data del render contract; validado con greenhouse-ux-writing: tuteo es-LATAM neutro, verbo+objeto, sin falso entusiasmo). */
const CTA_CONTENT = {
  eyebrow: 'Diagnóstico gratuito',
  headline: '¿Cómo ve la IA a tu marca?',
  body: 'Mide tu visibilidad en ChatGPT, Gemini y Perplexity con el AI Visibility Grader y recibe un informe accionable.',
  ctaLabel: 'Haz el diagnóstico gratis',
  dismissLabel: 'Ahora no',
  footnote: 'Toma menos de 2 minutos.',
}

const SURFACES = [
  {
    surfaceKind: 'wordpress' as const,
    surfaceName: 'Efeonce public site (WordPress)',
    originAllowlist: ['https://efeoncepro.com', 'https://www.efeoncepro.com'],
  },
  {
    surfaceKind: 'think' as const,
    surfaceName: 'Think (Astro)',
    originAllowlist: ['https://think.efeoncepro.com'],
  },
]

const seed = async (): Promise<{ surfaceSecrets: Array<{ surfaceId: string; surfaceName: string; embedKeyId: string; secret: string }> }> => {
  // 1. CTA definition + versión published (idempotente).
  const existing = await getCtaDefinitionBySlug(CTA_SLUG)
  const versions = existing ? await listVersionsForCta(existing.cta_id) : []
  const alreadyPublished = versions.some(version => version.status === 'published')

  if (alreadyPublished) {
    console.log(`CTA ${CTA_SLUG} ya tiene versión published — no se re-autora.`)
  } else {
    const authored = await authorDraftCta({
      slug: CTA_SLUG,
      name: 'Follow-up reporte AI Visibility',
      purpose: 'Invitar al diagnóstico gratuito de visibilidad en IA desde contenidos públicos (WordPress + Think).',
      ownerTeam: 'growth',
      campaignSlug: 'ai-visibility-grader',
      placement: 'embedded',
      content: CTA_CONTENT,
      actionPolicy: { kind: 'open_growth_form', formRef: 'ai-visibility-grader' },
      targetingPolicy: { routes: ['/**'], excludeRoutes: [] },
      priorityPolicy: { score: 100 },
      createdBy: 'seed-task-1339',
    })

    if (!authored.ok) throw new Error(`authorDraftCta falló: ${authored.details.join(', ')}`)

    const review = await submitCtaReview(authored.ctaVersionId)

    if (!review.ok) throw new Error(`submitCtaReview falló: ${review.reason}`)

    const published = await publishCtaVersion(authored.ctaVersionId)

    if (!published.ok) {
      throw new Error(`publishCtaVersion falló: ${published.reason} ${JSON.stringify(published.blockingReasons ?? [])}`)
    }

    console.log(`CTA ${CTA_SLUG} publicado (versión ${authored.version}, ${authored.ctaVersionId}).`)
  }

  // 2. Surface bindings (idempotente por surface_name).
  const bindings = await listSurfaceBindings()
  const surfaceSecrets: Array<{ surfaceId: string; surfaceName: string; embedKeyId: string; secret: string }> = []

  for (const surface of SURFACES) {
    const found = bindings.find(binding => binding.surface_name === surface.surfaceName)

    if (found) {
      console.log(`Surface "${surface.surfaceName}" ya existe (${found.surface_id}) — no se re-registra.`)
      continue
    }

    const registered = await registerCtaSurface({
      surfaceKind: surface.surfaceKind,
      surfaceName: surface.surfaceName,
      originAllowlist: surface.originAllowlist,
      allowedCtaSlugs: [CTA_SLUG],
    })

    surfaceSecrets.push({
      surfaceId: registered.surfaceId,
      surfaceName: surface.surfaceName,
      embedKeyId: registered.embedKeyId,
      secret: registered.embedKeySecret,
    })

    console.log(`Surface "${surface.surfaceName}" registrada: ${registered.surfaceId} (embed key ${registered.embedKeyId}).`)
  }

  return { surfaceSecrets }
}

const smoke = async (surfaceSecrets: Array<{ surfaceId: string; surfaceName: string; secret: string }>) => {
  if (surfaceSecrets.length === 0) {
    console.log('Smoke: sin secretos frescos (surfaces preexistentes) — rotar embed key para re-smoke si hace falta.')

    return
  }

  process.env.GROWTH_CTA_ENGINE_ENABLED = 'true'

  const target = surfaceSecrets[0]
  const origin = target.surfaceName.includes('Think') ? 'https://think.efeoncepro.com' : 'https://efeoncepro.com'

  // a) Render arbitrado: 0 interruptivos + 1 embedded browser-safe.
  const render = await getArbitratedRenderContracts({
    surfaceId: target.surfaceId,
    embedKey: target.secret,
    origin,
    route: '/blog/algun-post',
  })

  if (render.outcome !== 'ok') throw new Error(`Smoke render falló: ${render.outcome}`)
  if (render.result.interruptive !== null) throw new Error('Smoke: embedded jamás debe salir como interruptivo')
  if (render.result.nonInterruptive.length !== 1) throw new Error(`Smoke: esperaba 1 contrato, hay ${render.result.nonInterruptive.length}`)

  const contract = render.result.nonInterruptive[0]
  const serialized = JSON.stringify(contract)

  for (const forbidden of ['targeting', 'priority', 'suppression', 'analytics', 'experiment']) {
    if (serialized.includes(forbidden)) throw new Error(`Smoke: leak de policy server-only en el contrato (${forbidden})`)
  }

  if (contract.action.kind !== 'open_growth_form' || contract.action.formSlug !== 'ai-visibility-grader') {
    throw new Error('Smoke: la acción no resolvió al form del grader')
  }

  console.log(`Smoke render OK: 1 contrato embedded browser-safe (cta ${contract.cta.slug} v${contract.cta.version}, form ${contract.action.formSlug}).`)

  // b) Ingest legítimo → accepted (browser_reported).
  const accepted = await ingestCtaEvent(
    {
      surfaceId: target.surfaceId,
      embedKey: target.secret,
      ctaSlug: CTA_SLUG,
      ctaVersionId: contract.cta.ctaVersionId,
      eventKind: 'clicked',
      pageUri: '/blog/algun-post',
      visitorKey: 'smoke-visitor-task-1339',
      consentState: 'granted',
      consentSource: 'seed_smoke',
    },
    { origin, ip: '203.0.113.10' },
  )

  if (accepted.outcome !== 'accepted') throw new Error(`Smoke ingest falló: ${accepted.outcome} ${accepted.reason ?? ''}`)
  console.log(`Smoke ingest OK: evento aceptado ${accepted.eventId}.`)

  // b2) Idempotencia: mismo visitor+kind+versión dentro de la ventana ⇒ MISMO evento.
  const duplicate = await ingestCtaEvent(
    {
      surfaceId: target.surfaceId,
      embedKey: target.secret,
      ctaSlug: CTA_SLUG,
      ctaVersionId: contract.cta.ctaVersionId,
      eventKind: 'clicked',
      visitorKey: 'smoke-visitor-task-1339',
      consentState: 'granted',
      consentSource: 'seed_smoke',
    },
    { origin, ip: '203.0.113.10' },
  )

  if (duplicate.outcome !== 'accepted' || duplicate.eventId !== accepted.eventId) {
    throw new Error('Smoke: el duplicado no fue idempotente')
  }

  console.log('Smoke idempotencia OK: duplicado devolvió el mismo evento.')

  // c) Forja: embed key inválido ⇒ rechazado + persistido como unauthorized attempt.
  const forged = await ingestCtaEvent(
    {
      surfaceId: target.surfaceId,
      embedKey: 'ghek_forjado-invalido',
      ctaSlug: CTA_SLUG,
      ctaVersionId: contract.cta.ctaVersionId,
      eventKind: 'action_completed',
      consentState: 'unknown',
      consentSource: 'none',
    },
    { origin, ip: '203.0.113.66' },
  )

  if (forged.outcome !== 'surface_unauthorized') throw new Error(`Smoke forja falló: ${forged.outcome}`)
  console.log('Smoke forja OK: embed key inválido rechazado (surface_unauthorized).')

  // d) Cross-check version↔surface: versión inexistente ⇒ rechazado.
  const mismatch = await ingestCtaEvent(
    {
      surfaceId: target.surfaceId,
      embedKey: target.secret,
      ctaSlug: CTA_SLUG,
      ctaVersionId: 'cver-00000000-0000-0000-0000-000000000000',
      eventKind: 'clicked',
      consentState: 'unknown',
      consentSource: 'none',
    },
    { origin, ip: '203.0.113.66' },
  )

  if (mismatch.outcome !== 'surface_unauthorized') throw new Error(`Smoke mismatch falló: ${mismatch.outcome}`)
  console.log('Smoke cross-check OK: versión forjada rechazada (surface_version_mismatch).')
}

const main = async () => {
  const { surfaceSecrets } = await seed()

  if (process.argv.includes('--smoke')) await smoke(surfaceSecrets)

  if (surfaceSecrets.length > 0) {
    console.log('\n=== EMBED KEY SECRETS (entregar UNA vez al operador; NO committear) ===')

    for (const item of surfaceSecrets) {
      console.log(`${item.surfaceName} → surfaceId=${item.surfaceId} embedKeyId=${item.embedKeyId}`)
      console.log(`  secret: ${item.secret}`)
    }
  }

  console.log('\nSeed OK.')
  process.exit(0)
}

main().catch(error => {
  console.error('SEED FAILED:', error)
  process.exit(1)
})
