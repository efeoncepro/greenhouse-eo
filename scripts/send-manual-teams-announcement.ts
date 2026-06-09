import { readFileSync } from 'node:fs'
import path from 'node:path'

import { loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()

const usage = `Usage:
  pnpm teams:announce --destination eo-team --title "..." --body-file ./message.md [--cta-url https://...] [--cta-label "Abrir informe"] [--mention "Texto visible|entraObjectIdOrUpn|Nombre de perfil"] [--triggered-by codex] [--dry-run] [--yes]

Rules:
  - Use --body-file with paragraphs separated by blank lines.
  - Use repeatable --mention values to create real Adaptive Card mentions.
  - Mention ids must be Microsoft Entra Object IDs or UPNs, not 29:<aadObjectId>.
  - Use --dry-run to preview without sending.
  - Non-dry sends require --yes as an explicit confirmation gate.
`

const parseArgs = (argv: string[]) => {
  const args = new Map<string, string | boolean | string[]>()

  const pushArg = (key: string, value: string | boolean) => {
    const existing = args.get(key)

    if (existing === undefined) {
      args.set(key, value)

      return
    }

    if (Array.isArray(existing)) {
      existing.push(String(value))

      return
    }

    args.set(key, [String(existing), String(value)])
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument '${token}'`)
    }

    const key = token.slice(2)
    const next = argv[index + 1]

    if (!next || next.startsWith('--')) {
      pushArg(key, true)
      continue
    }

    pushArg(key, next)
    index += 1
  }

  return args
}

const getStringArg = (args: Map<string, string | boolean | string[]>, key: string) => {
  const value = args.get(key)

  return typeof value === 'string' ? value : ''
}

const getOptionalStringArg = (args: Map<string, string | boolean | string[]>, key: string) => {
  const value = args.get(key)

  return typeof value === 'string' ? value : undefined
}

const getStringListArg = (args: Map<string, string | boolean | string[]>, key: string) => {
  const value = args.get(key)

  if (Array.isArray(value)) return value
  if (typeof value === 'string') return [value]

  return []
}

const readBodyParagraphs = (bodyFile: string) =>
  readFileSync(path.resolve(process.cwd(), bodyFile), 'utf8')
    .split(/\n\s*\n/)
    .map(block => block.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)

const parseMentionArg = (value: string) => {
  const [text, id, name] = value.split('|').map(part => part.trim())

  if (!text || !id) {
    throw new Error(
      `Invalid --mention value '${value}'. Expected "Texto visible|entraObjectIdOrUpn|Nombre de perfil".`
    )
  }

  return {
    text,
    id,
    name: name || text
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.has('help')) {
    console.log(usage)

    return
  }

  const destinationKey = getStringArg(args, 'destination')
  const title = getStringArg(args, 'title')
  const bodyFile = getStringArg(args, 'body-file')
  const ctaUrl = getOptionalStringArg(args, 'cta-url')
  const ctaLabel = getOptionalStringArg(args, 'cta-label')
  const mentions = getStringListArg(args, 'mention').map(parseMentionArg)

  const triggeredBy = getOptionalStringArg(args, 'triggered-by')
    ? String(getOptionalStringArg(args, 'triggered-by'))
    : 'manual_cli'

  const dryRun = args.get('dry-run') === true
  const confirmed = args.get('yes') === true

  if (!destinationKey || !title || !bodyFile) {
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
    ctaLabel,
    mentions
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
        mentions: preview.mentions,
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
    ctaUrl: preview.ctaUrl || undefined,
    ctaLabel: preview.ctaLabel || undefined,
    mentions: preview.mentions,
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
