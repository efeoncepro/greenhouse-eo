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
}

type SourceHint = {
  searchTerms?: string[]
  simpleIconsSlug?: string
  preferredFileBase?: string
  officialSvgUrls?: string[]
  officialPages?: string[]
  expectedColors?: string[]
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

type CandidateSource = 'official' | 'simple-icons' | 'wikimedia' | 'direct-url'

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

const CONFIG_PATH = path.join(process.cwd(), 'scripts/config/payment-logo-sources.json')
const AUDIT_MANIFEST_PATH = path.join(process.cwd(), 'public/images/logos/payment/manifest.json')
const DEFAULT_REPORT_PATH = path.join(process.cwd(), 'artifacts/payment-logo-scraper/report.json')
const DEFAULT_MIN_SCORE = 70
const CURRENT_YEAR = new Date().getFullYear()
const HTTP_TIMEOUT_MS = 12000
const AI_REVIEW_TIMEOUT_MS = 25000
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

Options:
  --all                    Scan every provider in PROVIDER_CATALOG.
  --provider <slugs>       Comma-separated provider slugs.
  --variant <variants>     Comma-separated: ${LOGO_VARIANTS.join(', ')}. Default: all variants.
  --ai-review              Ask Gemini to review top deterministic candidates.
  --ai-required            Require Gemini pass before selecting/applying a candidate.
  --ai-timeout-ms <ms>     Gemini review timeout. Default: ${AI_REVIEW_TIMEOUT_MS}.
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

const inferLicenseSource = (candidate: ValidationResult) => {
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

const updateAuditManifest = (manifest: AuditManifest, providerSlug: ProviderSlug, selected: ValidationResult, relativeLogoPath: string): AuditManifest => {
  const provider = PROVIDER_CATALOG[providerSlug]
  const existing = manifest.entries.find(entry => entry.slug === providerSlug)
  const entries = manifest.entries.filter(entry => entry.slug !== providerSlug)

  const variants = {
    ...(existing?.variants ?? {}),
    [selected.variant]: {
      sourceUrl: selected.pageUrl ?? selected.url,
      licenseSource: inferLicenseSource(selected),
      logo: relativeLogoPath,
      lastVerifiedAt: new Date().toISOString()
    }
  }

  const primaryField = primaryLogoFieldForVariant(selected.variant)
  const logo = primaryField === 'logo' ? relativeLogoPath : (existing?.logo ?? provider.logo)
  const compactLogo = primaryField === 'compactLogo' ? relativeLogoPath : (existing?.compactLogo ?? provider.compactLogo ?? null)

  entries.push({
    slug: providerSlug,
    brandName: provider.name,
    category: provider.category,
    country: provider.country ?? null,
    sourceUrl: selected.pageUrl ?? selected.url,
    licenseSource: inferLicenseSource(selected),
    logo,
    compactLogo,
    lastVerifiedAt: new Date().toISOString(),
    variants
  })

  return {
    version: manifest.version || 1,
    updatedAt: new Date().toISOString(),
    variantModel: [...LOGO_VARIANTS],
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

const variantSearchSuffix = (variant: LogoVariant) => {
  if (variant === 'full-positive') return 'full logo svg'
  if (variant === 'full-negative') return 'white reversed full logo svg'
  if (variant === 'mark-positive') return 'isotipo icon brand mark svg'

  return 'white reversed isotipo icon brand mark svg'
}

const variantIntentSignals = (candidate: LogoCandidate) => {
  const haystack = `${candidate.title ?? ''} ${candidate.url} ${candidate.pageUrl ?? ''} ${candidate.discoveredBy}`.toLowerCase()
  const warnings: string[] = []
  let score = 0

  if (candidate.variant.includes('negative')) {
    if (/(negative|white|reversed|reverse|blanco|dark|light)/i.test(haystack)) score += 8
    else warnings.push('No hay senal clara de version negativa/blanca.')
  }

  if (candidate.variant.includes('mark')) {
    if (/(mark|icon|symbol|isotype|isotipo|brandmark|logo mark)/i.test(haystack) || candidate.source === 'simple-icons') score += 8
    else warnings.push('No hay senal clara de isotipo/brand mark.')
  }

  if (candidate.variant.includes('full')) {
    if (/(logo|wordmark|logotipo|lockup|full)/i.test(haystack)) score += 6
    else warnings.push('No hay senal clara de logo completo/wordmark.')
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

const scoreCandidate = (candidate: LogoCandidate, content: string, response: Response, svgWarnings: string[]) => {
  const url = new URL(candidate.url)
  const reasons: string[] = []
  const warnings = [...svgWarnings]
  const freshnessSignals = hasFreshnessSignal(candidate, content, response)
  const variantSignals = variantIntentSignals(candidate)
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

  score += variantSignals.score
  warnings.push(...variantSignals.warnings)

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

const getAiLogoReviewRuntime = () => ({
  project: process.env.GCP_PROJECT?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim() || 'efeonce-group',
  location: process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'us-central1',
  model: process.env.PAYMENT_LOGO_AI_MODEL?.trim() || process.env.GREENHOUSE_AGENT_MODEL?.trim() || 'google/gemini-2.5-flash@default'
})

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

const runAiLogoReview = async (candidate: ValidationResult, timeoutMs: number): Promise<AiLogoReview> => {
  if (!candidate.content) {
    return { status: 'skipped', rationale: 'No SVG content available for AI review.' }
  }

  const runtime = getAiLogoReviewRuntime()

  try {
    process.env.GOOGLE_GENAI_USE_VERTEXAI = 'true'
    process.env.GOOGLE_CLOUD_PROJECT ||= runtime.project
    process.env.GOOGLE_CLOUD_LOCATION ||= runtime.location

    const client = new GoogleGenAI({
      vertexai: true,
      project: runtime.project,
      location: runtime.location,
      apiVersion: 'v1'
    })

    const response = await withTimeout(
      client.models.generateContent({
        model: runtime.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [
                  'Review this SVG candidate for use in Greenhouse payment instrument logos.',
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
          maxOutputTokens: 900,
          thinkingConfig: { thinkingBudget: 0 }
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
        model: runtime.model,
        rationale: 'Gemini returned an empty or non-JSON response.'
      }
    }

    const status = parsed.status === 'pass' || parsed.status === 'review' || parsed.status === 'reject'
      ? parsed.status
      : 'review'

    return {
      status,
      model: runtime.model,
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
      model: runtime.model,
      rationale: error instanceof Error ? error.message : 'Unknown Gemini review error.'
    }
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
  officialSvgUrls: hint?.variants?.[variant]?.officialSvgUrls ?? hint?.officialSvgUrls,
  officialPages: hint?.variants?.[variant]?.officialPages ?? hint?.officialPages,
  expectedColors: hint?.variants?.[variant]?.expectedColors ?? hint?.expectedColors
})

const validateCandidate = async (candidate: LogoCandidate, outputDir: string, hint?: VariantHint): Promise<ValidationResult> => {
  const destinationBase = hint?.preferredFileBase ?? `${candidate.providerSlug}-${candidate.variant}`
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

  const provider = PROVIDER_CATALOG[providerSlug]
  const slug = hint.simpleIconsSlug

  return [
    {
      providerSlug,
      providerName: provider.name,
      variant,
      source: 'simple-icons',
      url: `https://cdn.simpleicons.org/${encodeURIComponent(slug)}`,
      pageUrl: `https://simpleicons.org/?q=${encodeURIComponent(slug)}`,
      title: `${provider.name} ${variant} logo from Simple Icons`,
      discoveredBy: 'simple-icons-cdn'
    },
    {
      providerSlug,
      providerName: provider.name,
      variant,
      source: 'simple-icons',
      url: `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/${encodeURIComponent(slug)}.svg`,
      pageUrl: `https://github.com/simple-icons/simple-icons/blob/develop/icons/${encodeURIComponent(slug)}.svg`,
      title: `${provider.name} ${variant} logo from Simple Icons repository`,
      discoveredBy: 'simple-icons-github'
    }
  ]
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

const queryWikimedia = async (providerSlug: ProviderSlug, variant: LogoVariant, term: string): Promise<LogoCandidate[]> => {
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
  const terms = baseTerms.map(term => `${term} ${variantSearchSuffix(variant)}`)
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
  const variants = variantListFromArgs(args.variants)

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

    const providerResult: RunReport['results'][number] = {
      providerSlug,
      providerName: provider.name,
      variants: {}
    }

    for (const variant of variants) {
      const hint = hintForVariant(manifest.providers[providerSlug], variant)

      const candidates = dedupeCandidates([
        ...discoverOfficialUrls(providerSlug, variant, hint),
        ...discoverSimpleIcons(providerSlug, variant, hint),
        ...(await discoverWikimedia(providerSlug, variant, hint))
      ])

      const deterministic = await Promise.all(candidates.map(candidate => validateCandidate(candidate, outputDir, hint)))
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

    report.results.push(providerResult)
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
