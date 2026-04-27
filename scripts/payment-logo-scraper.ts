import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { GoogleGenAI } from '@google/genai'

import { PROVIDER_CATALOG } from '../src/config/payment-instruments'

type ProviderSlug = keyof typeof PROVIDER_CATALOG

const LOGO_VARIANTS = ['full-positive', 'full-negative', 'mark-positive', 'mark-negative'] as const

type LogoVariant = (typeof LOGO_VARIANTS)[number]

type VariantHint = {
  searchTerms?: string[]
  simpleIconsSlug?: string
  preferredFileBase?: string
  officialSvgUrls?: string[]
  officialPages?: string[]
  expectedColors?: string[]
  requiredBrandSignals?: string[]
  blockedBrandSignals?: string[]
  curatedSvgPath?: string
  curatedSourceUrl?: string
  derivedFromVariant?: LogoVariant
  deriveMode?: 'recolor-white' | 'crop-viewbox' | 'crop-viewbox-recolor-white'
  cropViewBox?: string
}

type SourceHint = {
  searchTerms?: string[]
  simpleIconsSlug?: string
  preferredFileBase?: string
  officialSvgUrls?: string[]
  officialPages?: string[]
  expectedColors?: string[]
  requiredBrandSignals?: string[]
  blockedBrandSignals?: string[]
  variants?: Partial<Record<LogoVariant, VariantHint>>
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
  variants?: Partial<Record<LogoVariant, {
    sourceUrl: string | null
    licenseSource: string | null
    logo: string | null
    lastVerifiedAt: string | null
  }>>
}

type AuditManifest = {
  version: number
  updatedAt: string
  variantModel?: LogoVariant[]
  entries: AuditManifestEntry[]
}

type CandidateSource = 'official' | 'simple-icons' | 'wikimedia' | 'direct-url' | 'derived' | 'curated'

type LogoCandidate = {
  providerSlug: ProviderSlug
  providerName: string
  variant: LogoVariant
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
  aiReview?: AiLogoReview
  content?: string
}

type AiLogoReview = {
  status: 'skipped' | 'pass' | 'review' | 'reject' | 'error'
  model?: string
  confidence?: number
  qualityScore?: number
  isCorrectBrand?: boolean
  isCorrectVariant?: boolean
  isLikelyCurrent?: boolean
  rationale?: string
  risks?: string[]
}

type RunReport = {
  generatedAt: string
  mode: 'plan' | 'apply'
  selectionMode: 'discovery' | 'direct-candidate'
  minScore: number
  allowReviewRequired: boolean
  results: Array<{
    providerSlug: string
    providerName: string
    variants: Partial<Record<LogoVariant, {
      selected: Omit<ValidationResult, 'content'> | null
      candidates: Array<Omit<ValidationResult, 'content'>>
    }>>
  }>
}

type ManifestUpdateResult = {
  manifest: AuditManifest
  changed: boolean
}

const CONFIG_PATH = path.join(process.cwd(), 'scripts/config/payment-logo-sources.json')
const AUDIT_MANIFEST_PATH = path.join(process.cwd(), 'public/images/logos/payment/manifest.json')
const DEFAULT_REPORT_PATH = path.join(process.cwd(), 'artifacts/payment-logo-scraper/report.json')
const DEFAULT_MIN_SCORE = 70
const CURRENT_YEAR = new Date().getFullYear()
const HTTP_TIMEOUT_MS = 12000
const AI_REVIEW_TIMEOUT_MS = 25000
const MAX_SVG_BYTES = 250_000
const DOWNLOAD_CONCURRENCY = 3
const DEFAULT_AI_REVIEW_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'google/gemini-2.5-flash@default'] as const
const HTTP_RETRY_STATUSES = new Set([429, 500, 502, 503, 504])

const TRUSTED_WIKIMEDIA_HOSTS = new Set(['commons.wikimedia.org', 'upload.wikimedia.org'])
const TRUSTED_SIMPLE_ICON_HOSTS = new Set(['cdn.simpleicons.org', 'simpleicons.org', 'raw.githubusercontent.com'])
const HISTORICAL_OR_VARIANT_PATTERN = /\b(196[0-9]|197[0-9]|198[0-9]|199[0-9]|200[0-9]|201[0-6]|old|former|historical|archive|debit|yuhu|maestro|cirrus|wikipedia[\s_-]*logo|with[\s_-]+.*stripes)\b/i
const NON_BRAND_ASSET_PATTERN = /\b(whatsapp|facebook|instagram|linkedin|twitter|x-twitter|youtube|tiktok|duolingo|undertale|lipu|arrow|chevron|close|menu|hamburger|search|spinner|loader|icono?|ico-|i-|favicon|app-store|google-play|phone|mail|email|danger|warning|check|bullet|globe|flag)\b/i
const BRAND_TOKEN_STOPWORDS = new Set(['banco', 'bank', 'banque', 'de', 'del', 'the', 'logo', 'logotipo'])

