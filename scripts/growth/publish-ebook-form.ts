import 'server-only'

/**
 * TASK-1375 — Publisher GENÉRICO + IDEMPOTENTE de Growth Forms de ebook lead magnets.
 *
 * Config-driven: lee `EBOOK_FORMS` del registry. Agregar un ebook = una entrada en el registry
 * + correr esto. NO se reimplementa el flujo por ebook. Idempotente: si el form ya está publicado
 * y no pasás `--force`, hace no-op del publish (evita version-spam); el surface + form_asset se
 * upsertean siempre (quedan en sync). `--force` republica una versión nueva (clone → publish →
 * deprecate del anterior).
 *
 * DRY-RUN por defecto; `--apply` muta vía commands canónicos.
 *
 *   set -a && source .env.local && set +a
 *   pnpm growth:forms:publish-ebook -- --slug efeonce-web-agentica-ebook [--apply] [--force]
 *   pnpm growth:forms:publish-ebook -- --all [--apply]
 */

import { authorDraftForm, deprecateForm, publishForm } from '@/lib/growth/forms/commands'
import {
  getFormDefinitionById,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  insertHostSurface,
  upsertActiveFormAsset
} from '@/lib/growth/forms/store'

import {
  EBOOK_FORMS,
  STANDARD_EBOOK_DESTINATION_POLICY,
  STANDARD_EBOOK_FIELDS,
  STANDARD_EBOOK_UI_POLICY,
  STANDARD_EBOOK_VALIDATION,
  downloadPathTemplateForSlug,
  getEbookFormConfig,
  type EbookFormConfig
} from './ebook-forms.registry'

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')

const argValue = (flag: string): string | undefined => {
  const idx = process.argv.indexOf(flag)

  return idx >= 0 ? process.argv[idx + 1] : undefined
}

const buildSuccessBehavior = (cfg: EbookFormConfig) => ({
  kind: 'asset_access' as const,
  presentation: 'success_card' as const,
  title: cfg.success.title,
  body: cfg.success.body,
  reward: { kind: 'ebook' as const, title: cfg.success.rewardTitle, body: cfg.success.rewardBody },
  supportingNote: cfg.success.supportingNote,
  actions: [
    {
      kind: 'external_link' as const,
      label: cfg.success.bridge.label,
      href: cfg.success.bridge.href,
      target: '_self' as const
    }
  ],
  assetDownload: { downloadPathTemplate: downloadPathTemplateForSlug(cfg.slug) }
})

const buildCopyRefs = (cfg: EbookFormConfig) => ({
  copy: { ...cfg.copy.helps, ...(cfg.copy.errors ?? {}), submit: cfg.copy.submit },
  noticeText: cfg.copy.noticeText,
  privacyUrl: cfg.copy.privacyUrl,
  checkboxes: [{ key: 'marketingConsent', label: cfg.copy.consentLabel, required: true }]
})

const publishOne = async (cfg: EbookFormConfig): Promise<void> => {
  console.log(`\n=== ${cfg.slug} ===`)

  const current = await getPublishedVersionBySlug(cfg.slug)

  if (current && !FORCE) {
    console.log(`  ya publicado (${current.form_version_id}); skip publish (usa --force para republicar).`)
  }

  if (!APPLY) {
    console.log(
      `  DRY-RUN: publicaría con fields=[${STANDARD_EBOOK_FIELDS.map(f => f.key).join(', ')}], surface=${cfg.surfaceId}, asset=${cfg.asset.objectName}`
    )

    return
  }

  // Surface (idempotente por id estable).
  const existingSurface = await getHostSurfaceById(cfg.surfaceId)

  if (!existingSurface) {
    await insertHostSurface({
      surfaceId: cfg.surfaceId,
      surfaceKind: 'astro',
      surfaceName: cfg.surfaceName,
      originAllowlist: cfg.origins,
      allowedFormSlugs: [cfg.slug],
      status: 'active'
    })
    console.log(`  surface creado: ${cfg.surfaceId}`)
  } else {
    console.log(`  surface ya existe: ${cfg.surfaceId} (skip)`)
  }

  if (current && !FORCE) {
    // Ya publicado y sin --force: asegurar el asset activo y salir (idempotente).
    if (current.form_id) {
      const asset = await upsertActiveFormAsset({
        formId: current.form_id,
        objectName: cfg.asset.objectName,
        fileName: cfg.asset.fileName,
        assetKind: 'ebook',
        ttlHours: cfg.asset.ttlHours
      })

      console.log(`  form_asset en sync: ${asset.form_asset_id}`)
    }

    const def = current.form_id ? await getFormDefinitionById(current.form_id) : null

    console.log(`  form_key (embed): ${def?.form_key} | surface: ${cfg.surfaceId}`)

    return
  }

  // Publicar versión nueva (primera vez o --force).
  const { formId, formVersionId } = await authorDraftForm({
    slug: cfg.slug,
    name: cfg.name,
    formKind: 'lead_magnet',
    purpose: cfg.purpose,
    riskProfile: 'medium',
    locale: 'es-CL',
    fieldSchema: [...STANDARD_EBOOK_FIELDS],
    validationSchema: STANDARD_EBOOK_VALIDATION,
    copyRefs: buildCopyRefs(cfg),
    uiPolicy: STANDARD_EBOOK_UI_POLICY,
    successBehavior: buildSuccessBehavior(cfg),
    destinationPolicy: STANDARD_EBOOK_DESTINATION_POLICY,
    retentionPolicy: {
      scope: 'prospect_lead_pii',
      leadPiiRetentionDays: 730,
      legalBasis: 'consent',
      consentPolicyVersion: cfg.consentVersion
    },
    consentPolicyVersion: cfg.consentVersion,
    createdBy: 'task-1375-publish-ebook'
  })

  const asset = await upsertActiveFormAsset({
    formId,
    objectName: cfg.asset.objectName,
    fileName: cfg.asset.fileName,
    assetKind: 'ebook',
    ttlHours: cfg.asset.ttlHours
  })

  console.log(`  form_asset ok: ${asset.form_asset_id}`)

  const published = await publishForm(formVersionId)

  if (!published.ok) {
    console.error(`  FAIL publish — blocking: ${published.blockingReasons.join('; ')}`)
    process.exit(1)
  }

  if (current && current.form_version_id !== formVersionId) {
    await deprecateForm(current.form_version_id)
    console.log(`  deprecada versión anterior: ${current.form_version_id}`)
  }

  const def = await getFormDefinitionById(formId)

  console.log(`  PUBLICADO OK — form_key (embed): ${def?.form_key} | surface: ${cfg.surfaceId}`)
}

const main = async (): Promise<void> => {
  const slug = argValue('--slug')
  const all = process.argv.includes('--all')

  const targets: EbookFormConfig[] = all
    ? EBOOK_FORMS
    : slug
      ? [getEbookFormConfig(slug)].filter((c): c is EbookFormConfig => Boolean(c))
      : []

  if (targets.length === 0) {
    console.error('Uso: --slug <slug> | --all  [--apply] [--force]')
    console.error(`Slugs disponibles: ${EBOOK_FORMS.map(e => e.slug).join(', ')}`)
    process.exit(1)
  }

  console.log(
    `Publish ebook forms — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}${FORCE ? ' (force)' : ''} — targets: ${targets.length}`
  )

  for (const cfg of targets) await publishOne(cfg)
}

main().catch(error => {
  console.error('FAIL:', error instanceof Error ? error.message : error)
  process.exit(1)
})
