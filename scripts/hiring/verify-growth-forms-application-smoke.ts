import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { authorDraftForm, createHostSurface, publishForm, submitForm } from '@/lib/growth/forms/commands'
import { growthHiringApplicationFromSubmissionProjection } from '@/lib/sync/projections/growth-hiring-application-from-submission'
import { createHiringOpening, createTalentDemand, updateHiringOpening } from '@/lib/hiring/store'
import { publishOpening } from '@/lib/hiring/publication'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

if (process.env.GREENHOUSE_POSTGRES_HOST?.trim()) {
  delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
}

const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()

if (credentialsJson) {
  try {
    JSON.parse(credentialsJson)
  } catch {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  }
}

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

const check = (label: string, ok: boolean, detail?: string) => {
  console.log(`  ${ok ? 'OK' : 'FAIL'}  ${label}`)
  if (detail) console.log(`      ${detail}`)

  if (!ok) throw new Error(`smoke_failed:${label}`)
}

if (!hasPgConfig) {
  console.error('Missing GREENHOUSE_POSTGRES_* configuration. Run through pnpm pg:connect or load local DB env first.')
  process.exit(2)
}

const stamp = Date.now()
const actor = 'task-1372-smoke'
const slug = `task-1372-application-smoke-${stamp}`
const surfaceId = `fhsf-task-1372-smoke-${stamp}`
const email = `task1372+${stamp}@example.com`