const parseArgs = () => {
  const args = process.argv.slice(2)

  const getValue = (name: string) => {
    const index = args.lastIndexOf(name)

    return index >= 0 ? args[index + 1] : undefined
  }

  const providers = getValue('--provider')
    ?.split(',')
    .map(value => value.trim())
    .filter(Boolean) as ProviderSlug[] | undefined

  const variants = getValue('--variant')
    ?.split(',')
    .map(value => value.trim())
    .filter(Boolean) as LogoVariant[] | undefined

  return {
    apply: args.includes('--apply'),
    all: args.includes('--all'),
    provider: providers,
    variants,
    aiReview: args.includes('--ai-review'),
    aiRequired: args.includes('--ai-required'),
    candidateUrl: getValue('--candidate-url'),
    candidateSource: getValue('--candidate-source') as CandidateSource | undefined,
    reviewHtmlPath: getValue('--review-html'),
    outputDir: getValue('--output-dir'),
    reportPath: getValue('--report') ?? DEFAULT_REPORT_PATH,
    minScore: Number(getValue('--min-score') ?? DEFAULT_MIN_SCORE),
    aiTimeoutMs: Number(getValue('--ai-timeout-ms') ?? AI_REVIEW_TIMEOUT_MS),
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
  pnpm logos:payment:scrape -- --provider mastercard --variant full-positive,mark-positive --apply
  pnpm logos:payment:scrape -- --provider banco-chile --variant full-positive --candidate-url https://.../logo.svg --candidate-source official --apply

Options:
  --all                    Scan every provider in PROVIDER_CATALOG.
  --provider <slugs>       Comma-separated provider slugs.
  --variant <variants>     Comma-separated: ${LOGO_VARIANTS.join(', ')}. Default: all variants.
  --ai-review              Ask Gemini to review top deterministic candidates.
  --ai-required            Require Gemini pass before selecting/applying a candidate.
  --ai-timeout-ms <ms>     Gemini review timeout. Default: ${AI_REVIEW_TIMEOUT_MS}.
  --candidate-url <url>    Validate/apply one explicit SVG URL instead of discovering candidates.
  --candidate-source <src> Source label for --candidate-url: official, wikimedia, simple-icons, direct-url. Default: direct-url.
  --review-html <path>     Write a human review dashboard HTML for the run report.
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
  variantModel: [...LOGO_VARIANTS],
  entries: (Object.entries(PROVIDER_CATALOG) as Array<[ProviderSlug, (typeof PROVIDER_CATALOG)[ProviderSlug]]>).map(([slug, provider]) => ({
    slug,
    brandName: provider.name,
    category: provider.category,
    country: provider.country ?? null,
    sourceUrl: null,
    licenseSource: null,
    logo: provider.logo,
    compactLogo: provider.compactLogo ?? null,
    lastVerifiedAt: null,
    variants: {
      'full-positive': {
        sourceUrl: null,
        licenseSource: null,
        logo: provider.logo,
        lastVerifiedAt: null
      },
      'mark-positive': {
        sourceUrl: null,
        licenseSource: null,
        logo: provider.compactLogo ?? null,
        lastVerifiedAt: null
      }
    }
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

const readTextIfExists = async (filePath: string) => {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

const writeTextIfChanged = async (filePath: string, content: string) => {
  const current = await readTextIfExists(filePath)

  if (current === content) return false

  await writeFile(filePath, content, 'utf8')

  return true
}

const stableJson = (value: unknown) => JSON.stringify(value, null, 2) + '\n'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const inferLicenseSource = (candidate: ValidationResult) => {
  if (candidate.source === 'curated') return 'Curated local SVG from verified brand source; preserve original brand guidelines'
  if (candidate.source === 'derived') return 'Derived from verified SVG source; preserve original brand guidelines'
  if (candidate.source === 'simple-icons') return 'Simple Icons; verify brand usage guidelines before client-facing release'
  if (candidate.source === 'wikimedia') return 'Wikimedia Commons; verify file page license and trademark notes'
  if (candidate.source === 'official') return 'Official brand source; follow source brand guidelines'

  return 'Direct URL; manual license verification required'
}

const primaryLogoFieldForVariant = (variant: LogoVariant) => {
  if (variant === 'full-positive') return 'logo'
  if (variant === 'mark-positive') return 'compactLogo'

  return null
}

const updateAuditManifest = (manifest: AuditManifest, providerSlug: ProviderSlug, selected: ValidationResult, relativeLogoPath: string, verifiedAt: string): ManifestUpdateResult => {
  const provider = PROVIDER_CATALOG[providerSlug]
  const existing = manifest.entries.find(entry => entry.slug === providerSlug)
  const entries = manifest.entries.filter(entry => entry.slug !== providerSlug)
  const nextSourceUrl = selected.pageUrl ?? selected.url
  const nextLicenseSource = inferLicenseSource(selected)
  const existingVariant = existing?.variants?.[selected.variant]
  const primaryField = primaryLogoFieldForVariant(selected.variant)
  const nextLogo = primaryField === 'logo' ? relativeLogoPath : (existing?.logo ?? provider.logo)
  const nextCompactLogo = primaryField === 'compactLogo' ? relativeLogoPath : (existing?.compactLogo ?? provider.compactLogo ?? null)

  const nextEntrySourceUrl = selected.variant === 'full-positive'
    ? nextSourceUrl
    : (existing?.sourceUrl ?? nextSourceUrl)

  const nextEntryLicenseSource = selected.variant === 'full-positive'
    ? nextLicenseSource
    : (existing?.licenseSource ?? nextLicenseSource)

  const variantChanged = !existingVariant
    || existingVariant.sourceUrl !== nextSourceUrl
    || existingVariant.licenseSource !== nextLicenseSource
    || existingVariant.logo !== relativeLogoPath

  const entryChanged = !existing
    || existing.sourceUrl !== nextEntrySourceUrl
    || existing.licenseSource !== nextEntryLicenseSource
    || existing.logo !== nextLogo
    || existing.compactLogo !== nextCompactLogo

  const lastVerifiedAt = variantChanged ? verifiedAt : (existingVariant?.lastVerifiedAt ?? existing?.lastVerifiedAt ?? verifiedAt)
  const entryLastVerifiedAt = (variantChanged || entryChanged) ? verifiedAt : (existing?.lastVerifiedAt ?? verifiedAt)

  const variants = {
    ...(existing?.variants ?? {}),
    [selected.variant]: {
      sourceUrl: nextSourceUrl,
      licenseSource: nextLicenseSource,
      logo: relativeLogoPath,
      lastVerifiedAt
    }
  }

  entries.push({
    slug: providerSlug,
    brandName: provider.name,
    category: provider.category,
    country: provider.country ?? null,
    sourceUrl: nextEntrySourceUrl,
    licenseSource: nextEntryLicenseSource,
    logo: nextLogo,
    compactLogo: nextCompactLogo,
    lastVerifiedAt: entryLastVerifiedAt,
    variants
  })

  const updated = {
    version: manifest.version || 1,
    updatedAt: manifest.updatedAt,
    variantModel: [...LOGO_VARIANTS],
    entries: entries.sort((a, b) => a.slug.localeCompare(b.slug))
  }

  const normalizedCurrent = {
    ...manifest,
    variantModel: manifest.variantModel ?? [...LOGO_VARIANTS],
    entries: [...manifest.entries].sort((a, b) => a.slug.localeCompare(b.slug))
  }

  const changed = stableJson(normalizedCurrent) !== stableJson(updated)

  return {
    manifest: changed ? { ...updated, updatedAt: verifiedAt } : normalizedCurrent,
    changed
  }
}

const applySelectedCandidate = async (auditManifest: AuditManifest, providerSlug: ProviderSlug, selected: ValidationResult): Promise<{
  manifest: AuditManifest
  fileChanged: boolean
  manifestChanged: boolean
  relativeLogoPath: string | null
}> => {
  if (!selected.content || !selected.destination) {
    return {
      manifest: auditManifest,
      fileChanged: false,
      manifestChanged: false,
      relativeLogoPath: null
    }
  }

  const content = selected.content.trim() + '\n'
  const fileChanged = await writeTextIfChanged(selected.destination, content)
  const relativeLogoPath = `/${path.relative(path.join(process.cwd(), 'public'), selected.destination).replaceAll(path.sep, '/')}`
  const currentFileContent = await readTextIfExists(selected.destination)
  const currentFileHash = currentFileContent ? createHash('sha256').update(currentFileContent.trim()).digest('hex') : null
  const candidateHash = createHash('sha256').update(selected.content.trim()).digest('hex')

  const verifiedAt = fileChanged || currentFileHash !== candidateHash
    ? new Date().toISOString()
    : (auditManifest.entries.find(entry => entry.slug === providerSlug)?.variants?.[selected.variant]?.lastVerifiedAt ?? new Date().toISOString())

  const manifestUpdate = updateAuditManifest(auditManifest, providerSlug, selected, relativeLogoPath, verifiedAt)

  return {
    manifest: manifestUpdate.manifest,
    fileChanged,
    manifestChanged: manifestUpdate.changed,
    relativeLogoPath
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

const retryDelayMs = (response: Response | null, attempt: number) => {
  const retryAfter = response?.headers.get('retry-after')
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) return Math.min(retryAfterSeconds * 1000, 10000)

  return 750 * (attempt + 1)
}

const fetchWithRetry = async (url: string, init: RequestInit = {}, attempts = 3) => {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init)

      if (!HTTP_RETRY_STATUSES.has(response.status) || attempt === attempts - 1) return response

      await sleep(retryDelayMs(response, attempt))
    } catch (error) {
      lastError = error

      if (attempt === attempts - 1) throw error

      await sleep(retryDelayMs(null, attempt))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('HTTP retry failed.')
}

const mapWithConcurrency = async <Input, Output>(items: Input[], concurrency: number, mapper: (item: Input) => Promise<Output>) => {
  const results: Output[] = []
  let nextIndex = 0

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex

      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex])
    }
  })

  await Promise.all(workers)

  return results
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

  const words = [candidate.providerSlug, provider.name, candidate.providerSlug.replaceAll('-', '')]
    .flatMap(value => value.toLowerCase().split(/[^a-z0-9áéíóúñ]+/i))
    .filter(word => word.length >= 3 && !BRAND_TOKEN_STOPWORDS.has(word))

  return words.some(word => haystack.includes(word))
}

const normalizeConfiguredSignal = (signal: string) => signal
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9áéíóúñ]+/gi, '')

