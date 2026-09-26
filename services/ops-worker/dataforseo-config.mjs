/** TASK-1341 / ISSUE-175: deploy preflight and serving-revision readback. Never prints env values. */
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export function assertDataForSeoConfig(env) {
  const flags = ['GROWTH_SEO_ENABLED', 'GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED']

  for (const key of flags) {
    if (env[key] !== undefined && !['true', 'false'].includes(env[key])) {
      throw new Error(`Invalid boolean configuration: ${key}`)
    }
  }

  if (!flags.some(key => env[key] === 'true')) return

  const missing = ['DATAFORSEO_API_LOGIN', 'DATAFORSEO_API_PASSWORD_SECRET_REF'].filter(key => !env[key]?.trim())

  if (missing.length) {
    throw new Error(
      `DataForSEO configuration missing: ${missing.join(', ')}. ` +
        'Supply DATAFORSEO_API_LOGIN from the GitHub Actions secret or the authorized local environment; ' +
        'supply the password Secret Manager reference. Enabled SEO/AIO consumers require both.'
    )
  }
}

export function revisionEnvironment(revision) {
  const container = revision.spec?.containers?.[0]

  if (!container) throw new Error('Cloud Run revision has no container configuration')

  return Object.fromEntries((container.env ?? []).map(entry => [entry.name, entry.value]))
}

function main(args) {
  if (args.length === 1 && args[0] === '--preflight') {
    assertDataForSeoConfig(process.env)
    console.log('DataForSEO deploy configuration verified (no provider request).')

    return
  }

  const options = Object.fromEntries(Array.from({ length: args.length / 2 }, (_, i) => [args[i * 2], args[i * 2 + 1]]))

  if (!options['--service'] || !options['--project'] || !options['--region']) {
    throw new Error('Usage: --preflight | --service NAME --project PROJECT --region REGION')
  }

  const describe = (kind, name) => {
    try {
      return JSON.parse(
        execFileSync(
          'gcloud',
          [
            'run',
            kind,
            'describe',
            name,
            `--project=${options['--project']}`,
            `--region=${options['--region']}`,
            '--format=json'
          ],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
        )
      )
    } catch {
      throw new Error(`Cannot read Cloud Run ${kind} configuration`)
    }
  }

  const service = describe('services', options['--service'])

  const revisions = [
    ...new Set((service.status?.traffic ?? []).filter(entry => entry.percent > 0).map(entry => entry.revisionName))
  ]

  if (!revisions.length || revisions.some(name => !name)) {
    throw new Error('Cloud Run has no resolved serving revision')
  }

  for (const name of revisions) {
    assertDataForSeoConfig(revisionEnvironment(describe('revisions', name)))
    console.log(`DataForSEO serving configuration verified: ${name} (no provider request).`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
