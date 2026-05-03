import { readFileSync } from 'node:fs'
import path from 'node:path'

import { loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()

const usage = `Usage:
  pnpm teams:announce --destination eo-team --title "..." --body-file ./message.md --cta-url https://... [--cta-label "Abrir informe"] [--triggered-by codex] [--dry-run] [--yes]

Rules:
  - Use --body-file with paragraphs separated by blank lines.
  - Use --dry-run to preview without sending.
  - Non-dry sends require --yes as an explicit confirmation gate.
`

const parseArgs = (argv: string[]) => {
  const args = new Map<string, string | boolean>()

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument '${token}'`)
    }

    const key = token.slice(2)
    const next = argv[index + 1]

    if (!next || next.startsWith('--')) {
      args.set(key, true)
      continue
    }

    args.set(key, next)
    index += 1
  }

  return args
}

const readBodyParagraphs = (bodyFile: string) =>
  readFileSync(path.resolve(process.cwd(), bodyFile), 'utf8')
    .split(/\n\s*\n/)
    .map(block => block.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.has('help')) {
    console.log(usage)

    return
  }

  const destinationKey = typeof args.get('destination') === 'string' ? String(args.get('destination')) : ''
  const title = typeof args.get('title') === 'string' ? String(args.get('title')) : ''
  const bodyFile = typeof args.get('body-file') === 'string' ? String(args.get('body-file')) : ''
  const ctaUrl = typeof args.get('cta-url') === 'string' ? String(args.get('cta-url')) : ''
  const ctaLabel = typeof args.get('cta-label') === 'string' ? String(args.get('cta-label')) : undefined

  const triggeredBy = typeof args.get('triggered-by') === 'string'
    ? String(args.get('triggered-by'))
    : 'manual_cli'

  const dryRun = args.get('dry-run') === true
  const confirmed = args.get('yes') === true

  if (!destinationKey || !title || !bodyFile || !ctaUrl) {
    throw new Error(`Missing required arguments.\n\n${usage}`)
  }

  const { previewManualTeamsAnnouncement, sendManualTeamsAnnouncement } = await import(
    '@/lib/communications/manual-teams-announcements'
  )

  const preview = previewManualTeamsAnnouncement({
    destinationKey,
    title,
    paragraphs: readBodyParagraphs(bodyFile),
    ctaUrl,
    ctaLabel
  })

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'send',
        destination: preview.destination.label,
        title: preview.title,
        paragraphs: preview.paragraphs,
        ctaLabel: preview.ctaLabel,
        ctaUrl: preview.ctaUrl,
        fingerprint: preview.fingerprint
      },
      null,
      2
    )
  )

  if (dryRun) {
    return
  }

  if (!confirmed) {
    throw new Error('Refusing to send without --yes. Use --dry-run first if you want to inspect the payload.')
  }

  const outcome = await sendManualTeamsAnnouncement({
    destinationKey,
    title,
    paragraphs: preview.paragraphs,
    ctaUrl,
    ctaLabel: preview.ctaLabel,
    triggeredBy
  })

  console.log(JSON.stringify(outcome, null, 2))

  if (!outcome.ok) {
    process.exitCode = 1
  }
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