const configuredBrandSignalMatch = (haystack: string, signals: string[] | undefined) => {
  const normalizedHaystack = haystack
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ]+/gi, '')

  return signals
    ?.map(normalizeConfiguredSignal)
    .filter(Boolean)
    .some(signal => normalizedHaystack.includes(signal)) ?? false
}

const brandTokensForProvider = (providerSlug: ProviderSlug) => {
  const provider = PROVIDER_CATALOG[providerSlug]

  return [providerSlug, provider.name, providerSlug.replaceAll('-', '')]
    .flatMap(value => value.toLowerCase().split(/[^a-z0-9áéíóúñ]+/i))
    .filter(word => word.length >= 3 && !BRAND_TOKEN_STOPWORDS.has(word))
}

const officialPageAssetBrandSignal = (providerSlug: ProviderSlug, assetUrl: string) => {
  const parsed = new URL(assetUrl)
  const basename = path.basename(parsed.pathname)
  const haystack = decodeURIComponent(`${basename} ${parsed.search}`).toLowerCase()
  const tokens = brandTokensForProvider(providerSlug)

  return /(logo|logotipo|wordmark|brand|marca)/i.test(haystack) && tokens.some(token => haystack.includes(token))
}

const variantSearchSuffix = (variant: LogoVariant) => {
  if (variant === 'full-positive') return 'full logo svg'
  if (variant === 'full-negative') return 'white reversed full logo svg'
  if (variant === 'mark-positive') return 'isotipo icon brand mark svg'

  return 'white reversed isotipo icon brand mark svg'
}

