import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { PROVIDER_CATALOG } from '../src/config/payment-instruments'

type ProviderSlug = keyof typeof PROVIDER_CATALOG

type SourceHint = {
  searchTerms?: string[]
  simpleIconsSlug?: string
  preferredFileBase?: string
  officialSvgUrls?: string[]
  officialPages?: string[]
}

type SourceManifest = {
  version: number
  outputDir: string
  providers: Partial<Record<ProviderSlug, SourceHint>>
}

type AuditManifestEntry = {
  slug: string
  brandName: string
  category: string
  country: string | null
  sourceUrl: string | null
  licenseSource: string | null
  logo: string | null
  compactLogo: string | null
  lastVerifiedAt: string | null
}

type AuditManifest = {
  version: number
  updatedAt: string
  entries: AuditManifestEntry[]
}

type CandidateSource = 'official' | 'simple-icons' | 'wikimedia' | 'direct-url'

type LogoCandidate = {
  providerSlug: ProviderSlug
  providerName: string
  source: CandidateSource
  url: string
  pageUrl?: string
  title?: string
  discoveredBy: string
}

type ValidationResult = LogoCandidate & {
  ok: boolean
  score: number
  reviewRequired: boolean
  reasons: string[]
  warnings: string[]
  sha256?: string
  bytes?: number
  destination?: string
  freshnessSignals: string[]
  content?: string
}

type RunReport = {
  generatedAt: string
  mode: 'plan' | 'apply'
  minScore: number
  allowReviewRequired: boolean
  results: Array<{
    providerSlug: string
    providerName: string
    selected: Omit<ValidationResult, 'content'> | null
    candidates: Array<Omit<ValidationResult, 'content'>>
  }>
}

const CONFIG_PATH = path.join(process.cwd(), 'scripts/config/payment-logo-sources.json')
const AUDIT_MANIFEST_PATH = path.join(process.cwd(), 'public/images/logos/payment/manifest.json')
const DEFAULT_REPORT_PATH = path.join(process.cwd(), 'artifacts/payment-logo-scraper/report.json')
const DEFAULT_MIN_SCORE = 70
const CURRENT_YEAR = new Date().getFullYear()
const HTTP_TIMEOUT_MS = 12000
const MAX_SVG_BYTES = 250_000

const TRUSTED_WIKIMEDIA_HOSTS = new Set(['commons.wikimedia.org', 'upload.wikimedia.org'])
const TRUSTED_SIMPLE_ICON_HOSTS = new Set(['cdn.simpleicons.org', 'simpleicons.org', 'raw.githubusercontent.com'])
const HISTORICAL_OR_VARIANT_PATTERN = /\b(196[0-9]|197[0-9]|198[0-9]|199[0-9]|200[0-9]|201[0-6]|old|former|historical|archive|debit|yuhu|maestro|cirrus|with[\s_-]+.*stripes)\b/i

const parseArgs = () => {
  const args = process.argv.slice(2)

  const getValue = (name: string) => {
    const index = args.indexOf(name)

    return index >= 0 ? args[index + 1] : undefined
  }

  const providers = getValue('--provider')
    ?.split(',')
    .map(value => value.trim())
    .filter(Boolean) as ProviderSlug[] | undefined

  return {
    apply: args.includes('--apply'),
    all: args.includes('--all'),
    provider: providers,
    outputDir: getValue('--output-dir'),
    reportPath: getValue('--report') ?? DEFAULT_REPORT_PATH,
    minScore: Number(getValue('--min-score') ?? DEFAULT_MIN_SCORE),
    allowReviewRequired: args.includes('--allow-review-required'),
    help: args.includes('--help') || args.includes('-h')
  }
}

const printHelp = () => {
  console.log(`
Payment logo scraper

Usage:
  pnpm logos:payment:scrape -- --all
  pnpm logos:payment:scrape -- --provider mastercard,visa
  pnpm logos:payment:scrape -- --provider mastercard --apply

Options:
  --all                    Scan every provider in PROVIDER_CATALOG.
  --provider <slugs>       Comma-separated provider slugs.
  --apply                  Save selected SVG files into public/images/logos/payment.
  --min-score <number>     Minimum validation score required. Default: ${DEFAULT_MIN_SCORE}.
  --allow-review-required  Allow apply when the best candidate still needs human review.
  --output-dir <path>      Override destination directory.
  --report <path>          Write machine-readable report JSON. Default: artifacts/payment-logo-scraper/report.json.
`)
}

