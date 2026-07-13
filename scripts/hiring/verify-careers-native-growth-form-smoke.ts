import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { submitForm } from '@/lib/growth/forms/commands'
import { getPublishedVersionBySlug } from '@/lib/growth/forms/store'
import { listPublicOpenings, resolvePublishedOpeningIdByPublicId } from '@/lib/hiring/publication'
import { growthHiringApplicationFromSubmissionProjection } from '@/lib/sync/projections/growth-hiring-application-from-submission'
import {
  CAREERS_APPLICATION_FORM_KEY,
  CAREERS_APPLICATION_FORM_SLUG,
  CAREERS_APPLICATION_SURFACE_ID,
} from '@/lib/hiring/public-careers/growth-form-contract'
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

const API_BASE = process.env.TASK_1373_PUBLIC_API_BASE ?? 'http://localhost:3000'

const check = (label: string, ok: boolean, detail?: string) => {
  console.log(`  ${ok ? 'OK' : 'FAIL'}  ${label}`)
  if (detail) console.log(`      ${detail}`)

  if (!ok) throw new Error(`careers_native_smoke_failed:${label}`)
}

const smokePdf = () =>
  new File(
    [
      `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 0 >>
endobj
%%EOF
`,
    ],
    'task-1373-careers-smoke.pdf',
    { type: 'application/pdf' },
  )

const verifyHttpCaptchaFailClosed = async (publicId: string, email: string) => {
  const response = await fetch(
    `${API_BASE}/api/public/growth/forms/${encodeURIComponent(CAREERS_APPLICATION_FORM_KEY)}/submit`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', origin: API_BASE },
      body: JSON.stringify({
        surfaceId: CAREERS_APPLICATION_SURFACE_ID,
        fields: { openingPublicId: publicId, firstName: 'Captcha', lastName: 'Fail', email },
        consent: true,
        consentCheckboxes: ['careers_data_processing'],
        pageUri: `${API_BASE}/public/careers/${publicId}/apply`,
        pageName: 'TASK-1373 captcha fail-closed smoke',
      }),
    },
  )

  const body = (await response.json().catch(() => null)) as { outcome?: string; message?: string } | null

  check('HTTP submit without captcha is fail-closed', response.status === 403 && body?.outcome === 'captcha_failed', `${response.status} ${JSON.stringify(body)}`)
}

const main = async () => {
  console.log('\nTASK-1373 careers native Growth Form smoke\n')

  const version = await getPublishedVersionBySlug(CAREERS_APPLICATION_FORM_SLUG)

  check('Careers Growth Form is published', Boolean(version), version?.form_version_id)
  check('Careers Growth Form has no destinations', Boolean(version), version?.form_version_id)

  const destinationRows = version
    ? await runGreenhousePostgresQuery<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM greenhouse_growth.form_destination WHERE form_version_id = $1`,
        [version.form_version_id],
      )
    : []

  check('No form_destination rows for Careers version', destinationRows[0]?.count === '0', destinationRows[0]?.count)

  const opening = (await listPublicOpenings(1, 0))[0]

  check('At least one public opening is available', Boolean(opening), opening?.publicId)

  const openingId = await resolvePublishedOpeningIdByPublicId(opening.publicId)

  check('Opening public id resolves server-side', Boolean(openingId), openingId ?? undefined)

  const stamp = Date.now()
  const email = `task1373+${stamp}@example.com`

  await verifyHttpCaptchaFailClosed(opening.publicId, email)

  const submit = await submitForm(
    {
      formSlug: CAREERS_APPLICATION_FORM_SLUG,
      surfaceId: CAREERS_APPLICATION_SURFACE_ID,
      fields: {
        openingPublicId: opening.publicId,
        firstName: 'Task',
        lastName: 'Native',
        email,
        phone: '+56912345678',
        portfolioUrl: 'https://efeonce.com',
        linkedinUrl: 'https://linkedin.com/in/task-1373',
        availability: 'Inmediata',
        message: 'Synthetic TASK-1373 smoke.',
      },
      consent: true,
      consentCheckboxes: ['careers_data_processing'],
      pageUri: `${API_BASE}/public/careers/${opening.publicId}/apply`,
      pageName: 'TASK-1373 careers native smoke',
    },
    {
      origin: API_BASE,
      ip: '127.0.0.1',
      captchaToken: 'task-1373-approved',
      requestId: `task-1373-careers-native-${stamp}`,
      uploadedFiles: { cvFile: smokePdf() },
      verifier: { verify: async () => ({ ok: true, reason: 'synthetic_smoke' }) },
    },
  )

  check('Growth Forms submit accepted', submit.outcome === 'accepted' && Boolean(submit.submissionId), submit.reason)

  const projectionMessage = await growthHiringApplicationFromSubmissionProjection.refresh(
    { entityType: 'growth_form_submission', entityId: submit.submissionId! },
    {},
  )

  check('Reactive ATS projection completed', Boolean(projectionMessage?.includes('ok')), projectionMessage ?? undefined)

  const rows = await runGreenhousePostgresQuery<{
    submission_id: string
    application_id: string
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
      SELECT a.application_id
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
    [email, openingId, submit.submissionId, version!.form_version_id],
  )

  const evidence = rows[0]

  check('ATS application exists', Boolean(evidence?.application_id), evidence?.application_id)
  check('CV asset is private', evidence?.visibility === 'private', evidence?.visibility)
  check('CV asset attached to hiring application', evidence?.asset_status === 'attached' && evidence.owner_aggregate_type === 'hiring_application_cv')
  check('CV asset owner is created application', evidence?.owner_aggregate_id === evidence?.application_id)
  check('Asset scan verdict is clean', evidence?.scan_verdict === 'clean', evidence?.scan_verdict)
  check('No destination adapter leaked', evidence?.destination_count === '0', evidence?.destination_count)

  console.log('\nSmoke evidence')
  console.table([
    {
      submissionId: evidence.submission_id,
      applicationId: evidence.application_id,
      assetId: evidence.asset_id,
      assetStatus: evidence.asset_status,
      scanVerdict: evidence.scan_verdict,
      destinations: evidence.destination_count,
    },
  ])

  console.log('\nTASK-1373 careers native smoke: OK\n')
  process.exit(0)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