const variantIntentSignals = (candidate: LogoCandidate) => {
  const haystack = `${candidate.title ?? ''} ${candidate.url} ${candidate.pageUrl ?? ''}`.toLowerCase()
  const warnings: string[] = []
  let score = 0

  if (candidate.variant.includes('negative')) {
    if (/(negative|white|reversed|reverse|blanco|dark|light)/i.test(haystack)) score += 8
    else {
      score -= 35
      warnings.push('No hay senal clara de version negativa/blanca.')
    }
  }

  if (candidate.variant.includes('mark')) {
    if (/(mark|icon|symbol|isotype|isotipo|brandmark|logo mark)/i.test(haystack) || candidate.source === 'simple-icons') score += 8
    else {
      score -= 25
      warnings.push('No hay senal clara de isotipo/brand mark.')
    }
  }

  if (candidate.variant.includes('full')) {
    if (/(logo|wordmark|logotipo|lockup|full)/i.test(haystack)) score += 6
    else {
      score -= 10
      warnings.push('No hay senal clara de logo completo/wordmark.')
    }
  }

  return { score, warnings }
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

const validateExpectedColors = (svg: string, expectedColors: string[] | undefined) => {
  if (!expectedColors?.length) return []

  const normalizedSvg = svg.toLowerCase()

  return expectedColors.filter(color => !normalizedSvg.includes(color.toLowerCase()))
}

const scoreCandidate = (candidate: LogoCandidate, content: string, response: Response, svgWarnings: string[], hint?: VariantHint) => {
  const url = new URL(candidate.url)
  const reasons: string[] = []
  const warnings = [...svgWarnings]
  const freshnessSignals = hasFreshnessSignal(candidate, content, response)
  const variantSignals = variantIntentSignals(candidate)
  const candidateHaystack = `${candidate.title ?? ''} ${candidate.url} ${candidate.pageUrl ?? ''} ${content.slice(0, 2500)}`.toLowerCase()
  let score = 0

  if (candidate.source === 'official') score += 45
  if (candidate.source === 'simple-icons') score += 38
  if (candidate.source === 'wikimedia') score += 32
  if (candidate.source === 'direct-url') score += 24

  if (url.protocol === 'https:') score += 10
  else warnings.push('La URL no usa HTTPS.')

  if (TRUSTED_WIKIMEDIA_HOSTS.has(url.hostname) || TRUSTED_SIMPLE_ICON_HOSTS.has(url.hostname)) score += 12
  if (candidate.source === 'official') score += 15

  if (sameBrandSignal(candidate) || configuredBrandSignalMatch(candidateHaystack, hint?.requiredBrandSignals)) score += 15
  else {
    score -= 45
    reasons.push('La URL/titulo no contiene una senal fuerte del nombre distintivo de marca.')
  }

  if (hint?.requiredBrandSignals?.length && !configuredBrandSignalMatch(candidateHaystack, hint.requiredBrandSignals)) {
    score -= 75
    reasons.push(`No contiene senales requeridas de marca configuradas: ${hint.requiredBrandSignals.join(', ')}.`)
  }

  if (configuredBrandSignalMatch(candidateHaystack, hint?.blockedBrandSignals)) {
    score -= 90
    reasons.push(`Contiene senales bloqueadas para esta marca: ${hint?.blockedBrandSignals?.join(', ')}.`)
  }

  score += variantSignals.score
  warnings.push(...variantSignals.warnings)

  if (freshnessSignals.length > 0) score += 8
  else warnings.push('No hay senal de actualidad; requiere revision humana contra brand center o fuente oficial.')

  if (HISTORICAL_OR_VARIANT_PATTERN.test(`${candidate.title ?? ''} ${candidate.url} ${candidate.pageUrl ?? ''}`)) {
    score -= 35
    reasons.push('El candidato parece variante historica, co-brand o red derivada; no debe tratarse como logo actual de marca.')
  }

  if (NON_BRAND_ASSET_PATTERN.test(`${candidate.title ?? ''} ${candidate.url} ${candidate.pageUrl ?? ''}`)) {
    score -= 65
    reasons.push('El candidato parece icono de UI/social o asset no marcario; no debe usarse como logo de instrumento de pago.')
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

const parseAiJson = (text: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    const match = text.match(/\{[\s\S]*\}/)

    if (!match) return null

    try {
      return JSON.parse(match[0]) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

const splitModelList = (value: string | undefined) => value
  ?.split(',')
  .map(model => model.trim())
  .filter(Boolean) ?? []

const locationForModel = (model: string, fallbackLocation: string) => (
  model.startsWith('gemini-3-') ? 'global' : fallbackLocation
)

const getAiLogoReviewRuntime = () => {
  const configuredModels = [
    ...splitModelList(process.env.PAYMENT_LOGO_AI_MODEL),
    ...splitModelList(process.env.GREENHOUSE_AGENT_MODEL)
  ]

  return {
    project: process.env.GCP_PROJECT?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim() || 'efeonce-group',
    location: process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'us-central1',
    models: [...new Set([...configuredModels, ...DEFAULT_AI_REVIEW_MODELS])]
  }
}

const isRetryableAiReviewError = (review: AiLogoReview) => review.status === 'error'

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string) => {
  let timeout: NodeJS.Timeout | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
      })
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

const runAiLogoReviewWithModel = async (candidate: ValidationResult, timeoutMs: number, model: string): Promise<AiLogoReview> => {
  if (!candidate.content) {
    return { status: 'skipped', rationale: 'No SVG content available for AI review.' }
  }

  const runtime = getAiLogoReviewRuntime()
  const location = locationForModel(model, runtime.location)
  let renderedPngBase64: string | null = null

  try {
    const { default: sharp } = await import('sharp')

    renderedPngBase64 = (await sharp(Buffer.from(candidate.content))
      .resize({ width: candidate.variant.includes('full') ? 1200 : 512, withoutEnlargement: true })
      .png()
      .toBuffer())
      .toString('base64')
  } catch {
    renderedPngBase64 = null
  }

  try {
    process.env.GOOGLE_GENAI_USE_VERTEXAI = 'true'
    process.env.GOOGLE_CLOUD_PROJECT ||= runtime.project
    process.env.GOOGLE_CLOUD_LOCATION = location

    const client = new GoogleGenAI({
      vertexai: true,
      project: runtime.project,
      location,
      apiVersion: 'v1'
    })

    const response = await withTimeout(
      client.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              ...(renderedPngBase64
                ? [{
                    inlineData: {
                      mimeType: 'image/png',
                      data: renderedPngBase64
                    }
                  }]
                : []),
              {
                text: [
                  'Review this SVG candidate for use in Greenhouse payment instrument logos.',
                  renderedPngBase64 ? 'Use the rendered PNG image as the primary visual evidence; use the SVG excerpt only as technical context.' : 'No rendered PNG was available; review SVG text cautiously.',
                  'Return ONLY JSON with keys: status(pass|review|reject), confidence(0-1), qualityScore(0-100), isCorrectBrand(boolean), isCorrectVariant(boolean), isLikelyCurrent(boolean), rationale(string), risks(string[]).',
                  'Do not approve if the asset appears historical, co-branded, a derived network, not the requested brand, not the requested variant, raster-embedded, visually low quality, or unsafe for production UI.',
                  '',
                  `Brand: ${candidate.providerName}`,
                  `Requested variant: ${candidate.variant}`,
                  `Source: ${candidate.source}`,
                  `URL: ${candidate.url}`,
                  `Page: ${candidate.pageUrl ?? 'n/a'}`,
                  `Title: ${candidate.title ?? 'n/a'}`,
                  `Deterministic score: ${candidate.score}`,
                  `Deterministic warnings: ${candidate.warnings.join(' | ') || 'none'}`,
                  '',
                  'SVG excerpt:',
                  candidate.content.slice(0, 18000)
                ].join('\n')
              }
            ]
          }
        ],
        config: {
          temperature: 0,
          responseMimeType: 'application/json',
          maxOutputTokens: 900
        }
      }),
      timeoutMs,
      'Gemini logo review'
    )

    const text = response.text?.trim()
    const parsed = text ? parseAiJson(text) : null

    if (!parsed) {
      return {
        status: 'error',
        model: `${model}@${location}`,
        rationale: 'Gemini returned an empty or non-JSON response.'
      }
    }

    const status = parsed.status === 'pass' || parsed.status === 'review' || parsed.status === 'reject'
      ? parsed.status
      : 'review'

    return {
      status,
      model: `${model}@${location}`,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
      qualityScore: typeof parsed.qualityScore === 'number' ? parsed.qualityScore : undefined,
      isCorrectBrand: typeof parsed.isCorrectBrand === 'boolean' ? parsed.isCorrectBrand : undefined,
      isCorrectVariant: typeof parsed.isCorrectVariant === 'boolean' ? parsed.isCorrectVariant : undefined,
      isLikelyCurrent: typeof parsed.isLikelyCurrent === 'boolean' ? parsed.isLikelyCurrent : undefined,
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : undefined,
      risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : undefined
    }
  } catch (error) {
    return {
      status: 'error',
      model: `${model}@${location}`,
      rationale: error instanceof Error ? error.message : 'Unknown Gemini review error.'
    }
  }
}