const readManifest = async (): Promise<SourceManifest> => {
  const raw = await readFile(CONFIG_PATH, 'utf8')

  return JSON.parse(raw) as SourceManifest
}

const buildFallbackAuditManifest = (): AuditManifest => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  entries: (Object.entries(PROVIDER_CATALOG) as Array<[ProviderSlug, (typeof PROVIDER_CATALOG)[ProviderSlug]]>).map(([slug, provider]) => ({
    slug,
    brandName: provider.name,
    category: provider.category,
    country: provider.country ?? null,
    sourceUrl: null,
    licenseSource: null,
    logo: provider.logo,
    compactLogo: provider.compactLogo ?? null,
    lastVerifiedAt: null
  }))
})

const readAuditManifest = async (): Promise<AuditManifest> => {
  try {
    const raw = await readFile(AUDIT_MANIFEST_PATH, 'utf8')

    return JSON.parse(raw) as AuditManifest
  } catch {
    return buildFallbackAuditManifest()
  }
}

const inferLicenseSource = (candidate: ValidationResult) => {
  if (candidate.source === 'simple-icons') return 'Simple Icons; verify brand usage guidelines before client-facing release'
  if (candidate.source === 'wikimedia') return 'Wikimedia Commons; verify file page license and trademark notes'
  if (candidate.source === 'official') return 'Official brand source; follow source brand guidelines'

  return 'Direct URL; manual license verification required'
}

const updateAuditManifest = (manifest: AuditManifest, providerSlug: ProviderSlug, selected: ValidationResult, relativeLogoPath: string): AuditManifest => {
  const provider = PROVIDER_CATALOG[providerSlug]
  const entries = manifest.entries.filter(entry => entry.slug !== providerSlug)

  entries.push({
    slug: providerSlug,
    brandName: provider.name,
    category: provider.category,
    country: provider.country ?? null,
    sourceUrl: selected.pageUrl ?? selected.url,
    licenseSource: inferLicenseSource(selected),
    logo: relativeLogoPath,
    compactLogo: provider.compactLogo ?? null,
    lastVerifiedAt: new Date().toISOString()
  })

  return {
    version: manifest.version || 1,
    updatedAt: new Date().toISOString(),
    entries: entries.sort((a, b) => a.slug.localeCompare(b.slug))
  }
}

const fetchWithTimeout = async (url: string, init: RequestInit = {}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'user-agent': 'GreenhousePaymentLogoScraper/1.0 (+https://greenhouse.efeoncepro.com)',
        accept: 'image/svg+xml,text/html,application/json;q=0.9,*/*;q=0.8',
        ...init.headers
      }
    })
  } finally {
    clearTimeout(timeout)
  }
}

const normalizeUrl = (url: string) => {
  try {
    const parsed = new URL(url)

    parsed.hash = ''

    return parsed.toString()
  } catch {
    return null
  }
}

const sameBrandSignal = (candidate: LogoCandidate) => {
  const haystack = `${candidate.title ?? ''} ${candidate.url} ${candidate.pageUrl ?? ''}`.toLowerCase()
  const provider = PROVIDER_CATALOG[candidate.providerSlug]

  const words = [candidate.providerSlug, provider.name]
    .flatMap(value => value.toLowerCase().split(/[^a-z0-9áéíóúñ]+/i))
    .filter(word => word.length >= 3)

  return words.some(word => haystack.includes(word))
}

const hasFreshnessSignal = (candidate: LogoCandidate, content: string, response: Response) => {
  const haystack = `${candidate.title ?? ''} ${candidate.url} ${candidate.pageUrl ?? ''} ${content.slice(0, 1500)}`.toLowerCase()
  const signals: string[] = []
  const lastModified = response.headers.get('last-modified')

  if (candidate.source === 'official') signals.push('source:official')
  if (candidate.source === 'simple-icons' && lastModified) signals.push(`maintained-registry-last-modified:${lastModified}`)
  if (haystack.includes('current')) signals.push('text:current')
  if (haystack.includes('official')) signals.push('text:official')
  if (haystack.includes(String(CURRENT_YEAR))) signals.push(`text:${CURRENT_YEAR}`)
  if (haystack.includes(String(CURRENT_YEAR - 1))) signals.push(`text:${CURRENT_YEAR - 1}`)

  return signals
}