const main = async () => {
  console.log('\nTASK-1372 Growth Forms -> Hiring ATS smoke\n')
  console.log(`  slug: ${slug}`)
  console.log(`  email: ${email}`)

  const demand = await createTalentDemand(
    {
      stakeholderType: 'internal',
      engagementType: 'on_going',
      fulfillmentMode: 'internal_hire',
      demandOrigin: 'capacity_gap',
      requestedRole: `TASK-1372 SMOKE Application ${stamp}`
    },
    actor
  )

  const opening = await createHiringOpening(
    { demandId: demand.demandId, internalTitle: `TASK-1372 SMOKE opening ${stamp}` },
    actor
  )

  await updateHiringOpening(
    opening.openingId,
    {
      publicTitle: `TASK-1372 Smoke Role ${stamp}`,
      publicSummary: 'Synthetic smoke role for Growth Forms application projection.',
      publicDescription: 'Synthetic role used to verify Growth Forms application upload and ATS projection.',
      publicArea: 'Growth',
      publicWorkMode: 'remote',
      publicHiringRegion: 'Chile',
      publicSkillTags: ['growth-forms', 'ats-smoke']
    },
    actor
  )

  const publishedOpening = await publishOpening(opening.openingId, actor)

  const authored = await authorDraftForm({
    slug,
    name: `TASK-1372 smoke application ${stamp}`,
    formKind: 'application',
    purpose: 'Synthetic Growth Forms application smoke.',
    riskProfile: 'high',
    fieldSchema: [
      { key: 'openingPublicId', type: 'hidden', required: true, dataClass: 'public' },
      { key: 'firstName', type: 'text', required: true, dataClass: 'contact_pii' },
      { key: 'lastName', type: 'text', required: true, dataClass: 'contact_pii' },
      { key: 'email', type: 'email', required: true, dataClass: 'contact_pii' },
      {
        key: 'cvFile',
        type: 'file',
        required: false,
        dataClass: 'uploaded_file',
        uploadPolicy: {
          acceptedMimeTypes: ['application/pdf'],
          maxBytes: 10 * 1024 * 1024,
          multiple: false,
          storageContext: 'hiring_application_cv_draft',
          scanPolicy: 'scan_required'
        }
      }
    ],
    validationSchema: {},
    uiPolicy: { composition: 'static' },
    successBehavior: { kind: 'inline_message', message: 'Smoke accepted.' },
    consentPolicyVersion: 'task-1372-smoke-v1',
    dataClassification: { pii: true, files: true },
    destinationPolicy: null,
    analyticsPolicy: { enabled: true },
    retentionPolicy: { days: 30 },
    createdBy: actor
  })

  await createHostSurface({
    surfaceId,
    surfaceKind: 'generic_html',
    surfaceName: `TASK-1372 smoke ${stamp}`,
    originAllowlist: ['https://smoke.local'],
    allowedFormSlugs: [slug],
    rendererChannel: 'stable',
    status: 'active'
  })

  const publication = await publishForm(authored.formVersionId)

  check('application form publishes with no destinations', publication.ok, publication.blockingReasons.join(', '))

  const pdf = new File(
    [
      `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 0 >>
endobj
%%EOF
`
    ],
    'task-1372-smoke.pdf',
    { type: 'application/pdf' }
  )

  const submit = await submitForm(
    {
      formSlug: slug,
      surfaceId,
      fields: {
        openingPublicId: publishedOpening.publicId,
        firstName: 'Task',
        lastName: 'Smoke',
        email
      },
      consent: true,
      consentCheckboxes: ['careers_data_processing'],
      pageUri: 'https://smoke.local/task-1372',
      pageName: 'TASK-1372 smoke'
    },
    {
      origin: 'https://smoke.local',
      ip: '127.0.0.1',
      captchaToken: null,
      requestId: `task-1372-smoke-${stamp}`,
      uploadedFiles: { cvFile: pdf },
      verifier: { verify: async () => ({ ok: true, reason: 'synthetic_smoke' }) }
    }
  )

  check('Growth Forms submit accepted', submit.outcome === 'accepted' && Boolean(submit.submissionId), submit.reason)

  const projectionMessage = await growthHiringApplicationFromSubmissionProjection.refresh(
    { entityType: 'growth_form_submission', entityId: submit.submissionId! },
    {}
  )

  check('Reactive projection completed', Boolean(projectionMessage?.includes('ok')), projectionMessage ?? undefined)

  const rows = await runGreenhousePostgresQuery<{
    submission_id: string
    application_id: string
    identity_profile_id: string
    candidate_facet_id: string
    asset_id: string
    asset_status: string
    visibility: string
    owner_aggregate_type: string
    owner_aggregate_id: string | null
    scan_verdict: string
    destination_count: string
  }>(
    `
    WITH profile AS (
      SELECT profile_id
      FROM greenhouse_core.identity_profiles
      WHERE LOWER(canonical_email) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT 1
    ),
    app AS (
      SELECT a.application_id, a.identity_profile_id, a.candidate_facet_id
      FROM greenhouse_hiring.hiring_application a
      JOIN profile p ON p.profile_id = a.identity_profile_id
      WHERE a.opening_id = $2
      LIMIT 1
    ),
    sub AS (
      SELECT submission_id, normalized_fields_json
      FROM greenhouse_growth.form_submission
      WHERE submission_id = $3
    ),
    cv AS (
      SELECT normalized_fields_json->'cvFile'->>'assetId' AS asset_id
      FROM sub
    )
    SELECT
      sub.submission_id,
      app.application_id,
      app.identity_profile_id,
      app.candidate_facet_id,
      cv.asset_id,
      asset.status AS asset_status,
      asset.visibility,
      asset.owner_aggregate_type,
      asset.owner_aggregate_id,
      scan.verdict AS scan_verdict,
      (
        SELECT COUNT(*)::text
        FROM greenhouse_growth.form_destination
        WHERE form_version_id = $4
      ) AS destination_count
    FROM sub
    JOIN app ON true
    JOIN cv ON true
    JOIN greenhouse_core.assets asset ON asset.asset_id = cv.asset_id
    JOIN LATERAL (
      SELECT verdict
      FROM greenhouse_core.asset_scan_results
      WHERE asset_id = cv.asset_id
      ORDER BY scanned_at DESC
      LIMIT 1
    ) scan ON true
  `,
    [email, opening.openingId, submit.submissionId, authored.formVersionId]
  )

  const evidence = rows[0]

  check('ATS application exists', Boolean(evidence?.application_id), evidence?.application_id)
  check('CV asset is private', evidence?.visibility === 'private', evidence?.visibility)
  check(
    'CV asset is attached to hiring_application_cv',
    evidence?.asset_status === 'attached' && evidence.owner_aggregate_type === 'hiring_application_cv'
  )
  check('CV asset attached to the created application', evidence?.owner_aggregate_id === evidence?.application_id)
  check('Asset scan verdict is clean', evidence?.scan_verdict === 'clean', evidence?.scan_verdict)
  check('No form_destination rows were created', evidence?.destination_count === '0', evidence?.destination_count)

  console.log('\nSmoke evidence')
  console.table([
    {
      submissionId: evidence.submission_id,
      applicationId: evidence.application_id,
      assetId: evidence.asset_id,
      assetStatus: evidence.asset_status,
      scanVerdict: evidence.scan_verdict,
      destinations: evidence.destination_count
    }
  ])

  console.log('\nTASK-1372 smoke: OK\n')

  process.exit(0)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