const runAiLogoReview = async (candidate: ValidationResult, timeoutMs: number): Promise<AiLogoReview> => {
  const runtime = getAiLogoReviewRuntime()
  const errors: AiLogoReview[] = []

  for (const model of runtime.models) {
    const review = await runAiLogoReviewWithModel(candidate, timeoutMs, model)

    if (!isRetryableAiReviewError(review)) return review

    errors.push(review)
  }

  return {
    status: 'error',
    model: errors.map(error => error.model).filter(Boolean).join(', '),
    rationale: errors.map(error => `${error.model}: ${error.rationale}`).join(' | ') || 'No AI review model was available.'
  }
}

const applyAiReview = (candidate: ValidationResult, review: AiLogoReview, aiRequired: boolean): ValidationResult => {
  const next: ValidationResult = {
    ...candidate,
    aiReview: review,
    warnings: [...candidate.warnings],
    reasons: [...candidate.reasons]
  }

  if (review.status === 'error' || review.status === 'skipped') {
    next.warnings.push(`AI review ${review.status}: ${review.rationale ?? 'sin detalle'}`)

    if (aiRequired) {
      next.reviewRequired = true
      next.score = 0
      next.reasons.push('AI review requerido pero no disponible.')
    }

    return next
  }

  if (review.status === 'reject' || review.isCorrectBrand === false || review.isCorrectVariant === false) {
    next.reviewRequired = true
    next.score = Math.max(0, next.score - 45)
    next.reasons.push(`AI review rechazo o inconsistencia: ${review.rationale ?? 'sin detalle'}`)
  } else if (review.status === 'review' || review.isLikelyCurrent === false) {
    next.reviewRequired = true
    next.score = Math.max(0, next.score - 15)
    next.warnings.push(`AI review requiere revision: ${review.rationale ?? 'sin detalle'}`)
  } else if (typeof review.qualityScore === 'number') {
    next.score = Math.min(100, Math.round((next.score * 0.75) + (review.qualityScore * 0.25)))
  }

  return next
}