const validateSvg = (svg: string) => {
  const lower = svg.toLowerCase()
  const warnings: string[] = []
  const reasons: string[] = []

  if (!lower.includes('<svg')) reasons.push('No contiene elemento <svg>.')
  if (lower.includes('<script')) reasons.push('SVG contiene <script>.')
  if (lower.includes('<foreignobject')) reasons.push('SVG contiene <foreignObject>.')
  if (/\son[a-z]+\s*=/.test(lower)) reasons.push('SVG contiene event handlers inline.')
  if (/(href|src)\s*=\s*["']\s*(https?:|data:)/i.test(svg)) reasons.push('SVG contiene referencias externas o data URI.')
  if (Buffer.byteLength(svg, 'utf8') > MAX_SVG_BYTES) reasons.push(`SVG supera ${MAX_SVG_BYTES} bytes.`)
  if (!/viewbox\s*=/i.test(svg)) warnings.push('SVG no declara viewBox; revisar escalado responsive.')
  if (/<image\b/i.test(svg)) warnings.push('SVG contiene <image>; revisar que no embedee raster o recursos externos.')

  return { reasons, warnings }
}

const scoreCandidate = (candidate: LogoCandidate, content: string, response: Response, svgWarnings: string[]) => {
  const url = new URL(candidate.url)
  const reasons: string[] = []
  const warnings = [...svgWarnings]
  const freshnessSignals = hasFreshnessSignal(candidate, content, response)
  let score = 0

  if (candidate.source === 'official') score += 45
  if (candidate.source === 'simple-icons') score += 38
  if (candidate.source === 'wikimedia') score += 32
  if (candidate.source === 'direct-url') score += 24

  if (url.protocol === 'https:') score += 10
  else warnings.push('La URL no usa HTTPS.')

  if (TRUSTED_WIKIMEDIA_HOSTS.has(url.hostname) || TRUSTED_SIMPLE_ICON_HOSTS.has(url.hostname)) score += 12
  if (candidate.source === 'official') score += 15
  if (sameBrandSignal(candidate)) score += 15
  else warnings.push('La URL/titulo no contiene una senal fuerte del nombre de marca.')

  if (freshnessSignals.length > 0) score += 8
  else warnings.push('No hay senal de actualidad; requiere revision humana contra brand center o fuente oficial.')

  if (HISTORICAL_OR_VARIANT_PATTERN.test(`${candidate.title ?? ''} ${candidate.url} ${candidate.pageUrl ?? ''}`)) {
    score -= 35
    reasons.push('El candidato parece variante historica, co-brand o red derivada; no debe tratarse como logo actual de marca.')
  }

  if (content.includes('<metadata') || content.includes('<title')) score += 4
  if (svgWarnings.length === 0) score += 6

  if (candidate.source !== 'official' && freshnessSignals.length === 0) {
    reasons.push('No se puede afirmar que sea el logo mas actual sin revision humana.')
  }

  return {
    score: Math.min(score, 100),
    reasons,
    warnings,
    freshnessSignals
  }
}

const validateCandidate = async (candidate: LogoCandidate, outputDir: string, hint?: SourceHint): Promise<ValidationResult> => {
  const destinationBase = hint?.preferredFileBase ?? candidate.providerSlug
  const destination = path.join(outputDir, `${destinationBase}.svg`)

  try {
    const response = await fetchWithTimeout(candidate.url)

    if (!response.ok) {
      return {
        ...candidate,
        ok: false,
        score: 0,
        reviewRequired: true,
        reasons: [`HTTP ${response.status} al descargar candidato.`],
        warnings: [],
        freshnessSignals: [],
        destination
      }
    }

    const contentType = response.headers.get('content-type') ?? ''
    const content = await response.text()
    const svgValidation = validateSvg(content)
    const reasons = [...svgValidation.reasons]

    if (!contentType.includes('svg') && !content.trimStart().startsWith('<svg')) {
      reasons.push(`Content-Type no SVG: ${contentType || 'sin content-type'}.`)
    }

    const scoring = scoreCandidate(candidate, content, response, svgValidation.warnings)
    const sha256 = createHash('sha256').update(content).digest('hex')
    const ok = reasons.length === 0
    const reviewRequired = !ok || scoring.reasons.length > 0 || scoring.score < DEFAULT_MIN_SCORE

    return {
      ...candidate,
      ok,
      score: ok ? scoring.score : 0,
      reviewRequired,
      reasons: [...reasons, ...scoring.reasons],
      warnings: scoring.warnings,
      sha256,
      bytes: Buffer.byteLength(content, 'utf8'),
      destination,
      freshnessSignals: scoring.freshnessSignals,
      content
    }
  } catch (error) {
    return {
      ...candidate,
      ok: false,
      score: 0,
      reviewRequired: true,
      reasons: [error instanceof Error ? error.message : 'Error desconocido al descargar candidato.'],
      warnings: [],
      freshnessSignals: [],
      destination
    }
  }
}

const discoverSimpleIcons = (providerSlug: ProviderSlug, hint?: SourceHint): LogoCandidate[] => {
  if (!hint?.simpleIconsSlug) return []

  const provider = PROVIDER_CATALOG[providerSlug]
  const slug = hint.simpleIconsSlug

  return [
    {
      providerSlug,
      providerName: provider.name,
      source: 'simple-icons',
      url: `https://cdn.simpleicons.org/${encodeURIComponent(slug)}`,
      pageUrl: `https://simpleicons.org/?q=${encodeURIComponent(slug)}`,
      title: `${provider.name} logo from Simple Icons`,
      discoveredBy: 'simple-icons-cdn'
    },
    {
      providerSlug,
      providerName: provider.name,
      source: 'simple-icons',
      url: `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/${encodeURIComponent(slug)}.svg`,
      pageUrl: `https://github.com/simple-icons/simple-icons/blob/develop/icons/${encodeURIComponent(slug)}.svg`,
      title: `${provider.name} logo from Simple Icons repository`,
      discoveredBy: 'simple-icons-github'
    }
  ]
}

const discoverOfficialUrls = (providerSlug: ProviderSlug, hint?: SourceHint): LogoCandidate[] => {
  const provider = PROVIDER_CATALOG[providerSlug]

  return (hint?.officialSvgUrls ?? []).map(url => ({
    providerSlug,
    providerName: provider.name,
    source: 'official' as const,
    url,
    pageUrl: url,
    title: `${provider.name} official SVG`,
    discoveredBy: 'manifest-officialSvgUrls'
  }))
}

const queryWikimedia = async (providerSlug: ProviderSlug, term: string): Promise<LogoCandidate[]> => {
  const provider = PROVIDER_CATALOG[providerSlug]
  const searchUrl = new URL('https://commons.wikimedia.org/w/api.php')

  searchUrl.searchParams.set('action', 'query')
  searchUrl.searchParams.set('format', 'json')
  searchUrl.searchParams.set('generator', 'search')
  searchUrl.searchParams.set('gsrnamespace', '6')
  searchUrl.searchParams.set('gsrlimit', '8')
  searchUrl.searchParams.set('gsrsearch', `${term} filetype:svg`)
  searchUrl.searchParams.set('prop', 'imageinfo')
  searchUrl.searchParams.set('iiprop', 'url|mime|extmetadata')
  searchUrl.searchParams.set('origin', '*')

  const response = await fetchWithTimeout(searchUrl.toString(), { headers: { accept: 'application/json' } })

  if (!response.ok) return []

  const payload = await response.json() as {
    query?: {
      pages?: Record<string, {
        title?: string
        imageinfo?: Array<{
          url?: string
          descriptionurl?: string
          mime?: string
          extmetadata?: Record<string, { value?: string }>
        }>
      }>
    }
  }

  return Object.values(payload.query?.pages ?? {})
    .flatMap(page => page.imageinfo?.map(info => ({ page, info })) ?? [])
    .filter(({ info }) => info.mime === 'image/svg+xml' && Boolean(info.url))
    .map(({ page, info }) => ({
      providerSlug,
      providerName: provider.name,
      source: 'wikimedia' as const,
      url: info.url!,
      pageUrl: info.descriptionurl,
      title: page.title,
      discoveredBy: `wikimedia:${term}`
    }))
}

const discoverWikimedia = async (providerSlug: ProviderSlug, hint?: SourceHint): Promise<LogoCandidate[]> => {
  const provider = PROVIDER_CATALOG[providerSlug]
  const terms = hint?.searchTerms?.length ? hint.searchTerms : [`${provider.name} logo svg`]
  const results = await Promise.all(terms.map(term => queryWikimedia(providerSlug, term)))

  return results.flat()
}

const dedupeCandidates = (candidates: LogoCandidate[]) => {
  const seen = new Set<string>()

  return candidates.filter(candidate => {
    const url = normalizeUrl(candidate.url)

    if (!url || seen.has(url)) return false
    seen.add(url)

    return true
  })
}

const providerListFromArgs = (providerArg: ProviderSlug[] | undefined, all: boolean) => {
  if (all) return Object.keys(PROVIDER_CATALOG) as ProviderSlug[]
  if (providerArg?.length) return providerArg

  throw new Error('Debes indicar --all o --provider <slug[,slug]>.')
}

const stripContent = (result: ValidationResult): Omit<ValidationResult, 'content'> => {
  const rest = { ...result }

  delete rest.content

  return rest as Omit<ValidationResult, 'content'>
}

const main = async () => {
  const args = parseArgs()

  if (args.help) {
    printHelp()

    return
  }

  const manifest = await readManifest()
  let auditManifest = await readAuditManifest()
  const outputDir = path.resolve(process.cwd(), args.outputDir ?? manifest.outputDir)
  const providerSlugs = providerListFromArgs(args.provider, args.all)

  const report: RunReport = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'plan',
    minScore: args.minScore,
    allowReviewRequired: args.allowReviewRequired,
    results: []
  }

  await mkdir(path.dirname(args.reportPath), { recursive: true })
  await mkdir(outputDir, { recursive: true })

  for (const providerSlug of providerSlugs) {
    const provider = PROVIDER_CATALOG[providerSlug]

    if (!provider) throw new Error(`Provider desconocido: ${providerSlug}`)

    const hint = manifest.providers[providerSlug]

    const candidates = dedupeCandidates([
      ...discoverOfficialUrls(providerSlug, hint),
      ...discoverSimpleIcons(providerSlug, hint),
      ...(await discoverWikimedia(providerSlug, hint))
    ])

    const validated = await Promise.all(candidates.map(candidate => validateCandidate(candidate, outputDir, hint)))

    const selected = validated
      .filter(candidate => candidate.ok && candidate.score >= args.minScore)
      .sort((a, b) => b.score - a.score || (a.bytes ?? 0) - (b.bytes ?? 0))[0] ?? null

    report.results.push({
      providerSlug,
      providerName: provider.name,
      selected: selected ? stripContent(selected) : null,
      candidates: validated
        .sort((a, b) => b.score - a.score)
        .map(stripContent)
    })

    const status = selected ? `${selected.score}/100 ${selected.reviewRequired ? 'review-required' : 'ready'}` : 'sin candidato aprobado'

    console.log(`[${providerSlug}] ${provider.name}: ${status}`)

    if (args.apply && selected) {
      if (selected.reviewRequired && !args.allowReviewRequired) {
        console.log(`  skip apply: requiere revision humana (${selected.reasons.join(' ')})`)
      } else if (selected.content && selected.destination) {
        await writeFile(selected.destination, selected.content.trim() + '\n', 'utf8')
        auditManifest = updateAuditManifest(
          auditManifest,
          providerSlug,
          selected,
          `/${path.relative(path.join(process.cwd(), 'public'), selected.destination).replaceAll(path.sep, '/')}`
        )
        console.log(`  saved: ${path.relative(process.cwd(), selected.destination)}`)
      }
    }
  }

  if (args.apply) {
    await writeFile(AUDIT_MANIFEST_PATH, JSON.stringify(auditManifest, null, 2) + '\n', 'utf8')
  }

  await writeFile(args.reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8')
  console.log(`report: ${path.relative(process.cwd(), args.reportPath)}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