const reviewTopCandidatesWithAi = async (validated: ValidationResult[], aiReview: boolean, aiRequired: boolean, minScore: number, timeoutMs: number) => {
  if (!aiReview && !aiRequired) return validated

  const ranked = [...validated]
    .filter(candidate => candidate.ok && candidate.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

  const rankedKeys = new Set(ranked.map(candidate => candidate.url))
  const reviewed = new Map<string, ValidationResult>()

  for (const candidate of ranked) {
    const review = await runAiLogoReview(candidate, timeoutMs)

    reviewed.set(candidate.url, applyAiReview(candidate, review, aiRequired))
  }

  return validated.map(candidate => rankedKeys.has(candidate.url) ? reviewed.get(candidate.url) ?? candidate : candidate)
}

const hintForVariant = (hint: SourceHint | undefined, variant: LogoVariant): VariantHint | undefined => ({
  searchTerms: hint?.variants?.[variant]?.searchTerms ?? hint?.searchTerms,
  simpleIconsSlug: hint?.variants?.[variant]?.simpleIconsSlug ?? hint?.simpleIconsSlug,
  preferredFileBase: hint?.variants?.[variant]?.preferredFileBase ?? (hint?.preferredFileBase ? `${hint.preferredFileBase}-${variant}` : undefined),
  officialSvgUrls: hint?.variants?.[variant]?.officialSvgUrls ?? (variant === 'full-positive' ? hint?.officialSvgUrls : undefined),
  officialPages: hint?.variants?.[variant]?.officialPages ?? (variant === 'full-positive' ? hint?.officialPages : undefined),
  expectedColors: hint?.variants?.[variant]?.expectedColors ?? (variant.includes('negative') ? undefined : hint?.expectedColors),
  requiredBrandSignals: hint?.variants?.[variant]?.requiredBrandSignals ?? hint?.requiredBrandSignals,
  blockedBrandSignals: hint?.variants?.[variant]?.blockedBrandSignals ?? hint?.blockedBrandSignals,
  curatedSvgPath: hint?.variants?.[variant]?.curatedSvgPath,
  curatedSourceUrl: hint?.variants?.[variant]?.curatedSourceUrl,
  derivedFromVariant: hint?.variants?.[variant]?.derivedFromVariant,
  deriveMode: hint?.variants?.[variant]?.deriveMode,
  cropViewBox: hint?.variants?.[variant]?.cropViewBox
})

const validateCandidate = async (candidate: LogoCandidate, outputDir: string, hint?: VariantHint): Promise<ValidationResult> => {
  const destinationBase = hint?.preferredFileBase ?? `${candidate.providerSlug}-${candidate.variant}`
  const destination = path.join(outputDir, `${destinationBase}.svg`)

  try {
    const response = await fetchWithRetry(candidate.url)

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

    const scoring = scoreCandidate(candidate, content, response, svgValidation.warnings, hint)
    const missingExpectedColors = validateExpectedColors(content, hint?.expectedColors)

    if (missingExpectedColors.length > 0) {
      scoring.reasons.push(`Faltan colores esperados de marca: ${missingExpectedColors.join(', ')}.`)
      scoring.score = Math.max(0, scoring.score - 35)
    }

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

const discoverSimpleIcons = (providerSlug: ProviderSlug, variant: LogoVariant, hint?: VariantHint): LogoCandidate[] => {
  if (!hint?.simpleIconsSlug) return []
  if (variant.includes('full')) return []

  const provider = PROVIDER_CATALOG[providerSlug]
  const slug = hint.simpleIconsSlug

  const cdnUrl = variant.includes('negative')
    ? `https://cdn.simpleicons.org/${encodeURIComponent(slug)}/white`
    : `https://cdn.simpleicons.org/${encodeURIComponent(slug)}`

  const candidates: LogoCandidate[] = [
    {
      providerSlug,
      providerName: provider.name,
      variant,
      source: 'simple-icons',
      url: cdnUrl,
      pageUrl: `https://simpleicons.org/?q=${encodeURIComponent(slug)}`,
      title: `${provider.name} ${variant} mark from Simple Icons`,
      discoveredBy: variant.includes('negative') ? 'simple-icons-cdn:white' : 'simple-icons-cdn'
    }
  ]

  if (variant.includes('negative')) return candidates

  candidates.push({
    providerSlug,
    providerName: provider.name,
    variant,
    source: 'simple-icons',
    url: `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/${encodeURIComponent(slug)}.svg`,
    pageUrl: `https://github.com/simple-icons/simple-icons/blob/develop/icons/${encodeURIComponent(slug)}.svg`,
    title: `${provider.name} ${variant} mark from Simple Icons repository`,
    discoveredBy: 'simple-icons-github'
  })

  return candidates
}

const discoverOfficialUrls = (providerSlug: ProviderSlug, variant: LogoVariant, hint?: VariantHint): LogoCandidate[] => {
  const provider = PROVIDER_CATALOG[providerSlug]

  return (hint?.officialSvgUrls ?? []).map(url => ({
    providerSlug,
    providerName: provider.name,
    variant,
    source: 'official' as const,
    url,
    pageUrl: url,
    title: `${provider.name} official ${variant} SVG`,
    discoveredBy: 'manifest-officialSvgUrls'
  }))
}

const extractSvgUrlsFromHtml = (html: string, pageUrl: string) => {
  const matches = [
    ...html.matchAll(/https?:\/\/[^"'<>\s)]+\.svg(?:\/[^"'<>\s)]*)?/gi),
    ...html.matchAll(/["']([^"']+\.svg(?:\/[^"']*)?)["']/gi)
  ]

  const urls = matches
    .map(match => match[1] ?? match[0])
    .map(value => value.replace(/^["']|["']$/g, '').replaceAll('&amp;', '&'))
    .map(value => {
      try {
        return new URL(value, pageUrl).toString()
      } catch {
        return null
      }
    })
    .filter((value): value is string => Boolean(value))

  return [...new Set(urls)]
}

const discoverOfficialPages = async (providerSlug: ProviderSlug, variant: LogoVariant, hint?: VariantHint): Promise<LogoCandidate[]> => {
  if (!hint?.officialPages?.length) return []

  const provider = PROVIDER_CATALOG[providerSlug]

  const pages = await Promise.all(hint.officialPages.map(async pageUrl => {
    try {
      const response = await fetchWithRetry(pageUrl, { headers: { accept: 'text/html,application/xhtml+xml' } }, 2)

      if (!response.ok) return []

      const html = await response.text()

      return extractSvgUrlsFromHtml(html, pageUrl)
        .filter(url => officialPageAssetBrandSignal(providerSlug, url))
        .map(url => ({
          providerSlug,
          providerName: provider.name,
          variant,
          source: 'official' as const,
          url,
          pageUrl,
          title: path.basename(new URL(url).pathname),
          discoveredBy: 'official-page-html'
        }))
    } catch {
      return []
    }
  }))

  return pages.flat()
}

const queryWikimedia = async (providerSlug: ProviderSlug, variant: LogoVariant, term: string): Promise<LogoCandidate[]> => {
  const provider = PROVIDER_CATALOG[providerSlug]
  const searchUrl = new URL('https://commons.wikimedia.org/w/api.php')

  searchUrl.searchParams.set('action', 'query')
  searchUrl.searchParams.set('format', 'json')
  searchUrl.searchParams.set('generator', 'search')
  searchUrl.searchParams.set('gsrnamespace', '6')
  searchUrl.searchParams.set('gsrlimit', '8')
  searchUrl.searchParams.set('gsrsearch', term)
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
      variant,
      source: 'wikimedia' as const,
      url: info.url!,
      pageUrl: info.descriptionurl,
      title: page.title,
      discoveredBy: `wikimedia:${term}`
    }))
}

const discoverWikimedia = async (providerSlug: ProviderSlug, variant: LogoVariant, hint?: VariantHint): Promise<LogoCandidate[]> => {
  const provider = PROVIDER_CATALOG[providerSlug]
  const baseTerms = hint?.searchTerms?.length ? hint.searchTerms : [`${provider.name} ${variantSearchSuffix(variant)}`]

  const terms = [
    ...baseTerms,
    ...baseTerms.map(term => `${term} ${variantSearchSuffix(variant)}`),
    `${provider.name} logo`,
    `${provider.name} logotipo`
  ]

  const results = await Promise.all(terms.map(term => queryWikimedia(providerSlug, variant, term)))

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

const variantListFromArgs = (variants: LogoVariant[] | undefined) => {
  if (!variants?.length) return [...LOGO_VARIANTS]

  const invalid = variants.filter(variant => !LOGO_VARIANTS.includes(variant))

  if (invalid.length) throw new Error(`Variantes desconocidas: ${invalid.join(', ')}. Usa: ${LOGO_VARIANTS.join(', ')}`)

  return variants
}

const normalizeCandidateSource = (source: CandidateSource | undefined): CandidateSource => {
  if (source === 'official' || source === 'wikimedia' || source === 'simple-icons' || source === 'direct-url') return source

  return 'direct-url'
}

const buildDirectCandidate = (providerSlug: ProviderSlug, variant: LogoVariant, candidateUrl: string, source: CandidateSource | undefined): LogoCandidate => {
  const provider = PROVIDER_CATALOG[providerSlug]
  const candidateSource = normalizeCandidateSource(source)

  return {
    providerSlug,
    providerName: provider.name,
    variant,
    source: candidateSource,
    url: candidateUrl,
    pageUrl: candidateUrl,
    title: `${provider.name} ${variant} explicit candidate`,
    discoveredBy: `direct-candidate:${candidateSource}`
  }
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const statusLabel = (candidate: Omit<ValidationResult, 'content'> | null) => {
  if (!candidate) return 'No candidate'
  if (!candidate.ok) return 'Rejected'
  if (candidate.reviewRequired) return 'Needs review'

  return 'Ready'
}

const statusClass = (candidate: Omit<ValidationResult, 'content'> | null) => {
  if (!candidate || !candidate.ok) return 'danger'
  if (candidate.reviewRequired) return 'warning'

  return 'success'
}

const candidateApplyCommand = (providerSlug: string, variant: LogoVariant, candidate: Omit<ValidationResult, 'content'>, minScore: number) => [
  'pnpm logos:payment:agent --',
  `--provider ${providerSlug}`,
  `--variant ${variant}`,
  `--candidate-url "${candidate.url}"`,
  `--candidate-source ${candidate.source}`,
  `--min-score ${minScore}`,
  '--apply'
].join(' ')

const renderReviewHtml = (report: RunReport) => {
  const generated = escapeHtml(report.generatedAt)

  const sections = report.results.map(result => {
    const variantSections = LOGO_VARIANTS
      .map(variant => {
        const data = result.variants[variant]

        if (!data) return ''

        const candidates = data.candidates.slice(0, 6).map(candidate => {
          const command = candidateApplyCommand(result.providerSlug, variant, candidate, report.minScore)
          const reasons = [...candidate.reasons, ...candidate.warnings].slice(0, 6)

          return `
            <article class="candidate ${statusClass(candidate)}">
              <div class="preview"><img src="${escapeHtml(candidate.url)}" alt="${escapeHtml(result.providerName)} ${variant}" loading="lazy" /></div>
              <div class="candidate-body">
                <div class="candidate-topline">
                  <span class="badge ${statusClass(candidate)}">${escapeHtml(statusLabel(candidate))}</span>
                  <strong>${escapeHtml(candidate.score)}/100</strong>
                  <span>${escapeHtml(candidate.source)}</span>
                </div>
                <a href="${escapeHtml(candidate.url)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.url)}</a>
                ${candidate.pageUrl && candidate.pageUrl !== candidate.url ? `<a href="${escapeHtml(candidate.pageUrl)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.pageUrl)}</a>` : ''}
                <ul>${reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
                <code>${escapeHtml(command)}</code>
              </div>
            </article>
          `
        }).join('')

        return `
          <section class="variant">
            <h3>${escapeHtml(variant)} <span class="badge ${statusClass(data.selected)}">${escapeHtml(statusLabel(data.selected))}</span></h3>
            ${candidates || '<p class="muted">No candidates found.</p>'}
          </section>
        `
      })
      .join('')

    return `
      <section class="provider">
        <h2>${escapeHtml(result.providerName)} <span>${escapeHtml(result.providerSlug)}</span></h2>
        ${variantSections}
      </section>
    `
  }).join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Logo Review</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f8fb; color: #172033; }
    body { margin: 0; padding: 32px; }
    header, .provider { max-width: 1180px; margin: 0 auto 24px; }
    header { display: flex; justify-content: space-between; gap: 24px; align-items: end; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 28px; }
    h2 { display: flex; align-items: baseline; gap: 12px; font-size: 22px; margin-bottom: 18px; }
    h2 span { color: #60708f; font-size: 14px; font-weight: 600; }
    h3 { display: flex; align-items: center; gap: 10px; font-size: 16px; margin: 20px 0 12px; }
    .provider { background: #fff; border: 1px solid #dbe3ef; border-radius: 12px; padding: 22px; box-shadow: 0 14px 40px rgba(23, 32, 51, 0.08); }
    .variant { border-top: 1px solid #e7edf5; padding-top: 4px; }
    .candidate { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 18px; border: 1px solid #dbe3ef; border-radius: 10px; padding: 14px; margin: 12px 0; background: #fff; }
    .candidate.success { border-color: #9bd7b0; }
    .candidate.warning { border-color: #ffd18a; }
    .candidate.danger { border-color: #f2a4a4; }
    .preview { min-height: 110px; display: grid; place-items: center; border-radius: 8px; background: linear-gradient(135deg, #fff, #eef3f9); border: 1px solid #e7edf5; }
    .preview img { max-width: 150px; max-height: 90px; object-fit: contain; }
    .candidate-body { min-width: 0; display: grid; gap: 8px; }
    .candidate-topline { display: flex; gap: 10px; align-items: center; color: #60708f; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; }
    .badge.success { color: #086b32; background: #ddf7e7; }
    .badge.warning { color: #875100; background: #fff0d2; }
    .badge.danger { color: #8a1f1f; background: #ffe1e1; }
    a { color: #0b72e7; overflow-wrap: anywhere; text-decoration: none; }
    ul { margin: 0; padding-left: 18px; color: #60708f; }
    code { display: block; white-space: pre-wrap; overflow-wrap: anywhere; border-radius: 8px; padding: 10px; background: #0f172a; color: #e2e8f0; font-size: 12px; }
    .muted { color: #60708f; }
    @media (max-width: 760px) { body { padding: 18px; } header { display: block; } .candidate { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Payment Logo Review</h1>
      <p class="muted">Generated ${generated}. Mode: ${escapeHtml(report.mode)} / ${escapeHtml(report.selectionMode)}.</p>
    </div>
    <p class="muted">Approve only candidates that match the current brand and intended variant.</p>
  </header>
  ${sections}
</body>
</html>
`
}

const stripContent = (result: ValidationResult): Omit<ValidationResult, 'content'> => {
  const rest = { ...result }

  delete rest.content

  return rest as Omit<ValidationResult, 'content'>
}

const publicPathToFilePath = (logoPath: string | null | undefined) => {
  if (!logoPath?.startsWith('/')) return null

  return path.join(process.cwd(), 'public', logoPath.replace(/^\//, ''))
}

const validateCuratedVariant = async (
  providerSlug: ProviderSlug,
  variant: LogoVariant,
  hint: VariantHint | undefined
): Promise<ValidationResult[]> => {
  if (!hint?.curatedSvgPath) return []

  const sourceFilePath = publicPathToFilePath(hint.curatedSvgPath)
  const content = sourceFilePath ? await readTextIfExists(sourceFilePath) : null

  if (!sourceFilePath || !content) return []

  const provider = PROVIDER_CATALOG[providerSlug]
  const svgValidation = validateSvg(content)
  const ok = svgValidation.reasons.length === 0
  const sha256 = createHash('sha256').update(content.trim()).digest('hex')

  return [{
    providerSlug,
    providerName: provider.name,
    variant,
    source: 'curated',
    url: hint.curatedSvgPath,
    pageUrl: hint.curatedSourceUrl ?? hint.curatedSvgPath,
    title: `${provider.name} ${variant} curated local SVG`,
    discoveredBy: 'curated-local-svg',
    ok,
    score: ok ? 100 : 0,
    reviewRequired: !ok,
    reasons: svgValidation.reasons,
    warnings: [
      ...svgValidation.warnings,
      'Variante curada localmente desde fuente oficial; revisar visualmente ante cambios de marca.'
    ],
    sha256,
    bytes: Buffer.byteLength(content, 'utf8'),
    destination: sourceFilePath,
    freshnessSignals: ['source:curated', ...(hint.curatedSourceUrl ? ['source:official-raster'] : [])],
    content
  }]
}

const logoPathForVariant = (auditManifest: AuditManifest, providerSlug: ProviderSlug, variant: LogoVariant) => {
  const entry = auditManifest.entries.find(item => item.slug === providerSlug)

  return entry?.variants?.[variant]?.logo ?? (variant === 'full-positive' ? entry?.logo : null) ?? PROVIDER_CATALOG[providerSlug]?.logo ?? null
}

const recolorSvgToWhite = (svg: string) => svg
  .replace(/fill:\s*#[0-9a-f]{3,8}/gi, 'fill:#fff')
  .replace(/fill="(?!none\b)[^"]+"/gi, 'fill="#fff"')
  .replace(/fill='(?!none\b)[^']+'/gi, "fill='#fff'")

const cropSvgViewBox = (svg: string, cropViewBox: string) => svg.replace(/<svg\b([^>]*?)>/i, match => {
  const withoutSize = match
    .replace(/\swidth="[^"]*"/i, '')
    .replace(/\sheight="[^"]*"/i, '')
    .replace(/\sviewBox="[^"]*"/i, '')
    .replace(/\sviewbox="[^"]*"/i, '')

  return withoutSize.replace(/>$/, ` viewBox="${cropViewBox}">`)
})

const deriveSvgContent = (svg: string, hint: VariantHint) => {
  let content = svg

  if (hint.cropViewBox && hint.deriveMode?.includes('crop-viewbox')) {
    content = cropSvgViewBox(content, hint.cropViewBox)
  }

  if (hint.deriveMode?.includes('recolor-white')) {
    content = recolorSvgToWhite(content)
  }

  return content
}

const deriveVariantCandidate = async (
  providerSlug: ProviderSlug,
  variant: LogoVariant,
  outputDir: string,
  hint: VariantHint | undefined,
  auditManifest: AuditManifest
): Promise<ValidationResult[]> => {
  if (!hint?.deriveMode) return []

  const sourceVariant = hint.derivedFromVariant ?? 'full-positive'
  const sourceLogoPath = logoPathForVariant(auditManifest, providerSlug, sourceVariant)
  const sourceFilePath = publicPathToFilePath(sourceLogoPath)

  if (!sourceFilePath) return []

  const sourceSvg = await readTextIfExists(sourceFilePath)

  if (!sourceSvg) return []

  const content = deriveSvgContent(sourceSvg, hint)
  const provider = PROVIDER_CATALOG[providerSlug]
  const destinationBase = hint.preferredFileBase ?? `${providerSlug}-${variant}`
  const destination = path.join(outputDir, `${destinationBase}.svg`)
  const svgValidation = validateSvg(content)
  const ok = svgValidation.reasons.length === 0
  const sha256 = createHash('sha256').update(content).digest('hex')

  return [{
    providerSlug,
    providerName: provider.name,
    variant,
    source: 'derived',
    url: `derived-from:${sourceLogoPath}`,
    pageUrl: `derived-from:${sourceLogoPath}`,
    title: `${provider.name} ${variant} derived from ${sourceVariant}`,
    discoveredBy: `derived:${sourceVariant}:${hint.deriveMode}`,
    ok,
    score: ok ? 100 : 0,
    reviewRequired: !ok,
    reasons: svgValidation.reasons,
    warnings: [
      ...svgValidation.warnings,
      `Variante derivada desde ${sourceVariant}; requiere respetar brand guidelines.`
    ],
    sha256,
    bytes: Buffer.byteLength(content, 'utf8'),
    destination,
    freshnessSignals: ['derived-from-verified-source'],
    content
  }]
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
  const variants = variantListFromArgs(args.variants)
  const directCandidateMode = Boolean(args.candidateUrl)

  if (directCandidateMode && (providerSlugs.length !== 1 || variants.length !== 1)) {
    throw new Error('--candidate-url requiere exactamente un --provider y una --variant.')
  }

  const report: RunReport = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'plan',
    selectionMode: directCandidateMode ? 'direct-candidate' : 'discovery',
    minScore: args.minScore,
    allowReviewRequired: args.allowReviewRequired,
    results: []
  }

  await mkdir(path.dirname(args.reportPath), { recursive: true })
  await mkdir(outputDir, { recursive: true })

  for (const providerSlug of providerSlugs) {
    const provider = PROVIDER_CATALOG[providerSlug]

    if (!provider) throw new Error(`Provider desconocido: ${providerSlug}`)

    const providerResult: RunReport['results'][number] = {
      providerSlug,
      providerName: provider.name,
      variants: {}
    }

    for (const variant of variants) {
      const hint = hintForVariant(manifest.providers[providerSlug], variant)

      const candidates = args.candidateUrl
        ? [buildDirectCandidate(providerSlug, variant, args.candidateUrl, args.candidateSource)]
        : dedupeCandidates([
          ...discoverOfficialUrls(providerSlug, variant, hint),
          ...(await discoverOfficialPages(providerSlug, variant, hint)),
          ...discoverSimpleIcons(providerSlug, variant, hint),
          ...(await discoverWikimedia(providerSlug, variant, hint))
        ])

      const discovered = await mapWithConcurrency(
        candidates,
        DOWNLOAD_CONCURRENCY,
        candidate => validateCandidate(candidate, outputDir, hint)
      )

      const curated = await validateCuratedVariant(providerSlug, variant, hint)
      const derived = await deriveVariantCandidate(providerSlug, variant, outputDir, hint, auditManifest)
      const deterministic = [...curated, ...derived, ...discovered]

      const validated = await reviewTopCandidatesWithAi(deterministic, args.aiReview, args.aiRequired, args.minScore, args.aiTimeoutMs)

      const selected = validated
        .filter(candidate => candidate.ok && candidate.score >= args.minScore)
        .sort((a, b) => b.score - a.score || (a.bytes ?? 0) - (b.bytes ?? 0))[0] ?? null

      providerResult.variants[variant] = {
        selected: selected ? stripContent(selected) : null,
        candidates: validated
          .sort((a, b) => b.score - a.score)
          .map(stripContent)
      }

      const status = selected ? `${selected.score}/100 ${selected.reviewRequired ? 'review-required' : 'ready'}` : 'sin candidato aprobado'

      console.log(`[${providerSlug}] ${provider.name} ${variant}: ${status}`)

      if (args.apply && selected) {
        if (selected.reviewRequired && !args.allowReviewRequired) {
          console.log(`  skip apply: requiere revision humana (${selected.reasons.join(' ')})`)
        } else if (selected.content && selected.destination) {
          const applied = await applySelectedCandidate(auditManifest, providerSlug, selected)

          auditManifest = applied.manifest

          if (applied.fileChanged) {
            console.log(`  saved: ${path.relative(process.cwd(), selected.destination)}`)
          } else if (applied.manifestChanged) {
            console.log(`  manifest updated: ${applied.relativeLogoPath}`)
          } else {
            console.log(`  unchanged: ${path.relative(process.cwd(), selected.destination)}`)
          }
        }
      }
    }

    report.results.push(providerResult)
  }

  if (args.apply) {
    const manifestChanged = await writeTextIfChanged(AUDIT_MANIFEST_PATH, stableJson(auditManifest))

    if (!manifestChanged) console.log('manifest: unchanged')
  }

  await writeFile(args.reportPath, stableJson(report), 'utf8')
  console.log(`report: ${path.relative(process.cwd(), args.reportPath)}`)

  if (args.reviewHtmlPath) {
    await mkdir(path.dirname(args.reviewHtmlPath), { recursive: true })
    await writeFile(args.reviewHtmlPath, renderReviewHtml(report), 'utf8')
    console.log(`review: ${path.relative(process.cwd(), args.reviewHtmlPath)}`)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
